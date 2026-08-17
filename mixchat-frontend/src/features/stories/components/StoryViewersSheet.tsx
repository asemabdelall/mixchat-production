"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, Loader2, BadgeCheck } from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import {
  storiesService,
  StoryViewerItemDto,
} from "@/services/stories/storiesService";

interface StoryViewersSheetProps {
  storyId: string;
  isOpen: boolean;
  onClose: () => void;
}

const emojiMap: Record<string, string> = {
  HEART: "❤️",
  LAUGH: "😂",
  FIRE: "🔥",
  SURPRISED: "😮",
  SAD: "😢",
  CLAP: "👏",
};

export const StoryViewersSheet: React.FC<StoryViewersSheetProps> = ({
  storyId,
  isOpen,
  onClose,
}) => {
  const [viewers, setViewers] = useState<StoryViewerItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchViewers = useCallback(
    async (cursor?: string) => {
      try {
        if (!cursor) setIsLoading(true);
        else setIsLoadingMore(true);

        const res = await storiesService.getViewers(storyId, {
          cursor,
          limit: 20,
        });

        if (!cursor) {
          setViewers(res.items);
        } else {
          setViewers((prev) => [...prev, ...res.items]);
        }
        setTotalCount(res.totalCount);
        setNextCursor(res.pageInfo.nextCursor || null);
        setHasNextPage(res.pageInfo.hasNextPage);
      } catch (err) {
        console.error("Failed to load story viewers", err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [storyId],
  );

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      const load = async () => {
        await fetchViewers();
      };
      if (isMounted) {
        void load();
      }
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, fetchViewers]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Sheet Content */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[#0e1322] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[600px] z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Story Viewers</h3>
                <p className="text-[11px] text-muted-foreground">
                  {totalCount} {totalCount === 1 ? "person has" : "people have"}{" "}
                  viewed this story
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Viewers List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-white/40">
                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                <span className="text-xs">Loading viewers...</span>
              </div>
            ) : viewers.length > 0 ? (
              <>
                {viewers.map((viewer) => (
                  <div
                    key={viewer.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl glass-card border border-white/5 hover:border-purple-500/30 transition-all"
                  >
                    <Link
                      href={`/profile/${viewer.username}`}
                      onClick={onClose}
                      className="flex items-center gap-3 min-w-0 flex-1 group"
                    >
                      <Avatar
                        src={viewer.avatarUrl || ""}
                        alt={viewer.displayName}
                        size="md"
                        online={true}
                        isVerified={viewer.isVerified}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <h4 className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors truncate">
                            {viewer.displayName}
                          </h4>
                          {viewer.isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          @{viewer.username}
                        </p>
                      </div>
                    </Link>

                    {/* Viewer Reaction badge if any */}
                    {viewer.reaction && (
                      <div className="text-lg shrink-0 px-2 py-1 bg-white/5 rounded-xl border border-white/10">
                        {emojiMap[viewer.reaction] || "❤️"}
                      </div>
                    )}
                  </div>
                ))}

                {hasNextPage && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => nextCursor && fetchViewers(nextCursor)}
                      disabled={isLoadingMore}
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                    >
                      {isLoadingMore ? "Loading more..." : "Load more viewers"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 space-y-1 text-white/40">
                <Eye className="h-8 w-8 mx-auto text-purple-400/50 mb-2" />
                <p className="text-xs font-semibold text-white/60">
                  No views yet
                </p>
                <p className="text-[11px]">
                  When someone opens your story, they will show up here.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};
