'use client';

import { createContext, useContext } from 'react';
import type { CallResponseDto } from '@/services/calls/callsService';
import type { CallEventPayload } from '@/services/api/realtimeEvents';

export interface CallContextType {
  currentCall: CallResponseDto | null;
  incomingCall: CallEventPayload | null;
  isMinimized: boolean;
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  isScreenSharing: boolean;
  callStatusMessage: string | null;
  livekitToken: string | null;
  livekitServerUrl: string | null;
  startCall: (conversationId: string, type: 'VOICE' | 'VIDEO') => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => Promise<void>;
  cancelOutgoingCall: () => Promise<void>;
  endCurrentCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleSpeaker: () => void;
  setMinimized: (minimized: boolean) => void;
}

export const CallContext = createContext<CallContextType | undefined>(undefined);

export function useCall(): CallContextType {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}
