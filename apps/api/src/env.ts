import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  /** Must match AUTH_SECRET in apps/web — signs the session JWTs. */
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  APP_URL: z.string().default("http://localhost:3000"),

  // NVIDIA AI
  NVIDIA_API_KEY: z.string().optional().default(""),
  NVIDIA_BASE_URL: z.string().default("https://integrate.api.nvidia.com/v1"),
  AI_MODEL: z.string().default("deepseek-ai/deepseek-v4.1-flash"),

  // Resend
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("AI Content Studio <onboarding@resend.dev>"),

  // Upstash Redis (optional — falls back to in-memory)
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Backblaze B2 (optional — falls back to local disk)
  B2_KEY_ID: z.string().optional().default(""),
  B2_APP_KEY: z.string().optional().default(""),
  B2_BUCKET: z.string().optional().default(""),
  B2_REGION: z.string().default("us-west-004"),
  B2_PUBLIC_BASE_URL: z.string().optional().default(""),
  STORAGE_DRIVER: z.enum(["local", "b2"]).default("local"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

export const redisEnabled = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
export const b2Enabled =
  env.STORAGE_DRIVER === "b2" && Boolean(env.B2_KEY_ID && env.B2_APP_KEY && env.B2_BUCKET);
export const emailEnabled = Boolean(env.RESEND_API_KEY);
export const aiEnabled = Boolean(env.NVIDIA_API_KEY);
