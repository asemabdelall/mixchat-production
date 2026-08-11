"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Video,
  MoreVertical,
  Send,
  Mic,
  Paperclip,
  Smile,
  Ghost,
  Sparkles,
  UserCheck,
  UserX,
  ExternalLink,
  Shield,
  ChevronLeft,
  Pin,
  CornerUpLeft,
  Copy,
  Trash2,
  X,
  CheckCheck,
  Users,
  StopCircle,
  Forward,
  Search,
  ChevronUp,
  ChevronDown,
  FileText,
  Download,
  ShieldAlert,
  MessageSquare,
} from "lucide-react";
import { useChat } from "@/shared/providers/ChatProvider";
import { useCall } from "@/shared/providers/CallProvider";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { VoiceNotePlayer } from "./VoiceNotePlayer";
import { GroupDetailsModal } from "./GroupDetailsModal";
import { DirectDetailsModal } from "./DirectDetailsModal";
import { MediaPreviewModal } from "./MediaPreviewModal";
import { ForwardModal } from "./ForwardModal";
import { ReportUserModal } from "./ReportUserModal";
import { UserProfileSheet } from "./UserProfileSheet";
import { NewChatModal } from "./NewChatModal";
import { CreateGroupModal } from "./CreateGroupModal";
import { Message, MessageReply } from "@/types";

const EMOJI_REACTIONS = ["❤️", "😂", "🔥", "😮", "😢", "👍"];

