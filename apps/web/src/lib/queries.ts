"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type {
  ActivityDto,
  ConversationDto,
  FileRecordDto,
  MessageDto,
  ProjectDto,
  ProjectTypeId,
  StatsOverview,
  StatsUsage,
  UserDto,
} from "@studio/shared";
import { api } from "./api";

/* ------------------------------------------------------------------ */
/* Query keys                                                          */
/* ------------------------------------------------------------------ */

export const qk = {
  conversations: (search: string) => ["conversations", search] as const,
  conversation: (id: string) => ["conversation", id] as const,
  projects: (search: string, type: string) => ["projects", search, type] as const,
  project: (id: string) => ["project", id] as const,
  statsOverview: ["stats", "overview"] as const,
  statsUsage: (days: number) => ["stats", "usage", days] as const,
  activity: ["activity"] as const,
  uploads: ["uploads"] as const,
  sessionUser: ["session", "user"] as const,
};

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

interface ConversationsPage {
  conversations: ConversationDto[];
  nextCursor: string | null;
}

export function useConversations(search = "") {
  return useInfiniteQuery({
    queryKey: qk.conversations(search),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (pageParam) params.set("before", pageParam);
      return api<ConversationsPage>(`/conversations?${params.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: qk.conversation(id ?? "none"),
    queryFn: () =>
      api<{ conversation: ConversationDto; messages: MessageDto[] }>(`/conversations/${id}`),
    enabled: Boolean(id),
  });
}

export interface MessageDetail {
  message: MessageDto;
  conversation: Pick<ConversationDto, "id" | "title" | "mode" | "projectId">;
}

export function useMessage(id: string | null) {
  return useQuery({
    queryKey: ["message", id ?? "none"],
    queryFn: () => api<MessageDetail>(`/messages/${id}`),
    enabled: Boolean(id),
  });
}

export function useRenameConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api<{ conversation: ConversationDto }>(`/conversations/${id}`, {
        method: "PATCH",
        json: { title },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMoveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string | null }) =>
      api<{ conversation: ConversationDto }>(`/conversations/${id}`, {
        method: "PATCH",
        json: { projectId },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ ok: boolean }>(`/conversations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

interface ProjectsPage {
  projects: ProjectDto[];
  nextCursor: string | null;
}

export function useProjects(search = "", type: string = "all") {
  return useInfiniteQuery({
    queryKey: qk.projects(search, type),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("type", type);
      if (search) params.set("search", search);
      if (pageParam) params.set("before", pageParam);
      return api<ProjectsPage>(`/projects?${params.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: qk.project(id ?? "none"),
    queryFn: () =>
      api<{ project: ProjectDto; conversations: ConversationDto[] }>(`/projects/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null; type: ProjectTypeId }) =>
      api<{ project: ProjectDto }>("/projects", { method: "POST", json: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      name?: string;
      description?: string | null;
      type?: ProjectTypeId;
    }) => api<{ project: ProjectDto }>(`/projects/${id}`, { method: "PATCH", json: input }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: qk.project(vars.id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Stats & activity                                                    */
/* ------------------------------------------------------------------ */

export function useStatsOverview() {
  return useQuery({
    queryKey: qk.statsOverview,
    queryFn: () => api<StatsOverview>("/stats/overview"),
  });
}

export function useStatsUsage(days = 30) {
  return useQuery({
    queryKey: qk.statsUsage(days),
    queryFn: () => api<StatsUsage>(`/stats/usage?days=${days}`),
  });
}

export function useActivity() {
  return useQuery({
    queryKey: qk.activity,
    queryFn: () => api<{ activities: ActivityDto[]; unread: number }>("/activity?limit=15"),
    refetchInterval: 60_000,
  });
}

export function useMarkActivityRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: boolean }>("/activity/read-all", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.activity });
    },
  });
}

/* ------------------------------------------------------------------ */
/* User / profile                                                      */
/* ------------------------------------------------------------------ */

export function useSessionUser() {
  return useQuery({
    queryKey: qk.sessionUser,
    queryFn: () => api<{ user: UserDto }>("/auth/me"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string | null; bio?: string | null; image?: string | null }) =>
      api<{ user: UserDto }>("/users/me", { method: "PATCH", json: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.sessionUser });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api<{ ok: boolean }>("/users/me/password", { method: "POST", json: input }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => api<{ ok: boolean }>("/users/me", { method: "DELETE" }),
  });
}

/* ------------------------------------------------------------------ */
/* Messages (editor)                                                   */
/* ------------------------------------------------------------------ */

export function useUpdateMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api<{ message: MessageDto }>(`/messages/${id}`, { method: "PATCH", json: { content } }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["conversation", data.message.conversationId] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

export function useUploads() {
  return useQuery({
    queryKey: qk.uploads,
    queryFn: () => api<{ files: FileRecordDto[] }>("/uploads"),
  });
}
