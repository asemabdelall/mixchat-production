"use client";

import React from "react";
import { ChatList } from "@/features/chat/components/ChatList";
import { ChatRoom } from "@/features/chat/components/ChatRoom";
import { useChat } from "@/shared/providers/ChatProvider";

export default function ChatPage() {
  const { activeChatId } = useChat();

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto h-[100dvh] lg:h-[calc(100vh-8rem)]">
      {/* Mobile Chat List View (Hidden on mobile when conversation is active) */}
      <div className={`w-full lg:w-80 shrink-0 ${activeChatId ? "hidden lg:block" : "block"}`}>
        <ChatList />
      </div>

      {/* Mobile Active Chat View (Hidden on mobile when no active conversation) */}
      <div className={`flex-1 min-w-0 h-full ${!activeChatId ? "hidden lg:block" : "block"}`}>
        <ChatRoom />
      </div>
    </div>
  );
}
