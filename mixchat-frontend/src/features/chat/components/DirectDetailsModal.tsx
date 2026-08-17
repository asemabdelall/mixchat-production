"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  Ban,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Search,
  ExternalLink,
  Shield,
} from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Chat, Message } from "@/types";
import { useChat } from "@/shared/providers/ChatProvider";

interface DirectDetailsModalProps {
  chat: Chat;
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
}

export const DirectDetailsModal: React.FC<DirectDetailsModalProps> = ({
  chat,
  messages,
  isOpen,
  onClose,
  onOpenSearch,
}) => {
  const { muteChat, unmuteChat, blockUser, currentUserId } = useChat();
  const [activeTab, setActiveTab] = useState<"media" | "links" | "files">(
    "media",
  );
  const [showMuteDuration, setShowMuteDuration] = useState(false);

  const partner =
    chat.participants.find((p) => p.id !== currentUserId) ||
    chat.participants[0];

  // Filter shared media, links, files from message stream
  const mediaMsgs = messages.filter((m) => m.type === "image" && m.mediaUrl);
  const fileMsgs = messages.filter((m) => m.type === "file" || m.fileName);
  const linkMsgs = messages.filter(
    (m) =>
      m.text && (m.text.includes("http://") || m.text.includes("https://")),
  );

  const handleMute = (duration: string) => {
    muteChat(chat.id, duration);
    setShowMuteDuration(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contact Info" maxWidth="md">
      <div className="space-y-5">
        {/* Header Summary */}
        <div className="flex flex-col items-center text-center p-4 rounded-2xl glass-card border border-white/10">
          <Avatar
            src={partner.avatar}
            alt={partner.displayName}
            size="xl"
            isVerified={partner.role === "verified"}
            className="mb-3"
          />
          <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5 justify-center">
            {partner.displayName}
            {partner.role === "verified" && (
              <Shield className="h-4 w-4 text-purple-400 fill-purple-400/20" />
            )}
          </h3>
          <p className="text-xs text-purple-300 font-medium">
            @{partner.username}
          </p>
          {partner.bio && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              &quot;{partner.bio}&quot;
            </p>
          )}

          {/* Profile Link */}
          <Link href={`/profile/${partner.username}`} onClick={onClose}>
            <Button
              size="xs"
              variant="glass"
              className="mt-3 gap-1.5 text-purple-300 h-7"
            >
              <ExternalLink className="h-3 w-3" />
              <span>View Full Profile</span>
            </Button>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={() => {
              onOpenSearch();
              onClose();
            }}
            className="justify-center"
          >
            <Search className="w-3.5 h-3.5 mr-1.5" />
            Search Chat
          </Button>

          {chat.isMuted ? (
            <Button
              variant="glass"
              size="sm"
              onClick={() => unmuteChat(chat.id)}
              className="justify-center text-purple-300"
            >
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Unmute
            </Button>
          ) : (
            <Button
              variant="glass"
              size="sm"
              onClick={() => setShowMuteDuration(!showMuteDuration)}
              className="justify-center"
            >
              <BellOff className="w-3.5 h-3.5 mr-1.5" />
              Mute
            </Button>
          )}
        </div>

        {/* Mute Durations Selector */}
        {showMuteDuration && (
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-1 text-xs">
            <p className="font-semibold text-purple-300 mb-1">
              Mute notifications for:
            </p>
            {["8 hours", "1 week", "Always"].map((dur) => (
              <button
                key={dur}
                onClick={() => handleMute(dur)}
                className="w-full text-left px-2 py-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-white cursor-pointer"
              >
                {dur}
              </button>
            ))}
          </div>
        )}

        {/* Shared Content Tabs */}
        <div>
          <div className="flex items-center gap-1 border-b border-white/10 pb-2 mb-3">
            {[
              {
                id: "media",
                label: `Media (${mediaMsgs.length})`,
                icon: ImageIcon,
              },
              {
                id: "links",
                label: `Links (${linkMsgs.length})`,
                icon: LinkIcon,
              },
              {
                id: "files",
                label: `Files (${fileMsgs.length})`,
                icon: FileText,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id as "media" | "links" | "files")
                  }
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? "gradient-bg-primary text-white"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Shared Content Panel */}
          <div className="min-h-32 max-h-48 overflow-y-auto custom-scrollbar">
            {activeTab === "media" &&
              (mediaMsgs.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8 flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 text-white/10" />
                  No shared media
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaMsgs.map((m) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={m.id}
                      src={m.mediaUrl}
                      alt="Shared media"
                      className="w-full h-20 object-cover rounded-xl border border-white/10"
                    />
                  ))}
                </div>
              ))}

            {activeTab === "links" &&
              (linkMsgs.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8 flex flex-col items-center gap-2">
                  <LinkIcon className="w-8 h-8 text-white/10" />
                  No shared links
                </p>
              ) : (
                <div className="space-y-1.5">
                  {linkMsgs.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 rounded-xl glass-card text-xs truncate border border-white/5"
                    >
                      <span className="text-purple-300 truncate block select-all">
                        {m.text}
                      </span>
                    </div>
                  ))}
                </div>
              ))}

            {activeTab === "files" &&
              (fileMsgs.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8 flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-white/10" />
                  No shared files
                </p>
              ) : (
                <div className="space-y-1.5">
                  {fileMsgs.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-xl glass-card border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="truncate">
                          {m.fileName || m.text || "Document"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                        {m.fileSize || "Size unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>

        {/* Destructive Controls */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <Button
            variant="glass"
            size="sm"
            onClick={() => {
              if (confirm(`Block @${partner.username}?`)) {
                blockUser(partner.id);
                onClose();
              }
            }}
            className="w-full justify-start text-rose-400 hover:bg-rose-500/10 border-rose-500/20"
          >
            <Ban className="w-3.5 h-3.5 mr-2" />
            Block User
          </Button>
        </div>
      </div>
    </Modal>
  );
};
