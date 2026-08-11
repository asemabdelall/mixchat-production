"use client";

import React, { useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { Avatar } from "@/shared/components/ui/Avatar";
import { MOCK_USERS } from "@/shared/services/mockData";
import { useChat } from "@/shared/providers/ChatProvider";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { startNewChat } = useChat();
  const [search, setSearch] = useState("");

  const friends = MOCK_USERS.filter((u) => u.id !== "u_me");
  const filteredFriends = friends.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectUser = (userId: string) => {
    startNewChat(userId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Message" maxWidth="md">
      <div className="space-y-3">
        <Input
          icon={<Search className="h-4 w-4" />}
          placeholder="Search friends or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-xs"
        />

        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-1">
          {filteredFriends.map((user) => (
            <div
              key={user.id}
              onClick={() => handleSelectUser(user.id)}
              className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
            >
              <div className="flex items-center gap-3">
                <Avatar src={user.avatar} alt={user.displayName} size="md" online={user.online} />
                <div>
                  <p className="text-xs font-semibold text-foreground">{user.displayName}</p>
                  <p className="text-[10px] text-muted-foreground">@{user.username}</p>
                </div>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
