/**
 * MixChat Production Socket.IO Realtime Client
 * Handles bi-directional communication for Real-Time Chat,
 * Live Presence, Typing Indicators, Read Receipts, and Cross-Device Synchronization.
 */

import { io, Socket } from "socket.io-client";
import { RealtimeEvents } from "./realtimeEvents";
import {
  MessageDto,
  SendMessageDto,
  ReadStateDto,
} from "@/services/chat/ChatService";
import { apiClient } from "./apiClient";

export type ConnectionState =
  "connecting" | "connected" | "reconnecting" | "disconnected";

type EventCallback<T = unknown> = (data: T) => void;

class SocketClient {
  private socket: Socket | null = null;
  private url: string;
  private token: string | null = null;
  private currentConversationId: string | null = null;
  private connectionState: ConnectionState = "disconnected";
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private eventListeners: Map<string, Set<EventCallback<unknown>>> = new Map();

  constructor() {
    this.url = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public onConnectionStateChange(
    listener: (state: ConnectionState) => void,
  ): () => void {
    this.stateListeners.add(listener);
    listener(this.connectionState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private setConnectionState(state: ConnectionState) {
    this.connectionState = state;
    this.stateListeners.forEach((listener) => listener(state));
  }

  /**
   * Connect to Socket.IO gateway with authentication token.
   */
  public connect(token?: string) {
    if (typeof window === "undefined") return;
    const activeToken = token || this.token || apiClient.getAccessToken();
    if (!activeToken) return;

    if (this.socket && this.socket.connected && this.token === activeToken)
      return;

    this.token = activeToken;
    this.setConnectionState("connecting");

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    try {
      this.socket = io(`${this.url}/chat`, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      this.socket.on("connect", () => {
        this.setConnectionState("connected");

        // Re-join active conversation room if we were in one before disconnect
        if (this.currentConversationId) {
          void this.joinConversation(this.currentConversationId);
        }
      });

      this.socket.on("connect_error", () => {
        this.setConnectionState("reconnecting");
      });

      this.socket.on("disconnect", (reason) => {
        if (reason === "io client disconnect") {
          this.setConnectionState("disconnected");
        } else {
          this.setConnectionState("reconnecting");
        }
      });

      // Register generic event dispatcher for incoming events
      this.socket.onAny((event: string, data: unknown) => {
        const handlers = this.eventListeners.get(event);
        if (handlers) {
          handlers.forEach((handler) => handler(data));
        }
      });
    } catch {
      this.setConnectionState("disconnected");
    }
  }

  /**
   * Subscribe to a typed socket event. Returns an unsubscribe cleanup function.
   */
  public on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    const handler: EventCallback<unknown> = (data) => callback(data as T);
    this.eventListeners.get(event)!.add(handler);

    return () => {
      const handlers = this.eventListeners.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  /**
   * Join an authorized conversation room.
   */
  public joinConversation(
    conversationId: string,
  ): Promise<{ ok: boolean; conversationId?: string; error?: string }> {
    this.currentConversationId = conversationId;
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({ ok: false, error: "Socket not connected" });
        return;
      }
      this.socket.emit(
        RealtimeEvents.CHAT_JOIN,
        { conversationId },
        (response: {
          ok: boolean;
          conversationId?: string;
          error?: string;
        }) => {
          resolve(response || { ok: true, conversationId });
        },
      );
    });
  }

  /**
   * Leave a conversation room.
   */
  public leaveConversation(conversationId: string) {
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit(RealtimeEvents.CHAT_LEAVE, { conversationId });
    }
  }

  /**
   * Send a message through realtime socket with server acknowledgement.
   */
  public sendMessage(
    conversationId: string,
    payload: SendMessageDto,
  ): Promise<{ ok: boolean; data?: MessageDto; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({ ok: false, error: "Socket not connected" });
        return;
      }

      this.socket.emit(
        RealtimeEvents.MESSAGE_SEND,
        { conversationId, ...payload },
        (response: { ok: boolean; data?: MessageDto; error?: string }) => {
          resolve(response || { ok: false, error: "No response from server" });
        },
      );
    });
  }

  /**
   * Emit typing start indicator.
   */
  public startTyping(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(RealtimeEvents.TYPING_START, { conversationId });
    }
  }

  /**
   * Emit typing stop indicator.
   */
  public stopTyping(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(RealtimeEvents.TYPING_STOP, { conversationId });
    }
  }

  /**
   * Emit read receipt advancement.
   */
  public markRead(
    conversationId: string,
    lastReadMessageId: string,
  ): Promise<{ ok: boolean; data?: ReadStateDto; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({ ok: false, error: "Socket not connected" });
        return;
      }

      this.socket.emit(
        RealtimeEvents.MESSAGE_READ,
        { conversationId, lastReadMessageId },
        (response: { ok: boolean; data?: ReadStateDto; error?: string }) => {
          resolve(response || { ok: true });
        },
      );
    });
  }

  /**
   * Query batch presence status.
   */
  public getPresence(
    userIds: string[],
  ): Promise<
    Record<string, { status: "ONLINE" | "OFFLINE"; lastSeen: string | null }>
  > {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({});
        return;
      }

      this.socket.emit(
        RealtimeEvents.PRESENCE_GET,
        { userIds },
        (response: {
          ok: boolean;
          presence: Record<
            string,
            { status: "ONLINE" | "OFFLINE"; lastSeen: string | null }
          >;
        }) => {
          resolve(response?.presence || {});
        },
      );
    });
  }

  /** Emit an event and resolve its acknowledgement without fabricating a T. */
  public emitAsync<T = unknown>(
    event: string,
    data?: unknown,
  ): Promise<T | { ok: false; error: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({ ok: false, error: "Socket not connected" });
        return;
      }
      this.socket.emit(event, data, (response: T) => resolve(response));
    });
  }

  /**
   * Disconnect socket cleanly.
   */
  public disconnect() {
    this.token = null;
    this.currentConversationId = null;
    this.setConnectionState("disconnected");
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketClient = new SocketClient();
