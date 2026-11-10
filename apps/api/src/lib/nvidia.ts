import OpenAI from "openai";
import { estimateTokens } from "@studio/shared";
import { aiEnabled, env } from "../env.js";

/**
 * NVIDIA NIM client. The API is OpenAI-compatible, so we use the `openai` SDK
 * pointed at https://integrate.api.nvidia.com/v1 (build.nvidia.com).
 */

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  type: "delta";
  text: string;
}

export interface StreamResult {
  text: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  mocked: boolean;
}

const client = aiEnabled
  ? new OpenAI({
      apiKey: env.NVIDIA_API_KEY,
      baseURL: env.NVIDIA_BASE_URL,
      timeout: 120_000,
      maxRetries: 1,
    })
  : null;

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Streams a chat completion. Yields deltas, then resolves the final result
 * via the `onResult` callback before returning.
 */
export async function* streamChatCompletion(
  messages: AiMessage[],
  onResult: (result: StreamResult) => void,
  options: StreamOptions = {}
): AsyncGenerator<StreamChunk> {
  if (!client) {
    yield* mockStream(messages, onResult, options);
    return;
  }

  const completion = await client.chat.completions.create(
    {
      model: env.AI_MODEL,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream_options: { include_usage: true },
    },
    { signal: options.signal }
  );

  let text = "";
  let usage: { prompt_tokens: number; completion_tokens: number } | null = null;

  for await (const chunk of completion) {
    if (chunk.usage) {
      usage = {
        prompt_tokens: chunk.usage.prompt_tokens ?? 0,
        completion_tokens: chunk.usage.completion_tokens ?? 0,
      };
    }
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      text += delta;
      yield { type: "delta", text: delta };
    }
  }

  const promptTokens = usage?.prompt_tokens ?? estimateTokens(messages.map((m) => m.content).join("\n"));
  const completionTokens = usage?.completion_tokens ?? estimateTokens(text);

  onResult({
    text,
    model: env.AI_MODEL,
    usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
    mocked: false,
  });
}

/* ------------------------------------------------------------------ */
/* Mock provider — full experience without an API key                 */
/* ------------------------------------------------------------------ */

async function* mockStream(
  messages: AiMessage[],
  onResult: (result: StreamResult) => void,
  options: StreamOptions
): AsyncGenerator<StreamChunk> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "your request";

  const mode = /YouTube script|scriptwriter/i.test(system)
    ? "youtube_script"
    : /social media/i.test(system)
      ? "social_post"
      : /long-form|SEO-friendly articles/i.test(system)
        ? "article"
        : /distilling|Summarize/i.test(system)
          ? "summary"
          : /headline expert/i.test(system)
            ? "titles"
            : /SEO specialist/i.test(system)
              ? "seo_description"
              : "chat";

  const text = buildMockResponse(mode, lastUser);
  const chunks = tokenize(text);

  for (const chunk of chunks) {
    if (options.signal?.aborted) break;
    await sleep(12 + Math.random() * 26);
    yield { type: "delta", text: chunk };
  }

  const promptTokens = estimateTokens(messages.map((m) => m.content).join("\n"));
  const completionTokens = estimateTokens(text);

  onResult({
    text,
    model: `${env.AI_MODEL} (demo)`,
    usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
    mocked: true,
  });
}

