'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { CallContext, CallContextType } from './CallContext';
import {
  callsService,
  CallResponseDto,
} from '@/services/calls/callsService';
import { socketClient } from '@/services/api/socketClient';
import {
  RealtimeEvents,
  CallEventPayload,
} from '@/services/api/realtimeEvents';
import { callSounds } from '../utils/callSounds';
import { Toast } from '@/shared/components/ui/Toast';
import { IncomingCallOverlay } from '../components/IncomingCallOverlay';
import { VoiceCallScreen } from '../components/VoiceCallScreen';
import { VideoCallScreen } from '../components/VideoCallScreen';
import { MinimizedCallBar } from '../components/MinimizedCallBar';
import { OutgoingCallOverlay } from '../components/OutgoingCallOverlay';
import { useAuth } from '@/shared/providers/AuthProvider';

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const { user } = useAuth();
  const [currentCall, setCurrentCall] = useState<CallResponseDto | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallEventPayload | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [callStatusMessage, setCallStatusMessage] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitServerUrl, setLivekitServerUrl] = useState<string | null>(null);

  const [toastState, setToastState] = useState<{
    isOpen: boolean;
    message: string;
    type: 'info' | 'error' | 'success';
  }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback(
    (message: string, type: 'info' | 'error' | 'success' = 'info') => {
      setToastState({ isOpen: true, message, type });
    },
    [],
  );

  const statusClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Session recovery on mount / auth change
  useEffect(() => {
    let isMounted = true;

    if (!user) {
      callSounds.stopAll();
      return;
    }

    async function checkActiveCall() {
      try {
        const active = await callsService.getCurrentCall();
        if (active && isMounted) {
          setCurrentCall(active);
          if (active.livekit?.participantToken) {
            setLivekitToken(active.livekit.participantToken);
            setLivekitServerUrl(active.livekit.serverUrl);
          }
        }
      } catch {
        // Ignore background check failure
      }
    }

    void checkActiveCall();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // 2. Call Duration Counter
  useEffect(() => {
    const isCallActive = (currentCall?.status as string) === 'ACTIVE';
    if (!isCallActive) {
      return;
    }

    const startMs =
      currentCall?.answeredAt && typeof currentCall.answeredAt === 'string'
        ? new Date(currentCall.answeredAt).getTime()
        : Date.now();

    const interval = setInterval(() => {
      setCallDuration(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [currentCall?.status, currentCall?.answeredAt]);

  // 3. LiveKit token synchronization & auto-recovery for active calls
  useEffect(() => {
    let isMounted = true;

    if (
      currentCall &&
      currentCall.status === 'ACTIVE' &&
      (!livekitToken || !livekitServerUrl)
    ) {
      callsService
        .getCallToken(currentCall.id)
        .then((tokenData) => {
          if (isMounted && tokenData.participantToken) {
            setLivekitToken(tokenData.participantToken);
            setLivekitServerUrl(tokenData.serverUrl);
          }
        })
        .catch(() => {
          // Token fetch failed
        });
    }

    return () => {
      isMounted = false;
    };
  }, [currentCall, livekitToken, livekitServerUrl]);

  // 3. Socket.IO Realtime Signaling Subscriptions
  useEffect(() => {
    if (!user) return;

    // Incoming Call received
    const unsubIncoming = socketClient.on(
      RealtimeEvents.CALL_INCOMING,
      (data: unknown) => {
        const payload = data as CallEventPayload;
        setIncomingCall(payload);
        callSounds.startRingtone();
      },
    );

    // Call Ringing (initiated by current user)
    const unsubRinging = socketClient.on(
      RealtimeEvents.CALL_RINGING,
      () => {
        setCallStatusMessage('Ringing...');
        callSounds.startRingback();
      },
    );

    // Call Accepted by callee
    const unsubAccepted = socketClient.on(
      RealtimeEvents.CALL_ACCEPTED,
      async (data: unknown) => {
        const payload = data as CallEventPayload;
        callSounds.stopAll();
        callSounds.playConnectSound();
        setIncomingCall(null);
        setCallStatusMessage(null);

        try {
          const callData = await callsService.getCallById(payload.callId);
          const tokenData = await callsService.getCallToken(payload.callId);
          setCurrentCall(callData);
          setLivekitToken(tokenData.participantToken);
          setLivekitServerUrl(tokenData.serverUrl);
        } catch {
          showToast('Failed to connect to media room', 'error');
        }
      },
    );

    // Call Declined by callee
    const unsubDeclined = socketClient.on(
      RealtimeEvents.CALL_DECLINED,
      () => {
        callSounds.stopAll();
        callSounds.playEndSound();
        setIncomingCall(null);
        setCallStatusMessage('Call Declined');
        showToast('Call declined', 'info');

        statusClearTimerRef.current = setTimeout(() => {
          setCurrentCall(null);
          setLivekitToken(null);
          setCallStatusMessage(null);
        }, 1500);
      },
    );

    // Call Cancelled by caller
    const unsubCancelled = socketClient.on(
      RealtimeEvents.CALL_CANCELLED,
      () => {
        callSounds.stopAll();
        callSounds.playEndSound();
        setIncomingCall(null);
        setCurrentCall(null);
        setLivekitToken(null);
        setCallStatusMessage(null);
        showToast('Call cancelled', 'info');
      },
    );

    // Callee is Busy
    const unsubBusy = socketClient.on(
      RealtimeEvents.CALL_BUSY,
      () => {
        callSounds.stopAll();
        callSounds.playEndSound();
        setIncomingCall(null);
        setCallStatusMessage('User Busy');
        showToast('User is currently on another call', 'info');

        statusClearTimerRef.current = setTimeout(() => {
          setCurrentCall(null);
          setLivekitToken(null);
          setCallStatusMessage(null);
        }, 2000);
      },
    );

    // Call Ended
    const unsubEnded = socketClient.on(
      RealtimeEvents.CALL_ENDED,
      (data: unknown) => {
        const payload = data as CallEventPayload;
        callSounds.stopAll();
        callSounds.playEndSound();
        setIncomingCall(null);
        setCallStatusMessage('Call Ended');

        if (payload.durationSeconds !== undefined && payload.durationSeconds > 0) {
          showToast(`Call ended (${payload.durationSeconds}s)`, 'info');
        } else {
          showToast('Call ended', 'info');
        }

        statusClearTimerRef.current = setTimeout(() => {
          setCurrentCall(null);
          setLivekitToken(null);
          setCallStatusMessage(null);
          setIsMinimized(false);
          setIsScreenSharing(false);
        }, 1200);
      },
    );

    // Call Timeout / Missed
    const unsubTimeout = socketClient.on(
      RealtimeEvents.CALL_TIMEOUT,
      () => {
        callSounds.stopAll();
        callSounds.playEndSound();
        setIncomingCall(null);
        setCallStatusMessage('No Answer');
        showToast('No answer', 'info');

        statusClearTimerRef.current = setTimeout(() => {
          setCurrentCall(null);
          setLivekitToken(null);
          setCallStatusMessage(null);
          setIsMinimized(false);
        }, 1500);
      },
    );

    return () => {
      unsubIncoming();
      unsubRinging();
      unsubAccepted();
      unsubDeclined();
      unsubCancelled();
      unsubBusy();
      unsubEnded();
      unsubTimeout();
      callSounds.stopAll();
      if (statusClearTimerRef.current) {
        clearTimeout(statusClearTimerRef.current);
      }
    };
  }, [user, showToast]);

  /**
   * Start a new call in a conversation
   */
  const startCall = useCallback(
    async (conversationId: string, type: 'VOICE' | 'VIDEO') => {
      try {
        setCallStatusMessage('Calling...');
        setIsMinimized(false);
        setIsMuted(false);
        setIsVideoOff(false);
        setIsScreenSharing(false);

        const call = await callsService.initiateCall({
          conversationId,
          type,
        });

        setCurrentCall(call);
        if (call.livekit?.participantToken) {
          setLivekitToken(call.livekit.participantToken);
          setLivekitServerUrl(call.livekit.serverUrl);
        }

        callSounds.startRingback();
      } catch (err: unknown) {
        callSounds.stopAll();
        setCallStatusMessage(null);
        const error = err as { message?: string };
        showToast(error.message || 'Could not initiate call', 'error');
      }
    },
    [showToast],
  );

  /**
   * Accept incoming ringing call
   */
  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;

    callSounds.stopAll();
    callSounds.playConnectSound();

    try {
      const call = await callsService.acceptCall(incomingCall.callId);
      setCurrentCall(call);
      setIncomingCall(null);
      if (call.livekit?.participantToken) {
        setLivekitToken(call.livekit.participantToken);
        setLivekitServerUrl(call.livekit.serverUrl);
      }
    } catch (err: unknown) {
      setIncomingCall(null);
      const error = err as { message?: string };
      showToast(error.message || 'Failed to accept call', 'error');
    }
  }, [incomingCall, showToast]);

  /**
   * Decline incoming ringing call
   */
  const declineIncomingCall = useCallback(async () => {
    if (!incomingCall) return;

    callSounds.stopAll();
    const callIdToDecline = incomingCall.callId;
    setIncomingCall(null);

    try {
      await callsService.declineCall(callIdToDecline);
    } catch {
      // Ignore background decline error
    }
  }, [incomingCall]);

  /**
   * Cancel outgoing ringing call
   */
  const cancelOutgoingCall = useCallback(async () => {
    if (!currentCall) return;

    callSounds.stopAll();
    callSounds.playEndSound();
    const callId = currentCall.id;
    setCurrentCall(null);
    setLivekitToken(null);
    setCallStatusMessage(null);

    try {
      await callsService.cancelCall(callId);
    } catch {
      // Ignore
    }
  }, [currentCall]);

  /**
   * Hang up / end current active call
   */
  const endCurrentCall = useCallback(async () => {
    if (!currentCall) return;

    callSounds.stopAll();
    callSounds.playEndSound();
    const callId = currentCall.id;
    setCurrentCall(null);
    setLivekitToken(null);
    setCallStatusMessage(null);
    setIsMinimized(false);
    setIsScreenSharing(false);

    try {
      await callsService.endCall(callId);
    } catch {
      // Ignore
    }
  }, [currentCall]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoOff((prev) => !prev);
  }, []);

  const toggleScreenShare = useCallback(() => {
    setIsScreenSharing((prev) => !prev);
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  const contextValue: CallContextType = {
    currentCall,
    incomingCall,
    isMinimized,
    callDuration,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    isScreenSharing,
    callStatusMessage,
    livekitToken,
    livekitServerUrl,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    cancelOutgoingCall,
    endCurrentCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleSpeaker,
    setMinimized: setIsMinimized,
  };

  // Determine partner for screen presentation
  const otherParticipant = currentCall?.participants.find(
    (p) => p.userId !== user?.id,
  );

  return (
    <CallContext.Provider value={contextValue}>
      {children}

      {/* 1. Incoming Call Full-Screen Overlay */}
      {incomingCall && (
        <IncomingCallOverlay
          caller={incomingCall.initiator}
          callType={incomingCall.type}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
        />
      )}

      {/* 2. Outgoing Call Ringing Screen (when initiating/ringing) */}
      {currentCall &&
        currentCall.status === 'RINGING' &&
        currentCall.initiatorId === user?.id &&
        !isMinimized && (
          <OutgoingCallOverlay
            partner={otherParticipant}
            callType={currentCall.type}
            statusMessage={callStatusMessage || 'Ringing...'}
            onCancel={cancelOutgoingCall}
            onMinimize={() => setIsMinimized(true)}
          />
        )}

      {/* 3. Active Voice Call Screen */}
      {currentCall &&
        currentCall.status === 'ACTIVE' &&
        currentCall.type === 'VOICE' &&
        !isMinimized && (
          <VoiceCallScreen
            partner={otherParticipant}
            duration={callDuration}
            isMuted={isMuted}
            isSpeakerOn={isSpeakerOn}
            livekitServerUrl={livekitServerUrl}
            livekitToken={livekitToken}
            onToggleMute={toggleMute}
            onToggleSpeaker={toggleSpeaker}
            onEndCall={endCurrentCall}
            onMinimize={() => setIsMinimized(true)}
          />
        )}

      {/* 4. Active Video Call Screen */}
      {currentCall &&
        currentCall.status === 'ACTIVE' &&
        currentCall.type === 'VIDEO' &&
        !isMinimized && (
          <VideoCallScreen
            partner={otherParticipant}
            duration={callDuration}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            livekitServerUrl={livekitServerUrl}
            livekitToken={livekitToken}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onEndCall={endCurrentCall}
            onMinimize={() => setIsMinimized(true)}
          />
        )}

      {/* 5. Minimized Floating Call Bar */}
      {currentCall && isMinimized && (
        <MinimizedCallBar
          partner={otherParticipant}
          callType={currentCall.type}
          status={currentCall.status}
          duration={callDuration}
          onRestore={() => setIsMinimized(false)}
          onEndCall={
            currentCall.status === 'RINGING'
              ? cancelOutgoingCall
              : endCurrentCall
          }
        />
      )}

      {/* 6. Call Toast Notifications */}
      <Toast
        isOpen={toastState.isOpen}
        message={toastState.message}
        type={toastState.type}
        onClose={() => setToastState((prev) => ({ ...prev, isOpen: false }))}
      />
    </CallContext.Provider>
  );
}
