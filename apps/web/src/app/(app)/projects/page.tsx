"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import {
  PROJECT_TYPES,
  PROJECT_TYPE_DEFS,
  type ProjectDto,
  type ProjectTypeId,
} from "@studio/shared";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModeIcon } from "@/components/mode-icon";
import { toast } from "@/components/ui/toast";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDeleteProject, useProjects } from "@/lib/queries";
import { timeAgo } from "@/components/layout/notifications";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";

export default function ProjectsPage() {
  const [type, setType] = React.useState<"all" | ProjectTypeId>("all");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProjectDto | null>(null);
  const [deleting, setDeleting] = React.useState<ProjectDto | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useProjects(
    debouncedSearch,
    type
  );

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const projects = data?.pages.flatMap((p) => p.projects) ?? [];

  return (
    <div className="scrollbar h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Organize your content by type — scripts, posts, campaigns.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            New project
          </Button>
        </div>

        {/* Tabs + search */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={type}
            onValueChange={(v) => setType(v as "all" | ProjectTypeId)}
          >
            <TabsList className="flex-wrap">
              <TabsTrigger value="all">All</TabsTrigger>
              {PROJECT_TYPES.map((id) => (
                <TabsTrigger key={id} value={id}>
                  {PROJECT_TYPE_DEFS[id].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="pl-8"
            />
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <FolderIcon className="size-8 text-muted-foreground/50" />
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch ? "Nothing matches your search." : "Create one to get organized."}
              </p>
            </div>
            {!debouncedSearch ? (
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                <PlusIcon />
                New project
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={() => setEditing(p)}
                onDelete={() => setDeleting(p)}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} />
        {isFetchingNextPage ? (
          <div className="flex justify-center py-6">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProjectFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        project={editing ?? undefined}
      />
      <DeleteProjectDialog
        project={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: ProjectDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const def = PROJECT_TYPE_DEFS[project.type];
  return (
    <div className="group/card relative flex flex-col rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
      <Link href={`/projects/${project.id}`} className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              def.badgeClass
            )}
          >
            <ModeIcon name={def.icon} className="size-4.5" />
          </span>
          <Badge variant="secondary" className={cn("shrink-0", def.badgeClass)}>
            {def.label}
          </Badge>
        </div>
        <h3 className="truncate font-medium">{project.name}</h3>
        <p className="line-clamp-2 min-h-8 text-[13px] text-muted-foreground">
          {project.description || def.description}
        </p>
      </Link>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-xs text-muted-foreground">
          {project.conversationCount ?? 0} chat{(project.conversationCount ?? 0) === 1 ? "" : "s"} ·{" "}
          {timeAgo(project.updatedAt)}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/card:opacity-100">
          <Button variant="ghost" size="icon-xs" aria-label="Edit project" onClick={onEdit}>
            <PencilIcon />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Delete project" onClick={onDelete}>
            <Trash2Icon className="text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteProjectDialog({
  project,
  onClose,
}: {
  project: ProjectDto | null;
  onClose: () => void;
}) {
  const del = useDeleteProject();
  const [busy, setBusy] = React.useState(false);

  const onConfirm = async () => {
    if (!project) return;
    setBusy(true);
    try {
      await del.mutateAsync(project.id);
      toast.add({ title: "Project deleted", description: "Its chats were kept.", type: "success" });
      onClose();
    } catch (err) {
      toast.add({ title: "Delete failed", description: (err as Error).message, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete “{project?.name}”?</DialogTitle>
          <DialogDescription>
            The project will be removed. Conversations inside it are kept and become unassigned.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={busy}>
            {busy ? <Loader2Icon className="animate-spin" /> : null}
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
