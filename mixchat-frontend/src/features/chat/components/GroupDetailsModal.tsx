"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  UserMinus,
  LogOut,
  Crown,
  Image as ImageIcon,
  FileText,
  Bell,
  BellOff,
  Search,
} from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Chat } from "@/types";
import { useChat } from "@/shared/providers/ChatProvider";
import { Input } from "@/shared/components/ui/Input";
import { SocialUserItemDto, userService } from "@/services/user/userService";

interface GroupDetailsModalProps {
  chat: Chat;
  isOpen: boolean;
  onClose: () => void;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  chat,
  isOpen,
  onClose,
}) => {
  const {
    leaveGroupChat,
    addGroupMember,
    removeGroupMember,
    muteChat,
    unmuteChat,
    currentUserId,
  } = useChat();
  const [showAddMember, setShowAddMember] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "media" | "files">(
    "members",
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SocialUserItemDto[]>([]);

  useEffect(() => {
    if (!memberSearch.trim()) {
      return;
    }
    const timer = setTimeout(() => {
      void userService
        .searchUsers(memberSearch.trim(), 10)
        .then((users) =>
          setSearchResults(
            users.filter(
              (user) =>
                !chat.participants.some((member) => member.id === user.id),
            ),
          ),
        );
    }, 250);
    return () => clearTimeout(timer);
  }, [chat.participants, memberSearch]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Group Details"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Header Summary */}
        <div className="flex flex-col items-center text-center p-4 rounded-2xl glass-card border border-white/10">
          <Avatar
            src={chat.groupAvatar || ""}
            alt={chat.groupName || "Group"}
            size="xl"
            className="mb-3"
          />
          <h3 className="text-base font-bold text-foreground">
            {chat.groupName}
          </h3>
          <p className="text-xs text-muted-foreground">
            {chat.participants.length} members
          </p>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-2 mt-3">
            {chat.isMuted ? (
              <Button
                size="xs"
                variant="glass"
                onClick={() => unmuteChat(chat.id)}
                className="text-purple-300 h-7 gap-1"
              >
                <Bell className="w-3 h-3" />
                <span>Unmute</span>
              </Button>
            ) : (
              <Button
                size="xs"
                variant="glass"
                onClick={() => muteChat(chat.id, "Always")}
                className="h-7 gap-1"
              >
                <BellOff className="w-3 h-3" />
                <span>Mute</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 border-b border-white/10 pb-2">
          {[
            { id: "members", label: `Members (${chat.participants.length})` },
            { id: "media", label: "Shared Media" },
            { id: "files", label: "Files" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as "members" | "media" | "files")
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "gradient-bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Members Tab */}
        {activeTab === "members" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Members ({chat.participants.length})
              </h4>
              <Button
                size="xs"
                variant="accent"
                onClick={() => setShowAddMember(!showAddMember)}
                className="h-6 text-[11px]"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Add Member
              </Button>
            </div>

            {/* Add member dropdown list */}
            {showAddMember && (
              <div className="mb-3 p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-1">
                <p className="text-[11px] font-semibold text-purple-300 px-1 mb-1">
                  Select a friend to add:
                </p>
                <Input
                  icon={<Search className="h-3.5 w-3.5" />}
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Search users…"
                  className="h-8 mb-2 text-xs"
                />
                {searchResults.map((user) => (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => {
                      void addGroupMember(chat.id, user.id);
                      setShowAddMember(false);
                    }}
                    className="flex min-h-11 w-full items-center justify-between p-1.5 rounded-lg hover:bg-white/10 text-xs text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={user.avatarUrl || ""}
                        alt={user.displayName}
                        size="sm"
                      />
                      <span>{user.displayName}</span>
                    </div>
                    <span className="text-[10px] text-purple-400 font-bold">
                      + Add
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
              {chat.participants.map((member) => {
                const isAdmin = member.id === chat.groupAdminId;
                const isMe = member.id === currentUserId;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-xl glass-card border border-white/5"
                  >
                    <Link
                      href={`/profile/${member.username}`}
                      onClick={onClose}
                      className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
                    >
                      <Avatar
                        src={member.avatar}
                        alt={member.displayName}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground hover:underline">
                            {isMe ? "You" : member.displayName}
                          </span>
                          {isAdmin && (
                            <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-full">
                              <Crown className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                          {member.role === "verified" && (
                            <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded-full">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          @{member.username}
                        </span>
                      </div>
                    </Link>

                    {!isMe && (
                      <button
                        onClick={() =>
                          void removeGroupMember(chat.id, member.id)
                        }
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shared Media Tab */}
        {activeTab === "media" && (
          <div className="min-h-32 max-h-48 overflow-y-auto custom-scrollbar">
            <p className="text-center text-xs text-muted-foreground py-8 flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8 text-white/10" />
              No shared media in this group yet
            </p>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          <div className="min-h-32 max-h-48 overflow-y-auto custom-scrollbar">
            <p className="text-center text-xs text-muted-foreground py-8 flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-white/10" />
              No shared files in this group yet
            </p>
          </div>
        )}

        {/* Destructive Controls */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <Button
            variant="glass"
            size="sm"
            onClick={() => {
              void leaveGroupChat(chat.id);
              onClose();
            }}
            className="w-full justify-start text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Leave Group
          </Button>
        </div>
      </div>
    </Modal>
  );
};
