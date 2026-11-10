"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  Loader2Icon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { PROJECT_TYPE_DEFS, PROJECT_TYPE_DEFAULT_MODE } from "@studio/shared";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeIcon } from "@/components/mode-icon";
import { toast } from "@/components/ui/toast";
import { useDeleteProject, useMoveConversation, useProject } from "@/lib/queries";
import { timeAgo } from "@/components/layout/notifications";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data, isLoading } = useProject(id);
  const [editOpen, setEditOpen] = React.useState(false);

  const project = data?.project;
  const def = project ? PROJECT_TYPE_DEFS[project.type] : null;

  if (isLoading) {
    return (
      <div className="scrollbar h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-4 h-24 w-full rounded-xl" />
          <div className="mt-6 grid gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <p>Project not found.</p>
        <Button variant="outline" size="sm" render={<Link href="/projects" />}>
          <ArrowLeftIcon />
          Back to projects
        </Button>
      </div>
    );
  }

  return (
    <div className="scrollbar h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-1 text-muted-foreground"
          render={<Link href="/projects" />}
        >
          <ArrowLeftIcon />
          Projects
        </Button>

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {def ? (
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl",
                  def.badgeClass
                )}
              >
                <ModeIcon name={def.icon} className="size-5" />
              </span>
            ) : null}
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {def ? <Badge variant="secondary" className={def.badgeClass}>{def.label}</Badge> : null}
                <span className="text-sm text-muted-foreground">
                  {data?.conversations.length ?? 0} conversation
                  {(data?.conversations.length ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
              {project.description ? (
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  {project.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              render={
                <Link
                  href={`/workspace?project=${project.id}&mode=${PROJECT_TYPE_DEFAULT_MODE[project.type]}`}
                />
              }
            >
              <PlusIcon />
              New chat
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Project options" />}>
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <PencilIcon />
                  Edit project
                </DropdownMenuItem>
                <DeleteProjectButton projectId={project.id} projectName={project.name} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Conversations */}
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Conversations</h2>
        <div className="grid gap-2">
          {(data?.conversations ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
              <MessageSquareIcon className="size-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No chats in this project yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={`/workspace?project=${project.id}&mode=${PROJECT_TYPE_DEFAULT_MODE[project.type]}`}
                  />
                }
              >
                <PlusIcon />
                Start the first one
              </Button>
            </div>
          ) : (
            (data?.conversations ?? []).map((c) => (
              <ConversationRow key={c.id} conversationId={c.id} projectId={project.id} />
            ))
          )}
        </div>
      </div>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
      />
    </div>
  );
}

function ConversationRow({
  conversationId,
  projectId,
}: {
  conversationId: string;
  projectId: string;
}) {
  // Reuse the conversations list cache for individual rows
  const { data } = useProject(projectId);
  const conversation = data?.conversations.find((c) => c.id === conversationId);
  const move = useMoveConversation();
  const router = useRouter();

  if (!conversation) return null;

  return (
    <div className="group/row flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-shadow hover:shadow-sm">
      <Link
        href={`/workspace/${conversation.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{conversation.title}</span>
          {conversation.preview ? (
            <span className="block truncate text-xs text-muted-foreground">
              {conversation.preview}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {timeAgo(conversation.updatedAt)}
        </span>
      </Link>

      <Button
        variant="ghost"
        size="icon-xs"
        className="opacity-0 transition-opacity group-hover/row:opacity-100"
        aria-label="Remove from project"
        onClick={() => {
          move.mutate(
            { id: conversation.id, projectId: null },
            {
              onSuccess: () =>
                toast.add({ title: "Removed from project", type: "success" }),
            }
          );
        }}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}

function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const del = useDeleteProject();
  const router = useRouter();

  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={() => {
        del.mutate(projectId, {
          onSuccess: () => {
            toast.add({ title: "Project deleted", type: "success" });
            router.push("/projects");
          },
        });
      }}
    >
      <Trash2Icon />
      Delete project
    </DropdownMenuItem>
  );
}
