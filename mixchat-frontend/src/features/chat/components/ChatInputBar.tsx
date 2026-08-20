"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useRef, useState } from "react";
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

const ChatEmojiPicker = dynamic(
  () =>
    import("./ChatEmojiPicker").then((module) => module.ChatEmojiPicker),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[min(420px,52dvh)] w-full items-center justify-center rounded-[1.4rem] bg-[#0d1220] text-sm font-semibold text-white/55"
        role="status"
      >
        Loading emojis…
      </div>
    ),
  },
);

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef({
    start: inputText.length,
    end: inputText.length,
  });
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const rememberSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  };

  const closeEmojiPicker = (restoreFocus = false) => {
    setIsEmojiPickerOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(
          selectionRef.current.start,
          selectionRef.current.end,
        );
      });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const { start, end } = selectionRef.current;
    const nextText = `${inputText.slice(0, start)}${emoji}${inputText.slice(end)}`;
    const nextCaretPosition = start + emoji.length;

    onInputTextChange(nextText);
    selectionRef.current = {
      start: nextCaretPosition,
      end: nextCaretPosition,
    };

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.setSelectionRange(nextCaretPosition, nextCaretPosition);
      textarea.style.height = "48px";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    closeEmojiPicker();
    onSend(event);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      closeEmojiPicker();
      onSend();
    }
  };

  const hasContent = Boolean(inputText.trim() || pendingAttachment);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    textarea.style.height = "48px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    onInputTextChange(textarea.value);
  };

  useEffect(() => {
    if (!inputText && textareaRef.current) {
      textareaRef.current.style.height = "48px";
      selectionRef.current = { start: 0, end: 0 };
    }
  }, [inputText]);

  useEffect(() => {
    if (!isEmojiPickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        emojiPickerRef.current?.contains(target) ||
        emojiButtonRef.current?.contains(target)
      ) {
        return;
      }
      closeEmojiPicker();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsEmojiPickerOpen(false);
      requestAnimationFrame(() => emojiButtonRef.current?.focus());
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isEmojiPickerOpen]);

  return (
    <div className="relative z-30 shrink-0 bg-gradient-to-t from-[#070913] via-[#070913]/98 to-[#070913]/90 backdrop-blur-2xl">
      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="animate-in slide-in-from-bottom-2 mx-3 mt-2 flex min-h-12 items-center justify-between rounded-2xl bg-purple-500/10 px-3 py-2 text-sm sm:mx-4">
          <div className="flex min-w-0 items-center gap-2 truncate">
            <CornerUpLeft className="h-4 w-4 shrink-0 text-purple-300" aria-hidden="true" />
            <span className="shrink-0 font-bold text-purple-200">
              Replying to {replyingTo.senderName}:
            </span>
            <span className="text-white/60 truncate">{replyingTo.text}</span>
          </div>
          <button
            onClick={onCancelReply}
            type="button"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
            title="Cancel reply"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Attachment Pending Preview Bar */}
      {pendingAttachment && (
        <div className="animate-in slide-in-from-bottom-2 mx-3 mt-2 flex min-h-14 items-center justify-between rounded-2xl bg-purple-500/10 px-3 py-2.5 text-sm sm:mx-4">
          <div className="flex min-w-0 items-center gap-3 truncate">
            {pendingAttachment.type === "image" ? (
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingAttachment.url}
                  alt={`Pending attachment: ${pendingAttachment.file.name}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <div className="truncate">
              <p className="font-bold text-purple-300 truncate">
                {pendingAttachment.file.name}
              </p>
              <p className="text-xs font-medium text-white/55">
                {(pendingAttachment.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClearAttachment();
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            type="button"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
            title="Remove attachment"
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" aria-hidden="true" />
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

      {isEmojiPickerOpen && !isRecording && (
        <div className="pointer-events-none absolute inset-x-0 bottom-full z-50 mx-auto max-w-4xl px-2.5 pb-2 sm:px-4 sm:pb-3">
          <div
            ref={emojiPickerRef}
            id="chat-emoji-picker"
            role="dialog"
            aria-label="Choose an emoji"
            tabIndex={-1}
            className="emoji-picker-popover pointer-events-auto w-full max-w-[22rem] overflow-hidden rounded-[1.4rem] bg-[#0d1220] outline-none shadow-[0_22px_70px_rgba(0,0,0,0.58),0_0_0_1px_rgba(167,139,250,0.16)]"
          >
            <ChatEmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
        </div>
      )}

      {/* Main Composer Input Form */}
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-4xl items-end gap-2 px-2.5 pt-2.5 pb-safe-chat-input sm:px-4 sm:pt-3"
      >
        {/* Recording state or unified WhatsApp-style composer */}
        {isRecording ? (
          <div className="flex min-h-12 min-w-0 flex-1 items-center justify-between rounded-3xl bg-rose-500/15 px-2 pl-4 text-sm text-rose-200 ring-1 ring-inset ring-rose-400/20">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold">
                Recording… {recordTime}s
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
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-rose-300 transition-colors hover:bg-rose-500/20 hover:text-white active:bg-rose-500/25"
                title="Cancel Recording"
                aria-label="Cancel recording"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onToggleRecording}
                className="min-h-11 cursor-pointer rounded-full bg-rose-600 px-4 text-sm font-bold text-white shadow-md transition-colors hover:bg-rose-500 active:bg-rose-400"
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-12 min-w-0 flex-1 items-end rounded-[1.65rem] bg-white/[0.065] ring-1 ring-inset ring-white/[0.035] transition-colors hover:bg-white/[0.08] focus-within:bg-white/[0.095] focus-within:ring-2 focus-within:ring-purple-400/65">
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={(event) => {
                if (isEmojiPickerOpen) {
                  closeEmojiPicker(true);
                  return;
                }
                setIsEmojiPickerOpen(true);
                if (event.detail === 0) {
                  requestAnimationFrame(() => emojiPickerRef.current?.focus());
                }
              }}
              onPointerDown={rememberSelection}
              aria-label={
                isEmojiPickerOpen ? "Close emoji picker" : "Open emoji picker"
              }
              aria-haspopup="dialog"
              aria-controls="chat-emoji-picker"
              aria-expanded={isEmojiPickerOpen}
              className={`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:text-white active:bg-white/[0.08] ${
                isEmojiPickerOpen
                  ? "bg-purple-500/15 text-purple-300"
                  : "text-white/55"
              }`}
              title="Emojis"
            >
              <Smile className="h-5 w-5" aria-hidden="true" />
            </button>
            <textarea
              ref={textareaRef}
              dir="auto"
              rows={1}
              aria-label="Message"
              enterKeyHint="send"
              placeholder="Message..."
              value={inputText}
              onChange={handleTextChange}
              onSelect={rememberSelection}
              onClick={rememberSelection}
              onKeyUp={rememberSelection}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className="custom-scrollbar min-h-12 max-h-[120px] min-w-0 flex-1 resize-none bg-transparent py-3 text-base font-medium leading-6 text-white outline-none placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => {
                closeEmojiPicker();
                fileInputRef.current?.click();
              }}
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/55 transition-colors hover:text-white active:bg-white/[0.08]"
              title="Attach Image or File"
              aria-label="Attach Image or File"
            >
              <Paperclip className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Send Button or Voice Note Button */}
        {!isRecording &&
          (hasContent ? (
            <button
              type="submit"
              disabled={isSending}
              aria-label="Send Message"
              className="gradient-bg-primary flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-lg shadow-purple-500/30 transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? (
                <span className="text-xs font-bold tabular-nums">
                  {uploadProgress === null ? "…" : `${uploadProgress}%`}
                </span>
              ) : (
                <Send
                  className="h-5 w-5 stroke-[2.5]"
                  aria-hidden="true"
                />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                closeEmojiPicker();
                onToggleRecording();
              }}
              disabled={isSending}
              aria-label="Record Voice Note"
              title="Record Voice Note"
              className="gradient-bg-primary flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-lg shadow-purple-500/20 transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mic className="h-5 w-5" aria-hidden="true" />
            </button>
          ))}
      </form>
    </div>
  );
};
