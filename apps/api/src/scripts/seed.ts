/**
 * Seeds the database with a demo account and sample content so the app is
 * explorable immediately. Safe to re-run: it skips seeding if the demo user
 * already exists.
 *
 *   npm run db:seed --workspace @studio/api
 */
import bcrypt from "bcryptjs";
import { db } from "../prisma/db.js";
import { logActivity } from "../lib/dto.js";

const DEMO_EMAIL = "demo@studio.dev";
const DEMO_PASSWORD = "Demo1234!";

async function main() {
  const existing = await db.orm.public.User.first({ email: DEMO_EMAIL });
  if (existing) {
    console.log(`Demo user ${DEMO_EMAIL} already exists — nothing to seed.`);
    return;
  }

  const user = await db.orm.public.User.create({
    email: DEMO_EMAIL,
    name: "Demo User",
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    bio: "Exploring AI content generation.",
  });

  await logActivity(user.id, "auth", "Welcome to AI Content Studio 👋", "Your account was created");

  /* ---------------------------- projects ---------------------------- */

  const launchProject = await db.orm.public.Project.create({
    userId: user.id,
    name: "Q1 Product Launch",
    description: "Everything for the spring launch campaign.",
    type: "marketing",
  });
  const blogProject = await db.orm.public.Project.create({
    userId: user.id,
    name: "Company Blog",
    description: "Long-form articles and thought leadership.",
    type: "blog_posts",
  });
  await db.orm.public.Project.create({
    userId: user.id,
    name: "YouTube Channel",
    description: "Video scripts for the tutorial series.",
    type: "youtube_scripts",
  });

  /* -------------------------- conversations -------------------------- */

  const now = Date.now();
  const day = 86_400_000;

  type SeedMessage = {
    role: "user" | "assistant";
    content: string;
    mode?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
  };

  const conversations: {
    title: string;
    mode: string;
    project: string | null;
    ageMs: number;
    messages: SeedMessage[];
  }[] = [
    {
      title: "Balcony gardening tips",
      mode: "chat",
      project: null,
      ageMs: 0.2 * day,
      messages: [
        { role: "user", content: "Give me 5 tips for balcony gardening", mode: "chat" },
        {
          role: "assistant",
          mode: "chat",
          promptTokens: 42,
          completionTokens: 310,
          totalTokens: 352,
          latencyMs: 2400,
          content: `Here are five practical tips for a thriving balcony garden:

1. **Know your light.** Track how many hours of direct sun your balcony gets before buying anything — it decides which plants will thrive.
2. **Use the vertical space.** Rail planters, hanging baskets and a trellis triple your growing area.
3. **Water smart.** Balconies dry out fast; use pots with drainage holes and self-watering reservoirs for hot weeks.
4. **Pick compact varieties.** Bush tomatoes, dwarf peppers and loose-leaf lettuce beat full-size crops in containers.
5. **Feed lightly and often.** Nutrients flush out of pots faster than garden beds — a half-strength liquid feed every two weeks works well.`,
        },
      ],
    },
    {
      title: "City gardening YouTube script",
      mode: "youtube_script",
      project: null,
      ageMs: 1.5 * day,
      messages: [
        {
          role: "user",
          content: "Write a YouTube script about starting a garden in the city",
          mode: "youtube_script",
        },
        {
          role: "assistant",
          mode: "youtube_script",
          promptTokens: 58,
          completionTokens: 640,
          totalTokens: 698,
          latencyMs: 4100,
          content: `# Video Script: Starting a Garden in the City

**Target length:** ~8 minutes · **Style:** educational + energetic

---

## HOOK (0:00–0:30)

[Shot: timelapse of a small balcony turning green]

"You don't need a backyard to grow your own food. You need a balcony, a wall, or even a windowsill — and about 20 minutes a week. By the end of this video, you'll have a plan to turn your tiny space into a real garden."

## INTRO (0:30–1:00)

Hey everyone, welcome back to the channel! Today we're starting from zero...

## SECTION 1 — Assess your space (1:00–3:00)

- The sunlight test: track direct sun for one day
- Weight and wind limits for balconies
- What your building rules allow

## SECTION 2 — The starter kit (3:00–5:00)

- Three containers, one bag of potting mix, one trellis
- Best beginner crops: lettuce, herbs, bush beans
- Cost breakdown on screen (~$60 total)

## SECTION 3 — Plant your first container (5:00–7:00)

[Live planting demo, step by step with on-screen tips]

## OUTRO (7:00–8:00)

"Your homework: do the sunlight test this week and comment with your result. Next week — the five mistakes that kill balcony gardens. Subscribe so you don't miss it!"`,
        },
      ],
    },
    {
      title: "Coffee shop launch post",
      mode: "social_post",
      project: "launch",
      ageMs: 2.5 * day,
      messages: [
        {
          role: "user",
          content: "Write an Instagram launch post for our new coffee shop",
          mode: "social_post",
        },
        {
          role: "assistant",
          mode: "social_post",
          promptTokens: 51,
          completionTokens: 280,
          totalTokens: 331,
          latencyMs: 1900,
          content: `☕ **The wait is over — we're open!**

Tomorrow at 7 AM, the doors of **Ember & Oak** open for the very first time. Slow-roasted beans, fast friendships.

📍 Corner of 5th & Main
🕖 Mon–Fri 7 AM – 6 PM · Sat–Sun 8 AM – 4 PM
🎉 First 50 customers get a free pastry with any drink

Bring a friend. Stay a while. ☕

#EmberAndOak #CoffeeShop #GrandOpening #SupportLocal #CoffeeLovers`,
        },
      ],
    },
    {
      title: "Remote work article draft",
      mode: "article",
      project: "blog",
      ageMs: 4 * day,
      messages: [
        {
          role: "user",
          content: "Write a blog post about staying productive while working remotely",
          mode: "article",
        },
        {
          role: "assistant",
          mode: "article",
          promptTokens: 63,
          completionTokens: 720,
          totalTokens: 783,
          latencyMs: 5200,
          content: `# Staying Productive While Working Remotely

Remote work promised freedom — but without structure, the day dissolves. Here's how to take it back.

## Start with a commute substitute

Your brain needs a boundary between "home" and "work". A 15-minute walk before your first meeting does more than any productivity app...

## Design a shutdown ritual

End the day the way you'd leave an office: review what shipped, write tomorrow's top three tasks, close the laptop...

## Match tasks to energy, not the clock

Deep work in your peak hours, admin in the trough...

## Guard one meeting-free block

Four hours of unscheduled time per week is the difference between reacting and building...

## The bottom line

Productivity isn't more hours — it's fewer leaks. Plug three this week and the rest compounds.`,
        },
      ],
    },
  ];

  const projectIds: Record<string, string | null> = {
    launch: launchProject.id,
    blog: blogProject.id,
  };

  for (const [i, seed] of conversations.entries()) {
    const createdAt = new Date(now - seed.ageMs);
    const conversation = await db.orm.public.Conversation.create({
      userId: user.id,
      projectId: seed.project ? projectIds[seed.project] : null,
      title: seed.title,
      mode: seed.mode,
      preview: (seed.messages.at(-1)?.content ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
      createdAt,
      updatedAt: createdAt,
    });

    for (const [j, m] of seed.messages.entries()) {
      await db.orm.public.Message.create({
        conversationId: conversation.id,
        userId: user.id,
        role: m.role,
        content: m.content,
        mode: m.mode ?? null,
        model: m.role === "assistant" ? "seed" : null,
        promptTokens: m.promptTokens ?? null,
        completionTokens: m.completionTokens ?? null,
        totalTokens: m.totalTokens ?? null,
        latencyMs: m.latencyMs ?? null,
        active: true,
        createdAt: new Date(createdAt.getTime() + j * 60_000),
      });
    }

    const assistant = seed.messages.find((m) => m.role === "assistant");
    await addUsage(user.id, new Date(now - seed.ageMs), {
      requests: 1,
      generations: 1,
      promptTokens: assistant?.promptTokens ?? 0,
      completionTokens: assistant?.completionTokens ?? 0,
      conversations: i === 0 ? 1 : 0,
    });
  }

  await logActivity(
    user.id,
    "project",
    "Created project “Q1 Product Launch”",
    "Seeded sample data"
  );

  console.log("Seeded demo data:");
  console.log(`  user:      ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("  projects:  3");
  console.log(`  chats:     ${conversations.length}`);
}

/** Adds a usage delta to the daily row for the given date (UTC midnight). */
async function addUsage(
  userId: string,
  date: Date,
  delta: { requests: number; generations: number; promptTokens: number; completionTokens: number; conversations: number }
) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const existing = await db.orm.public.UsageDaily.where({ userId, date: utc }).first();
  if (!existing) {
    await db.orm.public.UsageDaily.create({ userId, date: utc, ...delta });
    return;
  }
  await db.orm.public.UsageDaily.where({ id: existing.id }).update({
    requests: existing.requests + delta.requests,
    generations: existing.generations + delta.generations,
    promptTokens: existing.promptTokens + delta.promptTokens,
    completionTokens: existing.completionTokens + delta.completionTokens,
    conversations: existing.conversations + delta.conversations,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
