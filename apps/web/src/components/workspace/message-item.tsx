"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  RefreshCwIcon,
  SparklesIcon,
  CoinsIcon,
} from "lucide-react";
import { formatNumber, getMode, type MessageDto } from "@studio/shared";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { Markdown } from "./markdown";

export function MessageItem({
  message,
  isStreaming = false,
  isLastAssistant = false,
  onRegenerate,
}: {
  message: MessageDto;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
}) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  return (
    <AssistantMessage
      message={message}
      isStreaming={isStreaming}
      isLastAssistant={isLastAssistant}
      onRegenerate={onRegenerate}
    />
  );
}

function UserMessage({ message }: { message: MessageDto }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-muted px-4 py-2.5 text-[0.9375rem] whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  isStreaming,
  isLastAssistant,
  onRegenerate,
}: {
  message: MessageDto;
  isStreaming: boolean;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);

  const mode = message.mode ? getMode(message.mode) : null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.add({ title: "Copied to clipboard", type: "success" });
    } catch {
      toast.add({ title: "Could not copy", type: "error" });
    }
  };

  const download = (ext: "md" | "txt") => {
    const blob = new Blob([message.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studio-${message.id.slice(0, 8)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.add({ title: `Exported as .${ext}`, type: "success" });
  };

  const words = message.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="group/msg flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
        <SparklesIcon className="size-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <Markdown
          content={message.content || (isStreaming ? "" : "…")}
          className={cn(isStreaming && message.content && "stream-caret")}
        />

        {!isStreaming && message.content ? (
          <div className="mt-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100 focus-within:opacity-100">
            <Button variant="ghost" size="icon-xs" aria-label="Copy" onClick={() => void onCopy()}>
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Export" />}>
                <DownloadIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => download("md")}>
                  <DownloadIcon />
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => download("txt")}>
                  <DownloadIcon />
                  Export as plain text
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/editor/${message.id}`)}
                >
                  <DownloadIcon />
                  Open in Editor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isLastAssistant && onRegenerate ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Regenerate"
                onClick={onRegenerate}
              >
                <RefreshCwIcon />
              </Button>
            ) : null}

            <span className="ml-1.5 flex items-center gap-2 text-[11px] text-muted-foreground/70">
              {words > 0 ? <span>{formatNumber(words)} words</span> : null}
              {message.totalTokens ? (
                <span className="flex items-center gap-0.5">
                  <CoinsIcon className="size-3" />
                  {formatNumber(message.totalTokens)} tokens
                </span>
              ) : null}
              {message.model ? (
                <span className="hidden sm:inline">{message.model}</span>
              ) : null}
            </span>
          </div>
        ) : null}

        {mode && !isStreaming ? (
          <div className="mt-1.5 opacity-0 transition-opacity group-hover/msg:opacity-100">
            <Badge variant="secondary" className="gap-1 text-[10px]">
              {mode.label}
            </Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}
