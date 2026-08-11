"use client";

import React, { useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Avatar } from "@/shared/components/ui/Avatar";
import { MOCK_USERS } from "@/shared/services/mockData";
import { useChat } from "@/shared/providers/ChatProvider";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop&q=80",
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const { createGroupChat } = useChat();
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);

  const friends = MOCK_USERS.filter((u) => u.id !== "u_me");

  const filteredFriends = friends.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    createGroupChat(groupName.trim(), selectedUserIds, selectedAvatar);
    setGroupName("");
    setSelectedUserIds([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Group Chat" maxWidth="md">
      <form onSubmit={handleCreate} className="space-y-4">
        {/* Avatar Presets */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Group Avatar
          </label>
          <div className="flex items-center gap-3">
            {AVATAR_PRESETS.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedAvatar(url)}
                className={`relative rounded-full p-0.5 border-2 transition-all ${
                  selectedAvatar === url ? "border-purple-500 scale-105" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={url} alt={`Group preset ${i}`} className="w-10 h-10 rounded-full object-cover" />
              </button>
            ))}
          </div>
        </div>

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
            {filteredFriends.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? "bg-purple-500/20 border border-purple-500/30" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar src={user.avatar} alt={user.displayName} size="sm" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{user.displayName}</p>
                      <p className="text-[10px] text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                      isSelected ? "bg-purple-500 border-purple-500 text-white" : "border-white/20"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
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
