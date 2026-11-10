"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  DownloadIcon,
  FolderIcon,
  MessageSquareIcon,
} from "lucide-react";
import {
  CHAT_MODES,
  type ChatModeId,
  type MessageDto,
  type StreamEvent,
} from "@studio/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useConversation } from "@/lib/queries";
import { api } from "@/lib/api";
import { streamChat } from "@/lib/stream";
import { ChatInput } from "./chat-input";
import { EmptyState } from "./empty-state";
import { MessageItem } from "./message-item";

interface StreamState {
  conversationId: string;
  content: string;
}

export function ChatView({ newChat = false }: { newChat?: boolean }) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const urlId = newChat ? null : (params.id ?? null);

  const [activeId, setActiveId] = React.useState<string | null>(urlId);
  const [mode, setMode] = React.useState<ChatModeId>(() => {
    const preset = searchParams.get("mode");
    return (CHAT_MODES as readonly string[]).includes(preset ?? "")
      ? (preset as ChatModeId)
      : "chat";
  });
  const [pendingUserMessage, setPendingUserMessage] = React.useState<string | null>(null);
  const [stream, setStream] = React.useState<StreamState | null>(null);
  const [streaming, setStreaming] = React.useState(false);

  const presetProjectId = React.useRef<string | null>(searchParams.get("project"));

  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = React.useRef(true);

  // URL id changes (navigating between chats)
  React.useEffect(() => {
    if (urlId && urlId !== activeId && !streaming) {
      setActiveId(urlId);
      setPendingUserMessage(null);
      setStream(null);
      stickToBottomRef.current = true;
    }
  }, [urlId, activeId, streaming]);

  // Load the conversation's mode when opening an existing chat
  const { data, isLoading } = useConversation(activeId);
  React.useEffect(() => {
    if (data?.conversation?.mode) {
      setMode((data.conversation.mode as ChatModeId) ?? "chat");
    }
  }, [data?.conversation?.id, data?.conversation?.mode]);

  const messages = data?.messages ?? [];

  // Auto scroll
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, stream?.content, pendingUserMessage]);

  /* ---------------------------------------------------------------- */

  const changeMode = (next: ChatModeId) => {
    setMode(next);
    if (activeId && next !== data?.conversation?.mode) {
      // keep the conversation's mode in sync for the system prompt
      void api(`/conversations/${activeId}`, { method: "PATCH", json: { mode: next } }).catch(
        () => undefined
      );
    }
  };

  const runStream = (body: Record<string, unknown>, conversationId: string | null) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setStream({ conversationId: conversationId ?? "", content: "" });

    let currentConversation = conversationId;

    void streamChat(
      body as Parameters<typeof streamChat>[0],
      {
        onMeta: (meta: Extract<StreamEvent, { type: "meta" }>) => {
          currentConversation = meta.conversationId;
          setStream((s) => (s ? { ...s, conversationId: meta.conversationId } : s));

          if (!activeId) {
            // First message of a brand new chat — take ownership of the URL
            setActiveId(meta.conversationId);
            setPendingUserMessage(null);
            window.history.replaceState(null, "", `/workspace/${meta.conversationId}`);
          }
        },
        onDelta: (text) => {
          setStream((s) => (s ? { ...s, content: s.content + text } : s));
        },
        onDone: (message) => {
          setStream(null);
          setStreaming(false);
          abortRef.current = null;
          void qc.invalidateQueries({ queryKey: ["conversation", message.conversationId] });
          void qc.invalidateQueries({ queryKey: ["conversations"] });
          void qc.invalidateQueries({ queryKey: ["stats"] });
          void qc.invalidateQueries({ queryKey: ["activity"] });
        },
        onError: (message) => {
          setStream(null);
          setStreaming(false);
          abortRef.current = null;
          toast.add({ title: "Generation failed", description: message, type: "error" });
          if (currentConversation) {
            void qc.invalidateQueries({ queryKey: ["conversation", currentConversation] });
            void qc.invalidateQueries({ queryKey: ["conversations"] });
          }
        },
      },
      controller.signal
    ).finally(() => {
      // If the stream ended without done/error (e.g. aborted), clean up
      setStreaming((prev) => {
        if (prev) {
          setStream(null);
          const convId = currentConversation;
          if (convId) {
            void qc.invalidateQueries({ queryKey: ["conversation", convId] });
            void qc.invalidateQueries({ queryKey: ["conversations"] });
          }
        }
        return false;
      });
    });
  };

  const send = (content: string, attachmentIds: string[]) => {
    if (streaming) return;

    // Optimistic update: append the user message to the loaded conversation
    if (activeId && data) {
      const optimistic: MessageDto = {
        id: `optimistic-${Date.now()}`,
        conversationId: activeId,
        role: "user",
        content,
        mode,
        model: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        latencyMs: null,
        active: true,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData(["conversation", activeId], {
        ...data,
        messages: [...messages, optimistic],
      });
    } else {
      setPendingUserMessage(content);
    }

    stickToBottomRef.current = true;
    runStream(
      {
        conversationId: activeId ?? undefined,
        content,
        mode,
        attachmentIds: attachmentIds.length ? attachmentIds : undefined,
        projectId: activeId ? undefined : (presetProjectId.current ?? undefined),
        regenerate: false,
      },
      activeId
    );
  };

  const regenerate = () => {
    if (streaming || !activeId || messages.length === 0) return;

    // Optimistically drop the trailing assistant message(s)
    let cut = messages.length;
    while (cut > 0 && messages[cut - 1]!.role === "assistant") cut--;
    if (cut < messages.length && data) {
      qc.setQueryData(["conversation", activeId], {
        ...data,
        messages: messages.slice(0, cut),
      });
    }

    stickToBottomRef.current = true;
    runStream(
      { conversationId: activeId, regenerate: true, mode },
      activeId
    );
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const exportConversation = () => {
    if (!data) return;
    const lines = [`# ${data.conversation.title}`, ""];
    for (const m of messages) {
      if (m.role === "user") {
        lines.push(`## 🧑 You`, "", m.content, "");
      } else if (m.role === "assistant" && m.content) {
        lines.push(`## ✦ Studio`, "", m.content, "");
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.conversation.title.replace(/[^\w\d-]+/g, "-").slice(0, 48) || "conversation"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.add({ title: "Conversation exported", type: "success" });
  };

  /* ---------------------------------------------------------------- */

  const showEmptyState = !isLoading && messages.length === 0 && !stream && !pendingUserMessage;
  const streamingBubble: MessageDto | null =
    stream && stream.content.length >= 0
      ? {
          id: "streaming",
          conversationId: stream.conversationId,
          role: "assistant",
          content: stream.content,
          mode,
          model: null,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          latencyMs: null,
          active: true,
          createdAt: new Date().toISOString(),
        }
      : null;

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div className="flex h-full flex-col">
      {/* Conversation header */}
      {(activeId || streaming) && data?.conversation ? (
        <div className="flex h-11 shrink-0 items-center gap-2 border-b px-4">
          <span className="truncate text-sm font-medium">{data.conversation.title}</span>
          {data.conversation.projectId ? (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <FolderIcon className="size-3" />
              Project
            </Badge>
          ) : null}
          <div className="ml-auto">
            <Button variant="ghost" size="icon-sm" aria-label="Export conversation" onClick={exportConversation}>
              <DownloadIcon />
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-11 shrink-0 border-b" />
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="scrollbar min-h-0 flex-1 overflow-y-auto"
      >
        {showEmptyState ? (
          <EmptyState
            mode={mode}
            onModeChange={changeMode}
            onSuggestion={(text, suggestionMode) => {
              setMode(suggestionMode);
              send(text, []);
            }}
          />
        ) : (
          <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-6">
            {isLoading && activeId ? (
              <>
                <div className="h-16 animate-pulse rounded-2xl bg-muted/60" />
                <div className="h-32 animate-pulse rounded-2xl bg-muted/40" />
              </>
            ) : null}

            {pendingUserMessage ? (
              <MessageItem
                message={{
                  id: "pending",
                  conversationId: activeId ?? "",
                  role: "user",
                  content: pendingUserMessage,
                  mode,
                  model: null,
                  promptTokens: null,
                  completionTokens: null,
                  totalTokens: null,
                  latencyMs: null,
                  active: true,
                  createdAt: new Date().toISOString(),
                }}
              />
            ) : null}

            {messages.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                isLastAssistant={m.id === lastAssistantId && !streaming}
                onRegenerate={regenerate}
              />
            ))}

            {streamingBubble ? (
              <MessageItem message={streamingBubble} isStreaming />
            ) : streaming ? (
              <div className="flex gap-3">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
                  <MessageSquareIcon className="size-3.5 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 py-2 text-sm text-muted-foreground">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0">
        <ChatInput
          mode={mode}
          onModeChange={changeMode}
          onSend={send}
          onStop={stop}
          streaming={streaming}
        />
      </div>
    </div>
  );
}
