"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useChat } from "@/shared/providers/ChatProvider";
import { SocialUserItemDto, userService } from "@/services/user/userService";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { startNewChat } = useChat();
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<SocialUserItemDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        setFriends(await userService.searchUsers(search.trim(), 20));
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectUser = async (userId: string) => {
    await startNewChat(userId);
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
          {isSearching && (
            <p className="py-6 text-center text-xs text-white/50">Searching…</p>
          )}
          {!isSearching && search.trim() && friends.length === 0 && (
            <p className="py-6 text-center text-xs text-white/50">
              No users found
            </p>
          )}
          {friends.map((user) => (
            <button
              type="button"
              key={user.id}
              onClick={() => void handleSelectUser(user.id)}
              className="flex min-h-11 w-full items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 text-left"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={user.avatarUrl || ""}
                  alt={user.displayName}
                  size="md"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    @{user.username}
                  </p>
                </div>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                <MessageSquare className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};
