"use client";

import React from "react";
import Link from "next/link";
import { Users, MessageSquare, Shield } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { User } from "@/types";

interface MutualConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User;
  mutualUsers: User[];
  onStartChat: (userId: string) => void;
}

export const MutualConnectionsModal: React.FC<MutualConnectionsModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  mutualUsers,
  onStartChat,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Mutual Connections (${mutualUsers.length})`} maxWidth="md">
      <div className="space-y-4">
        <div className="glass-panel p-3 rounded-2xl border border-white/10 flex items-center gap-2.5">
          <Users className="h-4 w-4 text-purple-400 shrink-0" />
          <p className="text-xs text-muted-foreground">
            People you and <span className="text-white font-bold">@{targetUser.username}</span> both follow and connect with.
          </p>
        </div>

        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {mutualUsers.length > 0 ? (
            mutualUsers.map((user) => (
              <Card
                key={user.id}
                className="glass-card p-3 border-white/10 flex items-center justify-between gap-3 hover:border-purple-500/30 transition-all"
              >
                <Link href={`/profile/${user.username}`} onClick={onClose} className="flex items-center gap-3 min-w-0 flex-1 group">
                  <Avatar
                    src={user.avatar}
                    alt={user.displayName}
                    size="md"
                    online={user.online}
                    isVerified={user.role === "verified"}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors truncate">
                      {user.displayName}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/profile/${user.username}`} onClick={onClose}>
                    <Button size="xs" variant="glass" className="text-xs">
                      Profile
                    </Button>
                  </Link>
                  <Button
                    onClick={() => {
                      onClose();
                      onStartChat(user.id);
                    }}
                    size="xs"
                    className="gradient-bg-primary text-white text-xs gap-1 font-bold"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Message</span>
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 glass-panel rounded-2xl border border-white/10 space-y-2">
              <Shield className="h-8 w-8 text-purple-400 mx-auto opacity-40" />
              <p className="text-xs font-bold text-white">No mutual connections found</p>
              <p className="text-[11px] text-muted-foreground">
                You and @{targetUser.username} do not have any mutual friends yet.
              </p>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-white/10 flex justify-end">
          <Button size="sm" variant="glass" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
