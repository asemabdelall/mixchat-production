"use client";

import React from "react";
import { ChatList } from "@/features/chat/components/ChatList";
import { ChatRoom } from "@/features/chat/components/ChatRoom";
import { useChat } from "@/shared/providers/ChatProvider";

export default function ChatPage() {
  const { activeChatId } = useChat();

  return (
    <div className="w-full h-full p-0 m-0 flex flex-col lg:flex-row gap-0 lg:gap-3 overflow-hidden">
      {/* Messages List Column (Desktop Sidebar / Mobile Main View) */}
      <div
        className={`w-full lg:w-80 xl:w-96 shrink-0 h-full ${activeChatId ? "hidden lg:block" : "block"}`}
      >
        <ChatList />
      </div>

      {/* Active Conversation Column (Desktop Main Pane / Mobile Active Screen) */}
      <div
        className={`flex-1 min-w-0 h-full ${!activeChatId ? "hidden lg:block" : "block"}`}
      >
        <ChatRoom />
      </div>
    </div>
  );
}
