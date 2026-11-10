"use client";

import * as React from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useTheme } from "next-themes";

/**
 * Monaco is loaded from the local npm package (not the default CDN) so the
 * editor works without network access. Markdown highlighting is main-thread
 * (Monarch), so a stub worker is enough — features like word-suggestions
 * that require the editor worker are simply disabled.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
g.MonacoEnvironment = {
  getWorker() {
    return new Worker(
      URL.createObjectURL(new Blob([""], { type: "text/javascript" }))
    );
  },
};

loader.config({ monaco });

/* Studio themes matching the app palette */
let themesDefined = false;
function defineThemes() {
  if (themesDefined) return;
  themesDefined = true;
  monaco.editor.defineTheme("studio-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword.md", foreground: "008000" },
      { token: "string.md", foreground: "a31515" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#0a0a0a",
      "editorGutter.background": "#ffffff",
    },
  });
  monaco.editor.defineTheme("studio-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1c1c1c",
      "editor.foreground": "#e8e8e8",
      "editorGutter.background": "#1c1c1c",
      "editor.lineHighlightBackground": "#ffffff08",
    },
  });
}

export type MonacoHandle = {
  /** Wrap the current selection (or insert) with before/after text */
  wrap: (before: string, after?: string) => void;
  /** Toggle a line-prefix (e.g. "# ", "- ", "> ") on the selected lines */
  prefixLines: (prefix: string) => void;
  /** Insert text at the cursor */
  insert: (text: string) => void;
  getValue: () => string;
  focus: () => void;
};

export const MonacoEditor = React.forwardRef<MonacoHandle, {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}>(function MonacoEditor({ value, onChange, language = "markdown", readOnly = false }, ref) {
  const { resolvedTheme } = useTheme();
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  React.useEffect(() => {
    defineThemes();
    monaco.editor.setTheme(resolvedTheme === "dark" ? "studio-dark" : "studio-light");
  }, [resolvedTheme]);

  const onMount: OnMount = (editor) => {
    editorRef.current = editor;
    defineThemes();
    monaco.editor.setTheme(resolvedTheme === "dark" ? "studio-dark" : "studio-light");
  };

  React.useImperativeHandle(ref, () => ({
    wrap(before, after = before) {
      const editor = editorRef.current;
      if (!editor) return;
      const selection = editor.getSelection();
      if (!selection) return;
      const selected = editor.getModel()?.getValueInRange(selection) ?? "";
      editor.executeEdits("toolbar", [
        {
          range: selection,
          text: `${before}${selected}${after}`,
          forceMoveMarkers: true,
        },
      ]);
      const isWrap = selected.startsWith(before) && selected.endsWith(after) && selected.length > before.length + after.length;
      if (isWrap) {
        // toggled off — select the inner text
        editor.setSelection({
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn + before.length,
          endLineNumber: selection.endLineNumber,
          endColumn: Math.max(selection.startColumn + before.length, selection.endColumn - after.length),
        });
      } else {
        editor.setSelection({
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn + before.length,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn + before.length,
        });
      }
      editor.focus();
    },
    prefixLines(prefix) {
      const editor = editorRef.current;
      if (!editor) return;
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (!selection || !model) return;
      const edits: monaco.editor.IIdentifiedSingleEditOperation[] = [];
      const hasPrefix = model
        .getValueInRange({
          startLineNumber: selection.startLineNumber,
          startColumn: 1,
          endLineNumber: selection.startLineNumber,
          endColumn: Math.min(model.getLineMaxColumn(selection.startLineNumber), prefix.length + 1),
        })
        .startsWith(prefix);

      for (let line = selection.startLineNumber; line <= selection.endLineNumber; line++) {
        const maxCol = model.getLineMaxColumn(line);
        const current = model.getValueInRange({
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: Math.min(maxCol, prefix.length + 1),
        });
        if (hasPrefix && current.startsWith(prefix)) {
          edits.push({
            range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: prefix.length + 1 },
            text: "",
          });
        } else if (!hasPrefix) {
          edits.push({
            range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
            text: prefix,
          });
        }
      }
      editor.executeEdits("toolbar", edits);
      editor.focus();
    },
    insert(text) {
      const editor = editorRef.current;
      if (!editor) return;
      const selection = editor.getSelection();
      if (!selection) return;
      editor.executeEdits("toolbar", [{ range: selection, text, forceMoveMarkers: true }]);
      editor.focus();
    },
    getValue() {
      return editorRef.current?.getValue() ?? "";
    },
    focus() {
      editorRef.current?.focus();
    },
  }));

  return (
    <Editor
      value={value}
      onChange={(v) => onChange(v ?? "")}
      language={language}
      onMount={onMount}
      theme="studio-light"
      loading={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-3 animate-pulse rounded-full bg-muted-foreground/50" />
          Loading editor…
        </div>
      }
      options={{
        readOnly,
        wordWrap: "on",
        minimap: { enabled: false },
        lineNumbers: "off",
        glyphMargin: false,
        folding: false,
        fontSize: 14.5,
        lineHeight: 1.65 * 14.5,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        padding: { top: 14, bottom: 24 },
        scrollBeyondLastLine: false,
        renderLineHighlight: "none",
        smoothScrolling: true,
        automaticLayout: true,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        scrollbar: { verticalScrollbarSize: 6, horizontal: "hidden" },
        contextmenu: false,
        quickSuggestions: false,
        occurrencesHighlight: "off",
        selectionHighlight: false,
        bracketPairColorization: { enabled: false },
        guides: { indentation: false },
        stickyScroll: { enabled: false },
      }}
    />
  );
});
