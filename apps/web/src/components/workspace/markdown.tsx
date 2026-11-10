"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "cn";
import { toast } from "@/components/ui/toast";

/**
 * Markdown renderer for assistant output — GFM tables, task lists,
 * styled code blocks with copy buttons, safe links.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("md-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          pre: CodeBlock,
          table: (props) => (
            <div className="my-4 overflow-x-auto rounded-lg border">
              <table {...props} className="my-0" />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock(props: React.ComponentProps<"pre">) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    const text = (props.children as unknown as { props?: { children?: unknown } })?.props?.children;
    const value = extractText(text);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.add({ title: "Could not copy", type: "error" });
    }
  };

  return (
    <div className="group/code relative my-4">
      <button
        onClick={() => void onCopy()}
        aria-label="Copy code"
        className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-md border bg-background/80 text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover/code:opacity-100 hover:text-foreground"
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </button>
      <pre {...props} />
    </div>
  );
}

function extractText(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props?: { children?: unknown } }).props?.children);
  }
  return "";
}
