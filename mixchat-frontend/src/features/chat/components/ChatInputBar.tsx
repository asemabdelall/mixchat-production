"use client";

import React, { useRef } from "react";
import {
  Smile,
  Paperclip,
  Trash2,
  Send,
  Mic,
  CornerUpLeft,
  FileText,
  X,
} from "lucide-react";
import { MessageReply } from "@/types";

interface ChatInputBarProps {
  inputText: string;
  onInputTextChange: (text: string) => void;
  replyingTo: MessageReply | null;
  onCancelReply: () => void;
  pendingAttachment: {
    file: File;
    url: string;
    type: "image" | "file";
  } | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAttachment: () => void;
  isRecording: boolean;
  recordTime: number;
  recordingLevels: number[];
  isSending: boolean;
  uploadProgress: number | null;
  onToggleRecording: () => void;
  onCancelRecording: () => void;
  onSend: (e?: React.FormEvent) => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  inputText,
  onInputTextChange,
  replyingTo,
  onCancelReply,
  pendingAttachment,
  onFileSelect,
  onClearAttachment,
  isRecording,
  recordTime,
  recordingLevels,
  isSending,
  uploadProgress,
  onToggleRecording,
  onCancelRecording,
  onSend,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const hasContent = Boolean(inputText.trim() || pendingAttachment);

  return (
    <div className="shrink-0 bg-[#070913]/95 backdrop-blur-2xl border-t border-white/10 z-30">
      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="px-4 py-2 bg-purple-950/60 border-b border-purple-500/20 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 truncate">
            <CornerUpLeft className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span className="font-bold text-purple-300">
              Replying to {replyingTo.senderName}:
            </span>
            <span className="text-white/60 truncate">{replyingTo.text}</span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-white/50 hover:text-white cursor-pointer"
            title="Cancel reply"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Attachment Pending Preview Bar */}
      {pendingAttachment && (
        <div className="px-4 py-2.5 bg-purple-950/60 border-b border-purple-500/20 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 truncate">
            {pendingAttachment.type === "image" ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-purple-500/30 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingAttachment.url}
                  alt="Pending"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="truncate">
              <p className="font-bold text-purple-300 truncate">
                {pendingAttachment.file.name}
              </p>
              <p className="text-[10px] text-white/50 font-mono">
                {(pendingAttachment.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClearAttachment();
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
            title="Remove attachment"
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        className="hidden"
      />

      {/* Main Composer Input Form */}
      <form
        onSubmit={onSend}
        className="p-2.5 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-end gap-2 max-w-5xl mx-auto"
      >
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => onInputTextChange(inputText + " 😊")}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all shrink-0"
          title="Add Emoji"
          aria-label="Add Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all shrink-0"
          title="Attach Image or File"
          aria-label="Attach Image or File"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Recording Visualizer vs Multiline Text Input */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-4 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold">
                Recording Audio... ({recordTime}s)
              </span>
              <div
                className="hidden sm:flex h-6 items-center gap-0.5"
                aria-hidden="true"
              >
                {recordingLevels.slice(-16).map((level, index) => (
                  <span
                    key={index}
                    className="w-0.5 rounded-full bg-rose-300 transition-[height] duration-100"
                    style={{
                      height: `${Math.max(4, Math.min(22, level / 4))}px`,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancelRecording}
                className="p-1.5 rounded-full text-rose-400 hover:text-white hover:bg-rose-500/30 cursor-pointer"
                title="Cancel Recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleRecording}
                className="px-3 py-1 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 cursor-pointer shadow-md"
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <textarea
            rows={1}
            placeholder="Message..."
            value={inputText}
            onChange={(e) => onInputTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1 min-h-[44px] max-h-28 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] p-3 px-4 text-xs sm:text-sm font-medium text-white placeholder:text-white/35 focus:border-purple-500/60 focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-purple-500/15 resize-none custom-scrollbar transition-all duration-200"
          />
        )}

        {/* Send Button or Voice Note Button */}
        {hasContent ? (
          <button
            type="submit"
            disabled={isSending}
            aria-label="Send Message"
            className="flex h-11 w-11 items-center justify-center rounded-full gradient-bg-primary hover:opacity-90 active:scale-90 text-white shadow-lg shadow-purple-500/40 transition-transform shrink-0"
          >
            {isSending ? (
              <span className="text-[10px] font-bold">
                {uploadProgress === null ? "…" : `${uploadProgress}%`}
              </span>
            ) : (
              <Send className="h-4 w-4 stroke-[2.5]" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleRecording}
            disabled={isSending}
            aria-label="Record Voice Note"
            title="Record Voice Note"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-purple-600 hover:text-white active:scale-90 text-purple-300 transition-all shrink-0"
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
      </form>
    </div>
  );
};
