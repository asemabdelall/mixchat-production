"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Chat, Message, MessageReply, MessageType, User } from "@/types";
import { useAuth } from "@/shared/providers/AuthProvider";
import { apiClient } from "@/services/api/apiClient";
import {
  chatService,
  ConversationDto,
  MessageDto,
  SendMessageDto,
} from "@/services/chat/ChatService";
import { socialService } from "@/services/social/socialService";
import { socketClient } from "@/services/api/socketClient";
import {
  RealtimeEvents,
  TypingUpdatePayload,
  PresenceUpdatePayload,
  ReadReceiptPayload,
} from "@/services/api/realtimeEvents";

const FALLBACK_AVATAR = "/mixchat-icon.png";
const MAX_MESSAGES_PER_CONVERSATION = 300;

const keepRecentMessages = (messages: Message[]) =>
  messages.length > MAX_MESSAGES_PER_CONVERSATION
    ? messages.slice(-MAX_MESSAGES_PER_CONVERSATION)
    : messages;

export interface SendChatMessageInput {
  type?: Exclude<MessageType, "system">;
  text?: string;
  mediaObjectIds?: string[];
  replyTo?: MessageReply;
  durationMs?: number;
  waveform?: number[];
  clientMessageId?: string;
}

export interface TypingUser {
  userId: string;
  username: string;
  displayName: string;
}

interface ChatContextType {
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  messages: Message[];
  currentUserId: string | null;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isLoadingOlder: boolean;
  hasOlderMessages: boolean;
  error: string | null;
  typingUsers: Record<string, TypingUser[]>; // conversationId -> typers
  presenceMap: Record<
    string,
    { status: "ONLINE" | "OFFLINE"; lastSeen: string | null }
  >;
  setActiveChatId: (id: string | null) => void;
  refreshChats: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (
    chatId: string,
    input: SendChatMessageInput,
  ) => Promise<Message>;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  reactToMessage: (chatId: string, messageId: string, emoji: string) => void;
  pinMessage: (chatId: string, messageId: string) => void;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  forwardMessage: (targetChatIds: string[], message: Message) => Promise<void>;
  togglePinChat: (chatId: string) => Promise<void>;
  toggleArchiveChat: (chatId: string) => Promise<void>;
  acceptMessageRequest: (chatId: string) => void;
  declineMessageRequest: (chatId: string) => void;
  muteChat: (chatId: string, duration?: string) => Promise<void>;
  unmuteChat: (chatId: string) => Promise<void>;
  clearChatHistory: (chatId: string) => void;
  updateGroupInfo: (
    chatId: string,
    name: string,
    avatarMediaObjectId?: string,
  ) => Promise<void>;
  startNewChat: (userId: string) => Promise<string>;
  createGroupChat: (
    groupName: string,
    participantIds: string[],
    avatarMediaObjectId?: string,
  ) => Promise<string>;
  leaveGroupChat: (chatId: string) => Promise<void>;
  addGroupMember: (chatId: string, userId: string) => Promise<void>;
  removeGroupMember: (chatId: string, userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const asString = (
  value: string | Record<string, never> | null | undefined,
): string | null => (typeof value === "string" ? value : null);

const formatMessageTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const mapUser = (
  user: ConversationDto["participants"][number] | MessageDto["sender"],
  isOnline = false,
): User => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  avatar: asString(user.avatarUrl) || FALLBACK_AVATAR,
  online: isOnline,
  isPremium: user.isPremium,
  role: user.isVerified ? "verified" : "user",
  followersCount: 0,
  followingCount: 0,
});

const mapMessage = (message: MessageDto, isRead = false): Message => {
  const attachment = message.attachments[0];
  const attachmentUrl = attachment ? asString(attachment.url) : null;
  const text = asString(message.text) ?? undefined;
  return {
    id: message.id,
    chatId: message.conversationId,
    clientMessageId: message.clientMessageId,
    senderId: message.sender.id,
    sender: mapUser(message.sender),
    type: message.type.toLowerCase() as MessageType,
    text: asString(message.deletedAt) ? "Message deleted" : text,
    mediaUrl: attachmentUrl ?? undefined,
    voiceUrl:
      message.type === "VOICE" ? (attachmentUrl ?? undefined) : undefined,
    voiceDuration:
      typeof message.durationMs === "number"
        ? Math.ceil(message.durationMs / 1000)
        : undefined,
    waveform: message.waveform ?? undefined,
    fileName: attachment?.filename,
    fileSize: attachment
      ? `${(attachment.sizeBytes / 1024).toFixed(1)} KB`
      : undefined,
    createdAt: formatMessageTime(message.createdAt),
    createdAtIso: message.createdAt,
    isRead,
    status: "sent",
    deletedAt: asString(message.deletedAt) ?? undefined,
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          senderName: message.replyTo.senderDisplayName,
          text:
            asString(message.replyTo.text) ||
            (message.replyTo.isDeleted ? "Message deleted" : "Attachment"),
        }
      : undefined,
  };
};

