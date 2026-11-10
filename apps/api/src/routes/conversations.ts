import { Router } from "express";
import { z } from "zod";
import { or } from "@prisma/orm-postgres/orm-client";
import { CHAT_MODES, updateConversationSchema } from "@studio/shared";
import { db } from "../prisma/db.js";
import { ApiError } from "../lib/errors.js";
import { conversationDto, messageDto } from "../lib/dto.js";

export const conversationsRouter = Router();

const PAGE_SIZE = 25;

/* GET /api/v1/conversations?search=&limit=&before=<ISO>&projectId= */
conversationsRouter.get("/", async (req, res) => {
  const userId = req.userId!;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  const limit = Math.min(Math.max(Number(req.query.limit) || PAGE_SIZE, 1), 50);
  const before = typeof req.query.before === "string" ? new Date(req.query.before) : null;

  let query = db.orm.public.Conversation.where({ userId });

  if (projectId) {
    query = query.where({ projectId });
  }
  if (search) {
    const pattern = `%${search}%`;
    query = query.where((c) => or(c.title.ilike(pattern), c.preview.ilike(pattern)));
  }
  if (before && !Number.isNaN(before.getTime())) {
    query = query.where((c) => c.updatedAt.lt(before));
  }

  const rows = await query
    .select("id", "userId", "title", "mode", "projectId", "preview", "createdAt", "updatedAt")
    .orderBy([(c) => c.updatedAt.desc(), (c) => c.id.desc()])
    .limit(limit)
    .all();

  const nextCursor =
    rows.length === limit && rows.length > 0
      ? rows[rows.length - 1]!.updatedAt.toISOString()
      : null;

  res.json({
    conversations: rows.map((c) => conversationDto(c, undefined, c.preview)),
    nextCursor,
  });
});

/* POST /api/v1/conversations — create an empty conversation */
conversationsRouter.post("/", async (req, res) => {
  const userId = req.userId!;
  const input = z
    .object({
      title: z.string().min(1).max(120).optional(),
      mode: z.enum(CHAT_MODES).default("chat"),
      projectId: z.string().nullable().optional(),
    })
    .parse(req.body ?? {});

  let projectId: string | null = input.projectId ?? null;
  if (projectId) {
    const project = await db.orm.public.Project.first({ id: projectId });
    if (!project || project.userId !== userId) throw ApiError.notFound("Project not found");
  }

  const conversation = await db.orm.public.Conversation.create({
    userId,
    title: input.title?.trim() || "New chat",
    mode: input.mode,
    projectId,
  });

  res.status(201).json({ conversation: conversationDto(conversation, 0, null) });
});

/* GET /api/v1/conversations/:id — conversation with its messages */
conversationsRouter.get("/:id", async (req, res) => {
  const conversation = await db.orm.public.Conversation.first({ id: req.params.id });
  if (!conversation || conversation.userId !== req.userId!) {
    throw ApiError.notFound("Conversation not found");
  }

  const messages = await db.orm.public.Message.where({
    conversationId: conversation.id,
    active: true,
  })
    .orderBy([(m) => m.createdAt.asc(), (m) => m.id.asc()])
    .all();

  res.json({
    conversation: conversationDto(conversation, messages.length, conversation.preview),
    messages: messages.map((m) => messageDto(m)),
  });
});

/* PATCH /api/v1/conversations/:id — rename / move / change mode */
conversationsRouter.patch("/:id", async (req, res) => {
  const input = updateConversationSchema.parse(req.body);

  const conversation = await db.orm.public.Conversation.first({ id: req.params.id });
  if (!conversation || conversation.userId !== req.userId!) {
    throw ApiError.notFound("Conversation not found");
  }

  if (input.projectId) {
    const project = await db.orm.public.Project.first({ id: input.projectId });
    if (!project || project.userId !== req.userId!) throw ApiError.notFound("Project not found");
  }

  const updated = await db.orm.public.Conversation.where({ id: conversation.id }).update({
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    ...(input.mode !== undefined ? { mode: input.mode } : {}),
  });

  res.json({ conversation: conversationDto(updated ?? conversation) });
});

/* DELETE /api/v1/conversations/:id */
conversationsRouter.delete("/:id", async (req, res) => {
  const conversation = await db.orm.public.Conversation.first({ id: req.params.id });
  if (!conversation || conversation.userId !== req.userId!) {
    throw ApiError.notFound("Conversation not found");
  }
  await db.orm.public.Conversation.where({ id: conversation.id }).delete();
  res.json({ ok: true });
});
