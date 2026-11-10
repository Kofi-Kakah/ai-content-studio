"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useUiStore } from "@/stores/ui-store";

export interface Shortcut {
  keys: string;
  description: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: "⌘ K", description: "Open command palette" },
  { keys: "⌘ B", description: "Toggle sidebar" },
  { keys: "⌘ ⇧ O", description: "New chat" },
  { keys: "⌘ ⇧ L", description: "Toggle theme" },
  { keys: "⌘ /", description: "Show keyboard shortcuts" },
  { keys: "Enter", description: "Send message (in workspace)" },
  { keys: "⇧ Enter", description: "New line (in workspace)" },
  { keys: "Esc", description: "Close dialogs / stop generating" },
];

/**
 * Global keyboard shortcuts, active across the app shell.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      if (key === "k" && !e.shiftKey) {
        e.preventDefault();
        setCommandOpen(true);
      } else if (key === "b") {
        e.preventDefault();
        toggleSidebar();
      } else if (key === "o" && e.shiftKey) {
        e.preventDefault();
        router.push("/workspace");
      } else if (key === "l" && e.shiftKey) {
        e.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      } else if (key === "/") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, setTheme, resolvedTheme, toggleSidebar, setCommandOpen, setShortcutsOpen]);
}