export const ChatRoom: React.FC = () => {
  const {
    activeChat,
    messages,
    sendMessage,
    reactToMessage,
    pinMessage,
    deleteMessage,
    setActiveChatId,
    requestIdentity,
    respondIdentityRequest,
    muteChat,
    unmuteChat,
    startAnonymousSearch,
  } = useChat();
  const { startCall } = useCall();

  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<MessageReply | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    url: string;
    type: "image" | "file";
  } | null>(null);

  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showDirectDetails, setShowDirectDetails] = useState(false);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [reportingUserId, setReportingUserId] = useState<string | null>(null);
  const [inspectUser, setInspectUser] = useState<import("@/types").User | null>(null);

  // Quick Action Modal States for Empty Room
  const [showEmptyNewChat, setShowEmptyNewChat] = useState(false);
  const [showEmptyCreateGroup, setShowEmptyCreateGroup] = useState(false);

  // Scroll & Highlight target state
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // In-chat search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Auto-scroll to bottom on message stream update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeChat?.id]);

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  if (!activeChat) {
    return (
      <>
        <div className="flex-1 flex flex-col items-center justify-center p-8 glass-panel rounded-2xl h-[calc(100vh-8rem)] text-center select-none space-y-6">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full gradient-bg-primary opacity-30 blur-xl animate-pulse" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl gradient-bg-primary text-white shadow-2xl border border-white/20">
              <MessageSquare className="h-10 w-10" />
            </div>
          </div>

          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-black text-white tracking-wide">
              Your conversations live here.
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select a conversation from the left menu or use one of the quick actions below to connect instantly across Mix Chat.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => setShowEmptyNewChat(true)}
              size="sm"
              className="gap-2 font-bold shadow-lg shadow-purple-500/25"
            >
              <MessageSquare className="h-4 w-4" />
              <span>New Message</span>
            </Button>

            <Button
              onClick={() => setShowEmptyCreateGroup(true)}
              variant="glass"
              size="sm"
              className="gap-2 text-purple-300 border-purple-500/30"
            >
              <Users className="h-4 w-4 text-purple-400" />
              <span>Start Group</span>
            </Button>

            <Button
              onClick={() => startAnonymousSearch("Casual Chat")}
              variant="accent"
              size="sm"
              className="gap-2 font-bold shadow-lg shadow-pink-500/20"
            >
              <Ghost className="h-4 w-4" />
              <span>Anonymous Match</span>
            </Button>
          </div>
        </div>

        {/* Quick Action Modals */}
        <NewChatModal isOpen={showEmptyNewChat} onClose={() => setShowEmptyNewChat(false)} />
        <CreateGroupModal isOpen={showEmptyCreateGroup} onClose={() => setShowEmptyCreateGroup(false)} />
      </>
    );
  }

  const partner = activeChat.participants.find((p) => p.id !== "u_me") || activeChat.participants[0];
  const pinnedMsg = messages.find((m) => m.id === activeChat.pinnedMessageId);

  // Matching messages for in-chat search
  const matchingMessages = searchQuery.trim()
    ? messages.filter((m) => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !pendingAttachment) return;

    if (pendingAttachment) {
      const type = pendingAttachment.type === "image" ? "image" : "file";
      sendMessage(
        activeChat.id,
        inputText.trim() || (type === "image" ? "Sent an image" : pendingAttachment.file.name),
        type,
        pendingAttachment.url,
        replyingTo || undefined,
        { name: pendingAttachment.file.name, size: `${(pendingAttachment.file.size / 1024).toFixed(1)} KB` }
      );
      URL.revokeObjectURL(pendingAttachment.url);
      setPendingAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      sendMessage(activeChat.id, inputText.trim(), "text", undefined, replyingTo || undefined);
    }

    setInputText("");
    setReplyingTo(null);
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (pendingAttachment?.url) URL.revokeObjectURL(pendingAttachment.url);
      const url = URL.createObjectURL(file);
      const isImage = file.type.startsWith("image/");
      setPendingAttachment({
        file,
        url,
        type: isImage ? "image" : "file",
      });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      const duration = recordTime > 0 ? recordTime : 8;
      sendMessage(activeChat.id, `Voice Note (${duration}s)`, "voice");
      setRecordTime(0);
    } else {
      setIsRecording(true);
      setRecordTime(1);
      recordingTimerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordTime(0);
  };

  const copyToClipboard = (text?: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      showToast("Message text copied to clipboard 📋");
    }
  };

  // Product Innovation #2: Quoted Reply Auto-Scroll & Highlight
  const handleScrollToMessage = (targetMsgId: string) => {
    const targetEl = messageRefs.current[targetMsgId];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(targetMsgId);
      setTimeout(() => setHighlightedMsgId(null), 1600);
    }
  };

  return (
    <div className="flex-1 flex flex-col glass-panel rounded-none lg:rounded-2xl h-full lg:h-[calc(100vh-8rem)] overflow-hidden border-0 lg:border border-white/10 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-purple-600/90 text-white backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold shadow-lg border border-purple-400/40"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-[#0d121f]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Mobile Back Button */}
          <button
            onClick={() => setActiveChatId(null)}
            className="lg:hidden p-1.5 rounded-xl glass-card text-muted-foreground hover:text-white transition-colors cursor-pointer"
            aria-label="Back to conversations"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {activeChat.isAnonymous ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg-accent text-white shadow-md">
              <Ghost className="h-5 w-5" />
            </div>
          ) : (
            <div
              onClick={() => setInspectUser(partner)}
              className="cursor-pointer"
            >
              <Avatar
                src={activeChat.isGroup ? activeChat.groupAvatar || "" : partner.avatar}
                alt={activeChat.isGroup ? activeChat.groupName || "" : partner.displayName}
                size="md"
                online={partner.online}
                isVerified={partner.role === "verified"}
              />
            </div>
          )}

          <div>
            <div
              onClick={() => setInspectUser(partner)}
              className="flex items-center gap-2 cursor-pointer hover:underline"
            >
              <h3 className="font-bold text-sm text-foreground">
                {activeChat.isGroup
                  ? activeChat.groupName
                  : activeChat.isAnonymous
                  ? activeChat.revealedPartner
                    ? activeChat.revealedPartner.displayName
                    : "Anonymous Stranger"
                  : partner.displayName}
              </h3>
              {activeChat.isGroup && (
                <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded-full">
                  <Users className="w-3 h-3" /> {activeChat.participants.length}
                </span>
              )}
              {activeChat.isMuted && (
                <span className="text-[10px] text-muted-foreground">🔕</span>
              )}
              {activeChat.streakCount && (
                <span className="flex items-center gap-0.5 text-[11px] font-extrabold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                  🔥 {activeChat.streakCount}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {activeChat.isGroup
                ? `${activeChat.participants.map((p) => p.displayName).slice(0, 3).join(", ")}...`
                : activeChat.isAnonymous
                ? `Topic: ${activeChat.anonymousTopic || "General Talk"}`
                : partner.online
                ? "Active Now"
                : `Last seen ${partner.lastSeen || "recently"}`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-xl glass-card transition-colors cursor-pointer ${
              showSearch ? "text-purple-400 bg-white/10" : "text-muted-foreground hover:text-white"
            }`}
            title="Search inside conversation"
            aria-label="Search inside conversation"
          >
            <Search className="h-4 w-4" />
          </button>

          {!activeChat.isAnonymous && !activeChat.isGroup && (
            <>
              <button
                onClick={() => startCall(partner, "voice")}
                className="p-2 rounded-xl glass-card text-purple-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Voice Call"
                aria-label="Voice Call"
              >
                <Phone className="h-4 w-4" />
              </button>

              <button
                onClick={() => startCall(partner, "video")}
                className="p-2 rounded-xl glass-card text-blue-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Video Call"
                aria-label="Video Call"
              >
                <Video className="h-4 w-4" />
              </button>
            </>
          )}

          {activeChat.isAnonymous && (
            <button
              onClick={() => setReportingUserId(partner.id)}
              className="p-2 rounded-xl glass-card text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
              title="Report Stranger"
              aria-label="Report Stranger"
            >
              <ShieldAlert className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => (activeChat.isGroup ? setShowGroupDetails(true) : setShowDirectDetails(true))}
            className="p-2 rounded-xl glass-card text-muted-foreground hover:text-white transition-colors cursor-pointer"
            title="Details & Settings"
            aria-label="Details & Settings"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* In-Chat Message Search Query Bar */}
      {showSearch && (
        <div className="bg-purple-950/60 border-b border-purple-500/30 p-2.5 px-4 flex items-center justify-between gap-2 text-xs">
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-purple-400 shrink-0" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              className="h-8 text-xs bg-black/40 border-white/10"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-purple-300 font-mono">
              {matchingMessages.length > 0 ? `${currentMatchIndex + 1} of ${matchingMessages.length}` : "No matches"}
            </span>

            {matchingMessages.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentMatchIndex((prev) => (prev > 0 ? prev - 1 : matchingMessages.length - 1))}
                  className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setCurrentMatchIndex((prev) => (prev < matchingMessages.length - 1 ? prev + 1 : 0))}
                  className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="p-1 rounded text-muted-foreground hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Anonymous Identity Reveal Banner */}
      {activeChat.isAnonymous && (
        <div className="bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-slate-900/80 p-3 px-4 border-b border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-400 shrink-0" />
            <span>
              {activeChat.identityStatus === "accepted" && activeChat.revealedPartner
                ? `Identity Revealed: @${activeChat.revealedPartner.username}`
                : activeChat.identityStatus === "pending"
                ? "Identity request pending..."
                : "Your identities are encrypted and private."}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(!activeChat.identityStatus || activeChat.identityStatus === "none") && (
              <Button
                onClick={() => requestIdentity(activeChat.id)}
                size="xs"
                variant="accent"
                className="h-7 text-[11px] font-bold"
              >
                <Sparkles className="h-3 w-3" />
                <span>Request Identity</span>
              </Button>
            )}

            {activeChat.identityStatus === "pending" && (
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => respondIdentityRequest(activeChat.id, true)}
                  size="xs"
                  className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500"
                >
                  <UserCheck className="h-3 w-3" />
                  <span>Accept Reveal</span>
                </Button>
                <Button
                  onClick={() => respondIdentityRequest(activeChat.id, false)}
                  size="xs"
                  variant="glass"
                  className="h-7 text-[10px] text-rose-400"
                >
                  <UserX className="h-3 w-3" />
                  <span>Decline</span>
                </Button>
              </div>
            )}

            {activeChat.identityStatus === "accepted" && activeChat.revealedPartner && (
              <Link href={`/profile/${activeChat.revealedPartner.username}`}>
                <Button size="xs" variant="glass" className="h-7 text-[11px] text-purple-300">
                  <span>View Profile</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Pinned Message Banner */}
      {pinnedMsg && (
        <div className="bg-purple-950/60 border-b border-purple-500/30 px-4 py-2 flex items-center justify-between text-xs">
          <div
            onClick={() => handleScrollToMessage(pinnedMsg.id)}
            className="flex items-center gap-2 truncate cursor-pointer hover:underline"
          >
            <Pin className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span className="font-semibold text-purple-300 shrink-0">Pinned:</span>
            <span className="text-muted-foreground truncate">{pinnedMsg.text}</span>
          </div>
          <button
            onClick={() => pinMessage(activeChat.id, pinnedMsg.id)}
            className="text-muted-foreground hover:text-white ml-2 text-[10px] underline cursor-pointer"
          >
            Unpin
          </button>
        </div>
      )}

      {/* Messages Stream with Visual Grouping */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3 bg-[#090c15]/80">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === "u_me";
          const msgSender = activeChat.participants.find((p) => p.id === msg.senderId);
          const isMatched = searchQuery.trim() && msg.text?.toLowerCase().includes(searchQuery.toLowerCase());
          const isHighlighted = highlightedMsgId === msg.id;

          // Visual Grouping logic: consecutive messages from same sender within 5 mins
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
          const isGroupedWithPrev = prevMsg && prevMsg.senderId === msg.senderId && prevMsg.type !== "system";
          const isGroupedWithNext = nextMsg && nextMsg.senderId === msg.senderId && nextMsg.type !== "system";

          if (msg.type === "system") {
            return (
              <div key={msg.id} className="flex justify-center my-3">
                <div className="rounded-xl glass-card px-4 py-1.5 text-xs text-purple-300 border border-purple-500/20 text-center max-w-sm shadow-xs font-medium">
                  {msg.text}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              ref={(el) => {
                messageRefs.current[msg.id] = el;
              }}
              className={`group relative flex items-end gap-2 ${
                isMe ? "flex-row-reverse" : "flex-row"
              } ${isGroupedWithPrev ? "mt-1" : "mt-4"}`}
            >
              {/* Partner Avatar (rendered only on the LAST message of a grouped sequence) */}
              {!isMe && (
                <div className="w-8 shrink-0">
                  {!isGroupedWithNext && (
                    <Avatar
                      src={msgSender?.avatar || partner.avatar}
                      alt={msgSender?.displayName || partner.displayName}
                      size="sm"
                    />
                  )}
                </div>
              )}

              <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                {/* Group Sender Attribution (rendered only on FIRST message of sequence) */}
                {activeChat.isGroup && !isMe && !isGroupedWithPrev && msgSender && (
                  <span className="text-[10px] font-bold text-purple-300 mb-1 pl-1">
                    {msgSender.displayName}
                  </span>
                )}

                {/* Hover Actions Toolbar */}
                <div
                  className={`absolute top-0 -translate-y-1/2 flex items-center gap-1 p-1 rounded-xl glass-panel border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 ${
                    isMe ? "right-2" : "left-10"
                  }`}
                >
                  {/* Emoji Quick Picker */}
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => reactToMessage(activeChat.id, msg.id, emoji)}
                      className="hover:scale-125 transition-transform p-0.5 text-xs cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}

                  <span className="w-px h-3 bg-white/20 mx-0.5" />

                  <button
                    onClick={() =>
                      setReplyingTo({
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
                    onClick={() => setForwardingMsg(msg)}
                    className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white cursor-pointer"
                    title="Forward"
                  >
                    <Forward className="h-3 w-3" />
                  </button>

                  <button
                    onClick={() => pinMessage(activeChat.id, msg.id)}
                    className={`p-1 rounded hover:bg-white/10 cursor-pointer ${
                      msg.isPinned ? "text-purple-400" : "text-muted-foreground hover:text-white"
                    }`}
                    title="Pin"
                  >
                    <Pin className="h-3 w-3" />
                  </button>

                  <button
                    onClick={() => copyToClipboard(msg.text)}
                    className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white cursor-pointer"
                    title="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </button>

                  {isMe && (
                    <button
                      onClick={() => deleteMessage(activeChat.id, msg.id)}
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
                    isHighlighted ? "ring-2 ring-purple-400 bg-purple-600/30 scale-[1.02]" : ""
                  } ${
                    isMatched ? "ring-2 ring-purple-400 bg-purple-950/80" : ""
                  } ${
                    isMe
                      ? "gradient-bg-primary text-white rounded-br-xs"
                      : "bg-[#161c2e] text-foreground rounded-bl-xs border border-white/10"
                  }`}
                >
                  {/* Forwarded Tag */}
                  {msg.isForwarded && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-300 mb-1">
                      <Forward className="w-3 h-3" />
                      <span>Forwarded message</span>
                    </div>
                  )}

                  {/* Reply Reference Quote */}
                  {msg.replyTo && (
                    <div
                      onClick={() => handleScrollToMessage(msg.replyTo!.id)}
                      className="mb-2 p-2 rounded-lg bg-black/25 border-l-2 border-purple-400 text-[11px] cursor-pointer hover:bg-black/40 transition-colors"
                    >
                      <span className="font-bold text-purple-300 block">{msg.replyTo.senderName}</span>
                      <span className="text-muted-foreground truncate block">{msg.replyTo.text}</span>
                    </div>
                  )}

                  {msg.type === "voice" ? (
                    <VoiceNotePlayer duration={msg.voiceDuration || 14} />
                  ) : msg.type === "file" ? (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/10 min-w-[200px]">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-5 h-5 text-purple-400 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate">{msg.fileName || msg.text}</p>
                          <p className="text-[10px] text-muted-foreground">{msg.fileSize || "Attachment"}</p>
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
                  ) : (
                    <p className="whitespace-pre-line">{msg.text}</p>
                  )}

                  {msg.mediaUrl && msg.type === "image" && (
                    <img
                      src={msg.mediaUrl}
                      alt="Chat attachment"
                      onClick={() => setPreviewMediaUrl(msg.mediaUrl || null)}
                      className="mt-2 rounded-xl max-h-56 w-full object-cover border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  )}

                  {/* Reactions Pill Display */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {msg.reactions.map((rx) => {
                        const hasReacted = rx.users.includes("u_me");
                        return (
                          <button
                            key={rx.emoji}
                            onClick={() => reactToMessage(activeChat.id, msg.id, rx.emoji)}
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                              hasReacted
                                ? "bg-purple-500/30 border-purple-500 text-white font-bold"
                                : "bg-black/30 border-white/10 text-muted-foreground hover:text-white"
                            }`}
                          >
                            <span>{rx.emoji}</span>
                            <span>{rx.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Timestamp & Message Delivery Status (rendered on last message of sequence) */}
                {!isGroupedWithNext && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1 px-1">
                    <span>{msg.createdAt}</span>
                    {isMe && (
                      <span className="text-purple-300">
                        <CheckCheck className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="px-4 py-2 bg-purple-950/40 border-t border-purple-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <CornerUpLeft className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span className="font-semibold text-purple-300">Replying to {replyingTo.senderName}:</span>
            <span className="text-muted-foreground truncate">{replyingTo.text}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 text-muted-foreground hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Attachment Pending Preview Bar */}
      {pendingAttachment && (
        <div className="px-4 py-2 bg-purple-950/40 border-t border-purple-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 truncate">
            {pendingAttachment.type === "image" ? (
              <img src={pendingAttachment.url} alt="Pending" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <FileText className="w-6 h-6 text-purple-400 shrink-0" />
            )}
            <div className="truncate">
              <p className="font-semibold text-purple-300 truncate">{pendingAttachment.file.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {(pendingAttachment.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              URL.revokeObjectURL(pendingAttachment.url);
              setPendingAttachment(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="p-1 text-muted-foreground hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

      {/* Multiline Input Composer */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-[#0d121f]/90 backdrop-blur-md flex items-end gap-2">
        <button
          type="button"
          onClick={() => setInputText((prev) => prev + " 😊")}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Add Emoji"
          aria-label="Add Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Attach Image or File"
          aria-label="Attach Image or File"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-4 h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold">Recording Voice Note... ({recordTime}s)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1 text-rose-400 hover:text-white cursor-pointer"
                title="Cancel Recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button type="button" onClick={toggleRecording} className="text-white font-bold hover:underline cursor-pointer">
                Send
              </button>
            </div>
          </div>
        ) : (
          <textarea
            rows={1}
            placeholder="Write a message... (Enter to send, Shift+Enter for new line)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDownTextarea}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none max-h-24 custom-scrollbar"
          />
        )}

        {inputText.trim() || pendingAttachment ? (
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label="Send Message">
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={toggleRecording}
            variant="glass"
            size="icon"
            className={`h-10 w-10 shrink-0 rounded-xl transition-colors ${
              isRecording ? "text-rose-400 border-rose-500" : "text-purple-400"
            }`}
            title="Voice Note"
            aria-label="Voice Note"
          >
            {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        )}
      </form>

      {/* Contextual User Profile Sheet */}
      {inspectUser && (
        <UserProfileSheet
          isOpen={!!inspectUser}
          onClose={() => setInspectUser(null)}
          user={inspectUser}
          isMuted={activeChat.isMuted}
          onMuteToggle={() => {
            if (activeChat.isMuted) unmuteChat(activeChat.id);
            else muteChat(activeChat.id);
          }}
        />
      )}

      {/* Supporting Modals */}
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
        onOpenReport={(userId) => setReportingUserId(userId)}
      />
      <MediaPreviewModal mediaUrl={previewMediaUrl} onClose={() => setPreviewMediaUrl(null)} />
      <ForwardModal
        message={forwardingMsg}
        isOpen={!!forwardingMsg}
        onClose={() => setForwardingMsg(null)}
      />
      <ReportUserModal
        userId={reportingUserId}
        isOpen={!!reportingUserId}
        onClose={() => setReportingUserId(null)}
      />
    </div>
  );
};
