import { Router } from "express";
import { or } from "@prisma/orm-postgres/orm-client";
import { PROJECT_TYPES, createProjectSchema, updateProjectSchema, type ProjectTypeId } from "@studio/shared";
import { db } from "../prisma/db.js";
import { ApiError } from "../lib/errors.js";
import { conversationDto, logActivity, projectDto } from "../lib/dto.js";

export const projectsRouter = Router();

const PAGE_SIZE = 24;

/* GET /api/v1/projects?type=&search=&before= */
projectsRouter.get("/", async (req, res) => {
  const userId = req.userId!;
  const rawType = typeof req.query.type === "string" ? req.query.type : "all";
  const type = (PROJECT_TYPES as readonly string[]).includes(rawType)
    ? (rawType as ProjectTypeId)
    : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const limit = Math.min(Math.max(Number(req.query.limit) || PAGE_SIZE, 1), 50);
  const before = typeof req.query.before === "string" ? new Date(req.query.before) : null;

  let query = db.orm.public.Project.where({ userId });
  if (type) query = query.where({ type });
  if (search) {
    const pattern = `%${search}%`;
    query = query.where((p) => or(p.name.ilike(pattern), p.description.ilike(pattern)));
  }
  if (before && !Number.isNaN(before.getTime())) {
    query = query.where((p) => p.updatedAt.lt(before));
  }

  const rows = await query
    .include("conversations", (c) => c.count())
    .orderBy([(p) => p.updatedAt.desc(), (p) => p.id.desc()])
    .limit(limit)
    .all();

  const nextCursor =
    rows.length === limit && rows.length > 0 ? rows[rows.length - 1]!.updatedAt.toISOString() : null;

  res.json({
    projects: rows.map((p) => projectDto(p, p.conversations)),
    nextCursor,
  });
});

/* POST /api/v1/projects */
projectsRouter.post("/", async (req, res) => {
  const userId = req.userId!;
  const input = createProjectSchema.parse(req.body);

  const project = await db.orm.public.Project.create({
    userId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    type: input.type,
  });

  await logActivity(userId, "project", `Project created: ${project.name}`, undefined, {
    projectId: project.id,
    type: project.type,
  });

  res.status(201).json({ project: projectDto(project, 0) });
});

/* GET /api/v1/projects/:id — project + its conversations */
projectsRouter.get("/:id", async (req, res) => {
  const project = await db.orm.public.Project.first({ id: req.params.id });
  if (!project || project.userId !== req.userId!) throw ApiError.notFound("Project not found");

  const conversations = await db.orm.public.Conversation.where({ projectId: project.id })
    .select("id", "userId", "title", "mode", "projectId", "preview", "createdAt", "updatedAt")
    .orderBy([(c) => c.updatedAt.desc(), (c) => c.id.desc()])
    .limit(100)
    .all();

  res.json({
    project: projectDto(project, conversations.length),
    conversations: conversations.map((c) => conversationDto(c, undefined, c.preview)),
  });
});

/* PATCH /api/v1/projects/:id */
projectsRouter.patch("/:id", async (req, res) => {
  const input = updateProjectSchema.parse(req.body);

  const project = await db.orm.public.Project.first({ id: req.params.id });
  if (!project || project.userId !== req.userId!) throw ApiError.notFound("Project not found");

  const updated = await db.orm.public.Project.where({ id: project.id }).update({
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
  });

  res.json({ project: projectDto(updated ?? project) });
});

/* DELETE /api/v1/projects/:id — conversations keep existing (projectId set null) */
projectsRouter.delete("/:id", async (req, res) => {
  const project = await db.orm.public.Project.first({ id: req.params.id });
  if (!project || project.userId !== req.userId!) throw ApiError.notFound("Project not found");

  await db.orm.public.Project.where({ id: project.id }).delete();
  res.json({ ok: true });
});
