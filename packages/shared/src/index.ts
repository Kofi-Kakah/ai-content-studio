/**
 * @studio/shared — code shared between the Next.js web app and the Node API.
 *
 * AI modes + prompt templates, project taxonomy, API payload schemas and DTOs.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/* AI modes                                                            */
/* ------------------------------------------------------------------ */

export const CHAT_MODES = ["chat", "article", "social_post", "youtube_script", "summary", "titles", "seo_description"] as const;
export type ChatModeId = (typeof CHAT_MODES)[number];

export interface ChatMode {
  id: ChatModeId;
  label: string;
  /** Short label used in compact UI (pickers, badges). */
  short: string;
  description: string;
  /** lucide-react icon name — mapped to a component in the web app. */
  icon: string;
  placeholder: string;
  suggestions: string[];
  systemPrompt: string;
}

export const AI_MODES: Record<ChatModeId, ChatMode> = {
  chat: {
    id: "chat",
    label: "Ask anything",
    short: "Chat",
    description: "A general purpose AI assistant for anything you need.",
    icon: "Sparkles",
    placeholder: "Ask anything…",
    suggestions: [
      "Brainstorm 10 content ideas for my niche",
      "Rewrite this paragraph to be more engaging",
      "Explain SEO basics like I'm five",
      "Draft an email newsletter intro",
    ],
    systemPrompt:
      "You are Studio, a friendly and highly capable AI assistant. Answer clearly and concisely, using Markdown formatting (headings, lists, tables, code blocks) when it helps readability.",
  },
  article: {
    id: "article",
    label: "Write an article",
    short: "Article",
    description: "Long-form, SEO-ready blog posts and articles with structure.",
    icon: "FileText",
    placeholder: "What should the article be about? e.g. “How to start a newsletter in 2026”",
    suggestions: [
      "Write a 1,500-word article about remote work productivity",
      "A beginner's guide to personal finance for Gen Z",
      "How AI is changing content marketing",
      "The ultimate guide to morning routines",
    ],
    systemPrompt:
      "You are Studio, an expert long-form content writer. Write well-structured, engaging, SEO-friendly articles in Markdown. Always include: a compelling H1 title, a short introduction that hooks the reader, descriptive H2/H3 section headings, actionable takeaways, and a conclusion with a call to action. Adapt tone and depth to the user's request, and never pad with filler.",
  },
  social_post: {
    id: "social_post",
    label: "Create a social post",
    short: "Social",
    description: "Scroll-stopping posts for X, LinkedIn, Instagram and more.",
    icon: "Share2",
    placeholder: "What's the post about? Which platform? e.g. “LinkedIn post about our new feature”",
    suggestions: [
      "A LinkedIn post announcing our new AI feature",
      "Twitter/X thread about productivity tips",
      "Instagram caption for a fitness studio",
      "A poll-style post about remote work",
    ],
    systemPrompt:
      "You are Studio, a social media copywriting expert. Write platform-appropriate, high-engagement posts. Unless the user asks for a single post, provide 2–3 variations with different angles (e.g. bold statement, story-driven, value-list). Include relevant hashtags and, where useful, emoji. Keep each variation within the platform's character norms.",
  },
  youtube_script: {
    id: "youtube_script",
    label: "Write a YouTube script",
    short: "Script",
    description: "Hook-first video scripts with sections, b-roll notes and CTAs.",
    icon: "Youtube",
    placeholder: "What's the video about? e.g. “10-minute video about building a PC”",
    suggestions: [
      "A 10-minute YouTube script about building a gaming PC",
      "Video script: I tried waking up at 5am for 30 days",
      "Script for a tutorial on Notion for beginners",
      "A documentary-style short about deep sea life",
    ],
    systemPrompt:
      "You are Studio, a professional YouTube scriptwriter. Structure scripts in Markdown with: a 0–15 second HOOK, an INTRO that previews value, clearly-timed BODY sections with talking points and [b-roll] suggestions, and an OUTRO with a subscribe CTA. Write conversationally for spoken delivery, and note approximate timestamps for each section.",
  },
  summary: {
    id: "summary",
    label: "Summarize text",
    short: "Summary",
    description: "Turn long text into crisp summaries with key points.",
    icon: "AlignLeft",
    placeholder: "Paste the text to summarize, or describe what to summarize.",
    suggestions: [
      "Summarize this article in 5 bullet points",
      "TL;DR of this meeting transcript",
      "Summarize this research paper for a general audience",
      "Give me a one-paragraph executive summary",
    ],
    systemPrompt:
      "You are Studio, an expert at distilling information. Summarize the provided content faithfully. Start with a 1–2 sentence TL;DR, then a **Key points** bulleted list, then optional **Notable quotes** or **Action items** when relevant. Never invent facts that are not in the source. If the source is missing, ask for it.",
  },
  titles: {
    id: "titles",
    label: "Generate titles",
    short: "Titles",
    description: "Click-worthy headline options ranked with rationale.",
    icon: "Heading",
    placeholder: "What do you need a title for? e.g. “blog post about meal prep”",
    suggestions: [
      "10 title ideas for a blog post about meal prepping",
      "YouTube video titles for a coding tutorial",
      "Headlines for a landing page about a productivity app",
      "Title options for a podcast episode about travel",
    ],
    systemPrompt:
      "You are Studio, a headline expert. Generate 8–10 title options, numbered, spanning different styles (how-to, listicle, curiosity gap, bold claim, SEO keyword-first). For each, add a one-line rationale. End with your top pick and why. Keep titles under ~65 characters unless asked otherwise.",
  },
  seo_description: {
    id: "seo_description",
    label: "SEO description",
    short: "SEO",
    description: "Meta descriptions and keywords that rank and convert.",
    icon: "Search",
    placeholder: "Describe the page or paste content to optimize.",
    suggestions: [
      "Meta description for a landing page selling course templates",
      "SEO description for a blog post about intermittent fasting",
      "Optimize this product page description for search",
      "Keywords + meta description for a vegan recipe blog",
    ],
    systemPrompt:
      "You are Studio, an SEO specialist. Provide: (1) 3 meta description options of 140–160 characters that include the primary keyword and a call to action; (2) a primary keyword, 5–8 secondary keywords, and 3 long-tail variants; (3) a suggested SEO title (under 60 characters). Present everything in clean Markdown.",
  },
};

