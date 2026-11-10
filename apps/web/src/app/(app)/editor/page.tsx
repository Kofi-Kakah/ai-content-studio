"use client";

import * as React from "react";
import Link from "next/link";
import { FileEditIcon, SparklesIcon } from "lucide-react";
import { formatNumber, getMode } from "@studio/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeIcon } from "@/components/mode-icon";
import { useStatsOverview } from "@/lib/queries";
import { timeAgo } from "@/components/layout/notifications";

export default function EditorIndexPage() {
  const { data, isLoading } = useStatsOverview();
  const recent = data?.recent ?? [];

  return (
    <div className="scrollbar h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileEditIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Editor</h1>
            <p className="text-sm text-muted-foreground">
              Polish your AI generations in a full editor with live preview.
            </p>
          </div>
        </div>

        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Recent generations</h2>

        {isLoading ? (
          <div className="grid gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <SparklesIcon className="size-8 text-muted-foreground/50" />
            <div>
              <p className="font-medium">Nothing to edit yet</p>
              <p className="text-sm text-muted-foreground">
                Generate something in the workspace first, then open it here.
              </p>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/workspace" />}>
              Go to workspace
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            {recent.map((g) => (
              <Link
                key={g.id}
                href={`/editor/${g.id}`}
                className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-shadow hover:shadow-md"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ModeIcon name={getMode(g.mode).icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{g.conversationTitle}</span>
                  <span className="block truncate text-xs text-muted-foreground">{g.preview}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  <span className="block">{timeAgo(g.createdAt)}</span>
                  {g.totalTokens ? (
                    <span className="block">{formatNumber(g.totalTokens)} tok</span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
