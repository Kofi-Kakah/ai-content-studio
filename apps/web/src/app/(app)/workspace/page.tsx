import { Suspense } from "react";
import type { Metadata } from "next";
import { ChatView } from "@/components/workspace/chat-view";

export const metadata: Metadata = { title: "Workspace" };

export default function WorkspacePage() {
  return (
    <Suspense>
      <ChatView newChat />
    </Suspense>
  );
}
