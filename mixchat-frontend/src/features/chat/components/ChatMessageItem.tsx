"use client";

import React from "react";
import Link from "next/link";
import {
  CornerUpLeft,
  Copy,
  Trash2,
  FileText,
  Download,
  Check,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { VoiceNotePlayer } from "./VoiceNotePlayer";
import { Message, User, MessageReply } from "@/types";

interface ChatMessageItemProps {
  msg: Message;
  isMe: boolean;
  msgSender?: User;
  partner: User;
  isGroup: boolean;
  isGroupedWithPrev: boolean;
  isGroupedWithNext: boolean;
  isHighlighted: boolean;
  isMatched: boolean;
  onReply: (reply: MessageReply) => void;
  onCopy: (text?: string) => void;
  onDelete: (messageId: string) => void;
  onPreviewMedia: (url: string) => void;
  onScrollToMessage: (messageId: string) => void;
  setElementRef: (el: HTMLDivElement | null) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  msg,
  isMe,
  msgSender,
  partner,
  isGroup,
  isGroupedWithPrev,
  isGroupedWithNext,
  isHighlighted,
  isMatched,
  onReply,
  onCopy,
  onDelete,
  onPreviewMedia,
  onScrollToMessage,
  setElementRef,
}) => {
  if (msg.type === "system") {
    return (
      <div className="my-4 flex justify-center">
        <div className="max-w-sm rounded-full bg-purple-500/10 px-4 py-2 text-center text-sm font-medium text-purple-200">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setElementRef}
      className={`group relative flex items-end gap-2 focus-within:z-20 ${
        isMe ? "flex-row-reverse" : "flex-row"
      } ${isGroupedWithPrev ? "mt-1" : "mt-4 sm:mt-5"}`}
    >
      {/* Partner Avatar (rendered only on the LAST message of a grouped sequence) */}
      {!isMe && (
        <div className="w-10 shrink-0">
          {!isGroupedWithNext && (
            <Link
              href={`/profile/${msgSender?.username || partner.username}`}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              aria-label={`View ${msgSender?.displayName || partner.displayName}'s profile`}
            >
              <Avatar
                src={msgSender?.avatar || partner.avatar}
                alt={msgSender?.displayName || partner.displayName}
                size="sm"
              />
            </Link>
          )}
        </div>
      )}

      <div
        className={`flex max-w-[84%] flex-col sm:max-w-[76%] lg:max-w-[72%] ${isMe ? "items-end" : "items-start"}`}
      >
        {/* Group Sender Attribution (rendered only on FIRST message of sequence) */}
        {isGroup && !isMe && !isGroupedWithPrev && msgSender && (
          <Link
            href={`/profile/${msgSender.username}`}
            className="mb-1 pl-1 text-xs font-bold text-purple-200 hover:underline"
          >
            {msgSender.displayName}
          </Link>
        )}

        {/* Hover Actions Toolbar */}
        <div
          className={`pointer-events-none absolute top-0 z-20 flex -translate-y-1/2 items-center gap-1 rounded-xl bg-[#202637]/98 p-1 opacity-0 shadow-xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 ${
            isMe ? "right-1" : "left-10"
          }`}
        >
          <button
            type="button"
            onClick={() =>
              onReply({
                id: msg.id,
                senderName: isMe ? "You" : msgSender?.displayName || "Stranger",
                text: msg.text || "Attachment",
              })
            }
            aria-label="Reply to message"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
            title="Reply"
          >
            <CornerUpLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onCopy(msg.text)}
            aria-label="Copy message"
            disabled={!msg.text}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            title="Copy"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>

          {isMe && (
            <button
              type="button"
              onClick={() => onDelete(msg.id)}
              aria-label="Delete message"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 active:bg-rose-500/15"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Message Bubble Container */}
        <div
          tabIndex={0}
          className={`relative rounded-[1.25rem] px-3.5 py-2.5 text-base leading-[1.5] shadow-sm outline-none transition-[box-shadow,background-color] [overflow-wrap:anywhere] focus-visible:ring-2 focus-visible:ring-purple-300 sm:px-4 sm:py-3 ${
            isHighlighted
              ? "ring-2 ring-purple-400 bg-purple-600/30"
              : ""
          } ${isMatched ? "ring-2 ring-purple-400 bg-purple-950/80" : ""} ${
            isMe
              ? "gradient-bg-primary text-white rounded-br-xs"
              : "bg-[#171d2c] text-foreground rounded-bl-xs"
          }`}
        >
          {/* Reply Reference Quote */}
          {msg.replyTo && (
            <button
              type="button"
              onClick={() => onScrollToMessage(msg.replyTo!.id)}
              className="mb-2 w-full cursor-pointer rounded-xl bg-black/20 p-2.5 text-left text-sm transition-colors hover:bg-black/35"
            >
              <span className="block font-bold text-purple-200">
                {msg.replyTo.senderName}
              </span>
              <span className="text-muted-foreground truncate block">
                {msg.replyTo.text}
              </span>
            </button>
          )}

          {msg.type === "voice" ? (
            <VoiceNotePlayer
              src={msg.voiceUrl || msg.mediaUrl}
              duration={msg.voiceDuration || 1}
              waveform={msg.waveform}
            />
          ) : msg.type === "file" ? (
            <div className="flex min-w-[200px] items-center justify-between rounded-xl bg-black/20 p-2.5">
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-5 w-5 shrink-0 text-purple-300" aria-hidden="true" />
                <div className="truncate">
                  <p className="truncate text-sm font-semibold">
                    {msg.fileName || msg.text}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {msg.fileSize || "Attachment"}
                  </p>
                </div>
              </div>
              <a
                href={msg.mediaUrl || "#"}
                download
                aria-label="Download attachment"
                className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          ) : msg.type === "video" && msg.mediaUrl ? (
            <video
              src={msg.mediaUrl}
              controls
              preload="metadata"
              className="max-h-72 w-full rounded-xl"
            />
          ) : (
            <p dir="auto" className="whitespace-pre-line">
              {msg.text}
            </p>
          )}

          {msg.mediaUrl && msg.type === "image" && (
            /* Native image is intentional: signed attachment hosts are dynamic. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={msg.mediaUrl}
              alt="Chat attachment"
              onClick={() => onPreviewMedia(msg.mediaUrl!)}
              className="mt-2 max-h-64 w-full cursor-pointer rounded-xl object-cover transition-opacity hover:opacity-90"
            />
          )}
        </div>

        {/* Timestamp & Message Delivery Status (rendered on last message of sequence) */}
        {!isGroupedWithNext && (
          <div className="mt-1 flex items-center gap-1 px-1 text-xs font-medium tabular-nums text-muted-foreground">
            <span>{msg.createdAt}</span>
            {isMe && (
              <span className="text-purple-300" aria-label="Persisted on server">
                <Check
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
