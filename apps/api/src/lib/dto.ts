import type {
  ActivityDto,
  AttachmentDto,
  ConversationDto,
  FileRecordDto,
  MessageDto,
  ProjectDto,
  UserDto,
} from "@studio/shared";
import type { Contract } from "../prisma/contract.d.js";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { db } from "../prisma/db.js";

type UserRow = ResultType<typeof db.orm.public.User>;
type ProjectRow = ResultType<typeof db.orm.public.Project>;
type ConversationRow = ResultType<typeof db.orm.public.Conversation>;
type MessageRow = ResultType<typeof db.orm.public.Message>;
type ActivityRow = ResultType<typeof db.orm.public.Activity>;
type FileRow = ResultType<typeof db.orm.public.FileRecord>;

export type { UserRow, ProjectRow, ConversationRow, MessageRow, ActivityRow, FileRow };

export function userDto(u: UserRow): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    bio: u.bio,
    createdAt: u.createdAt.toISOString(),
  };
}

export function projectDto(p: ProjectRow, conversationCount?: number): ProjectDto {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    type: p.type as ProjectDto["type"],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    conversationCount,
  };
}

export function conversationDto(c: ConversationRow, messageCount?: number, preview?: string | null): ConversationDto {
  return {
    id: c.id,
    title: c.title,
    mode: c.mode as ConversationDto["mode"],
    projectId: c.projectId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    messageCount,
    preview: preview ?? null,
  };
}

export function messageDto(m: MessageRow, attachments?: AttachmentDto[]): MessageDto {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role as MessageDto["role"],
    content: m.content,
    mode: (m.mode as MessageDto["mode"]) ?? null,
    model: m.model,
    promptTokens: m.promptTokens,
    completionTokens: m.completionTokens,
    totalTokens: m.totalTokens,
    latencyMs: m.latencyMs,
    active: m.active,
    createdAt: m.createdAt.toISOString(),
    attachments,
  };
}

export function activityDto(a: ActivityRow): ActivityDto {
  return {
    id: a.id,
    type: a.type,
    title: a.title,
    description: a.description,
    metadata: a.metadata ? (JSON.parse(a.metadata) as Record<string, unknown>) : null,
    read: a.read,
    createdAt: a.createdAt.toISOString(),
  };
}

export function fileDto(f: FileRow): FileRecordDto {
  return {
    id: f.id,
    name: f.name,
    url: f.url,
    mime: f.mime,
    size: f.size,
    createdAt: f.createdAt.toISOString(),
  };
}

/** Records an activity entry (never throws — activity logging is best-effort). */
export async function logActivity(
  userId: string,
  type: string,
  title: string,
  description?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await db.orm.public.Activity.create({
      userId,
      type,
      title,
      description: description ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (err) {
    console.error("[api] failed to log activity:", err);
  }
}
