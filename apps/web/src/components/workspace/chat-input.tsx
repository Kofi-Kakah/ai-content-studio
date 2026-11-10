"use client";

import * as React from "react";
import {
  ArrowUpIcon,
  Loader2Icon,
  PaperclipIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import {
  AI_MODES,
  CHAT_MODES,
  formatBytes,
  type AttachmentDto,
  type ChatModeId,
} from "@studio/shared";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { ModeIcon } from "@/components/mode-icon";
import { uploadFile } from "@/lib/api";

export function ChatInput({
  mode,
  onModeChange,
  onSend,
  onStop,
  streaming,
  autoFocus = true,
  presetAttachments = [],
}: {
  mode: ChatModeId;
  onModeChange: (mode: ChatModeId) => void;
  onSend: (content: string, attachmentIds: string[]) => void;
  onStop: () => void;
  streaming: boolean;
  autoFocus?: boolean;
  presetAttachments?: AttachmentDto[];
}) {
  const [value, setValue] = React.useState("");
  const [attachments, setAttachments] = React.useState<AttachmentDto[]>(presetAttachments);
  const [uploading, setUploading] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeMode = AI_MODES[mode];

  // Auto-resize the textarea up to a cap
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  React.useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const content = value.trim();
    if (!content || streaming || uploading) return;
    onSend(content, attachments.map((a) => a.id));
    setValue("");
    setAttachments([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 5 - attachments.length)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.add({ title: `${file.name} is over 10 MB`, type: "error" });
          continue;
        }
        const res = await uploadFile(file);
        setAttachments((prev) => [...prev, res.file]);
      }
    } catch (err) {
      toast.add({
        title: "Upload failed",
        description: (err as Error).message,
        type: "error",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Paste files directly
  const onPaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files;
    if (files?.length) {
      e.preventDefault();
      void onFiles(files);
    }
  };

  const canSend = value.trim().length > 0 && !streaming && !uploading;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-3 md:px-4 md:pb-4">
      <div className="mb-1.5 flex flex-wrap gap-1.5 empty:mb-0">
        {attachments.map((a) => (
          <span
            key={a.id}
            className="flex items-center gap-1.5 rounded-full border bg-muted/60 py-1 pr-1 pl-2.5 text-xs"
          >
            <PaperclipIcon className="size-3 text-muted-foreground" />
            <span className="max-w-40 truncate">{a.name}</span>
            <span className="text-muted-foreground/60">{formatBytes(a.size)}</span>
            <button
              onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
              className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Remove ${a.name}`}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        {uploading ? (
          <span className="flex items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
            <Loader2Icon className="size-3 animate-spin" />
            Uploading…
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "relative flex items-end gap-1 rounded-3xl border bg-card px-2 py-1.5 shadow-sm transition-shadow",
          "focus-within:shadow-md dark:bg-input/40"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="mb-0.5 gap-1.5 rounded-full px-2.5 text-muted-foreground"
              />
            }
          >
            <ModeIcon name={activeMode.icon} className="size-4" />
            <span className="hidden text-[13px] sm:inline">{activeMode.short}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-64">
            <DropdownMenuLabel>What are we creating?</DropdownMenuLabel>
            {CHAT_MODES.map((id) => {
              const m = AI_MODES[id];
              return (
                <DropdownMenuItem
                  key={id}
                  onClick={() => onModeChange(id)}
                  className={cn("items-start gap-2 py-1.5", id === mode && "bg-accent")}
                >
                  <ModeIcon name={m.icon} className="mt-0.5 size-4 shrink-0" />
                  <span className="flex flex-col">
                    <span className="text-[13px] font-medium">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.description}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={activeMode.placeholder}
          aria-label="Message"
          className="max-h-55 flex-1 resize-none bg-transparent px-1 py-1.5 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => void onFiles(e.target.files)}
          accept=".txt,.md,.markdown,.json,.csv,.yaml,.yml,.html,.ts,.tsx,.js,.jsx,.py,.rb,.go,.rs,.java,.css,.sql,.sh,image/*"
        />

        <Button
          variant="ghost"
          size="icon-sm"
          className="mb-0.5 rounded-full text-muted-foreground"
          aria-label="Attach files"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachments.length >= 5}
        >
          <PaperclipIcon />
        </Button>

        {streaming ? (
          <Button
            size="icon-sm"
            className="mb-0.5 rounded-full"
            aria-label="Stop generating"
            onClick={onStop}
          >
            <SquareIcon className="size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon-sm"
            className="mb-0.5 rounded-full"
            aria-label="Send message"
            disabled={!canSend}
            onClick={submit}
          >
            <ArrowUpIcon />
          </Button>
        )}
      </div>

      <p className="mt-1.5 text-center text-[11px] text-muted-foreground/70">
        Enter to send · Shift+Enter for a new line · AI can make mistakes — verify important info.
      </p>
    </div>
  );
}
