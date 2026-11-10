import { Router, type Response } from "express";
import { chatRequestSchema, getMode, type ChatModeId, type StreamEvent } from "@studio/shared";
import { db } from "../prisma/db.js";
import { ApiError } from "../lib/errors.js";
import { logActivity, messageDto } from "../lib/dto.js";
import { streamChatCompletion, type AiMessage } from "../lib/nvidia.js";
import { recordUsage } from "../lib/usage.js";
import { deriveTitle, previewOf } from "../lib/title.js";
import { rateLimit } from "../lib/rate-limit.js";
import { aiEnabled } from "../env.js";

export const aiRouter = Router();

const HISTORY_LIMIT = 24;
const MAX_MESSAGE_CHARS = 12_000;

aiRouter.post(
  "/chat",
  rateLimit({ name: "ai:chat", limit: 40, windowSeconds: 300 }),
  async (req, res) => {
    const input = chatRequestSchema.parse(req.body);
    const userId = req.userId!;

    /* ---------------------------------------------------------- *
     * 1. Load or create the conversation                         *
     * ---------------------------------------------------------- */
    let conversation = input.conversationId
      ? await db.orm.public.Conversation.first({ id: input.conversationId })
      : null;

    if (conversation && conversation.userId !== userId) {
      throw ApiError.forbidden("This conversation belongs to another account");
    }

    if (input.projectId) {
      const project = await db.orm.public.Project.first({ id: input.projectId });
      if (!project || project.userId !== userId) {
        throw ApiError.notFound("Project not found");
      }
    }

    const isNewConversation = !conversation;

    /* ---------------------------------------------------------- *
     * 2. Build the message history                               *
     * ---------------------------------------------------------- */
    let userMessageId: string | null = null;
    let prompt = input.content?.trim() ?? "";

    if (conversation && input.regenerate) {
      // Regenerating: reuse the last user message, retire current answer(s)
      const messages = await db.orm.public.Message.where({ conversationId: conversation.id })
        .orderBy([(m) => m.createdAt.desc(), (m) => m.id.desc()])
        .limit(200)
        .all();

      const lastUserIdx = messages.findIndex((m) => m.role === "user");
      if (lastUserIdx === -1) throw ApiError.badRequest("Nothing to regenerate yet");

      const toRetire = messages
        .slice(0, lastUserIdx)
        .filter((m) => m.role === "assistant" && m.active);
      for (const m of toRetire) {
        await db.orm.public.Message.where({ id: m.id }).update({ active: false });
      }
      prompt = messages[lastUserIdx].content;
    } else {
      if (!prompt) throw ApiError.badRequest("Message content is required");
    }

    if (!conversation) {
      conversation = await db.orm.public.Conversation.create({
        userId,
        projectId: input.projectId ?? null,
        title: deriveTitle(prompt || "New chat"),
        mode: input.mode,
        preview: previewOf(prompt),
      });
      await recordUsage(userId, { conversations: 1 });
    }

    if (!input.regenerate && prompt) {
      // Attach file context (text-ish uploads get inlined into the prompt)
      let contextBlock = "";
      if (input.attachmentIds?.length) {
        const files = await db.orm.public.FileRecord.where((f) => f.id.in(input.attachmentIds!)).all();
        const owned = files.filter((f) => f.userId === userId);
        const textFiles = owned.filter((f) => f.textContent);
        if (textFiles.length) {
          contextBlock =
            "\n\n---\nAttached files:\n" +
            textFiles.map((f) => `### ${f.name}\n${f.textContent}`).join("\n\n");
        }
      }

      const created = await db.orm.public.Message.create({
        conversationId: conversation.id,
        userId,
        role: "user",
        content: prompt,
        mode: input.mode,
      });
      userMessageId = created.id;

      const fullPrompt = contextBlock ? prompt + contextBlock : prompt;
      if (fullPrompt !== prompt) {
        await db.orm.public.Message.where({ id: created.id }).update({ content: fullPrompt });
      }
      prompt = fullPrompt;
    }

    const historyRows = await db.orm.public.Message.where({
      conversationId: conversation.id,
      active: true,
    })
      .orderBy([(m) => m.createdAt.asc(), (m) => m.id.asc()])
      .all();

    const history: AiMessage[] = historyRows.slice(-HISTORY_LIMIT).map((m) => ({
      role: m.role as AiMessage["role"],
      content: m.content.slice(0, MAX_MESSAGE_CHARS),
    }));

    const mode = getMode(conversation.mode);
    const messages: AiMessage[] = [
      { role: "system", content: mode.systemPrompt },
      ...history,
    ];

    // Pre-create the assistant message so the UI has a stable id
    const assistantMessage = await db.orm.public.Message.create({
      conversationId: conversation.id,
      userId,
      role: "assistant",
      content: "",
      mode: conversation.mode,
      model: null,
    });

    /* ---------------------------------------------------------- *
     * 3. Stream the response                                     *
     * ---------------------------------------------------------- */
    startSse(res);

    const send = (event: StreamEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    send({
      type: "meta",
      conversationId: conversation.id,
      userMessageId,
      assistantMessageId: assistantMessage.id,
      title: conversation.title,
      mode: conversation.mode as ChatModeId,
    });

    const startedAt = Date.now();
    const state: { result?: import("../lib/nvidia.js").StreamResult } = {};
    let streamed = ""; // accumulated text, used to save partials on disconnect

    const abort = new AbortController();
    req.on("close", () => abort.abort());

    try {
      for await (const chunk of streamChatCompletion(
        messages,
        (r) => {
          state.result = r;
        },
        { signal: abort.signal }
      )) {
        streamed += chunk.text;
        send(chunk);
      }

      const final = state.result;
      if (!final) throw new Error("Stream ended without a result");

      const saved = await db.orm.public.Message.where({ id: assistantMessage.id }).update({
        content: final.text,
        model: final.model,
        promptTokens: final.usage.promptTokens,
        completionTokens: final.usage.completionTokens,
        totalTokens: final.usage.totalTokens,
        latencyMs: Date.now() - startedAt,
      });

      await db.orm.public.Conversation.where({ id: conversation.id }).update({
        updatedAt: new Date(),
        preview: previewOf(final.text),
        ...(isNewConversation ? { title: deriveTitle(prompt) } : {}),
      });

      await recordUsage(userId, {
        requests: 1,
        generations: 1,
        promptTokens: final.usage.promptTokens,
        completionTokens: final.usage.completionTokens,
      });

      await logActivity(
        userId,
        "generation",
        mode.label === "Ask anything" ? "New chat started" : `Generated: ${mode.label}`,
        previewOf(final.text, 80),
        { conversationId: conversation.id, mode: conversation.mode }
      );

      send({ type: "done", message: messageDto(saved ?? assistantMessage) });
    } catch (err) {
      const aborted = abort.signal.aborted;
      console.error(`[ai] generation ${aborted ? "aborted" : "failed"}:`, (err as Error).message);

      if (aborted && streamed.trim().length > 0) {
        // Client disconnected mid-stream — keep the partial answer
        await db.orm.public.Message.where({ id: assistantMessage.id }).update({
          content: streamed,
          latencyMs: Date.now() - startedAt,
        });
        await db.orm.public.Conversation.where({ id: conversation.id }).update({
          preview: previewOf(streamed),
        });
      } else {
        try {
          send({
            type: "error",
            message: aiEnabled
              ? "The AI provider failed to respond. Please try again."
              : "Generation failed.",
          });
        } catch {
          /* socket already closed */
        }
        // Clean up the empty assistant row
        await db.orm.public.Message.where({ id: assistantMessage.id }).delete();
      }
    } finally {
      res.end();
    }
  }
);

function startSse(res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
}
