"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  SkipForward,
  Eye,
  Shield,
  Sparkles,
  UserCheck,
  MessageSquare,
  LogOut,
  AlertCircle,
  Play,
  Pause,
  Mic,
  Smile,
  CheckCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  AnonymousSessionDto,
  AnonymousMessageDto,
  AnonymousRevealedUserDto,
} from "@/services/anonymous/anonymousService";
import { PartnerConnectionState } from "../hooks/useAnonymousChat";
import { RevealIdentitySheet } from "./RevealIdentitySheet";
import { AnonymousSafetySheet } from "./AnonymousSafetySheet";
import { Button } from "@/shared/components/ui/Button";
import { socialService } from "@/services/social/socialService";
import { mediaService } from "@/services/media/mediaService";

interface AnonymousChatRoomProps {
  session: AnonymousSessionDto;
  messages: AnonymousMessageDto[];
  isPartnerTyping: boolean;
  partnerConnectionStatus: PartnerConnectionState;
  isRevealRequestedByPartner: boolean;
  revealedPartner: AnonymousRevealedUserDto | null;
  isRevealed: boolean;
  onSendMessage: (
    content?: string,
    mediaId?: string,
    voiceDurationMs?: number,
  ) => void;
  onSendTyping: (isTyping: boolean) => void;
  onSkipMatch: (requeue?: boolean) => void;
  onLeaveSession: () => void;
  onRequestReveal: () => void;
  onCancelReveal: () => void;
  onBlockPartner: () => void;
  onReportPartner: (reason: string, details?: string) => void;
  isSending?: boolean;
}

