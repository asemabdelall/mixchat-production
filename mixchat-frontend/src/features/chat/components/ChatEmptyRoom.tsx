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
      <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-center space-y-7 rounded-none bg-[#080c16] p-8 text-center select-none lg:rounded-3xl">
        <div className="relative">
          <div className="gradient-bg-primary absolute -inset-4 rounded-full opacity-20 blur-xl" />
          <div className="gradient-bg-primary relative flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-2xl">
            <MessageSquare className="h-9 w-9" aria-hidden="true" />
          </div>
        </div>

        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Your conversations live here
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Choose a conversation or start a new message to connect with
            someone on MixChat.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => setShowNewChat(true)}
            size="sm"
            className="min-h-11 gap-2 px-5 text-sm font-bold shadow-lg shadow-purple-500/25"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span>New Message</span>
          </Button>

          <Button
            onClick={() => setShowCreateGroup(true)}
            variant="glass"
            size="sm"
            className="min-h-11 gap-2 px-5 text-sm text-purple-300"
          >
            <Users className="h-4 w-4 text-purple-400" aria-hidden="true" />
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
