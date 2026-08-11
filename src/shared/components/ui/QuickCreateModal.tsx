"use client";

import React, { useState } from "react";
import { MessageSquare, PlusCircle, Users, Film, ArrowRight } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { CreatePostModal } from "@/features/feed/components/CreatePostModal";
import { CreateStoryModal } from "@/features/stories/components/CreateStoryModal";
import { NewChatModal } from "@/features/chat/components/NewChatModal";
import { CreateGroupModal } from "@/features/chat/components/CreateGroupModal";

import { CreateReelModal } from "@/features/reels/components/CreateReelModal";

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ isOpen, onClose }) => {
  const [activeModal, setActiveModal] = useState<"post" | "story" | "reel" | "dm" | "group" | null>(null);

  const handleSelectOption = (option: "post" | "story" | "reel" | "dm" | "group") => {
    setActiveModal(option);
  };

  const handleCloseSubModal = () => {
    setActiveModal(null);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen && activeModal === null} onClose={onClose} title="Quick Create Action" maxWidth="md">
        <div className="space-y-3 py-1 select-none">
          <p className="text-xs text-muted-foreground">Select what you would like to create on Mix Chat:</p>

          <div className="grid grid-cols-1 gap-2">
            {/* Create Short Reel */}
            <button
              onClick={() => handleSelectOption("reel")}
              className="flex items-center justify-between p-3 rounded-2xl glass-card hover:bg-white/10 hover:border-purple-500/40 border border-purple-500/30 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl gradient-bg-primary text-white shadow-md">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors">
                    Create Short Reel
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Publish fullscreen vertical video content</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Create Post */}
            <button
              onClick={() => handleSelectOption("post")}
              className="flex items-center justify-between p-3 rounded-2xl glass-card hover:bg-white/10 hover:border-purple-500/40 border border-white/10 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-md">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors">
                    New Social Post
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Share text, carousel photos, or video updates</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Create Story */}
            <button
              onClick={() => handleSelectOption("story")}
              className="flex items-center justify-between p-3 rounded-2xl glass-card hover:bg-white/10 hover:border-purple-500/40 border border-white/10 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl gradient-bg-accent text-white shadow-md">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white group-hover:text-pink-300 transition-colors">
                    Share Story 2.0
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Post ephemeral photo/video story for 24 hours</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* New Direct Message */}
            <button
              onClick={() => handleSelectOption("dm")}
              className="flex items-center justify-between p-3 rounded-2xl glass-card hover:bg-white/10 hover:border-purple-500/40 border border-white/10 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors">
                    Direct Message
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Start a private chat with any friend or user</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Create Group Chat */}
            <button
              onClick={() => handleSelectOption("group")}
              className="flex items-center justify-between p-3 rounded-2xl glass-card hover:bg-white/10 hover:border-purple-500/40 border border-white/10 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white group-hover:text-blue-300 transition-colors">
                    Create Group Chat
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Assemble a multi-user social channel</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      </Modal>

      {/* Sub Modals */}
      {activeModal === "reel" && (
        <CreateReelModal isOpen={true} onClose={handleCloseSubModal} />
      )}
      {activeModal === "post" && (
        <CreatePostModal isOpen={true} onClose={handleCloseSubModal} onPostCreated={() => handleCloseSubModal()} />
      )}
      {activeModal === "story" && (
        <CreateStoryModal isOpen={true} onClose={handleCloseSubModal} onStoryCreated={() => handleCloseSubModal()} />
      )}
      {activeModal === "dm" && (
        <NewChatModal isOpen={true} onClose={handleCloseSubModal} />
      )}
      {activeModal === "group" && (
        <CreateGroupModal isOpen={true} onClose={handleCloseSubModal} />
      )}
    </>
  );
};
