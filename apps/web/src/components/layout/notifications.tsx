"use client";

import * as React from "react";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useActivity, useMarkActivityRead } from "@/lib/queries";
import { cn } from "cn";

export function NotificationsBell() {
  const { data, isLoading } = useActivity();
  const markRead = useMarkActivityRead();

  const unread = data?.unread ?? 0;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" />
        }
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                markRead.mutate(undefined, {
                  onSuccess: () => toast.add({ title: "All caught up", type: "success" }),
                })
              }
            >
              <CheckCheckIcon />
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="max-h-80 overflow-y-auto p-1">
          {isLoading ? (
            <div className="grid gap-2 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (data?.activities ?? []).length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nothing here yet. Generate something! ✨
            </p>
          ) : (
            (data?.activities ?? []).map((a) => (
              <div
                key={a.id}
                className={cn(
                  "flex gap-2.5 rounded-lg px-2.5 py-2",
                  !a.read && "bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    a.type === "generation"
                      ? "bg-emerald-500"
                      : a.type === "project"
                        ? "bg-blue-500"
                        : "bg-muted-foreground/40"
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{a.title}</p>
                  {a.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {timeAgo(a.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
