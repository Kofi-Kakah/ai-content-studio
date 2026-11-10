import { Router } from "express";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@studio/shared";
import { db } from "../prisma/db.js";
import { ApiError } from "../lib/errors.js";
import { signSession } from "../lib/jwt.js";
import { logActivity, userDto } from "../lib/dto.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { emailEnabled, env } from "../env.js";
import { rateLimit } from "../lib/rate-limit.js";

export const authRouter = Router();

const RESET_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

/* POST /api/v1/auth/register */
authRouter.post(
  "/register",
  rateLimit({ name: "auth:register", limit: 10, windowSeconds: 900 }),
  async (req, res) => {
    const input = registerSchema.parse(req.body);
    const email = input.email.toLowerCase().trim();

    const existing = await db.orm.public.User.where((u) => u.email.eq(email)).first();
    if (existing) {
      throw ApiError.conflict("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await db.orm.public.User.create({
      email,
      name: input.name.trim(),
      passwordHash,
    });

    await logActivity(user.id, "auth", "Welcome to AI Content Studio 👋", "Your account was created");

    const token = signSession({ sub: user.id, email: user.email, name: user.name });
    res.status(201).json({ token, user: userDto(user) });
  }
);

/* POST /api/v1/auth/login */
authRouter.post(
  "/login",
  rateLimit({ name: "auth:login", limit: 15, windowSeconds: 900 }),
  async (req, res) => {
    const input = loginSchema.parse(req.body);
    const email = input.email.toLowerCase().trim();

    const user = await db.orm.public.User.where((u) => u.email.eq(email)).first();
    if (!user) {
      throw new ApiError(401, "Invalid email or password", "invalid_credentials");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "Invalid email or password", "invalid_credentials");
    }

    const token = signSession({ sub: user.id, email: user.email, name: user.name });
    res.json({ token, user: userDto(user) });
  }
);

/* GET /api/v1/auth/me */
authRouter.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized();
  // delegate to requireAuth-style verification without mounting it globally here
  const { verifySession } = await import("../lib/jwt.js");
  const claims = verifySession(header.slice("Bearer ".length).trim());
  if (!claims) throw ApiError.unauthorized();

  const user = await db.orm.public.User.first({ id: claims.sub });
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  res.json({ user: userDto(user) });
});

/* POST /api/v1/auth/forgot-password */
authRouter.post(
  "/forgot-password",
  rateLimit({ name: "auth:forgot", limit: 5, windowSeconds: 900 }),
  async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body);
    const email = input.email.toLowerCase().trim();

    const user = await db.orm.public.User.where((u) => u.email.eq(email)).first();

    // Always respond ok — never reveal whether the account exists.
    if (!user) {
      res.json({ ok: true });
      return;
    }

    // Invalidate previous tokens for this user
    await db.orm.public.PasswordResetToken.where({ userId: user.id }).deleteAll();

    const token = randomBytes(32).toString("hex");
    await db.orm.public.PasswordResetToken.create({
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });

    const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    res.json({
      ok: true,
      // Convenience for local development without Resend configured:
      ...(emailEnabled ? {} : { devLink: resetUrl }),
    });
  }
);

/* POST /api/v1/auth/reset-password */
authRouter.post(
  "/reset-password",
  rateLimit({ name: "auth:reset", limit: 10, windowSeconds: 900 }),
  async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);

    const record = await db.orm.public.PasswordResetToken.first({ token: input.token });
    if (!record) {
      throw ApiError.badRequest("This reset link is invalid", "invalid_token");
    }
    if (record.usedAt) {
      throw ApiError.badRequest("This reset link has already been used", "token_used");
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw ApiError.badRequest("This reset link has expired — request a new one", "token_expired");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    await db.orm.public.User.where({ id: record.userId }).update({ passwordHash });
    await db.orm.public.PasswordResetToken.where({ id: record.id }).update({ usedAt: new Date() });

    await logActivity(record.userId, "auth", "Password changed", "Your password was reset via email");

    res.json({ ok: true });
  }
);
