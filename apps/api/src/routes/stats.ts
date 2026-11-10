import { Router } from "express";
import type { ChatModeId, ModeUsage, RecentGeneration, StatsOverview, StatsUsage, UsageDay } from "@studio/shared";
import { db } from "../prisma/db.js";
import { requireAuth } from "../middleware/auth.js";

export const statsRouter = Router();

function utcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* GET /api/v1/stats/overview */
statsRouter.get("/overview", async (req, res) => {
  const userId = req.userId!;

  const [messageTotals, conversationCount, projectCount, user] = await Promise.all([
    db.orm.public.Message.where({ userId, role: "assistant", active: true }).aggregate((a) => ({
      generations: a.count(),
      promptTokens: a.sum("promptTokens"),
      completionTokens: a.sum("completionTokens"),
      totalTokens: a.sum("totalTokens"),
    })),
    db.orm.public.Conversation.where({ userId }).aggregate((a) => ({ count: a.count() })),
    db.orm.public.Project.where({ userId }).aggregate((a) => ({ count: a.count() })),
    db.orm.public.User.select("createdAt").first({ id: userId }),
  ]);

  const todayKey = utcDay();
  const sevenDaysAgo = new Date(todayKey.getTime() - 6 * 86_400_000);

  const usageRows = await db.orm.public.UsageDaily.where((u) =>
    // date >= sevenDaysAgo (chained where for the date range)
    u.date.gte(sevenDaysAgo)
  )
    .where({ userId })
    .all();

  let todayGenerations = 0;
  let todayTokens = 0;
  let last7Generations = 0;
  let last7Tokens = 0;
  for (const row of usageRows) {
    if (isoDay(row.date) === isoDay(todayKey)) {
      todayGenerations += row.generations;
      todayTokens += row.promptTokens + row.completionTokens;
    }
    last7Generations += row.generations;
    last7Tokens += row.promptTokens + row.completionTokens;
  }

  const recentRows = await db.orm.public.Message.where({ userId, role: "assistant", active: true })
    .select("id", "conversationId", "userId", "role", "content", "mode", "model", "promptTokens", "completionTokens", "totalTokens", "latencyMs", "active", "createdAt")
    .include("conversation", (c) => c.select("id", "title"))
    .orderBy([(m) => m.createdAt.desc(), (m) => m.id.desc()])
    .limit(8)
    .all();

  const recent: RecentGeneration[] = recentRows.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    conversationTitle: m.conversation?.title ?? "Conversation",
    mode: (m.mode as ChatModeId) ?? "chat",
    preview: m.content.replace(/\s+/g, " ").trim().slice(0, 140) || "—",
    totalTokens: m.totalTokens,
    createdAt: m.createdAt.toISOString(),
  }));

  const overview: StatsOverview = {
    totals: {
      generations: messageTotals.generations,
      conversations: conversationCount.count,
      projects: projectCount.count,
      promptTokens: messageTotals.promptTokens ?? 0,
      completionTokens: messageTotals.completionTokens ?? 0,
      totalTokens: messageTotals.totalTokens ?? 0,
    },
    today: { generations: todayGenerations, totalTokens: todayTokens },
    last7Days: { generations: last7Generations, totalTokens: last7Tokens },
    memberSince: user?.createdAt.toISOString() ?? new Date().toISOString(),
    recent,
  };

  res.json(overview);
});

/* GET /api/v1/stats/usage?days=30 */
statsRouter.get("/usage", async (req, res) => {
  const userId = req.userId!;
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
  const startDay = new Date(utcDay().getTime() - (days - 1) * 86_400_000);

  const [usageRows, modeRows] = await Promise.all([
    db.orm.public.UsageDaily.where((u) => u.date.gte(startDay)).where({ userId }).all(),
    db.orm.public.Message.where({ userId, role: "assistant", active: true })
      .groupBy("mode")
      .aggregate((a) => ({ count: a.count(), tokens: a.sum("totalTokens") })),
  ]);

  // Zero-fill missing days
  const byDay = new Map(usageRows.map((r) => [isoDay(r.date), r]));
  const series: UsageDay[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(startDay.getTime() + i * 86_400_000);
    const key = isoDay(day);
    const row = byDay.get(key);
    series.push({
      date: key,
      requests: row?.requests ?? 0,
      generations: row?.generations ?? 0,
      promptTokens: row?.promptTokens ?? 0,
      completionTokens: row?.completionTokens ?? 0,
      totalTokens: (row?.promptTokens ?? 0) + (row?.completionTokens ?? 0),
    });
  }

  const byMode: ModeUsage[] = modeRows
    .map((r) => ({
      mode: (r.mode as ChatModeId) ?? "chat",
      count: r.count,
      totalTokens: r.tokens ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const usage: StatsUsage = { series, byMode };
  res.json(usage);
});
