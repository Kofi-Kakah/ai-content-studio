"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BarChart3Icon,
  FilePenIcon,
  FolderIcon,
  LaptopIcon,
  MessageSquareIcon,
  MoonIcon,
  SettingsIcon,
  SparklesIcon,
  SunIcon,
} from "lucide-react";
import { AI_MODES, CHAT_MODES } from "@studio/shared";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ModeIcon } from "@/components/mode-icon";
import { useUiStore } from "@/stores/ui-store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useConversations, useProjects } from "@/lib/queries";

export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);

  const [query, setQuery] = React.useState("");
  const debounced = useDebouncedValue(query, 250);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const { data: conversations } = useConversations(open ? debounced : "");
  const { data: projects } = useProjects(open ? debounced : "", "all");

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const matchedConversations = (conversations?.pages[0]?.conversations ?? []).slice(0, 6);
  const matchedProjects = (projects?.pages[0]?.projects ?? []).slice(0, 4);

  return (
    <div
      className={
        open
          ? "fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]"
          : "pointer-events-none absolute -left-[9999px]"
      }
    >
      {/* Overlay */}
      {open ? (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in-0"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {open ? (
        <div className="relative z-10 w-full max-w-lg animate-in fade-in-0 zoom-in-95">
          <Command
            className="overflow-hidden rounded-xl border bg-popover shadow-lg"
            shouldFilter={!debounced}
            loop
          >
            <CommandInput
              placeholder="Type a command or search…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>No results for “{query}”.</CommandEmpty>

              {debounced ? (
                <>
                  {matchedConversations.length > 0 ? (
                    <CommandGroup heading="Chats">
                      {matchedConversations.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`chat ${c.title}`}
                          onSelect={() => run(() => router.push(`/workspace/${c.id}`))}
                        >
                          <MessageSquareIcon />
                          <span className="truncate">{c.title}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}

                  {matchedProjects.length > 0 ? (
                    <CommandGroup heading="Projects">
                      {matchedProjects.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`project ${p.name}`}
                          onSelect={() => run(() => router.push(`/projects/${p.id}`))}
                        >
                          <FolderIcon />
                          <span className="truncate">{p.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}

                  <CommandSeparator />
                </>
              ) : null}

              <CommandGroup heading="Generate">
                {CHAT_MODES.map((id) => {
                  const mode = AI_MODES[id];
                  return (
                    <CommandItem
                      key={id}
                      value={`generate ${mode.label}`}
                      onSelect={() =>
                        run(() => router.push(`/workspace?mode=${id}`))
                      }
                    >
                      <ModeIcon name={mode.icon} />
                      {mode.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Navigate">
                <CommandItem value="workspace" onSelect={() => run(() => router.push("/workspace"))}>
                  <SparklesIcon />
                  Workspace
                </CommandItem>
                <CommandItem value="projects" onSelect={() => run(() => router.push("/projects"))}>
                  <FolderIcon />
                  Projects
                </CommandItem>
                <CommandItem value="dashboard" onSelect={() => run(() => router.push("/dashboard"))}>
                  <BarChart3Icon />
                  Dashboard
                </CommandItem>
                <CommandItem value="editor" onSelect={() => run(() => router.push("/editor"))}>
                  <FilePenIcon />
                  Editor
                </CommandItem>
                <CommandItem value="settings" onSelect={() => run(() => router.push("/settings"))}>
                  <SettingsIcon />
                  Settings
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Theme">
                <CommandItem value="theme light" onSelect={() => run(() => setTheme("light"))}>
                  <SunIcon />
                  Light
                </CommandItem>
                <CommandItem value="theme dark" onSelect={() => run(() => setTheme("dark"))}>
                  <MoonIcon />
                  Dark
                </CommandItem>
                <CommandItem value="theme system" onSelect={() => run(() => setTheme("system"))}>
                  <LaptopIcon />
                  System
                </CommandItem>
              </CommandGroup>
            </CommandList>

            <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
              <span>
                <kbd className="rounded border bg-muted px-1 font-mono">↑↓</kbd> navigate
                <kbd className="ml-1.5 rounded border bg-muted px-1 font-mono">↵</kbd> select
              </span>
              <span>
                <kbd className="rounded border bg-muted px-1 font-mono">esc</kbd> close
              </span>
            </div>
          </Command>
        </div>
      ) : null}
    </div>
  );
}
