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
      <div className="flex justify-center my-3">
        <div className="rounded-xl glass-card px-4 py-1.5 text-xs text-purple-300 border border-purple-500/20 text-center max-w-sm shadow-xs font-medium">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setElementRef}
      className={`group relative flex items-end gap-2 ${
        isMe ? "flex-row-reverse" : "flex-row"
      } ${isGroupedWithPrev ? "mt-1" : "mt-4"}`}
    >
      {/* Partner Avatar (rendered only on the LAST message of a grouped sequence) */}
      {!isMe && (
        <div className="w-8 shrink-0">
          {!isGroupedWithNext && (
            <Link
              href={`/profile/${msgSender?.username || partner.username}`}
              className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 hover:opacity-80 transition-opacity"
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
        className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}
      >
        {/* Group Sender Attribution (rendered only on FIRST message of sequence) */}
        {isGroup && !isMe && !isGroupedWithPrev && msgSender && (
          <Link
            href={`/profile/${msgSender.username}`}
            className="text-[10px] font-bold text-purple-300 hover:underline mb-1 pl-1"
          >
            {msgSender.displayName}
          </Link>
        )}

        {/* Hover Actions Toolbar */}
        <div
          className={`absolute top-0 -translate-y-1/2 flex items-center gap-1 p-1 rounded-xl glass-panel border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 ${
            isMe ? "right-2" : "left-10"
          }`}
        >
          <button
            onClick={() =>
              onReply({
                id: msg.id,
                senderName: isMe ? "You" : msgSender?.displayName || "Stranger",
                text: msg.text || "Attachment",
              })
            }
            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white cursor-pointer"
            title="Reply"
          >
            <CornerUpLeft className="h-3 w-3" />
          </button>

          <button
            onClick={() => onCopy(msg.text)}
            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white cursor-pointer"
            title="Copy"
          >
            <Copy className="h-3 w-3" />
          </button>

          {isMe && (
            <button
              onClick={() => onDelete(msg.id)}
              className="p-1 rounded hover:bg-white/10 text-rose-400 hover:text-rose-300 cursor-pointer"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Message Bubble Container */}
        <div
          className={`rounded-2xl p-3 text-xs leading-relaxed shadow-sm relative transition-all ${
            isHighlighted
              ? "ring-2 ring-purple-400 bg-purple-600/30 scale-[1.02]"
              : ""
          } ${isMatched ? "ring-2 ring-purple-400 bg-purple-950/80" : ""} ${
            isMe
              ? "gradient-bg-primary text-white rounded-br-xs"
              : "bg-[#161c2e] text-foreground rounded-bl-xs border border-white/10"
          }`}
        >
          {/* Reply Reference Quote */}
          {msg.replyTo && (
            <button
              type="button"
              onClick={() => onScrollToMessage(msg.replyTo!.id)}
              className="mb-2 w-full p-2 rounded-lg bg-black/25 border-l-2 border-purple-400 text-[11px] hover:bg-black/40 transition-colors text-left"
            >
              <span className="font-bold text-purple-300 block">
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
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/10 min-w-[200px]">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-5 h-5 text-purple-400 shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-semibold truncate">
                    {msg.fileName || msg.text}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {msg.fileSize || "Attachment"}
                  </p>
                </div>
              </div>
              <a
                href={msg.mediaUrl || "#"}
                download
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white ml-2 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : msg.type === "video" && msg.mediaUrl ? (
            <video
              src={msg.mediaUrl}
              controls
              preload="metadata"
              className="rounded-xl max-h-72 w-full border border-white/10"
            />
          ) : (
            <p className="whitespace-pre-line">{msg.text}</p>
          )}

          {msg.mediaUrl && msg.type === "image" && (
            /* Native image is intentional: signed attachment hosts are dynamic. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={msg.mediaUrl}
              alt="Chat attachment"
              onClick={() => onPreviewMedia(msg.mediaUrl!)}
              className="mt-2 rounded-xl max-h-56 w-full object-cover border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
            />
          )}
        </div>

        {/* Timestamp & Message Delivery Status (rendered on last message of sequence) */}
        {!isGroupedWithNext && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1 px-1">
            <span>{msg.createdAt}</span>
            {isMe && (
              <span className="text-purple-300">
                <Check
                  className="h-3.5 w-3.5"
                  aria-label="Persisted on server"
                />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
