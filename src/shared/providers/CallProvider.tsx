"use client";

import React, { createContext, useContext, useState } from "react";
import { User, ActiveCall, CallType } from "@/types";

interface CallContextType {
  activeCall: ActiveCall | null;
  startCall: (partner: User, type: CallType) => void;
  acceptCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const startCall = (partner: User, type: CallType) => {
    setActiveCall({
      id: `call_${Date.now()}`,
      type,
      status: "outgoing",
      partner,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
    });

    // Auto-connect after 2 seconds simulation
    setTimeout(() => {
      setActiveCall((prev) =>
        prev ? { ...prev, status: "connected", startedAt: new Date().toISOString() } : null
      );
    }, 2000);
  };

  const acceptCall = () => {
    setActiveCall((prev) =>
      prev ? { ...prev, status: "connected", startedAt: new Date().toISOString() } : null
    );
  };

  const endCall = () => {
    setActiveCall((prev) => (prev ? { ...prev, status: "ended" } : null));
    setTimeout(() => {
      setActiveCall(null);
    }, 800);
  };

  const toggleMute = () => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const toggleCamera = () => {
    setActiveCall((prev) => (prev ? { ...prev, isCameraOff: !prev.isCameraOff } : null));
  };

  const toggleScreenShare = () => {
    setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: !prev.isScreenSharing } : null));
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        startCall,
        acceptCall,
        endCall,
        toggleMute,
        toggleCamera,
        toggleScreenShare,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used within a CallProvider");
  return context;
};
