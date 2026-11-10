"use client";

import {
  AlignLeftIcon,
  FileTextIcon,
  HeadingIcon,
  MegaphoneIcon,
  SearchIcon,
  Share2Icon,
  SparklesIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";

/** Maps the icon names used in @studio/shared to lucide components. */
const ICONS: Record<string, LucideIcon> = {
  Sparkles: SparklesIcon,
  FileText: FileTextIcon,
  Share2: Share2Icon,
  Video: VideoIcon,
  AlignLeft: AlignLeftIcon,
  Heading: HeadingIcon,
  Search: SearchIcon,
  Megaphone: MegaphoneIcon,
};

export function ModeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? SparklesIcon;
  return <Icon className={className} />;
}
