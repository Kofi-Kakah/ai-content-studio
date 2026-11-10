import { Router } from "express";
import bcrypt from "bcryptjs";
import { changePasswordSchema, updateProfileSchema } from "@studio/shared";
import { db } from "../prisma/db.js";
import { ApiError } from "../lib/errors.js";
import { logActivity, userDto } from "../lib/dto.js";

export const usersRouter = Router();

usersRouter.use(async (req, _res, next) => {
  // Ensure the account still exists for mutated sessions
  if (req.userId) {
    const user = await db.orm.public.User.select("id").first({ id: req.userId });
    if (!user) throw ApiError.unauthorized("Account no longer exists");
  }
  next();
});

/* PATCH /api/v1/users/me — update profile */
usersRouter.patch("/me", async (req, res) => {
  const input = updateProfileSchema.parse(req.body);

  const patch: Record<string, string | null> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.image !== undefined) patch.image = input.image;

  if (Object.keys(patch).length === 0) {
    const current = await db.orm.public.User.first({ id: req.userId! });
    if (!current) throw ApiError.notFound("Account not found");
    res.json({ user: userDto(current) });
    return;
  }

  const user = await db.orm.public.User.where({ id: req.userId! }).update(patch);
  if (!user) throw ApiError.notFound("Account not found");

  res.json({ user: userDto(user) });
});

/* POST /api/v1/users/me/password — change password */
usersRouter.post("/me/password", async (req, res) => {
  const input = changePasswordSchema.parse(req.body);

  const user = await db.orm.public.User.first({ id: req.userId! });
  if (!user) throw ApiError.notFound("Account not found");

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest("Your current password is incorrect", "wrong_password");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await db.orm.public.User.where({ id: user.id }).update({ passwordHash });
  await logActivity(user.id, "auth", "Password changed", "Password updated from settings");

  res.json({ ok: true });
});

/* DELETE /api/v1/users/me — delete account (cascades to all data) */
usersRouter.delete("/me", async (req, res) => {
  await db.orm.public.User.where({ id: req.userId! }).delete();
  res.json({ ok: true });
});
