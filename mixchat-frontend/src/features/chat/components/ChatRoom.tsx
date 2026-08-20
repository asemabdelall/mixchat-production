"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useChat } from "@/shared/providers/ChatProvider";
import { GroupDetailsModal } from "./GroupDetailsModal";
import { DirectDetailsModal } from "./DirectDetailsModal";
import { MediaPreviewModal } from "./MediaPreviewModal";
import { ChatRoomHeader } from "./ChatRoomHeader";
import { ChatSearchBar } from "./ChatSearchBar";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatInputBar } from "./ChatInputBar";
import { ChatEmptyRoom } from "./ChatEmptyRoom";
import { MessageReply, User } from "@/types";
import { mediaService, MediaKind } from "@/services/media/mediaService";
import { offlineStorage } from "@/services/storage/offlineStorage";
import { useAuth } from "@/shared/providers/AuthProvider";

export const ChatRoom: React.FC = () => {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const {
    activeChat,
    messages,
    sendMessage,
    deleteMessage,
    setActiveChatId,
    currentUserId,
    isLoadingMessages,
    isLoadingOlder,
    hasOlderMessages,
    loadOlderMessages,
    typingUsers,
    presenceMap,
    startTyping,
    stopTyping,
  } = useChat();

  // Local UI State
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<MessageReply | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    url: string;
    type: "image" | "file";
  } | null>(null);

  // Modals & Sheets
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showDirectDetails, setShowDirectDetails] = useState(false);

  // Search & Navigation
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [recordingLevels, setRecordingLevels] = useState<number[]>(
    Array(20).fill(12),
  );
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Highlights & Toast
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingLevelsRef = useRef<number[]>(Array(20).fill(12));
  const recordingStartedAtRef = useRef(0);
  const recordingMimeTypeRef = useRef("audio/webm");
  const cancelRecordingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastRenderedMessageRef = useRef<string | null>(null);
  const renderedConversationRef = useRef<string | null>(null);
  const isNearBottomRef = useRef(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  useEffect(() => {
    const lastMessageId = messages.at(-1)?.id ?? null;
    const conversationChanged =
      renderedConversationRef.current !== activeChat?.id;
    const appended = lastRenderedMessageRef.current !== lastMessageId;
    const isOwnNewMessage = messages.at(-1)?.senderId === currentUserId;
    if (conversationChanged || (appended && (isNearBottomRef.current || isOwnNewMessage))) {
      messagesEndRef.current?.scrollIntoView({
        behavior: conversationChanged ? "auto" : "smooth",
      });
      isNearBottomRef.current = true;
    }
    renderedConversationRef.current = activeChat?.id ?? null;
    lastRenderedMessageRef.current = lastMessageId;
  }, [activeChat?.id, currentUserId, messages]);

  useEffect(() => {
    const attachmentUrl = pendingAttachment?.url;
    return () => {
      if (attachmentUrl) URL.revokeObjectURL(attachmentUrl);
    };
  }, [pendingAttachment?.url]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (analyserFrameRef.current) cancelAnimationFrame(analyserFrameRef.current);
      if (mediaRecorderRef.current?.state !== "inactive") {
        cancelRecordingRef.current = true;
        mediaRecorderRef.current?.stop();
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current) void audioContextRef.current.close();
    };
  }, []);

  const handleInputChange = (text?: string) => {
    const val = text || "";
    setInputText(val);
    if (!activeChat) return;
    if (val.trim()) {
      startTyping(activeChat.id);
    } else {
      stopTyping(activeChat.id);
    }
  };

  const handleScrollToMessage = useCallback((targetMessageId: string) => {
    const element = messageRefs.current[targetMessageId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(targetMessageId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    } else {
      showToast("Message is further up in history");
    }
  }, []);

  const copyToClipboard = useCallback((text?: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      showToast("Copied to clipboard 📋");
    }
  }, []);

  if (!activeChat) {
    return <ChatEmptyRoom />;
  }

  const rawPartner =
    activeChat.participants.find((p) => p.id !== currentUserId) ||
    activeChat.participants[0];
  const partnerPresence = rawPartner ? presenceMap[rawPartner.id] : undefined;
  const partner: User = rawPartner
    ? {
        ...rawPartner,
        online: partnerPresence?.status === "ONLINE" || rawPartner.online,
      }
    : rawPartner;

  const activeTypers = (activeChat ? typingUsers[activeChat.id] : []) || [];

  const matchingMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.text?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !pendingAttachment) || isSending) return;

    setIsSending(true);
    setUploadProgress(pendingAttachment ? 0 : null);

    stopTyping(activeChat.id);
    const messageText = inputText.trim();
    setInputText("");
    setReplyingTo(null);

    try {
      if (pendingAttachment) {
        const file = pendingAttachment.file;
        const type = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : "file";
        const kind: MediaKind =
          type === "image" ? "IMAGE" : type === "video" ? "VIDEO" : "FILE";
        const uploaded = await mediaService.uploadFile({
          file,
          kind,
          onProgress: setUploadProgress,
        });
        await sendMessage(activeChat.id, {
          type,
          text: messageText || undefined,
          mediaObjectIds: [uploaded.id],
          replyTo: replyingTo || undefined,
        });
        URL.revokeObjectURL(pendingAttachment.url);
        setPendingAttachment(null);
      } else {
        await sendMessage(activeChat.id, {
          type: "text",
          text: messageText,
          replyTo: replyingTo || undefined,
        });
      }
    } catch {
      showToast("Could not send message");
    } finally {
      setIsSending(false);
      setUploadProgress(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pendingAttachment?.url) URL.revokeObjectURL(pendingAttachment.url);
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("image/") ? "image" : "file";
    setPendingAttachment({ file, url, type });
    e.target.value = "";
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        recordingStreamRef.current = stream;
        const preferredMimeType = [
          "audio/webm;codecs=opus",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
        const mediaRecorder = new MediaRecorder(
          stream,
          preferredMimeType ? { mimeType: preferredMimeType } : undefined,
        );
        mediaRecorderRef.current = mediaRecorder;
        recordingMimeTypeRef.current = mediaRecorder.mimeType || "audio/webm";
        recordingChunksRef.current = [];
        cancelRecordingRef.current = false;
        recordingStartedAtRef.current = Date.now();

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) recordingChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          if (recordingTimerRef.current)
            clearInterval(recordingTimerRef.current);
          if (analyserFrameRef.current)
            cancelAnimationFrame(analyserFrameRef.current);
          if (audioContextRef.current) void audioContextRef.current.close();
          audioContextRef.current = null;
          analyserFrameRef.current = null;

          if (cancelRecordingRef.current) return;

          const durationMs = Date.now() - recordingStartedAtRef.current;
          if (durationMs < 600) {
            showToast("Hold longer to record a voice note");
            return;
          }

          const cleanDuration = Math.max(1, Math.round(durationMs));
          const cleanWaveform = recordingLevelsRef.current
            .slice(0, 32)
            .map((v) => Math.min(100, Math.max(0, Math.round(v))));

          const mimeType = recordingMimeTypeRef.current;
          const extension = mimeType.includes("ogg")
            ? "ogg"
            : mimeType.includes("mp4")
              ? "m4a"
              : "webm";
          const audioBlob = new Blob(recordingChunksRef.current, {
            type: mimeType,
          });
          const audioFile = new File([audioBlob], `voice_${Date.now()}.${extension}`, {
            type: mimeType,
          });

          setIsSending(true);
          try {
            const uploaded = await mediaService.uploadFile({
              file: audioFile,
              kind: "AUDIO" as MediaKind,
              durationMs: cleanDuration,
              onProgress: setUploadProgress,
            });

            await sendMessage(activeChat.id, {
              type: "voice",
              mediaObjectIds: [uploaded.id],
              durationMs: cleanDuration,
              waveform: cleanWaveform,
              replyTo: replyingTo || undefined,
            });
            if (user?.id) {
              offlineStorage.clearVoiceDraft(user.id);
            }
          } catch {
            showToast("Could not send voice note. Please try again.");
          } finally {
            setIsSending(false);
            setUploadProgress(null);
            setRecordTime(0);
          }
        };

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        audioContextRef.current = audioContext;

        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        const updateLevels = () => {
          analyser.getByteFrequencyData(frequencyData);
          const nextLevels = Array.from({ length: 20 }, (_, index) => {
              const dataIndex = Math.floor(
                (index / 20) * frequencyData.length,
              );
              return Math.max(
                8,
                Math.round((frequencyData[dataIndex] / 255) * 92),
              );
            });
          recordingLevelsRef.current = nextLevels;
          setRecordingLevels(nextLevels);
          analyserFrameRef.current = requestAnimationFrame(updateLevels);
        };

        mediaRecorder.start(100);
        updateLevels();
        setIsRecording(true);
        setRecordTime(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordTime((prev) => prev + 1);
        }, 1000);
      } catch {
        showToast("Microphone permission denied");
      }
    }
  };

  const cancelRecording = () => {
    cancelRecordingRef.current = true;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordTime(0);
  };

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-[#070913] lg:rounded-3xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(124,58,237,0.08),transparent_32%),radial-gradient(circle_at_82%_82%,rgba(37,99,235,0.06),transparent_30%)]"
      />
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={
              shouldReduceMotion ? false : { opacity: 0, y: -20, scale: 0.95 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="pointer-events-none fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-full bg-purple-600/95 px-4 py-2.5 text-sm font-semibold text-white shadow-2xl backdrop-blur-md"
            role="status"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <ChatRoomHeader
        activeChat={activeChat}
        partner={partner}
        activeTypers={activeTypers}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onBack={() => setActiveChatId(null)}
        onOpenDetails={() => {
          if (activeChat.isGroup) setShowGroupDetails(true);
          else setShowDirectDetails(true);
        }}
      />

      {/* Main Conversation Area */}
      <motion.div
        key={activeChat.id}
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex flex-col min-h-0 relative"
      >
        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={
                shouldReduceMotion ? false : { height: 0, opacity: 0 }
              }
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              className="overflow-hidden"
            >
              <ChatSearchBar
                searchQuery={searchQuery}
                onSearchQueryChange={(query) => {
                  setSearchQuery(query);
                  setCurrentMatchIndex(0);
                }}
                matchingMessages={matchingMessages}
                currentMatchIndex={currentMatchIndex}
                onPrevMatch={() =>
                  setCurrentMatchIndex((prev) =>
                    prev > 0 ? prev - 1 : matchingMessages.length - 1,
                  )
                }
                onNextMatch={() =>
                  setCurrentMatchIndex((prev) =>
                    prev < matchingMessages.length - 1 ? prev + 1 : 0,
                  )
                }
                onClose={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message List */}
        <div
          ref={messagesContainerRef}
          onScroll={async (event) => {
            const element = event.currentTarget;
            isNearBottomRef.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              120;
            if (element.scrollTop > 80 || !hasOlderMessages || isLoadingOlder)
              return;
            const previousHeight = element.scrollHeight;
            await loadOlderMessages();
            requestAnimationFrame(() => {
              element.scrollTop = element.scrollHeight - previousHeight;
            });
          }}
          className="custom-scrollbar relative flex-1 space-y-1.5 overflow-y-auto overscroll-contain bg-[#090c15]/55 px-3 py-4 sm:px-5 sm:py-5 lg:px-6"
          role="log"
          aria-label="Conversation messages"
        >
          {isLoadingOlder && (
            <p className="py-2 text-center text-sm font-medium text-white/55" role="status">
              Loading older messages…
            </p>
          )}
          {isLoadingMessages && messages.length === 0 && (
            <p className="py-8 text-center text-sm font-medium text-white/55" role="status">
              Loading messages…
            </p>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUserId;
            const msgSender = activeChat.participants.find(
              (p) => p.id === msg.senderId,
            );
            const isMatched =
              Boolean(searchQuery.trim()) &&
              Boolean(
                msg.text?.toLowerCase().includes(searchQuery.toLowerCase()),
              );
            const isHighlighted = highlightedMsgId === msg.id;

            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const nextMsg =
              idx < messages.length - 1 ? messages[idx + 1] : null;
            const isGroupedWithPrev = Boolean(
              prevMsg &&
              prevMsg.senderId === msg.senderId &&
              prevMsg.type !== "system",
            );
            const isGroupedWithNext = Boolean(
              nextMsg &&
              nextMsg.senderId === msg.senderId &&
              nextMsg.type !== "system",
            );

            return (
              <div
                key={msg.id}
                className="mx-auto w-full max-w-4xl"
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: "0 80px",
                }}
              >
                <ChatMessageItem
                  msg={msg}
                  isMe={isMe}
                  msgSender={msgSender}
                  partner={partner}
                  isGroup={Boolean(activeChat.isGroup)}
                  isGroupedWithPrev={isGroupedWithPrev}
                  isGroupedWithNext={isGroupedWithNext}
                  isHighlighted={isHighlighted}
                  isMatched={isMatched}
                  onReply={(reply) => setReplyingTo(reply)}
                  onCopy={copyToClipboard}
                  onDelete={(id) => deleteMessage(activeChat.id, id)}
                  onPreviewMedia={setPreviewMediaUrl}
                  onScrollToMessage={handleScrollToMessage}
                  setElementRef={(el) => {
                    messageRefs.current[msg.id] = el;
                  }}
                />
              </div>
            );
          })}

          {/* Typing Indicator Bubble */}
          <AnimatePresence>
            {activeTypers.length > 0 && (
              <motion.div
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, y: 10, scale: 0.95 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="mx-auto flex w-full max-w-4xl items-center gap-2 px-10 py-2 text-sm text-white/65"
                role="status"
              >
                <div className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
                <span className="truncate">
                  {activeTypers.length === 1
                    ? `${activeTypers[0].displayName} is typing...`
                    : `${activeTypers[0].displayName} & others typing...`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </motion.div>

      {/* Input Composer */}
      <ChatInputBar
        inputText={inputText}
        onInputTextChange={handleInputChange}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        pendingAttachment={pendingAttachment}
        onFileSelect={handleFileSelect}
        onClearAttachment={() => {
          if (pendingAttachment?.url)
            URL.revokeObjectURL(pendingAttachment.url);
          setPendingAttachment(null);
        }}
        isRecording={isRecording}
        recordTime={recordTime}
        recordingLevels={recordingLevels}
        isSending={isSending}
        uploadProgress={uploadProgress}
        onToggleRecording={toggleRecording}
        onCancelRecording={cancelRecording}
        onSend={handleSend}
      />

      {/* Contextual Modals */}
      <GroupDetailsModal
        chat={activeChat}
        isOpen={showGroupDetails}
        onClose={() => setShowGroupDetails(false)}
      />
      <DirectDetailsModal
        chat={activeChat}
        messages={messages}
        isOpen={showDirectDetails}
        onClose={() => setShowDirectDetails(false)}
        onOpenSearch={() => setShowSearch(true)}
      />
      <MediaPreviewModal
        mediaUrl={previewMediaUrl}
        onClose={() => setPreviewMediaUrl(null)}
      />
    </div>
  );
};
