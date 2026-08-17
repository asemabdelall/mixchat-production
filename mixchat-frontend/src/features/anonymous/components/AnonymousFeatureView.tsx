"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnonymousChat } from "../hooks/useAnonymousChat";
import { AnonymousLanding } from "./AnonymousLanding";
import { AnonymousSearching } from "./AnonymousSearching";
import { AnonymousChatRoom } from "./AnonymousChatRoom";
import { AlertCircle } from "lucide-react";

export const AnonymousFeatureView: React.FC = () => {
  const {
    status,
    joinedAt,
    selectedInterests,
    session,
    messages,
    isPartnerTyping,
    partnerConnectionStatus,
    isRevealRequestedByPartner,
    revealedPartner,
    isRevealed,
    isLoading,
    isSending,
    error,
    joinQueue,
    leaveQueue,
    sendMessage,
    sendTyping,
    skipMatch,
    leaveSession,
    requestReveal,
    cancelReveal,
    blockPartner,
    reportPartner,
  } = useAnonymousChat();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full flex flex-col justify-center">
      {/* Error Toast / Alert */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-950/90 border border-red-500/50 text-red-200 text-xs font-semibold shadow-2xl backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Screen Routing */}
      <AnimatePresence mode="wait">
        {status === "IDLE" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <AnonymousLanding
              onStartSearch={(interests) => joinQueue(interests)}
              isLoading={isLoading}
            />
          </motion.div>
        )}

        {status === "SEARCHING" && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full"
          >
            <AnonymousSearching
              interests={selectedInterests}
              joinedAt={joinedAt}
              onCancel={leaveQueue}
              isLoading={isLoading}
            />
          </motion.div>
        )}

        {status === "MATCHED" && session && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full h-full flex flex-col"
          >
            <AnonymousChatRoom
              session={session}
              messages={messages}
              isPartnerTyping={isPartnerTyping}
              partnerConnectionStatus={partnerConnectionStatus}
              isRevealRequestedByPartner={isRevealRequestedByPartner}
              revealedPartner={revealedPartner}
              isRevealed={isRevealed}
              onSendMessage={sendMessage}
              onSendTyping={sendTyping}
              onSkipMatch={skipMatch}
              onLeaveSession={leaveSession}
              onRequestReveal={requestReveal}
              onCancelReveal={cancelReveal}
              onBlockPartner={blockPartner}
              onReportPartner={reportPartner}
              isSending={isSending}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
