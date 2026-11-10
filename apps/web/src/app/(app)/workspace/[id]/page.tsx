import { Suspense } from "react";
import type { Metadata } from "next";
import { ChatView } from "@/components/workspace/chat-view";

export const metadata: Metadata = { title: "Chat" };

export default function ConversationPage() {
  return (
    <Suspense>
      <ChatView />
    </Suspense>
  );
}
