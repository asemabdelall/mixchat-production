"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  anonymousService,
  AnonymousSessionDto,
  AnonymousMessageDto,
  AnonymousRevealedUserDto,
} from "@/services/anonymous/anonymousService";
import { socketClient } from "@/services/api/socketClient";
import { RealtimeEvents } from "@/services/api/realtimeEvents";

export type MatchmakingStatus = "IDLE" | "SEARCHING" | "MATCHED";
export type PartnerConnectionState =
  "CONNECTED" | "RECONNECTING" | "DISCONNECTED";

export function useAnonymousChat() {
  const [status, setStatus] = useState<MatchmakingStatus>("IDLE");
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [session, setSession] = useState<AnonymousSessionDto | null>(null);
  const [messages, setMessages] = useState<AnonymousMessageDto[]>([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerConnectionStatus, setPartnerConnectionStatus] =
    useState<PartnerConnectionState>("CONNECTED");
  const [isRevealRequestedByPartner, setIsRevealRequestedByPartner] =
    useState(false);
  const [revealedPartner, setRevealedPartner] =
    useState<AnonymousRevealedUserDto | null>(null);
  const [sessionEndReason, setSessionEndReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeSessionIdRef.current = session?.id || null;
  }, [session?.id]);

  // 1. Initial State Restoration on Mount
  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        setIsLoading(true);
        const res = await anonymousService.getStatus();
        if (!isMounted) return;
        if (res.status === "MATCHED" && res.session) {
          setStatus("MATCHED");
          setSession(res.session);
          setMessages(res.session.messages || []);
          setIsRevealRequestedByPartner(
            Boolean(
              res.session.revealConsent.partner &&
              !res.session.revealConsent.me,
            ),
          );
          if (res.session.revealedPartner) {
            setRevealedPartner(res.session.revealedPartner);
          }
        } else if (res.status === "SEARCHING") {
          setStatus("SEARCHING");
          setJoinedAt(res.joinedAt || null);
          setSelectedInterests(res.interests || []);
        } else {
          setStatus("IDLE");
        }
      } catch {
        if (isMounted) setStatus("IDLE");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Realtime WebSocket Event Subscriptions
  useEffect(() => {
    const unsubMatch = socketClient.on<AnonymousSessionDto>(
      RealtimeEvents.ANONYMOUS_MATCH_FOUND,
      (newSession) => {
        setStatus("MATCHED");
        setSession(newSession);
        setMessages(newSession.messages || []);
        setIsRevealRequestedByPartner(false);
        setRevealedPartner(newSession.revealedPartner || null);
        setSessionEndReason(null);
        setPartnerConnectionStatus("CONNECTED");
      },
    );

    const unsubMsg = socketClient.on<AnonymousMessageDto>(
      RealtimeEvents.ANONYMOUS_MESSAGE_NEW,
      (newMsg) => {
        if (
          activeSessionIdRef.current &&
          newMsg.sessionId === activeSessionIdRef.current
        ) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      },
    );

    const unsubTyping = socketClient.on<{
      sessionId: string;
      isTyping: boolean;
    }>(RealtimeEvents.ANONYMOUS_TYPING_UPDATE, (data) => {
      if (
        activeSessionIdRef.current &&
        data.sessionId === activeSessionIdRef.current
      ) {
        setIsPartnerTyping(data.isTyping);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (data.isTyping) {
          typingTimeoutRef.current = setTimeout(
            () => setIsPartnerTyping(false),
            4000,
          );
        }
      }
    });

    const unsubRevealReq = socketClient.on<{ sessionId: string }>(
      RealtimeEvents.ANONYMOUS_REVEAL_REQUESTED,
      (data) => {
        if (
          activeSessionIdRef.current &&
          data.sessionId === activeSessionIdRef.current
        ) {
          setIsRevealRequestedByPartner(true);
        }
      },
    );

    const unsubRevealCancel = socketClient.on<{ sessionId: string }>(
      RealtimeEvents.ANONYMOUS_REVEAL_CANCELLED,
      (data) => {
        if (
          activeSessionIdRef.current &&
          data.sessionId === activeSessionIdRef.current
        ) {
          setIsRevealRequestedByPartner(false);
        }
      },
    );

    const unsubRevealed = socketClient.on<{
      sessionId: string;
      revealedPartner: AnonymousRevealedUserDto | null;
    }>(RealtimeEvents.ANONYMOUS_IDENTITY_REVEALED, (data) => {
      if (
        activeSessionIdRef.current &&
        data.sessionId === activeSessionIdRef.current
      ) {
        setRevealedPartner(data.revealedPartner);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                status: "REVEALED",
                revealConsent: { me: true, partner: true, isMutual: true },
                revealedPartner: data.revealedPartner || undefined,
              }
            : null,
        );
      }
    });

    const unsubPartnerStatus = socketClient.on<{
      sessionId: string;
      status: PartnerConnectionState;
    }>(RealtimeEvents.ANONYMOUS_PARTNER_STATUS, (data) => {
      if (
        activeSessionIdRef.current &&
        data.sessionId === activeSessionIdRef.current
      ) {
        setPartnerConnectionStatus(data.status);
      }
    });

    const unsubPartnerLeft = socketClient.on<{
      sessionId: string;
      reason: string;
    }>(RealtimeEvents.ANONYMOUS_PARTNER_LEFT, (data) => {
      if (
        activeSessionIdRef.current &&
        data.sessionId === activeSessionIdRef.current
      ) {
        setSessionEndReason(data.reason || "LEFT");
        setPartnerConnectionStatus("DISCONNECTED");
        setSession((prev) => (prev ? { ...prev, status: "ENDED" } : null));
      }
    });

    return () => {
      unsubMatch();
      unsubMsg();
      unsubTyping();
      unsubRevealReq();
      unsubRevealCancel();
      unsubRevealed();
      unsubPartnerStatus();
      unsubPartnerLeft();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // 3. User Actions
  const joinQueue = useCallback(async (interests: string[] = []) => {
    try {
      setIsLoading(true);
      setError(null);
      setSelectedInterests(interests);
      const res = await anonymousService.joinQueue(interests);
      if (res.status === "MATCHED" && res.session) {
        setStatus("MATCHED");
        setSession(res.session);
        setMessages(res.session.messages || []);
        setSessionEndReason(null);
        setPartnerConnectionStatus("CONNECTED");
      } else {
        setStatus("SEARCHING");
        setJoinedAt(res.joinedAt || new Date().toISOString());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join queue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const leaveQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      await anonymousService.leaveQueue();
      setStatus("IDLE");
      setJoinedAt(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel search");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (content?: string, mediaId?: string, voiceDurationMs?: number) => {
      if (!session || session.status === "ENDED") return;
      try {
        setIsSending(true);
        const newMsg = await anonymousService.sendMessage(session.id, {
          content,
          mediaId,
          voiceDurationMs,
          type: mediaId ? (voiceDurationMs ? "VOICE" : "IMAGE") : "TEXT",
        });

        setMessages((prev) => [...prev, newMsg]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsSending(false);
      }
    },
    [session],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!session || session.status === "ENDED") return;
      if (isTyping) {
        void socketClient.emitAsync(RealtimeEvents.ANONYMOUS_TYPING_START, {
          sessionId: session.id,
        });
      } else {
        void socketClient.emitAsync(RealtimeEvents.ANONYMOUS_TYPING_STOP, {
          sessionId: session.id,
        });
      }
    },
    [session],
  );

  const skipMatch = useCallback(
    async (requeue: boolean = true) => {
      if (!session) return;
      try {
        setIsLoading(true);
        const res = await anonymousService.skipSession(
          session.id,
          requeue,
          selectedInterests,
        );
        if (requeue) {
          if (res.status === "MATCHED" && res.session) {
            setStatus("MATCHED");
            setSession(res.session);
            setMessages(res.session.messages || []);
            setSessionEndReason(null);
            setPartnerConnectionStatus("CONNECTED");
            setRevealedPartner(null);
            setIsRevealRequestedByPartner(false);
          } else {
            setStatus("SEARCHING");
            setSession(null);
            setMessages([]);
            setJoinedAt(res.joinedAt || new Date().toISOString());
          }
        } else {
          setStatus("IDLE");
          setSession(null);
          setMessages([]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to skip match");
      } finally {
        setIsLoading(false);
      }
    },
    [session, selectedInterests],
  );

  const leaveSession = useCallback(async () => {
    if (!session) return;
    try {
      setIsLoading(true);
      await anonymousService.leaveSession(session.id);
      setStatus("IDLE");
      setSession(null);
      setMessages([]);
      setSessionEndReason(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to leave session");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const requestReveal = useCallback(async () => {
    if (!session) return;
    try {
      const updated = await anonymousService.requestReveal(session.id);
      setSession(updated);
      if (updated.revealedPartner) {
        setRevealedPartner(updated.revealedPartner);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to request identity reveal",
      );
    }
  }, [session]);

  const cancelReveal = useCallback(async () => {
    if (!session) return;
    try {
      const updated = await anonymousService.cancelReveal(session.id);
      setSession(updated);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel reveal request",
      );
    }
  }, [session]);

  const blockPartner = useCallback(async () => {
    if (!session) return;
    try {
      await anonymousService.blockPartner(session.id);
      setStatus("IDLE");
      setSession(null);
      setMessages([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to block user");
    }
  }, [session]);

  const reportPartner = useCallback(
    async (reason: string, details?: string) => {
      if (!session) return;
      try {
        await anonymousService.reportPartner(session.id, {
          reason,
          details,
          messageSnippets: messages
            .slice(-5)
            .map((m) => m.content || "[Media Attachment]"),
        });
        setSessionEndReason("REPORTED");
        setSession((prev) => (prev ? { ...prev, status: "ENDED" } : null));
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to submit report",
        );
      }
    },
    [session, messages],
  );

  const resetToIdle = useCallback(() => {
    setStatus("IDLE");
    setSession(null);
    setMessages([]);
    setSessionEndReason(null);
    setRevealedPartner(null);
    setIsRevealRequestedByPartner(false);
  }, []);

  return {
    status,
    joinedAt,
    selectedInterests,
    session,
    messages,
    isPartnerTyping,
    partnerConnectionStatus,
    isRevealRequestedByPartner,
    revealedPartner,
    isRevealed: session?.status === "REVEALED" || Boolean(revealedPartner),
    sessionEndReason,
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
    resetToIdle,
  };
}