const mapConversation = (
  conversation: ConversationDto,
  presenceMap: Record<
    string,
    { status: "ONLINE" | "OFFLINE"; lastSeen: string | null }
  > = {},
): Chat => ({
  id: conversation.id,
  participants: conversation.participants.map((p) =>
    mapUser(p, presenceMap[p.id]?.status === "ONLINE"),
  ),
  lastMessage: conversation.lastMessage
    ? mapMessage(conversation.lastMessage)
    : undefined,
  unreadCount: conversation.unreadCount,
  isGroup: conversation.type === "GROUP",
  groupName: conversation.type === "GROUP" ? conversation.title : undefined,
  groupAvatar: asString(conversation.avatarUrl) ?? undefined,
  groupAdminId: conversation.participants.find(
    (participant) => participant.role === "OWNER",
  )?.id,
  updatedAt: asString(conversation.lastActivityAt) ?? "",
  isPinnedConvo: conversation.isPinned,
  isArchived: conversation.isArchived,
  isMuted: conversation.isMuted,
  muteUntil: asString(conversation.mutedUntil) ?? undefined,
});

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [messageStore, setMessageStore] = useState<Record<string, Message[]>>(
    {},
  );
  const [messageCursor, setMessageCursor] = useState<
    Record<string, string | null>
  >({});
  const [hasOlderStore, setHasOlderStore] = useState<Record<string, boolean>>(
    {},
  );
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Realtime typing and presence state
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser[]>>(
    {},
  );
  const [presenceMap, setPresenceMap] = useState<
    Record<string, { status: "ONLINE" | "OFFLINE"; lastSeen: string | null }>
  >({});
  const presenceMapRef = useRef(presenceMap);
  const activeChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    presenceMapRef.current = presenceMap;
  }, [presenceMap]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Typing debounce timers
  const typingTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastTypingEmitRef = useRef<number>(0);

  const refreshChats = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingChats(true);
    setError(null);
    try {
      const [active, archived] = await Promise.all([
        chatService.listConversations({ limit: 50 }),
        chatService.listConversations({ limit: 50, archived: true }),
      ]);
      const allItems = [...active.items, ...archived.items];
      setChats(allItems.map((c) => mapConversation(c, presenceMapRef.current)));

      // Collect partner user IDs to fetch initial presence snapshot
      const partnerIds = new Set<string>();
      allItems.forEach((c) => {
        c.participants.forEach((p) => {
          if (p.id !== user?.id) partnerIds.add(p.id);
        });
      });

      if (partnerIds.size > 0) {
        socketClient.getPresence([...partnerIds]).then((p) => {
          if (p && Object.keys(p).length > 0) {
            setPresenceMap((prev) => ({ ...prev, ...p }));
          }
        });
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load conversations",
      );
    } finally {
      setIsLoadingChats(false);
    }
  }, [isAuthenticated, user?.id]);

  // Handle Auth lifecycle & Socket connection
  useEffect(() => {
    let mounted = true;
    if (isAuthenticated) {
      const token = apiClient.getAccessToken();
      if (token) {
        socketClient.connect(token);
      }
      Promise.resolve().then(async () => {
        if (!mounted) return;
        await refreshChats();
      });
    } else {
      socketClient.disconnect();
      Promise.resolve().then(() => {
        if (!mounted) return;
        setChats((prev) => (prev.length > 0 ? [] : prev));
        setMessageStore((prev) => (Object.keys(prev).length > 0 ? {} : prev));
        setActiveChatIdState((prev) => (prev !== null ? null : prev));
        setTypingUsers((prev) => (Object.keys(prev).length > 0 ? {} : prev));
        setPresenceMap((prev) => (Object.keys(prev).length > 0 ? {} : prev));
      });
    }
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, refreshChats]);

  // Setup Realtime Socket Event Listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleIncomingMessage = (messageDto: MessageDto) => {
      const convId = messageDto.conversationId;
      const mapped = mapMessage(messageDto);

      // 1. Update messageStore
      setMessageStore((prev) => {
        const currentList = prev[convId] || [];
        const exists = currentList.some(
          (m) =>
            m.id === mapped.id ||
            (mapped.clientMessageId &&
              m.clientMessageId === mapped.clientMessageId),
        );

        if (exists) {
          return {
            ...prev,
            [convId]: currentList.map((m) =>
              m.id === mapped.id ||
              (mapped.clientMessageId &&
                m.clientMessageId === mapped.clientMessageId)
                ? mapped
                : m,
            ),
          };
        }
        return {
          ...prev,
          [convId]: keepRecentMessages([...currentList, mapped]),
        };
      });

      // 2. Update chats list (sidebar)
      const isActive = activeChatIdRef.current === convId;
      const isFromMe = messageDto.sender.id === user?.id;

      setChats((prev) => {
        const chatIndex = prev.findIndex((c) => c.id === convId);
        if (chatIndex !== -1) {
          const target = prev[chatIndex];
          const updatedChat = {
            ...target,
            lastMessage: mapped,
            updatedAt: messageDto.createdAt,
            unreadCount: isActive || isFromMe ? 0 : target.unreadCount + 1,
          };
          const nextChats = [...prev];
          nextChats[chatIndex] = updatedChat;
          return nextChats.sort(
            (a, b) =>
              Number(Boolean(b.isPinnedConvo)) -
                Number(Boolean(a.isPinnedConvo)) ||
              (b.updatedAt || "").localeCompare(a.updatedAt || ""),
          );
        }

        // 3. If conversation is not in local list, fetch and prepend it
        void chatService.getConversation(convId).then((newConvo) => {
          if (newConvo) {
            const mappedConvo = mapConversation(
              newConvo,
              presenceMapRef.current,
            );
            mappedConvo.lastMessage = mapped;
            mappedConvo.updatedAt = messageDto.createdAt;
            mappedConvo.unreadCount = isActive || isFromMe ? 0 : 1;

            setChats((current) => {
              if (current.some((c) => c.id === convId)) {
                return current.map((c) => (c.id === convId ? mappedConvo : c));
              }
              const list = [mappedConvo, ...current];
              return list.sort(
                (a, b) =>
                  Number(Boolean(b.isPinnedConvo)) -
                    Number(Boolean(a.isPinnedConvo)) ||
                  (b.updatedAt || "").localeCompare(a.updatedAt || ""),
              );
            });
          }
        });

        return prev;
      });

      // If active conversation is currently open, advance read state automatically
      if (isActive && !isFromMe) {
        void socketClient.markRead(convId, messageDto.id);
      }
    };

    // 1. Incoming Realtime Message
    const unsubNewMessage = socketClient.on(
      RealtimeEvents.MESSAGE_NEW,
      handleIncomingMessage,
    );

    // 2. Incoming Conversation Sidebar Update
    const unsubConvoUpdated = socketClient.on(
      RealtimeEvents.CONVERSATION_UPDATED,
      (data: { conversationId: string; lastMessage: MessageDto }) => {
        handleIncomingMessage(data.lastMessage);
      },
    );

    // 3. Incoming Typing Indicator
    const unsubTyping = socketClient.on(
      RealtimeEvents.TYPING_UPDATE,
      (payload: TypingUpdatePayload) => {
        const { conversationId, userId, username, displayName, isTyping } =
          payload;
        if (userId === user?.id) return;

        setTypingUsers((prev) => {
          const list = prev[conversationId] || [];
          if (isTyping) {
            if (!list.some((u) => u.userId === userId)) {
              return {
                ...prev,
                [conversationId]: [...list, { userId, username, displayName }],
              };
            }
            return prev;
          } else {
            return {
              ...prev,
              [conversationId]: list.filter((u) => u.userId !== userId),
            };
          }
        });

        // Auto-clear typing after 4.5s TTL safeguard
        const timerKey = `${conversationId}:${userId}`;
        if (typingTimerRef.current[timerKey]) {
          clearTimeout(typingTimerRef.current[timerKey]);
        }
        if (isTyping) {
          typingTimerRef.current[timerKey] = setTimeout(() => {
            setTypingUsers((prev) => ({
              ...prev,
              [conversationId]: (prev[conversationId] || []).filter(
                (u) => u.userId !== userId,
              ),
            }));
          }, 4500);
        }
      },
    );

    // 4. Incoming Presence Update
    const unsubPresence = socketClient.on(
      RealtimeEvents.PRESENCE_UPDATE,
      (payload: PresenceUpdatePayload) => {
        const { userId, status, lastSeen } = payload;
        setPresenceMap((prev) => ({
          ...prev,
          [userId]: { status, lastSeen: lastSeen ?? null },
        }));

        // Update chats participant online dot
        setChats((prev) =>
          prev.map((chat) => ({
            ...chat,
            participants: chat.participants.map((p) =>
              p.id === userId ? { ...p, online: status === "ONLINE" } : p,
            ),
          })),
        );
      },
    );

    // 5. Incoming Read Receipt
    const unsubRead = socketClient.on(
      RealtimeEvents.MESSAGE_READ_RECEIPT,
      (payload: ReadReceiptPayload) => {
        const { conversationId } = payload;
        setMessageStore((prev) => {
          const list = prev[conversationId];
          if (!list) return prev;
          return {
            ...prev,
            [conversationId]: list.map((m) => ({ ...m, isRead: true })),
          };
        });
      },
    );

    const timers = typingTimerRef.current;
    return () => {
      unsubNewMessage();
      unsubConvoUpdated();
      unsubTyping();
      unsubPresence();
      unsubRead();
      Object.values(timers).forEach(clearTimeout);
    };
  }, [isAuthenticated, user?.id]);

  const openConversation = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    setError(null);
    try {
      // Join realtime socket room
      void socketClient.joinConversation(conversationId);

      const page = await chatService.listMessages(conversationId, {
        limit: 30,
      });
      const mapped = page.items.map((m) => mapMessage(m));
      setMessageStore((previous) => ({
        ...previous,
        [conversationId]: mapped,
      }));
      setMessageCursor((previous) => ({
        ...previous,
        [conversationId]: asString(page.pageInfo.nextCursor),
      }));
      setHasOlderStore((previous) => ({
        ...previous,
        [conversationId]: page.pageInfo.hasNextPage,
      }));

      const last = page.items.at(-1);
      if (last) {
        void socketClient.markRead(conversationId, last.id);
        const readState = await chatService.markRead(conversationId, last.id);
        setChats((previous) =>
          previous.map((chat) =>
            chat.id === conversationId
              ? { ...chat, unreadCount: readState.unreadCount }
              : chat,
          ),
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load messages",
      );
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const setActiveChatId = useCallback(
    (id: string | null) => {
      if (activeChatIdRef.current && activeChatIdRef.current !== id) {
        socketClient.leaveConversation(activeChatIdRef.current);
      }
      setActiveChatIdState(id);
      if (id) void openConversation(id);
    },
    [openConversation],
  );

  const loadOlderMessages = useCallback(async () => {
    if (
      !activeChatId ||
      isLoadingOlder ||
      !hasOlderStore[activeChatId] ||
      (messageStore[activeChatId]?.length ?? 0) >= MAX_MESSAGES_PER_CONVERSATION
    )
      return;
    setIsLoadingOlder(true);
    try {
      const page = await chatService.listMessages(activeChatId, {
        cursor: messageCursor[activeChatId] ?? undefined,
        limit: 30,
      });
      setMessageStore((previous) => {
        const combined = [
          ...page.items.map((m) => mapMessage(m)),
          ...(previous[activeChatId] ?? []),
        ].slice(-MAX_MESSAGES_PER_CONVERSATION);
        return { ...previous, [activeChatId]: combined };
      });
      setMessageCursor((previous) => ({
        ...previous,
        [activeChatId]: asString(page.pageInfo.nextCursor),
      }));
      setHasOlderStore((previous) => ({
        ...previous,
        [activeChatId]:
          page.pageInfo.hasNextPage &&
          (messageStore[activeChatId]?.length ?? 0) + page.items.length <
            MAX_MESSAGES_PER_CONVERSATION,
      }));
    } finally {
      setIsLoadingOlder(false);
    }
  }, [
    activeChatId,
    hasOlderStore,
    isLoadingOlder,
    messageCursor,
    messageStore,
  ]);

  const sendMessage = useCallback(
    async (chatId: string, input: SendChatMessageInput) => {
      const clientMessageId = input.clientMessageId ?? crypto.randomUUID();
      const payload: SendMessageDto = {
        type: (input.type ?? "text").toUpperCase() as SendMessageDto["type"],
        text: input.text,
        clientMessageId,
        mediaObjectIds: input.mediaObjectIds,
        replyToMessageId: input.replyTo?.id,
        durationMs: input.durationMs,
        waveform: input.waveform,
      };

      // Optimistic local insertion
      const optimisticMessage: Message = {
        id: `temp_${clientMessageId}`,
        chatId,
        clientMessageId,
        senderId: user?.id || "me",
        sender: user
          ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatar: user.avatarUrl || FALLBACK_AVATAR,
              online: true,
              isPremium: user.isPremium,
              role: user.role === "ADMIN" ? "verified" : "user",
              followersCount: 0,
              followingCount: 0,
            }
          : {
              id: "me",
              username: "me",
              displayName: "Me",
              avatar: FALLBACK_AVATAR,
              online: true,
              isPremium: false,
              role: "user",
              followersCount: 0,
              followingCount: 0,
            },
        type: (input.type ?? "text").toLowerCase() as MessageType,
        text: input.text,
        voiceDuration:
          typeof input.durationMs === "number"
            ? Math.ceil(input.durationMs / 1000)
            : undefined,
        waveform: input.waveform,
        createdAt: formatMessageTime(new Date().toISOString()),
        createdAtIso: new Date().toISOString(),
        isRead: false,
        status: "sending",
        replyTo: input.replyTo
          ? {
              id: input.replyTo.id,
              senderName: input.replyTo.senderName,
              text: input.replyTo.text,
            }
          : undefined,
      };

      setMessageStore((prev) => ({
        ...prev,
        [chatId]: keepRecentMessages([
          ...(prev[chatId] || []).filter(
            (m) => m.clientMessageId !== clientMessageId,
          ),
          optimisticMessage,
        ]),
      }));

      try {
        // Send over Socket.IO if connected, else fallback to REST
        const socketRes = await socketClient.sendMessage(chatId, payload);
        let canonicalResponse: MessageDto;

        if (socketRes.ok && socketRes.data) {
          canonicalResponse = socketRes.data;
        } else {
          canonicalResponse = await chatService.sendMessage(chatId, payload);
        }

        const sent = mapMessage(canonicalResponse);
        setMessageStore((previous) => ({
          ...previous,
          [chatId]: keepRecentMessages([
            ...(previous[chatId] ?? []).filter(
              (item) =>
                item.clientMessageId !== clientMessageId &&
                item.id !== `temp_${clientMessageId}`,
            ),
            sent,
          ]),
        }));

        setChats((previous) => {
          const chatIndex = previous.findIndex((chat) => chat.id === chatId);
          if (chatIndex !== -1) {
            const updated = previous.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    lastMessage: sent,
                    updatedAt: canonicalResponse.createdAt,
                    unreadCount: 0,
                  }
                : chat,
            );
            return updated.sort(
              (a, b) =>
                Number(Boolean(b.isPinnedConvo)) -
                  Number(Boolean(a.isPinnedConvo)) ||
                (b.updatedAt || "").localeCompare(a.updatedAt || ""),
            );
          }

          void chatService.getConversation(chatId).then((newConvo) => {
            if (newConvo) {
              const mappedConvo = mapConversation(
                newConvo,
                presenceMapRef.current,
              );
              mappedConvo.lastMessage = sent;
              mappedConvo.updatedAt = canonicalResponse.createdAt;
              mappedConvo.unreadCount = 0;
              setChats((current) => {
                if (current.some((c) => c.id === chatId)) {
                  return current.map((c) =>
                    c.id === chatId ? mappedConvo : c,
                  );
                }
                const list = [mappedConvo, ...current];
                return list.sort(
                  (a, b) =>
                    Number(Boolean(b.isPinnedConvo)) -
                      Number(Boolean(a.isPinnedConvo)) ||
                    (b.updatedAt || "").localeCompare(a.updatedAt || ""),
                );
              });
            }
          });

          return previous;
        });

        return sent;
      } catch (requestError) {
        setMessageStore((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map((m) =>
            m.clientMessageId === clientMessageId
              ? { ...m, status: "failed" }
              : m,
          ),
        }));
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Message failed to send",
        );
        throw requestError;
      }
    },
    [user],
  );

  const startTyping = useCallback((chatId: string) => {
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2000) {
      lastTypingEmitRef.current = now;
      socketClient.startTyping(chatId);
    }
  }, []);

  const stopTyping = useCallback((chatId: string) => {
    socketClient.stopTyping(chatId);
  }, []);

  const deleteMessage = useCallback(
    async (chatId: string, messageId: string) => {
      const response = await chatService.deleteMessage(messageId);
      const deleted = mapMessage(response);
      setMessageStore((previous) => ({
        ...previous,
        [chatId]: (previous[chatId] ?? []).map((message) =>
          message.id === messageId ? deleted : message,
        ),
      }));
    },
    [],
  );

  const updateConversationState = useCallback(
    async (
      chatId: string,
      data: Parameters<typeof chatService.updateState>[1],
    ) => {
      const response = await chatService.updateState(chatId, data);
      setChats((previous) =>
        previous.map((chat) =>
          chat.id === chatId ? mapConversation(response, presenceMap) : chat,
        ),
      );
    },
    [presenceMap],
  );

  const startNewChat = useCallback(
    async (targetUserId: string) => {
      const conversation = await chatService.createConversation({
        type: "DIRECT",
        targetUserId,
      });
      const mapped = mapConversation(conversation, presenceMap);
      setChats((previous) => [
        mapped,
        ...previous.filter((chat) => chat.id !== mapped.id),
      ]);
      setActiveChatId(mapped.id);
      return mapped.id;
    },
    [presenceMap, setActiveChatId],
  );

  const createGroupChat = useCallback(
    async (title: string, memberIds: string[]) => {
      const conversation = await chatService.createConversation({
        type: "GROUP",
        title,
        memberIds,
      });
      const mapped = mapConversation(conversation, presenceMap);
      setChats((previous) => [mapped, ...previous]);
      setActiveChatId(mapped.id);
      return mapped.id;
    },
    [presenceMap, setActiveChatId],
  );

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats],
  );

  const value: ChatContextType = {
    chats,
    activeChatId,
    activeChat,
    messages: activeChatId ? (messageStore[activeChatId] ?? []) : [],
    currentUserId: user?.id ?? null,
    isLoadingChats,
    isLoadingMessages,
    isLoadingOlder,
    hasOlderMessages: activeChatId
      ? Boolean(hasOlderStore[activeChatId])
      : false,
    error,
    typingUsers,
    presenceMap,
    setActiveChatId,
    refreshChats,
    loadOlderMessages,
    sendMessage,
    startTyping,
    stopTyping,
    reactToMessage: () => undefined,
    pinMessage: () => undefined,
    deleteMessage,
    forwardMessage: async (targetChatIds, message) => {
      await Promise.all(
        targetChatIds.map((chatId) =>
          sendMessage(chatId, {
            type: "text",
            text: message.text || "Forwarded attachment",
          }),
        ),
      );
    },
    togglePinChat: async (chatId) =>
      updateConversationState(chatId, {
        pinned: !chats.find((chat) => chat.id === chatId)?.isPinnedConvo,
      }),
    toggleArchiveChat: async (chatId) =>
      updateConversationState(chatId, {
        archived: !chats.find((chat) => chat.id === chatId)?.isArchived,
      }),
    acceptMessageRequest: () => undefined,
    declineMessageRequest: () => undefined,
    muteChat: async (chatId) =>
      updateConversationState(chatId, {
        mutedUntil: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      }),
    unmuteChat: async (chatId) =>
      updateConversationState(chatId, { mutedUntil: null }),
    clearChatHistory: () => undefined,
    updateGroupInfo: async (chatId, title, avatarMediaObjectId) => {
      const response = await chatService.updateGroup(chatId, {
        title,
        avatarMediaObjectId,
      });
      setChats((previous) =>
        previous.map((chat) =>
          chat.id === chatId ? mapConversation(response, presenceMap) : chat,
        ),
      );
    },
    startNewChat,
    createGroupChat,
    leaveGroupChat: async (chatId) => {
      await chatService.leaveGroup(chatId);
      setChats((previous) => previous.filter((chat) => chat.id !== chatId));
      setActiveChatIdState(null);
    },
    addGroupMember: async (chatId, memberId) => {
      const response = await chatService.addGroupMember(chatId, memberId);
      setChats((previous) =>
        previous.map((chat) =>
          chat.id === chatId ? mapConversation(response, presenceMap) : chat,
        ),
      );
    },
    removeGroupMember: async (chatId, memberId) => {
      await chatService.removeGroupMember(chatId, memberId);
      await refreshChats();
    },
    blockUser: async (blockedUserId) => {
      await socialService.blockUser(blockedUserId);
      setChats((previous) =>
        previous.filter(
          (chat) =>
            chat.isGroup ||
            !chat.participants.some(
              (participant) => participant.id === blockedUserId,
            ),
        ),
      );
      setActiveChatIdState(null);
    },
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};