function tokenize(text: string): string[] {
  // Split into word-ish chunks for a natural typing feel
  const parts = text.match(/\S+\s*|\s+/g) ?? [text];
  const chunks: string[] = [];
  let buffer = "";
  for (const part of parts) {
    buffer += part;
    if (buffer.length >= 3 && !part.endsWith("\n\n")) {
      chunks.push(buffer);
      buffer = "";
    } else if (part.includes("\n") && buffer.length > 0) {
      chunks.push(buffer);
      buffer = "";
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function topicOf(prompt: string): string {
  const firstLine = prompt.split("\n")[0] ?? prompt;
  const cleaned = firstLine.replace(/^(write|create|draft|make|generate|give me|summarize|help me with)\s+(me\s+)?(an?|the)?\s*/i, "").trim();
  const topic = cleaned.length > 3 ? cleaned : "your topic";
  return topic.replace(/[.!?]+$/, "");
}

function buildMockResponse(mode: string, prompt: string): string {
  const topic = topicOf(prompt);
  const note =
    "\n\n---\n\n> **Demo mode** — this response is generated locally so you can explore the full product experience. Set `NVIDIA_API_KEY` in `apps/api/.env` to generate real content with DeepSeek v4.1 Flash on NVIDIA NIM.";

  switch (mode) {
    case "article":
      return `# ${capitalize(topic)}: The Complete Guide

*Estimated read time: 6 minutes*

## Introduction

${capitalize(topic)} has moved from a niche curiosity to a mainstream practice — and doing it well is now a genuine competitive advantage. In this guide we'll break down what actually works, what doesn't, and how to get started without wasting a weekend on trial and error.

## Why it matters

- **Momentum is compounding.** Small, consistent improvements beat occasional heroic efforts.
- **The tools have matured.** What required a specialist last year is now a 15-minute task.
- **The cost of waiting grows.** Every month of delay is a month of missed feedback.

## The 5-step framework

1. **Start with the outcome.** Write down what "done" looks like before you touch anything.
2. **Pick one lever.** Choose the single change with the highest expected impact.
3. **Set a two-week loop.** Ship something small, measure, adjust.
4. **Document as you go.** Future-you will thank present-you.
5. **Scale what works.** Double down only after the data agrees.

## Common mistakes to avoid

> Trying to optimize step 9 when step 2 is still broken.

- Perfectionism disguised as "research"
- Building systems before you have a habit
- Ignoring the boring fundamentals

## Conclusion

${capitalize(topic)} doesn't require talent as much as it requires consistency. Pick one idea from this guide, apply it this week, and let the results make the case for the next one.

**Your next step:** block 30 minutes on your calendar right now and complete step 1 of the framework.${note}`;

    case "social_post":
      return `Here are three ready-to-post variations for **${topic}**:

---

**Option 1 — Bold statement**

Everyone talks about ${topic}.

Almost nobody does it well.

Here's the 3-part system I use ↓

1️⃣ Start smaller than feels productive
2️⃣ Measure one thing
3️⃣ Repeat for 30 days

That's it. That's the post.

#${hashtag(topic)} #growth #contentcreator

---

**Option 2 — Story-driven**

Six months ago, ${topic} was just another thing on my someday-list.

Today it's the single highest-leverage habit I have.

What changed? I stopped trying to be impressive and started trying to be consistent.

The boring stuff works. 🧵

#${hashtag(topic)}

---

**Option 3 — Value list**

5 things I wish I knew about ${topic}:

→ You don't need more information, you need fewer decisions
→ The first version should embarrass you
→ Consistency > intensity, every time
→ Track it or lose it
→ Community beats willpower

Save this for your next slump. 📌

#${hashtag(topic)} #tips${note}`;

    case "youtube_script":
      return `# Video Script: ${capitalize(topic)}

**Target length:** ~8 minutes · **Style:** educational + energetic

---

## [0:00–0:15] HOOK

*(Direct to camera, fast cuts)*

What if I told you that everything you've heard about ${topic} is only half the story? By the end of this video you'll know the part nobody talks about — and it changes everything.

*[b-roll: quick montage of ${topic}]*

## [0:15–0:45] INTRO

Hey everyone, welcome back to the channel! Today we're doing a deep dive into ${topic}. I spent the last month testing, researching, and breaking things so you don't have to. Stick around to the end — I'll share the one mistake that cost me the most time.

*[b-roll: channel intro animation]*

## [0:45–3:00] PART 1 — The fundamentals

Let's start with the basics, because getting these right makes everything else 10x easier.

- **Point one:** the 80/20 of ${topic} — most of your results come from one or two core actions
- **Point two:** the setup that takes 10 minutes and pays off for months
- **Point three:** the metric you should actually be watching (spoiler: it's not the popular one)

*[b-roll: screen recording walking through the setup]*

## [3:00–5:30] PART 2 — The advanced system

Now let's stack the advanced stuff on top. This is where ${topic} goes from "fine" to genuinely unfair.

**The system has three moving parts** — I'll walk through each one with a real example, and I've put the checklist in the description below.

*[b-roll: whiteboard diagram, then real footage]*

## [5:30–7:00] PART 3 — Mistakes & fixes

Three mistakes I see constantly:

1. Doing too much, too early
2. Optimizing before validating
3. Quitting at the exact moment it starts working *(this one is brutal)*

## [7:00–8:00] OUTRO + CTA

So that's ${topic}, minus the fluff. If this saved you some trial and error, subscribing is the best way to say thanks — I drop a video like this every week. And comment below: what should I break down next?

See you in the next one. ✌️

---

**Production notes:** shoot Part 1 with natural window light; Part 2 benefits from a second angle. Total estimated edit: ~6 hours.${note}`;

    case "summary":
      return `**TL;DR** — ${capitalize(topic)} comes down to a few core ideas, summarized below.

## Key points

- **The core idea:** the fundamentals drive most of the results — the advanced tactics are multiplier, not foundation.
- **The practical takeaway:** start with one small, measurable change and let consistency compound.
- **The common trap:** over-preparation. The feedback from doing beats the confidence from planning.
- **The numbers:** practitioners report the biggest gains in the first 2–4 weeks of a focused loop.

## Action items

1. Define what "done" looks like for ${topic} in one sentence
2. Choose the smallest useful experiment you can run this week
3. Set a calendar reminder to review results in 14 days

---

*Faithful to the source, compressed to essentials.*${note}`;

    case "titles":
      return `Here are 10 title options for **${topic}**, spanning different styles:

1. **${capitalize(topic)}: The Complete 2026 Guide** — *authority/SEO play; strong for search intent*
2. **I Tried ${capitalize(topic)} for 30 Days. Here's What Happened** — *experiment format; proven curiosity gap*
3. **The ${capitalize(topic)} Mistake Everyone Makes** — *negative framing; high CTR in most niches*
4. **${capitalize(topic)} in 5 Minutes (No Experience Needed)** — *speed + accessibility promise*
5. **Why ${capitalize(topic)} Is Harder Than It Looks** — *contrarian angle; invites debate*
6. **From Zero to ${capitalize(topic)}: A Practical Roadmap** — *transformation framing*
7. **7 ${capitalize(topic)} Rules I Learned the Hard Way** — *listicle + earned authority*
8. **The Lazy Person's Guide to ${capitalize(topic)}** — *self-deprecating; disarms resistance*
9. **Stop Dabbling: How to Actually Master ${capitalize(topic)}** — *command + pain point*
10. **${capitalize(topic)}, Explained Like You're Five** — *simplicity promise; broad appeal*

---

**🏆 Top pick: #2** — the experiment format combines a time-boxed promise with an open loop, which reliably outperforms generic guides. Use #1 if search traffic matters more than clicks.${note}`;

    case "seo_description":
      return `## Meta descriptions (140–160 characters)

1. > Discover everything you need to know about ${topic} — practical steps, common mistakes, and a proven framework to get results fast. Start today.

2. > Learn ${topic} the smart way: a step-by-step guide with real examples, expert tips, and the tools that actually make a difference.

3. > Master ${topic} in weeks, not months. Our complete guide covers the fundamentals, the pitfalls, and the exact system the pros use.

## Keywords

- **Primary:** ${keyword(topic)}
- **Secondary:** ${keyword(topic)} guide · learn ${keyword(topic)} · ${keyword(topic)} tips · best ${keyword(topic)} · ${keyword(topic)} for beginners
- **Long-tail:** how to get started with ${keyword(topic)} · ${keyword(topic)} step by step · ${keyword(topic)} mistakes to avoid

## SEO title (under 60 characters)

> ${truncate(capitalize(topic) + ": The 2026 Complete Guide", 60)}

---

*Tip: pair description #1 with the SEO title for the strongest click-through combination.*${note}`;

    default:
      return `Great question — let's dig into **${topic}**.

Here's the short version first, then the details:

**The short version:** the most effective approach is usually the boring one — pick the smallest meaningful step, do it consistently, and measure what happens. Most people fail not from lack of information but from lack of a repeatable loop.

**A bit deeper:**

1. **Clarify the outcome.** What would make this a win? Write it in one sentence.
2. **Find the constraint.** There's almost always one bottleneck — time, knowledge, or tooling. Name yours honestly.
3. **Design the loop.** Something you can repeat weekly, not heroically. Small + frequent beats big + rare.
4. **Review and adjust.** Every two weeks, ask: what worked, what didn't, what's the next smallest step?

**A concrete example:** say you wanted to apply this to ${topic} specifically — you'd define the outcome, pick one measurable action, schedule it twice a week for two weeks, then review. Simple, but it's remarkable how often this beats elaborate plans.

Want me to go deeper on any of these — or apply the framework to a specific situation you have in mind?${note}`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hashtag(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => capitalize(w.replace(/[^a-zA-Z0-9]/g, "")))
    .join("")
    .slice(0, 24) || "Content";
}

function keyword(s: string): string {
  return s.toLowerCase().replace(/[.!?]+$/, "");
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}
