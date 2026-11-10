import "temporal-polyfill";
import { createApp } from "./app.js";
import { env, aiEnabled, b2Enabled, emailEnabled, redisEnabled } from "./env.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`\n🚀 AI Content Studio API`);
  console.log(`   http://localhost:${env.PORT}`);
  console.log(`   env: ${env.NODE_ENV}`);
  console.log(`   ai: ${aiEnabled ? "nvidia ✓" : "mock streaming (set NVIDIA_API_KEY)"}`);
  console.log(`   redis: ${redisEnabled ? "upstash ✓" : "in-memory fallback"}`);
  console.log(`   storage: ${b2Enabled ? "backblaze b2 ✓" : "local disk fallback"}`);
  console.log(`   email: ${emailEnabled ? "resend ✓" : "console fallback"}\n`);
});

function shutdown(signal: string) {
  console.log(`\n[api] ${signal} received — shutting down gracefully`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
