"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { useNetworkStatus } from "@/shared/providers/NetworkProvider";

export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-banner"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none px-4 pt-[env(safe-area-inset-top,0px)]"
        >
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500/90 dark:bg-amber-600/90 text-white text-xs font-medium shadow-lg backdrop-blur-md border border-amber-400/30">
            <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-200" />
            <span>You&apos;re offline. Browsing cached content.</span>
          </div>
        </motion.div>
      )}

      {isOnline && wasOffline && (
        <motion.div
          key="online-banner"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none px-4 pt-[env(safe-area-inset-top,0px)]"
        >
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-600/90 text-white text-xs font-medium shadow-lg backdrop-blur-md border border-emerald-400/30">
            <Wifi className="w-3.5 h-3.5 text-emerald-200" />
            <span>Back online • Restored connection</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
