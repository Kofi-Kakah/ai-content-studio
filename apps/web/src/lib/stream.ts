"use client";

import type { ChatRequest, MessageDto, StreamEvent } from "@studio/shared";

export interface StreamHandlers {
  onMeta?: (meta: Extract<StreamEvent, { type: "meta" }>) => void;
  onDelta?: (text: string) => void;
  onDone?: (message: MessageDto) => void;
  onError?: (message: string) => void;
}

/**
 * POSTs to the AI chat endpoint and consumes its SSE stream.
 * The BFF proxy pipes the response through untouched.
 */
export async function streamChat(
  body: ChatRequest,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/v1/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    handlers.onError?.("Could not reach the AI service — check your connection.");
    return;
  }

  if (!res.ok || !res.body) {
    let message = `Generation failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: { message?: string } };
      if (data?.error?.message) message = data.error.message;
    } catch {
      /* ignore */
    }
    handlers.onError?.(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (raw: string) => {
    for (const line of raw.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6)) as StreamEvent;
        switch (event.type) {
          case "meta":
            handlers.onMeta?.(event);
            break;
          case "delta":
            handlers.onDelta?.(event.text);
            break;
          case "done":
            handlers.onDone?.(event.message);
            break;
          case "error":
            handlers.onError?.(event.message);
            break;
        }
      } catch {
        /* malformed event — ignore */
      }
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        dispatch(raw);
      }
    }
    if (buffer.trim()) dispatch(buffer);
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      handlers.onError?.("The stream was interrupted.");
    }
  }
}
