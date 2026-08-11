"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Eye, Send, Volume2, VolumeX } from "lucide-react";
import { Story } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Input } from "@/shared/components/ui/Input";
import { useChat } from "@/shared/providers/ChatProvider";

interface StoryViewerModalProps {
  story: Story;
  onClose: () => void;
  onNextStory?: () => void;
  onPrevStory?: () => void;
}

const quickEmojis = ["❤️", "🔥", "😮", "😂", "👏", "🚀"];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  story,
  onClose,
  onNextStory,
  onPrevStory,
}) => {
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(story.isLiked || false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { sendMessage, startNewChat } = useChat();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Progress Bar Timer with Pause Support
  useEffect(() => {
    if (isPaused || showViewers) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (onNextStory) {
            onNextStory();
            return 0;
          }
          onClose();
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isPaused, showViewers, onClose, onNextStory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && onNextStory) onNextStory();
      if (e.key === "ArrowLeft" && onPrevStory) onPrevStory();
      if (e.key === " ") setIsPaused((prev) => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNextStory, onPrevStory]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const chatId = startNewChat(story.userId || story.user.id);
    if (chatId) {
      sendMessage(chatId, `Replied to your story: "${replyText.trim()}"`);
    }

    showToast(`Reply sent to ${story.user.displayName.split(" ")[0]} 🚀`);
    setReplyText("");
  };

  const handleQuickReaction = (emoji: string) => {
    setActiveReaction(emoji);
    showToast(`Reacted with ${emoji}`);

    const chatId = startNewChat(story.userId || story.user.id);
    if (chatId) {
      sendMessage(chatId, `Reacted ${emoji} to your story`);
    }

    setTimeout(() => setActiveReaction(null), 1200);
  };

  const handleLikeToggle = () => {
    setIsLiked((prev) => !prev);
    showToast(!isLiked ? "Story liked ❤️" : "Unliked story");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-2xl select-none">
        {/* Toast Overlay */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-600/90 text-white backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold shadow-xl border border-purple-400/40"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="relative w-full max-w-md h-full sm:h-[88vh] rounded-none sm:rounded-3xl overflow-hidden glass-panel border-0 sm:border border-white/10 flex flex-col justify-between"
        >
          {/* Progress Bar Header */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent pt-4 pointer-events-auto">
            <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mb-3">
              <div
                className="bg-white h-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={story.user.avatar} alt={story.user.displayName} size="sm" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-white">{story.user.displayName}</h4>
                    {isPaused && <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full text-white/80">Paused</span>}
                  </div>
                  <p className="text-[10px] text-white/70">{story.timestamp}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {story.mediaType === "video" && (
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    aria-label="Mute toggle"
                    className="rounded-full p-1.5 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close story viewer"
                  className="rounded-full p-1.5 text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Media Content */}
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {story.mediaType === "video" ? (
              <video
                src={story.mediaUrl}
                autoPlay
                loop
                muted={isMuted}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={story.mediaUrl}
                alt="Story Media"
                className="w-full h-full object-cover"
              />
            )}

            {/* Caption Banner */}
            {story.caption && (
              <div className="absolute bottom-24 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-white text-xs text-center shadow-lg">
                {story.caption}
              </div>
            )}

            {/* Quick Emoji Reaction Animating Overlay */}
            <AnimatePresence>
              {activeReaction && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 50 }}
                  animate={{ opacity: 1, scale: 1.6, y: -40 }}
                  exit={{ opacity: 0, scale: 2 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none text-6xl drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                >
                  {activeReaction}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Bar: Reply, Quick Emojis & Viewer Sheet */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent space-y-3 pointer-events-auto">
            {/* Quick Emoji Reaction Pill Strip */}
            <div className="flex items-center justify-around px-2 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleQuickReaction(emoji)}
                  className="text-lg hover:scale-125 transition-transform cursor-pointer active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2.5">
              <form onSubmit={handleSendReply} className="flex-1">
                <Input
                  placeholder={`Reply to ${story.user.displayName.split(" ")[0]}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60 h-10 text-xs rounded-full"
                  rightElement={
                    replyText ? (
                      <button type="submit" className="text-purple-400 hover:text-purple-300">
                        <Send className="h-4 w-4" />
                      </button>
                    ) : null
                  }
                />
              </form>

              {story.userId === "u_me" && (
                <button
                  onClick={() => setShowViewers(!showViewers)}
                  aria-label="Story Viewers"
                  className="flex items-center gap-1 px-3 py-2.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors shrink-0"
                >
                  <Eye className="h-4 w-4 text-purple-400" />
                  <span>{story.viewsCount || 482}</span>
                </button>
              )}

              <button
                onClick={handleLikeToggle}
                aria-label="Like story"
                className={`p-2.5 rounded-full transition-transform active:scale-125 shrink-0 ${
                  isLiked ? "text-pink-500 bg-pink-500/20" : "text-white bg-white/10"
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-pink-500" : ""}`} />
              </button>
            </div>
          </div>

          {/* Expandable Story Viewers Drawer */}
          <AnimatePresence>
            {showViewers && (
              <motion.div
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 200, opacity: 0 }}
                className="absolute bottom-0 left-0 right-0 z-30 bg-[#0b0f19]/95 backdrop-blur-2xl p-5 rounded-t-3xl border-t border-white/10 max-h-[60vh] overflow-y-auto space-y-3 pointer-events-auto"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Eye className="h-4 w-4 text-purple-400" />
                    <span>Story Viewers ({story.viewsCount || 482})</span>
                  </h4>
                  <button onClick={() => setShowViewers(false)} className="text-muted-foreground hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { name: "Sara Chen", username: "sophiachen", time: "5m ago", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80" },
                    { name: "Khaled Vance", username: "marcusv", time: "12m ago", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80" },
                    { name: "Noor Rostova", username: "elenarostova", time: "25m ago", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80" },
                    { name: "David Kim", username: "davidkim", time: "45m ago", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80" },
                  ].map((viewer, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <Avatar src={viewer.avatar} alt={viewer.name} size="sm" />
                        <div>
                          <p className="font-bold text-white">{viewer.name}</p>
                          <p className="text-[10px] text-muted-foreground">@{viewer.username}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{viewer.time}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
