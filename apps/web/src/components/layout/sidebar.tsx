"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3Icon,
  FilePenIcon,
  FolderIcon,
  MessageSquarePlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PencilRulerIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  FolderInputIcon,
  Loader2Icon,
  SquarePen,
} from "lucide-react";
import { getMode } from "@studio/shared";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ModeIcon } from "@/components/mode-icon";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useConversations,
  useDeleteConversation,
  useMoveConversation,
  useProjects,
  useRenameConversation,
} from "@/lib/queries";

const NAV = [
  { href: "/workspace", label: "Workspace", icon: SparklesIcon, shortcut: "⌘⇧O" },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3Icon },
  { href: "/editor", label: "Editor", icon: FilePenIcon },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Link
          href="/workspace"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-1 py-1 font-semibold"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <SparklesIcon className="size-3.5" />
          </span>
          <span className="text-[15px]">Studio</span>
        </Link>
      </div>

      <div className="px-3 pb-2">
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          render={<Link href="/workspace" onClick={onNavigate} />}
        >
          <SquarePen />
          New chat
        </Button>
      </div>

      <nav className="grid gap-0.5 px-3 pb-3">
        {NAV.map((item) => (
          <NavItem key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <ConversationList onNavigate={onNavigate} />
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  shortcut,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      data-active={active}
      className={cn(
        "flex h-8 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-muted font-medium text-foreground"
      )}
    >
      <Icon className="size-4" />
      {label}
      {shortcut ? (
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">{shortcut}</span>
      ) : null}
    </Link>
  );
}

function ConversationList({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConversations(debouncedSearch);

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // Infinite scroll
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const conversations = data?.pages.flatMap((p) => p.conversations) ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative px-3 pb-2">
        <SearchIcon className="pointer-events-none absolute left-5.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats…"
          className="h-8 pl-7 text-[13px]"
        />
      </div>

      <div className="scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {debouncedSearch ? "Results" : "Recent"}
        </p>

        {isLoading ? (
          <div className="grid gap-1 px-1 pt-1">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 pt-2 text-xs text-muted-foreground">
            {debouncedSearch ? "No chats match your search." : "No conversations yet — start one!"}
          </p>
        ) : (
          <div className="grid gap-0.5">
            {conversations.map((c) => {
              const active = pathname === `/workspace/${c.id}`;
              return (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  active={active}
                  onNavigate={onNavigate}
                  onDeleted={() => {
                    if (active) router.push("/workspace");
                  }}
                />
              );
            })}
            <div ref={sentinelRef} />
            {isFetchingNextPage ? (
              <div className="flex justify-center py-2">
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onNavigate,
  onDeleted,
}: {
  conversation: { id: string; title: string; mode: string; preview?: string | null };
  active: boolean;
  onNavigate?: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const rename = useRenameConversation();
  const move = useMoveConversation();
  const del = useDeleteConversation();
  const { data: projectsData } = useProjects("", "all");

  const [renameOpen, setRenameOpen] = React.useState(false);
  const [title, setTitle] = React.useState(conversation.title);

  const mode = getMode(conversation.mode);

  const doDelete = async () => {
    await del.mutateAsync(conversation.id);
    onDeleted?.();
  };

  return (
    <div
      className={cn(
        "group/conv relative flex items-center rounded-lg transition-colors",
        active ? "bg-muted" : "hover:bg-muted/60"
      )}
    >
      <Link
        href={`/workspace/${conversation.id}`}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 pl-2"
        title={conversation.title}
      >
        <ModeIcon name={mode.icon} className="size-3.5 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "truncate text-[13px] text-muted-foreground",
            active && "font-medium text-foreground"
          )}
        >
          {conversation.title}
        </span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(
                "mr-0.5 opacity-0 transition-opacity group-hover/conv:opacity-100",
                active && "opacity-70"
              )}
            />
          }
        >
          <MoreHorizontalIcon />
          <span className="sr-only">Conversation options</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => { setTitle(conversation.title); setRenameOpen(true); }}>
            <PencilIcon />
            Rename
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="flex items-center gap-1.5">
            <FolderInputIcon className="size-3.5" />
            Move to project
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => move.mutate({ id: conversation.id, projectId: null })}
          >
            <span className="pl-3.5 text-muted-foreground">No project</span>
          </DropdownMenuItem>
          {(projectsData?.pages[0]?.projects ?? []).map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => move.mutate({ id: conversation.id, projectId: p.id })}
            >
              <span className="pl-3.5 truncate">{p.name}</span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => void doDelete()}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="conv-title">Title</Label>
            <Input
              id="conv-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) {
                  rename.mutate({ id: conversation.id, title: title.trim() });
                  setRenameOpen(false);
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || rename.isPending}
              onClick={() => {
                rename.mutate({ id: conversation.id, title: title.trim() });
                setRenameOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