export const DEFAULT_MODE: ChatModeId = "chat";

export function getMode(id: string | null | undefined): ChatMode {
  return AI_MODES[(id as ChatModeId) ?? "chat"] ?? AI_MODES.chat;
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export const PROJECT_TYPES = ["youtube_scripts", "blog_posts", "social_media", "marketing"] as const;
export type ProjectTypeId = (typeof PROJECT_TYPES)[number];

export interface ProjectTypeDef {
  id: ProjectTypeId;
  label: string;
  description: string;
  /** lucide-react icon name */
  icon: string;
  /** tailwind classes for badges */
  badgeClass: string;
}

export const PROJECT_TYPE_DEFS: Record<ProjectTypeId, ProjectTypeDef> = {
  youtube_scripts: {
    id: "youtube_scripts",
    label: "YouTube Scripts",
    description: "Video scripts, hooks, storyboards and channel content.",
    icon: "Youtube",
    badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  blog_posts: {
    id: "blog_posts",
    label: "Blog Posts",
    description: "Long-form articles, guides and SEO content.",
    icon: "FileText",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  social_media: {
    id: "social_media",
    label: "Social Media",
    description: "Posts, threads and captions for every platform.",
    icon: "Share2",
    badgeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  marketing: {
    id: "marketing",
    label: "Marketing",
    description: "Campaigns, emails, landing copy and ads.",
    icon: "Megaphone",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

export function getProjectTypeDef(id: string): ProjectTypeDef {
  return PROJECT_TYPE_DEFS[id as ProjectTypeId] ?? PROJECT_TYPE_DEFS.blog_posts;
}

/** Default AI mode when starting a chat inside a project of a given type. */
export const PROJECT_TYPE_DEFAULT_MODE: Record<ProjectTypeId, ChatModeId> = {
  youtube_scripts: "youtube_script",
  blog_posts: "article",
  social_media: "social_post",
  marketing: "social_post",
};

/* ------------------------------------------------------------------ */
/* DTOs (API <-> web)                                                  */
/* ------------------------------------------------------------------ */

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  createdAt: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  type: ProjectTypeId;
  createdAt: string;
  updatedAt: string;
  conversationCount?: number;
}

export interface ConversationDto {
  id: string;
  title: string;
  mode: ChatModeId;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  preview?: string | null;
}

export interface AttachmentDto {
  id: string;
  name: string;
  url: string;
  mime: string;
  size: number;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  mode: ChatModeId | null;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  active: boolean;
  createdAt: string;
  attachments?: AttachmentDto[];
}

export interface ActivityDto {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export interface FileRecordDto {
  id: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  createdAt: string;
}

export interface UsageDay {
  date: string;
  requests: number;
  generations: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModeUsage {
  mode: ChatModeId;
  count: number;
  totalTokens: number;
}

export interface RecentGeneration {
  id: string;
  conversationId: string;
  conversationTitle: string;
  mode: ChatModeId;
  preview: string;
  totalTokens: number | null;
  createdAt: string;
}

export interface StatsOverview {
  totals: {
    generations: number;
    conversations: number;
    projects: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  today: {
    generations: number;
    totalTokens: number;
  };
  last7Days: {
    generations: number;
    totalTokens: number;
  };
  memberSince: string;
  recent: RecentGeneration[];
}

export interface StatsUsage {
  series: UsageDay[];
  byMode: ModeUsage[];
}

/* ------------------------------------------------------------------ */
/* AI streaming protocol (SSE events emitted by POST /ai/chat)         */
/* ------------------------------------------------------------------ */

export type StreamEvent =
  | { type: "meta"; conversationId: string; userMessageId: string | null; assistantMessageId: string; title: string; mode: ChatModeId }
  | { type: "delta"; text: string }
  | { type: "done"; message: MessageDto }
  | { type: "error"; message: string };

/* ------------------------------------------------------------------ */
/* Request schemas                                                     */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .regex(/[a-zA-Z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .regex(/[a-zA-Z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).nullable().optional(),
  bio: z.string().max(280).nullable().optional(),
  image: z.string().nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .regex(/[a-zA-Z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(PROJECT_TYPES),
});

export const updateProjectSchema = createProjectSchema.partial();

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  projectId: z.string().nullable().optional(),
  mode: z.enum(CHAT_MODES).optional(),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().optional(),
  projectId: z.string().nullable().optional(),
  content: z.string().max(32_000).optional(),
  mode: z.enum(CHAT_MODES).default("chat"),
  regenerate: z.boolean().default(false),
  attachmentIds: z.array(z.string()).max(5).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/* ------------------------------------------------------------------ */
/* Misc helpers                                                        */
/* ------------------------------------------------------------------ */

export const AI_MODEL = "deepseek-ai/deepseek-v4.1-flash";
export const AI_MODEL_LABEL = "DeepSeek v4.1 Flash";

/** Rough token estimate used for the mock provider and UI hints. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
