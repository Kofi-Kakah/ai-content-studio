"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronDownIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useSessionUser } from "@/lib/queries";

export function UserMenu() {
  const router = useRouter();
  const { data, isLoading } = useSessionUser();
  const user = data?.user;

  const name = user?.name ?? user?.email ?? "Account";
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-1 border-t p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="h-auto w-full justify-start gap-2 p-1.5" />
          }
        >
          <Avatar className="size-7">
            {user?.image ? <AvatarImage src={user.image} alt={name} /> : null}
            <AvatarFallback className="text-[10px]">{initials || "?"}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col items-start gap-0">
            <span className="w-full truncate text-left text-[13px] font-medium leading-tight">
              {isLoading ? "…" : name}
            </span>
            {user?.email ? (
              <span className="w-full truncate text-left text-[11px] leading-tight text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </span>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel className="truncate">{user?.email ?? "Account"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <SettingsIcon />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => void signOut({ callbackUrl: "/" })}
          >
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeToggle />
    </div>
  );
}
