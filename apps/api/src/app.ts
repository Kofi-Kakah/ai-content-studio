import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env.js";
import { errorHandler, notFoundHandler } from "./lib/errors.js";
import { requireAuth } from "./middleware/auth.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { uploadsRouter } from "./routes/uploads.js";
import { conversationsRouter } from "./routes/conversations.js";
import { messagesRouter } from "./routes/messages.js";
import { aiRouter } from "./routes/ai.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: "2mb" }));

  // Health & liveness (public)
  app.use("/api/v1/health", healthRouter);

  // Authentication (public, rate limited)
  app.use("/api/v1/auth", authRouter);

  // Local file storage fallback (public reads; keys are unguessable)
  app.use("/api/v1/files", uploadsRouter);

  // Everything below requires a valid session JWT
  app.use("/api/v1", requireAuth, protectedRoutes());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function protectedRoutes() {
  const router = express.Router();
  router.use("/users", usersRouter);
  router.use("/conversations", conversationsRouter);
  router.use("/messages", messagesRouter);
  router.use("/ai", aiRouter);
  return router;
}
