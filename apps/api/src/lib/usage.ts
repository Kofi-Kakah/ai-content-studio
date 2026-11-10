import { db } from "../prisma/db.js";

function utcMidnight(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export interface UsageDelta {
  requests?: number;
  generations?: number;
  promptTokens?: number;
  completionTokens?: number;
  conversations?: number;
}

/** Upserts today's UsageDaily row for a user, adding the given deltas. */
export async function recordUsage(userId: string, delta: UsageDelta) {
  const date = utcMidnight();
  try {
    const existing = await db.orm.public.UsageDaily.where({ userId, date }).first();
    if (!existing) {
      await db.orm.public.UsageDaily.create({
        userId,
        date,
        requests: delta.requests ?? 0,
        generations: delta.generations ?? 0,
        promptTokens: delta.promptTokens ?? 0,
        completionTokens: delta.completionTokens ?? 0,
        conversations: delta.conversations ?? 0,
      });
      return;
    }
    await db.orm.public.UsageDaily.where({ id: existing.id }).update({
      requests: existing.requests + (delta.requests ?? 0),
      generations: existing.generations + (delta.generations ?? 0),
      promptTokens: existing.promptTokens + (delta.promptTokens ?? 0),
      completionTokens: existing.completionTokens + (delta.completionTokens ?? 0),
      conversations: existing.conversations + (delta.conversations ?? 0),
    });
  } catch (err) {
    console.error("[api] failed to record usage:", err);
  }
}
