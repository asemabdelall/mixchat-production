"use client";

import React, { createContext, useContext, useState, useRef } from "react";
import { Chat, Message, AnonymousMatch } from "@/types";
import { MOCK_CHATS, MOCK_MESSAGES, MOCK_USERS } from "@/shared/services/mockData";

interface ChatContextType {
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  messages: Message[];
  setActiveChatId: (id: string | null) => void;
  sendMessage: (
    chatId: string,
    text: string,
    type?: Message["type"],
    mediaUrl?: string,
    replyTo?: Message["replyTo"],
    fileData?: { name?: string; size?: string }
  ) => void;
  reactToMessage: (chatId: string, messageId: string, emoji: string) => void;
  pinMessage: (chatId: string, messageId: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  forwardMessage: (targetChatIds: string[], message: Message) => void;
  togglePinChat: (chatId: string) => void;
  toggleArchiveChat: (chatId: string) => void;
  acceptMessageRequest: (chatId: string) => void;
  declineMessageRequest: (chatId: string) => void;
  muteChat: (chatId: string, duration?: string) => void;
  unmuteChat: (chatId: string) => void;
  clearChatHistory: (chatId: string) => void;
  updateGroupInfo: (chatId: string, name: string, avatar?: string) => void;
  startNewChat: (userId: string) => string;
  createGroupChat: (groupName: string, participantIds: string[], groupAvatar?: string) => string;
  leaveGroupChat: (chatId: string) => void;
  addGroupMember: (chatId: string, userId: string) => void;
  removeGroupMember: (chatId: string, userId: string) => void;
  blockUser: (userId: string) => void;
  reportUser: (userId: string, reason: string) => void;
  anonymousMatch: AnonymousMatch | null;
  startAnonymousSearch: (topic: string) => void;
  cancelAnonymousSearch: () => void;
  requestIdentity: (chatId: string) => void;
  respondIdentityRequest: (chatId: string, accept: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Add mock request & archive flags to initial MOCK_CHATS
const INITIAL_CHATS: Chat[] = MOCK_CHATS.map((c, i) => ({
  ...c,
  isPinnedConvo: i === 0,
  isArchived: false,
  isRequest: i === 3,
  isMuted: false,
}));

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>("chat_1");
  const [messageStore, setMessageStore] = useState<Record<string, Message[]>>(
    MOCK_MESSAGES as unknown as Record<string, Message[]>
  );
  const [anonymousMatch, setAnonymousMatch] = useState<AnonymousMatch | null>(null);
  const anonSearchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const messages = activeChatId ? messageStore[activeChatId] || [] : [];

  const sendMessage = (
    chatId: string,
    text: string,
    type: Message["type"] = "text",
    mediaUrl?: string,
    replyTo?: Message["replyTo"],
    fileData?: { name?: string; size?: string }
  ) => {
    const newMsg: Message = {
      id: `m_${Date.now()}`,
      chatId,
      senderId: "u_me",
      type,
      text,
      mediaUrl,
      fileName: fileData?.name,
      fileSize: fileData?.size,
      replyTo,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: true,
      status: "read",
    };

    // Append to message store
    setMessageStore((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    // Update last message in chat list and unread count
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, lastMessage: newMsg, updatedAt: "Just now", unreadCount: 0 } : c
      )
    );
  };

  const reactToMessage = (chatId: string, messageId: string, emoji: string) => {
    setMessageStore((prev) => {
      const chatMsgs = prev[chatId] || [];
      const updated = chatMsgs.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = msg.reactions || [];
        const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);

        const newReactions = [...currentReactions];
        if (existingIdx > -1) {
          const rx = newReactions[existingIdx];
          if (rx.users.includes("u_me")) {
            const newUsers = rx.users.filter((u) => u !== "u_me");
            if (newUsers.length === 0) {
              newReactions.splice(existingIdx, 1);
            } else {
              newReactions[existingIdx] = { ...rx, count: newUsers.length, users: newUsers };
            }
          } else {
            newReactions[existingIdx] = {
              ...rx,
              count: rx.count + 1,
              users: [...rx.users, "u_me"],
            };
          }
        } else {
          newReactions.push({ emoji, count: 1, users: ["u_me"] });
        }

        return { ...msg, reactions: newReactions };
      });

      return { ...prev, [chatId]: updated };
    });
  };

  const pinMessage = (chatId: string, messageId: string) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, pinnedMessageId: c.pinnedMessageId === messageId ? undefined : messageId }
          : c
      )
    );

    setMessageStore((prev) => {
      const chatMsgs = prev[chatId] || [];
      const updated = chatMsgs.map((m) =>
        m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
      );
      return { ...prev, [chatId]: updated };
    });
  };

  const deleteMessage = (chatId: string, messageId: string) => {
    setMessageStore((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || []).filter((m) => m.id !== messageId),
    }));
  };

  const forwardMessage = (targetChatIds: string[], message: Message) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const baseTs = Date.now();

    // Build all forwarded messages upfront (unique IDs, stable timestamp)
    const fwdMessages = targetChatIds.map((targetId, i) => ({
      targetId,
      msg: {
        id: `m_fwd_${baseTs + i}_${Math.random().toString(36).substring(2, 5)}`,
        chatId: targetId,
        senderId: "u_me",
        type: message.type,
        text: message.text,
        mediaUrl: message.mediaUrl,
        voiceUrl: message.voiceUrl,
        voiceDuration: message.voiceDuration,
        fileName: message.fileName,
        fileSize: message.fileSize,
        isForwarded: true,
        createdAt: now,
        isRead: true,
        status: "read" as const,
      } satisfies Message,
    }));

    // Single batched update — no stale state across forEach iterations
    setMessageStore((prev) => {
      const next = { ...prev };
      fwdMessages.forEach(({ targetId, msg }) => {
        next[targetId] = [...(next[targetId] || []), msg];
      });
      return next;
    });

    setChats((prev) =>
      prev.map((c) => {
        const match = fwdMessages.find((f) => f.targetId === c.id);
        return match ? { ...c, lastMessage: match.msg, updatedAt: "Just now" } : c;
      })
    );
  };

  const togglePinChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isPinnedConvo: !c.isPinnedConvo } : c))
    );
  };

  const toggleArchiveChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isArchived: !c.isArchived } : c))
    );
  };

  const acceptMessageRequest = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isRequest: false } : c))
    );
  };

  const declineMessageRequest = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);
  };

  const muteChat = (chatId: string, duration: string = "8 hours") => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isMuted: true, muteUntil: duration } : c))
    );
  };

  const unmuteChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isMuted: false, muteUntil: undefined } : c))
    );
  };

  const clearChatHistory = (chatId: string) => {
    setMessageStore((prev) => ({
      ...prev,
      [chatId]: [],
    }));
  };

  const updateGroupInfo = (chatId: string, name: string, avatar?: string) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, groupName: name, groupAvatar: avatar || c.groupAvatar }
          : c
      )
    );
  };

  const startNewChat = (userId: string) => {
    const existing = chats.find(
      (c) => !c.isGroup && !c.isAnonymous && c.participants.some((p) => p.id === userId)
    );

    if (existing) {
      setActiveChatId(existing.id);
      return existing.id;
    }

    const partnerUser = MOCK_USERS.find((u) => u.id === userId);
    if (!partnerUser) return "";

    const newChatId = `chat_dm_${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      participants: [MOCK_USERS[0], partnerUser],
      unreadCount: 0,
      updatedAt: "Just now",
    };

    setChats((prev) => [newChat, ...prev]);
    setMessageStore((prev) => ({
      ...prev,
      [newChatId]: [
        {
          id: `m_init_${Date.now()}`,
          chatId: newChatId,
          senderId: "u_me",
          type: "system",
          text: `Started direct conversation with ${partnerUser.displayName}`,
          createdAt: "Just now",
          isRead: true,
        },
      ],
    }));

    setActiveChatId(newChatId);
    return newChatId;
  };

  const createGroupChat = (groupName: string, participantIds: string[], groupAvatar?: string) => {
    const selectedParticipants = MOCK_USERS.filter(
      (u) => participantIds.includes(u.id) || u.id === "u_me"
    );
    const newChatId = `group_${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      participants: selectedParticipants,
      isGroup: true,
      groupName,
      groupAvatar:
        groupAvatar ||
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
      groupAdminId: "u_me",
      unreadCount: 0,
      updatedAt: "Just now",
    };

    setChats((prev) => [newChat, ...prev]);
    setMessageStore((prev) => ({
      ...prev,
      [newChatId]: [
        {
          id: `m_sys_init_${Date.now()}`,
          chatId: newChatId,
          senderId: "u_me",
          type: "system",
          text: `Group "${groupName}" created. Welcome members!`,
          createdAt: "Just now",
          isRead: true,
        },
      ],
    }));

    setActiveChatId(newChatId);
    return newChatId;
  };

  const leaveGroupChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
  };

  const addGroupMember = (chatId: string, userId: string) => {
    const userToAdd = MOCK_USERS.find((u) => u.id === userId);
    if (!userToAdd) return;

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId && c.isGroup
          ? {
              ...c,
              participants: c.participants.some((p) => p.id === userId)
                ? c.participants
                : [...c.participants, userToAdd],
            }
          : c
      )
    );

    const systemMsg: Message = {
      id: `m_sys_add_${Date.now()}`,
      chatId,
      senderId: "u_me",
      type: "system",
      text: `@${userToAdd.displayName} was added to the group.`,
      createdAt: "Just now",
      isRead: true,
    };

    setMessageStore((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), systemMsg],
    }));
  };

  const removeGroupMember = (chatId: string, userId: string) => {
    const targetUser = MOCK_USERS.find((u) => u.id === userId);

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId && c.isGroup
          ? { ...c, participants: c.participants.filter((p) => p.id !== userId) }
          : c
      )
    );

    if (targetUser) {
      const systemMsg: Message = {
        id: `m_sys_rem_${Date.now()}`,
        chatId,
        senderId: "u_me",
        type: "system",
        text: `@${targetUser.displayName} was removed from the group.`,
        createdAt: "Just now",
        isRead: true,
      };

      setMessageStore((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), systemMsg],
      }));
    }
  };

  const blockUser = (userId: string) => {
    setChats((prev) =>
      prev.filter((c) => !c.participants.some((p) => p.id === userId && !c.isGroup))
    );
    setActiveChatId(null);
  };

  const reportUser = (userId: string, reason: string) => {
    // Audit log mock report
    console.log(`Report submitted for user ${userId}: ${reason}`);
  };

  const requestIdentity = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, identityStatus: "pending" } : c))
    );

    const systemMsg: Message = {
      id: `m_sys_${Date.now()}`,
      chatId,
      senderId: "u_me",
      type: "system",
      text: "🔒 You requested identity reveal from the stranger. Waiting for response...",
      createdAt: "Just now",
      isRead: true,
    };

    setMessageStore((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), systemMsg],
    }));
  };

  const respondIdentityRequest = (chatId: string, accept: boolean) => {
    const revealedPartner = accept ? MOCK_USERS[4] : undefined; // David Kim
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              identityStatus: accept ? "accepted" : "rejected",
              revealedPartner,
            }
          : c
      )
    );

    const systemMsg: Message = {
      id: `m_sys_${Date.now()}`,
      chatId,
      senderId: accept ? "u_4" : "u_me",
      type: "system",
      text: accept
        ? `🎉 Sender accepted! Identity revealed: @${MOCK_USERS[4].username} (${MOCK_USERS[4].displayName})`
        : "❌ Identity request was declined by the stranger.",
      createdAt: "Just now",
      isRead: true,
    };

    setMessageStore((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), systemMsg],
    }));
  };

  const startAnonymousSearch = (topic: string) => {
    // Cancel any in-flight search timer before starting a new one
    if (anonSearchTimerRef.current) clearTimeout(anonSearchTimerRef.current);

    setAnonymousMatch({
      id: `anon_${Date.now()}`,
      topic,
      status: "searching",
    });

    // Simulate match after 2.5s
    anonSearchTimerRef.current = setTimeout(() => {
      anonSearchTimerRef.current = null;
      setAnonymousMatch({
        id: `anon_${Date.now()}`,
        topic,
        status: "connected",
        partner: MOCK_USERS[4],
        startedAt: new Date().toISOString(),
      });
    }, 2500);
  };

  const cancelAnonymousSearch = () => {
    if (anonSearchTimerRef.current) {
      clearTimeout(anonSearchTimerRef.current);
      anonSearchTimerRef.current = null;
    }
    setAnonymousMatch(null);
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        activeChat,
        messages,
        setActiveChatId,
        sendMessage,
        reactToMessage,
        pinMessage,
        deleteMessage,
        forwardMessage,
        togglePinChat,
        toggleArchiveChat,
        acceptMessageRequest,
        declineMessageRequest,
        muteChat,
        unmuteChat,
        clearChatHistory,
        updateGroupInfo,
        startNewChat,
        createGroupChat,
        leaveGroupChat,
        addGroupMember,
        removeGroupMember,
        blockUser,
        reportUser,
        anonymousMatch,
        startAnonymousSearch,
        cancelAnonymousSearch,
        requestIdentity,
        respondIdentityRequest,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};
