"use client";

import React, { useState } from "react";
import { Check, Search, Send } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Message } from "@/types";
import { useChat } from "@/shared/providers/ChatProvider";

interface ForwardModalProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ message, isOpen, onClose }) => {
  const { chats, forwardMessage } = useChat();
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  if (!message) return null;

  const availableChats = chats.filter((c) => !c.isArchived);
  const filteredChats = availableChats.filter((c) => {
    const title = c.isGroup
      ? c.groupName
      : c.isAnonymous
      ? "Anonymous Stranger"
      : c.participants.find((p) => p.id !== "u_me")?.displayName;
    return title?.toLowerCase().includes(search.toLowerCase());
  });

  const toggleChat = (chatId: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const handleForward = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedChatIds.length === 0) return;

    forwardMessage(selectedChatIds, message);
    setSelectedChatIds([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Forward Message" maxWidth="md">
      <form onSubmit={handleForward} className="space-y-4">
        {/* Message Preview Box */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
          <span className="font-semibold text-purple-300 block mb-1">Message Preview:</span>
          <p className="text-muted-foreground truncate">{message.text || "Attachment"}</p>
        </div>

        {/* Conversation Selector */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Select Destination ({selectedChatIds.length} selected)
          </label>

          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-xs mb-2"
          />

          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
            {filteredChats.map((chat) => {
              const isSelected = selectedChatIds.includes(chat.id);
              const partner = chat.participants.find((p) => p.id !== "u_me") || chat.participants[0];
              const title = chat.isGroup ? chat.groupName : chat.isAnonymous ? "Anonymous Stranger" : partner.displayName;

              return (
                <div
                  key={chat.id}
                  onClick={() => toggleChat(chat.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? "bg-purple-500/20 border border-purple-500/30" : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={chat.isGroup ? chat.groupAvatar || "" : partner.avatar}
                      alt={title || ""}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {chat.isGroup ? `${chat.participants.length} members` : `@${partner.username}`}
                      </p>
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
            disabled={selectedChatIds.length === 0}
            className="font-bold"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Forward ({selectedChatIds.length})
          </Button>
        </div>
      </form>
    </Modal>
  );
};
