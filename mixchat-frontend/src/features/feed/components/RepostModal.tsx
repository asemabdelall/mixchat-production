"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Repeat2, Undo2 } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Post } from "@/types";

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onRepost: () => Promise<void>;
}

export const RepostModal: React.FC<RepostModalProps> = ({
  isOpen,
  onClose,
  post,
  onRepost,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const frameId = window.requestAnimationFrame(() => setErrorMessage(null));
    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onRepost();
      onClose();
    } catch {
      setErrorMessage(
        post.isReposted
          ? "Could not undo this repost. Please try again."
          : "Could not repost this post. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUndo = Boolean(post.isReposted);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isUndo ? "Undo Repost" : "Repost"}
    >
      <div className="space-y-4">
        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={post.user.avatar}
              alt={post.user.displayName}
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {post.user.displayName}
              </p>
              <p className="truncate text-[11px] text-white/40">
                @{post.user.username}
              </p>
            </div>
          </div>
          {post.content && (
            <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-white/65">
              {post.content}
            </p>
          )}
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            isUndo
              ? "border-amber-500/20 bg-amber-500/10"
              : "border-purple-500/20 bg-purple-500/10"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`rounded-xl p-2.5 ${
                isUndo
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-purple-500/15 text-purple-300"
              }`}
            >
              {isUndo ? (
                <Undo2 className="h-5 w-5" />
              ) : (
                <Repeat2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {isUndo ? "Remove from your reposts?" : "Repost this post?"}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-white/45">
                {isUndo
                  ? "The repost will be removed and the public repost count will update immediately."
                  : "This records your repost and updates its count everywhere the post appears."}
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
          >
            {errorMessage}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isUndo ? "secondary" : "gradient"}
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isUndo ? (
              <Undo2 className="h-4 w-4" />
            ) : (
              <Repeat2 className="h-4 w-4" />
            )}
            {isSubmitting ? "Updating..." : isUndo ? "Undo Repost" : "Repost"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
