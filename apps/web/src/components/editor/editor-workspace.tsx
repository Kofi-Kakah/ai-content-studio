"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  BoldIcon,
  CheckIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  Loader2Icon,
  MinusIcon,
  PanelLeftIcon,
  QuoteIcon,
  SaveIcon,
  TableIcon,
} from "lucide-react";
import { formatNumber, getMode } from "@studio/shared";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useMessage, useUpdateMessage } from "@/lib/queries";
import { Markdown } from "@/components/workspace/markdown";
import type { MonacoHandle } from "./monaco-editor";

const MonacoEditor = dynamic(() => import("./monaco-editor").then((m) => m.MonacoEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2Icon className="size-4 animate-spin" />
      Loading editor…
    </div>
  ),
});

type ViewMode = "editor" | "split" | "preview";

const TOOLBAR_ITEMS = [
  { icon: <BoldIcon />, label: "Bold" },
  { icon: <ItalicIcon />, label: "Italic" },
  { icon: <Heading2Icon />, label: "Heading" },
  { icon: <ListIcon />, label: "Bullet list" },
  { icon: <ListOrderedIcon />, label: "Numbered list" },
  { icon: <QuoteIcon />, label: "Quote" },
  { icon: <CodeIcon />, label: "Code" },
  { icon: <LinkIcon />, label: "Link" },
  { icon: <MinusIcon />, label: "Divider" },
  { icon: <TableIcon />, label: "Table" },
];

export function EditorWorkspace({ messageId }: { messageId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useMessage(messageId);
  const update = useUpdateMessage();

  const monacoRef = React.useRef<MonacoHandle | null>(null);
  const [content, setContent] = React.useState("");
  const [view, setView] = React.useState<ViewMode>("split");
  const [savedContent, setSavedContent] = React.useState("");

  const message = data?.message;
  const conversation = data?.conversation;

  // Hydrate once the message arrives
  const [prevMessageId, setPrevMessageId] = React.useState<string | null>(null);
  if (message && message.id !== prevMessageId) {
    setPrevMessageId(message.id);
    setContent(message.content);
    setSavedContent(message.content);
  }

  const dirty = content !== savedContent;

  const save = React.useCallback(async () => {
    if (!dirty || !message) return;
    try {
      await update.mutateAsync({ id: message.id, content });
      setSavedContent(content);
      void qc.invalidateQueries({ queryKey: ["message", message.id] });
      if (conversation) {
        void qc.invalidateQueries({ queryKey: ["conversation", conversation.id] });
        void qc.invalidateQueries({ queryKey: ["conversations"] });
      }
      toast.add({ title: "Saved", type: "success" });
    } catch (err) {
      toast.add({ title: "Save failed", description: (err as Error).message, type: "error" });
    }
  }, [dirty, message, content, update, qc, conversation]);

  // Cmd/Ctrl+S
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // Warn before losing unsaved edits
  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const chars = content.length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.add({ title: "Copied to clipboard", type: "success" });
    } catch {
      toast.add({ title: "Could not copy", type: "error" });
    }
  };

  const exportMd = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(conversation?.title ?? "studio").replace(/[^\w\d-]+/g, "-").slice(0, 48) || "studio"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyTool = React.useCallback((label: string) => {
    const handle = monacoRef.current;
    if (!handle) return;
    switch (label) {
      case "Bold":
        handle.wrap("**");
        break;
      case "Italic":
        handle.wrap("*");
        break;
      case "Heading":
        handle.prefixLines("## ");
        break;
      case "Bullet list":
        handle.prefixLines("- ");
        break;
      case "Numbered list":
        handle.prefixLines("1. ");
        break;
      case "Quote":
        handle.prefixLines("> ");
        break;
      case "Code":
        handle.wrap("`");
        break;
      case "Link":
        handle.wrap("[", "](https://)");
        break;
      case "Divider":
        handle.insert("\n\n---\n\n");
        break;
      case "Table":
        handle.insert("\n| Column | Description |\n| --- | --- |\n|  |  |\n");
        break;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-12 items-center gap-3 border-b px-4">
          <Skeleton className="h-6 w-44" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !message || !conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>Message not found.</p>
        <Button variant="outline" size="sm" render={<Link href="/editor" />}>
          <ArrowLeftIcon />
          Back to editor
        </Button>
      </div>
    );
  }

  const mode = message.mode ? getMode(message.mode) : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to conversation"
          className="text-muted-foreground"
          onClick={() => router.push(`/workspace/${conversation.id}`)}
        >
          <ArrowLeftIcon />
        </Button>

        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{conversation.title}</span>
          {mode ? (
            <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
              {mode.label}
            </Badge>
          ) : null}
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px]",
              dirty
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {dirty ? "Unsaved" : "Saved"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="editor" aria-label="Editor only">
                <PanelLeftIcon className="size-3.5" />
                <span className="hidden sm:inline">Write</span>
              </TabsTrigger>
              <TabsTrigger value="split">
                <span className="hidden sm:inline">Split</span>
              </TabsTrigger>
              <TabsTrigger value="preview">
                <span className="hidden sm:inline">Preview</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="ghost" size="icon-sm" aria-label="Copy" onClick={() => void copy()}>
            <CopyIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Export markdown" onClick={exportMd}>
            <DownloadIcon />
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={!dirty || update.isPending}>
            {update.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : dirty ? (
              <SaveIcon />
            ) : (
              <CheckIcon />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {view !== "preview" ? (
        <div className="flex h-10 shrink-0 items-center gap-0.5 border-b px-3">
          {TOOLBAR_ITEMS.map((t) => (
            <Button
              key={t.label}
              variant="ghost"
              size="icon-xs"
              aria-label={t.label}
              title={t.label}
              onClick={() => applyTool(t.label)}
            >
              {t.icon}
            </Button>
          ))}
          <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
            ⌘S to save
          </span>
        </div>
      ) : null}

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {view !== "preview" ? (
          <div className={cn("min-w-0 flex-1", view === "split" && "border-r")}>
            <MonacoEditor ref={monacoRef} value={content} onChange={setContent} />
          </div>
        ) : null}
        {view !== "editor" ? (
          <div className="scrollbar min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-5 py-4">
              <Markdown content={content} />
            </div>
          </div>
        ) : null}
      </div>

      {/* Status bar */}
      <div className="flex h-7 shrink-0 items-center gap-3 border-t px-4 text-[11px] text-muted-foreground">
        <span>{formatNumber(words)} words</span>
        <span>{formatNumber(chars)} characters</span>
        {message.totalTokens ? <span>{formatNumber(message.totalTokens)} tokens (original)</span> : null}
        {message.model ? <span className="hidden sm:inline">{message.model}</span> : null}
      </div>
    </div>
  );
}
