export const RealtimeEvents = {
  // Client -> Server
  CHAT_JOIN: 'conversation:join',
  CHAT_LEAVE: 'conversation:leave',
  MESSAGE_SEND: 'message:send',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  MESSAGE_READ: 'message:read',
  PRESENCE_GET: 'presence:get',

  // Server -> Client
  MESSAGE_NEW: 'message:new',
  MESSAGE_ACK: 'message:ack',
  CONVERSATION_UPDATED: 'conversation:updated',
  TYPING_UPDATE: 'typing:update',
  PRESENCE_UPDATE: 'presence:update',
  MESSAGE_READ_RECEIPT: 'message:read',
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_UNREAD_COUNT: 'notification:unread_count',
  MAP_LOCATION_UPDATED: 'map:location_updated',
  MAP_LOCATION_REMOVED: 'map:location_removed',

  // Anonymous Matching & Chat Events
  ANONYMOUS_MATCH_FOUND: 'anonymous:match_found',
  ANONYMOUS_MESSAGE_SEND: 'anonymous:message:send',
  ANONYMOUS_MESSAGE_NEW: 'anonymous:message:new',
  ANONYMOUS_TYPING_START: 'anonymous:typing:start',
  ANONYMOUS_TYPING_STOP: 'anonymous:typing:stop',
  ANONYMOUS_TYPING_UPDATE: 'anonymous:typing:update',
  ANONYMOUS_REVEAL_REQUEST: 'anonymous:reveal:request',
  ANONYMOUS_REVEAL_CANCEL: 'anonymous:reveal:cancel',
  ANONYMOUS_REVEAL_REQUESTED: 'anonymous:reveal_requested',
  ANONYMOUS_REVEAL_CANCELLED: 'anonymous:reveal_cancelled',
  ANONYMOUS_IDENTITY_REVEALED: 'anonymous:identity_revealed',
  ANONYMOUS_PARTNER_STATUS: 'anonymous:partner_status',
  ANONYMOUS_PARTNER_LEFT: 'anonymous:partner_left',
  ANONYMOUS_LEAVE: 'anonymous:leave',

  // Voice & Video Call Events (Phase 16)
  CALL_INCOMING: 'call:incoming',
  CALL_RINGING: 'call:ringing',
  CALL_ACCEPTED: 'call:accepted',
  CALL_DECLINED: 'call:declined',
  CALL_CANCELLED: 'call:cancelled',
  CALL_BUSY: 'call:busy',
  CALL_ENDED: 'call:ended',
  CALL_TIMEOUT: 'call:timeout',

  ERROR: 'error',
} as const;

export interface CallEventPayload {
  callId: string;
  conversationId: string;
  type: 'VOICE' | 'VIDEO';
  initiator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  livekitRoomName: string;
  livekitUrl?: string;
  participantToken?: string;
  status: 'INITIATING' | 'RINGING' | 'ACTIVE' | 'ENDED';
  endReason?: string | null;
  endedByUserId?: string | null;
  durationSeconds?: number;
  createdAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
}

export interface SocketUserContext {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  sessionId: string;
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface TypingPayload {
  conversationId: string;
}

export interface TypingUpdatePayload {
  conversationId: string;
  userId: string;
  username: string;
  displayName: string;
  isTyping: boolean;
}

export interface PresenceUpdatePayload {
  userId: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeen?: string | null;
}

export interface PresenceGetPayload {
  userIds: string[];
}

export interface ReadReceiptPayload {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
  lastReadAt: string;
  unreadCount: number;
}