export const AnonymousChatRoom: React.FC<AnonymousChatRoomProps> = ({
  session,
  messages,
  isPartnerTyping,
  partnerConnectionStatus,
  isRevealRequestedByPartner,
  revealedPartner,
  isRevealed,
  onSendMessage,
  onSendTyping,
  onSkipMatch,
  onLeaveSession,
  onRequestReveal,
  onCancelReveal,
  onBlockPartner,
  onReportPartner,
  isSending = false,
}) => {
  const [inputText, setInputText] = useState("");
  const [isRevealSheetOpen, setIsRevealSheetOpen] = useState(false);
  const [isSafetySheetOpen, setIsSafetySheetOpen] = useState(false);
  const [isFollowingPartner, setIsFollowingPartner] = useState(false);
  const [isPlayingAudioId, setIsPlayingAudioId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPartnerTyping]);

  // Handle Text Send
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;
    onSendMessage(clean);
    setInputText("");
    onSendTyping(false);
  };

  // Handle Input Changes & Typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (e.target.value.length > 0) {
      onSendTyping(true);
    } else {
      onSendTyping(false);
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
          type: "audio/webm",
        });

        try {
          // Upload voice note directly to Cloudflare R2
          const uploaded = await mediaService.uploadFile({
            file: audioFile,
            kind: "AUDIO",
          });
          onSendMessage(undefined, uploaded.id, recordingDuration * 1000);
        } catch {
          // Upload fallback
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      recorder.start();
      setIsRecordingVoice(true);
      setRecordingDuration(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      // Audio permission denied or unavailable
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }
  };

  // Audio Playback
  const togglePlayAudio = (id: string, url?: string) => {
    if (!url) return;
    if (isPlayingAudioId === id) {
      audioElementRef.current?.pause();
      setIsPlayingAudioId(null);
    } else {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      const audio = new Audio(url);
      audioElementRef.current = audio;
      audio.onended = () => setIsPlayingAudioId(null);
      audio.play();
      setIsPlayingAudioId(id);
    }
  };

  const handleFollowPartner = async () => {
    if (!revealedPartner) return;
    try {
      await socialService.followUser(revealedPartner.id);
      setIsFollowingPartner(true);
    } catch {
      // Handled
    }
  };

  const partnerPersona = session.partner || {
    id: "anon_partner",
    displayName: "Anonymous Stranger",
    avatar: "/mixchat-icon.png",
    theme: "from-purple-500 to-indigo-500",
  };

  const isSessionEnded =
    session.status === "ENDED" || partnerConnectionStatus === "DISCONNECTED";

  return (
    <div className="relative flex flex-col h-[calc(100vh-4.5rem)] max-w-4xl mx-auto w-full bg-zinc-950/80 backdrop-blur-xl border-x border-zinc-800/80 shadow-2xl overflow-hidden">
      {/* 1. Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800">
        {/* Partner Persona Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-zinc-800 border border-zinc-700/80 overflow-hidden flex items-center justify-center shadow-md">
              <Image
                src={
                  isRevealed && typeof revealedPartner?.avatarUrl === "string"
                    ? revealedPartner.avatarUrl
                    : partnerPersona.avatar
                }
                alt={
                  isRevealed && revealedPartner
                    ? revealedPartner.displayName
                    : partnerPersona.displayName
                }
                width={44}
                height={44}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            {/* Status Dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${
                partnerConnectionStatus === "CONNECTED"
                  ? "bg-emerald-500"
                  : partnerConnectionStatus === "RECONNECTING"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-zinc-500"
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-white tracking-tight">
                {isRevealed && revealedPartner
                  ? revealedPartner.displayName
                  : partnerPersona.displayName}
              </h2>
              {isRevealed && revealedPartner?.isVerified && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                  ✓
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="font-medium text-purple-400">
                {session.matchedInterests.join(", ")}
              </span>
              <span>•</span>
              <span>
                {partnerConnectionStatus === "CONNECTED"
                  ? "Online"
                  : partnerConnectionStatus === "RECONNECTING"
                    ? "Reconnecting..."
                    : "Left Chat"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mutual Reveal Trigger */}
          <button
            type="button"
            onClick={() => setIsRevealSheetOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isRevealed
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : session.revealConsent.me
                  ? "bg-purple-600/30 border-purple-500 text-purple-300 shadow-md shadow-purple-900/30"
                  : isRevealRequestedByPartner
                    ? "bg-pink-600/30 border-pink-500 text-pink-300 animate-bounce"
                    : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isRevealed
                ? "Revealed"
                : session.revealConsent.me
                  ? "Reveal Requested"
                  : isRevealRequestedByPartner
                    ? "Accept Reveal!"
                    : "Reveal"}
            </span>
          </button>

          {/* Skip Button */}
          <Button
            onClick={() => onSkipMatch(true)}
            variant="glass"
            size="sm"
            className="rounded-xl px-3 text-zinc-300 hover:text-white border-zinc-700/60"
            title="Skip to next partner"
          >
            <SkipForward className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">Skip</span>
          </Button>

          {/* Safety Options */}
          <button
            type="button"
            onClick={() => setIsSafetySheetOpen(true)}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-red-400 transition-colors"
            title="Safety & Moderation"
          >
            <Shield className="w-4 h-4" />
          </button>

          {/* Leave Button */}
          <button
            type="button"
            onClick={onLeaveSession}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white transition-colors"
            title="Leave Chat"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Revealed Identity Hero Card (Shown when mutual reveal occurred) */}
      <AnimatePresence>
        {isRevealed && revealedPartner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-purple-950/40 via-zinc-900/90 to-cyan-950/40 border-b border-purple-500/30 p-4 shrink-0"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 text-left">
                <div className="relative w-12 h-12 rounded-full ring-2 ring-purple-500 overflow-hidden shrink-0">
                  <Image
                    src={
                      typeof revealedPartner.avatarUrl === "string"
                        ? revealedPartner.avatarUrl
                        : partnerPersona.avatar
                    }
                    alt={revealedPartner.displayName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-sm font-bold text-white">
                      Identity Revealed: {revealedPartner.displayName}
                    </span>
                    <span className="text-xs text-zinc-400">
                      @{revealedPartner.username}
                    </span>
                  </div>
                  {typeof revealedPartner.bio === "string" && (
                    <p className="text-xs text-zinc-300 line-clamp-1 mt-0.5">
                      {revealedPartner.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Action CTAs */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handleFollowPartner}
                  disabled={isFollowingPartner}
                  size="sm"
                  className={`rounded-xl text-xs font-semibold ${
                    isFollowingPartner
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-purple-600 hover:bg-purple-500 text-white"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  <span>{isFollowingPartner ? "Following" : "Follow"}</span>
                </Button>

                <Link href={`/profile/${revealedPartner.username}`}>
                  <Button
                    variant="glass"
                    size="sm"
                    className="rounded-xl text-xs"
                  >
                    View Profile
                  </Button>
                </Link>

                <Link href={`/chat`}>
                  <Button
                    variant="glass"
                    size="sm"
                    className="rounded-xl text-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    Chat
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text">
        {/* Welcome Notice Banner */}
        <div className="max-w-md mx-auto my-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center text-xs text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-300">
            👻 Connected with{" "}
            <span className="text-purple-400">
              {partnerPersona.displayName}
            </span>
          </p>
          <p className="text-[11px] text-zinc-500">
            Be kind and respectful. Messages in this session are ephemeral.
          </p>
        </div>

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isOwn = msg.isOwn;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
            >
              <div
                className={`relative max-w-[82%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                  isOwn
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm"
                    : "bg-zinc-800/90 border border-zinc-700/60 text-zinc-100 rounded-tl-sm"
                }`}
              >
                {/* Voice Note Message */}
                {msg.type === "VOICE" && msg.mediaUrl ? (
                  <div className="flex items-center gap-3 py-1">
                    <button
                      type="button"
                      onClick={() => togglePlayAudio(msg.id, msg.mediaUrl)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center shadow-inner ${
                        isOwn
                          ? "bg-white text-purple-700"
                          : "bg-purple-600 text-white"
                      }`}
                    >
                      {isPlayingAudioId === msg.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-1 h-4">
                        {[40, 70, 30, 90, 50, 80, 60, 100, 45, 65, 85].map(
                          (h, i) => (
                            <span
                              key={i}
                              className={`w-1 rounded-full ${
                                isPlayingAudioId === msg.id
                                  ? "bg-cyan-300 animate-pulse"
                                  : isOwn
                                    ? "bg-purple-200"
                                    : "bg-zinc-400"
                              }`}
                              style={{ height: `${h}%` }}
                            />
                          ),
                        )}
                      </div>
                      <span className="text-[10px] opacity-80 mt-1 block">
                        Voice Note (
                        {Math.round((msg.voiceDurationMs || 3000) / 1000)}s)
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                )}

                {/* Message Timestamp */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isOwn ? "text-purple-200" : "text-zinc-400"
                  }`}
                >
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isOwn && <CheckCheck className="w-3 h-3 text-cyan-300" />}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Partner Typing Indicator */}
        {isPartnerTyping && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-zinc-400 pl-1"
          >
            <div className="flex items-center gap-1 p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[11px] text-zinc-500">
              {partnerPersona.displayName} is typing...
            </span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Session Ended / Disconnected Overlay */}
      {isSessionEnded && (
        <div className="bg-red-950/40 border-t border-red-500/30 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-red-300 text-sm font-semibold mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>This conversation has ended.</span>
          </div>
          <Button
            onClick={() => onSkipMatch(true)}
            size="sm"
            className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
          >
            <SkipForward className="w-3.5 h-3.5 mr-1.5" />
            <span>Find Someone New</span>
          </Button>
        </div>
      )}

      {/* 5. Message Composer */}
      {!isSessionEnded && (
        <footer className="sticky bottom-0 z-30 p-3 sm:p-4 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            {/* Voice Note Recording Status */}
            {isRecordingVoice ? (
              <div className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="font-semibold">
                    Recording Voice Note ({recordingDuration}s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-lg hover:bg-red-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder={`Message ${partnerPersona.displayName}...`}
                  maxLength={1000}
                  className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] rounded-2xl pl-4 pr-10 py-3 text-sm font-medium text-white placeholder:text-white/35 focus:outline-none focus-visible:outline-none focus:border-purple-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setInputText((prev) => prev + " 😊")}
                  className="absolute right-3.5 text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Voice Record Button */}
            {!isRecordingVoice && !inputText.trim() && (
              <button
                type="button"
                onClick={startRecording}
                className="p-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-purple-400 transition-colors"
                title="Record Voice Note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            {/* Send Button */}
            {inputText.trim() && (
              <Button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}
          </form>
        </footer>
      )}

      {/* Sheets & Modals */}
      <RevealIdentitySheet
        isOpen={isRevealSheetOpen}
        onClose={() => setIsRevealSheetOpen(false)}
        onRequestReveal={onRequestReveal}
        onCancelReveal={onCancelReveal}
        hasViewerConsented={session.revealConsent.me}
        hasPartnerConsented={session.revealConsent.partner}
      />

      <AnonymousSafetySheet
        isOpen={isSafetySheetOpen}
        onClose={() => setIsSafetySheetOpen(false)}
        onBlock={onBlockPartner}
        onReport={onReportPartner}
        partnerPersonaName={partnerPersona.displayName}
      />
    </div>
  );
};
