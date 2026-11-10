"use client";

import { AI_MODES, CHAT_MODES, type ChatModeId } from "@studio/shared";
import { SparklesIcon } from "lucide-react";
import { ModeIcon } from "@/components/mode-icon";
import { cn } from "cn";

const SHOWCASE: ChatModeId[] = [
  "article",
  "social_post",
  "youtube_script",
  "seo_description",
];

export function EmptyState({
  mode,
  onModeChange,
  onSuggestion,
}: {
  mode: ChatModeId;
  onModeChange: (mode: ChatModeId) => void;
  onSuggestion: (text: string, mode: ChatModeId) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <SparklesIcon className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          What should we create today?
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Pick a format and describe your idea — articles, posts, scripts, summaries, titles
          and SEO descriptions, streamed as they&apos;re written.
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4">
        {SHOWCASE.map((id) => {
          const m = AI_MODES[id];
          return (
            <button
              key={id}
              onClick={() => onModeChange(id)}
              className={cn(
                "flex flex-col gap-2 rounded-xl border bg-card p-3.5 text-left transition-all hover:shadow-md",
                mode === id && "border-primary/50 ring-2 ring-primary/20"
              )}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ModeIcon name={m.icon} className="size-4" />
              </span>
              <span className="text-[13px] font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {CHAT_MODES.slice(0, 4).flatMap((id) =>
          AI_MODES[id].suggestions.slice(0, 1).map((s) => (
            <button
              key={id}
              onClick={() => onSuggestion(s, id)}
              className="rounded-full border bg-card px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {s.length > 52 ? s.slice(0, 52) + "…" : s}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
