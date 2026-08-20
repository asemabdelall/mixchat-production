"use client";

import React, { useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChatList } from "@/features/chat/components/ChatList";
import { ChatRoom } from "@/features/chat/components/ChatRoom";
import { useChat } from "@/shared/providers/ChatProvider";

const DESKTOP_CHAT_QUERY = "(min-width: 1024px)";

const subscribeToDesktopLayout = (onStoreChange: () => void) => {
  const mediaQuery = window.matchMedia(DESKTOP_CHAT_QUERY);
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", onStoreChange);
    return () => mediaQuery.removeEventListener("change", onStoreChange);
  }

  mediaQuery.addListener(onStoreChange);
  return () => mediaQuery.removeListener(onStoreChange);
};

const getDesktopLayoutSnapshot = () =>
  window.matchMedia(DESKTOP_CHAT_QUERY).matches;

const getServerDesktopLayoutSnapshot = () => false;

export default function ChatPage() {
  const { activeChatId } = useChat();
  const shouldReduceMotion = useReducedMotion();
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopLayout,
    getDesktopLayoutSnapshot,
    getServerDesktopLayoutSnapshot,
  );

  const springTransition = shouldReduceMotion
    ? { duration: 0 }
    : {
        type: "spring" as const,
        stiffness: 360,
        damping: 34,
        mass: 0.82,
      };

  if (!isDesktop) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#070913]">
        <AnimatePresence initial={false} mode="sync">
          {activeChatId ? (
            <motion.section
              key={`mobile-chat-${activeChatId}`}
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, x: "18%", scale: 0.992 }
              }
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, x: "18%", scale: 0.992 }
              }
              transition={springTransition}
              className="absolute inset-0 z-10 h-full w-full will-change-transform"
              aria-label="Active conversation"
            >
              <ChatRoom />
            </motion.section>
          ) : (
            <motion.section
              key="mobile-conversation-list"
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, x: "-10%", scale: 0.995 }
              }
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, x: "-14%", scale: 0.992 }
              }
              transition={springTransition}
              className="absolute inset-0 h-full w-full will-change-transform"
              aria-label="Conversations"
            >
              <ChatList />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="m-0 flex h-full w-full gap-3 overflow-hidden bg-background p-0">
      <motion.aside
        initial={shouldReduceMotion ? false : { opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={springTransition}
        className="h-full w-[22rem] shrink-0 overflow-hidden rounded-3xl shadow-2xl shadow-black/20 xl:w-[25rem]"
        aria-label="Conversations"
      >
        <ChatList />
      </motion.aside>

      <div className="relative h-full min-w-0 flex-1 overflow-hidden rounded-3xl shadow-2xl shadow-black/20">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.section
            key={`desktop-chat-${activeChatId ?? "empty"}`}
            initial={
              shouldReduceMotion
                ? false
                : { opacity: 0, x: 22, scale: 0.995 }
            }
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 0, x: -12, scale: 0.995 }
            }
            transition={springTransition}
            className="absolute inset-0 h-full w-full will-change-transform"
            aria-label={activeChatId ? "Active conversation" : "Chat"}
          >
            <ChatRoom />
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
