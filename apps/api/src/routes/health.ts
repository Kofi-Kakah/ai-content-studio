import { Router } from "express";
import { aiEnabled, b2Enabled, emailEnabled, redisEnabled } from "../env.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "ai-content-studio-api",
    time: new Date().toISOString(),
    integrations: {
      ai: aiEnabled ? "nvidia" : "mock",
      redis: redisEnabled ? "upstash" : "memory",
      storage: b2Enabled ? "b2" : "local",
      email: emailEnabled ? "resend" : "console",
    },
  });
});
