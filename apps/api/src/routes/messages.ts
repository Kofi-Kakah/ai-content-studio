import { Router } from "express";
import { z } from "zod";
import { db } from "../prisma/db.js";
import { ApiError } from "../lib/errors.js";
import { messageDto } from "../lib/dto.js";
import { previewOf } from "../lib/title.js";

export const messagesRouter = Router();

const updateMessageSchema = z.object({
  content: z.string().min(1).max(64_000),
});

async function getOwnedMessage(messageId: string, userId: string) {
  const message = await db.orm.public.Message.first({ id: messageId });
  if (!message) throw ApiError.notFound("Message not found");

  const conversation = await db.orm.public.Conversation.first({ id: message.conversationId });
  if (!conversation || conversation.userId !== userId) {
    throw ApiError.notFound("Message not found");
  }
  return { message, conversation };
}

/* PATCH /api/v1/messages/:id — edit content (used by the Studio editor) */
messagesRouter.patch("/:id", async (req, res) => {
  const input = updateMessageSchema.parse(req.body);
  const { message, conversation } = await getOwnedMessage(req.params.id, req.userId!);

  const updated = await db.orm.public.Message.where({ id: message.id }).update({
    content: input.content,
  });

  // Keep the conversation preview fresh if this was the latest message
  const latest = await db.orm.public.Message.where({ conversationId: conversation.id, active: true })
    .orderBy([(m) => m.createdAt.desc(), (m) => m.id.desc()])
    .first();
  if (latest && latest.id === message.id) {
    await db.orm.public.Conversation.where({ id: conversation.id }).update({
      preview: previewOf(input.content),
    });
  }

  res.json({ message: messageDto(updated ?? message) });
});

/* DELETE /api/v1/messages/:id */
messagesRouter.delete("/:id", async (req, res) => {
  const { message } = await getOwnedMessage(req.params.id, req.userId!);
  await db.orm.public.Message.where({ id: message.id }).delete();
  res.json({ ok: true });
});
