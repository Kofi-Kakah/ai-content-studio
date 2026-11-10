"use client";

import { useParams } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/editor-workspace";

export default function EditorMessagePage() {
  const params = useParams<{ messageId: string }>();
  return <EditorWorkspace messageId={params.messageId} />;
}
