"use client";

import React, { useEffect, useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useChat } from "@/shared/providers/ChatProvider";
import { SocialUserItemDto, userService } from "@/services/user/userService";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createGroupChat } = useChat();
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<SocialUserItemDto[]>([]);

  useEffect(() => {
    if (!search.trim()) {
      return;
    }
    const timer = setTimeout(() => {
      void userService.searchUsers(search.trim(), 20).then(setFriends);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    await createGroupChat(groupName.trim(), selectedUserIds);
    setGroupName("");
    setSelectedUserIds([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Group Chat"
      maxWidth="md"
    >
      <form onSubmit={handleCreate} className="space-y-4">
        {/* Group Name Input */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Group Name *
          </label>
          <Input
            placeholder="e.g. Design Mavericks 🚀"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="h-10 text-xs"
            required
          />
        </div>

        {/* Member Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">
              Add Members ({selectedUserIds.length} selected)
            </label>
          </div>

          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-xs mb-2"
          />

          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {search.trim() && friends.length === 0 && (
              <p className="py-5 text-center text-xs text-white/50">
                No users found
              </p>
            )}
            {friends.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              return (
                <button
                  type="button"
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  aria-pressed={isSelected}
                  className={`flex min-h-11 w-full items-center justify-between p-2 rounded-xl transition-colors text-left ${
                    isSelected
                      ? "bg-purple-500/20 border border-purple-500/30"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      src={user.avatarUrl || ""}
                      alt={user.displayName}
                      size="sm"
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

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                      isSelected
                        ? "bg-purple-500 border-purple-500 text-white"
                        : "border-white/20"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <Button type="button" variant="glass" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gradient"
            size="sm"
            disabled={!groupName.trim() || selectedUserIds.length === 0}
            className="font-bold"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};
