"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const emptySubscribe = () => () => {};

/**
 * Light / dark / system theme switcher (next-themes).
 * Cycles through the three modes; shows what's next.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const label =
    next === "light" ? "Switch to light" : next === "dark" ? "Switch to dark" : "Match system";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label={label}
            onClick={() => setTheme(next)}
          />
        }
      >
        {!mounted ? (
          <SunIcon className="opacity-0" />
        ) : theme === "system" ? (
          <LaptopIcon />
        ) : resolvedTheme === "dark" ? (
          <MoonIcon />
        ) : (
          <SunIcon />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
