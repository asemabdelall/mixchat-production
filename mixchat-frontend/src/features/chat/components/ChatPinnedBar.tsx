"use client";

import React from "react";
import { Pin } from "lucide-react";
import { Message } from "@/types";

interface ChatPinnedBarProps {
  pinnedMsg: Message;
  onScrollToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export const ChatPinnedBar: React.FC<ChatPinnedBarProps> = ({
  pinnedMsg,
  onScrollToMessage,
  onUnpin,
}) => {
  return (
    <div className="bg-purple-950/60 border-b border-purple-500/30 px-4 py-2 flex items-center justify-between text-xs">
      <button
        type="button"
        onClick={() => onScrollToMessage(pinnedMsg.id)}
        className="flex min-h-11 items-center gap-2 truncate hover:underline text-left"
      >
        <Pin className="h-3.5 w-3.5 text-purple-400 shrink-0" />
        <span className="font-semibold text-purple-300 shrink-0">Pinned:</span>
        <span className="text-muted-foreground truncate">{pinnedMsg.text}</span>
      </button>
      <button
        onClick={() => onUnpin(pinnedMsg.id)}
        className="min-h-11 px-2 text-muted-foreground hover:text-white ml-2 text-[10px] underline"
      >
        Unpin
      </button>
    </div>
  );
};
