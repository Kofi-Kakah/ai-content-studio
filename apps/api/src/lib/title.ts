/** Derives a short conversation title from the first user message. */
export function deriveTitle(content: string): string {
  const firstLine = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? "New chat";

  const stripped = firstLine
    .replace(/[#>*_`~\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const sentence = stripped.split(/(?<=[.!?])\s/)[0] ?? stripped;

  if (sentence.length <= 60) return sentence || "New chat";
  return sentence.slice(0, 57).trimEnd() + "…";
}

export function previewOf(content: string, length = 120): string {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length <= length ? flat : flat.slice(0, length - 1).trimEnd() + "…";
}
