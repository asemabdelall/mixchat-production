"use client";

import React, { useState } from "react";
import { MessageSquare, Users } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { NewChatModal } from "./NewChatModal";
import { CreateGroupModal } from "./CreateGroupModal";

export const ChatEmptyRoom: React.FC = () => {
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  return (
    <>
      <div className="flex-1 h-full min-w-0 flex flex-col items-center justify-center p-8 glass-panel rounded-none lg:rounded-3xl border-0 lg:border border-white/10 bg-[#070913] lg:bg-[#090c17]/95 text-center select-none space-y-6">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full gradient-bg-primary opacity-30 blur-xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl gradient-bg-primary text-white shadow-2xl border border-white/20">
            <MessageSquare className="h-10 w-10" />
          </div>
        </div>

        <div className="max-w-md space-y-2">
          <h3 className="text-xl font-black text-white tracking-wide">
            Your conversations live here.
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select a conversation from the left menu or use one of the quick
            actions below to connect instantly across Mix Chat.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => setShowNewChat(true)}
            size="sm"
            className="gap-2 font-bold shadow-lg shadow-purple-500/25"
          >
            <MessageSquare className="h-4 w-4" />
            <span>New Message</span>
          </Button>

          <Button
            onClick={() => setShowCreateGroup(true)}
            variant="glass"
            size="sm"
            className="gap-2 text-purple-300 border-purple-500/30"
          >
            <Users className="h-4 w-4 text-purple-400" />
            <span>Start Group</span>
          </Button>
        </div>
      </div>

      {/* Quick Action Modals */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
      />
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
    </>
  );
};
