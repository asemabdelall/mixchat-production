"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Shield, Volume2 } from "lucide-react";
import { useCall } from "@/shared/providers/CallProvider";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";

export const CallOverlay: React.FC = () => {
  const { activeCall, endCall, toggleMute, toggleCamera, toggleScreenShare } = useCall();
  const [elapsed, setElapsed] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const elapsedRef = useRef(0);

  // Reset elapsed when call status changes to non-connected
  const isConnected = activeCall?.status === "connected";

  // Simulated call timer
  useEffect(() => {
    if (!isConnected) {
      elapsedRef.current = 0;
      return;
    }
    const interval = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  if (!activeCall) return null;

  const isRinging = activeCall.status === "outgoing" || activeCall.status === "incoming";
  const isVideo = activeCall.type === "video";

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Background Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
        />

        {/* Call Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative z-10 w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d121f]/95 backdrop-blur-xl p-6 shadow-2xl overflow-hidden flex flex-col items-center justify-between min-h-[500px]"
        >
          {/* Ambient Background Glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[200px] h-[200px] rounded-full bg-indigo-600/10 blur-[100px]" />
          </div>

          {/* Top Bar */}
          <div className="w-full flex items-center justify-between text-xs text-muted-foreground border-b border-white/10 pb-4 relative z-10">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-400" />
              <span className="text-purple-300/80 font-medium">Mix Call Prototype</span>
              <span className="w-px h-3 bg-white/20" />
              <span>HD {isVideo ? "Video" : "Voice"} Call</span>
            </div>
            <span className="font-mono text-purple-300 tabular-nums">
              {isRinging ? (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  Ringing...
                </motion.span>
              ) : (
                formatTime(elapsed)
              )}
            </span>
          </div>

          {/* Active Call Video Grid or Voice Visualizer */}
          <div className="w-full flex-1 flex flex-col items-center justify-center my-6 relative z-10">
            {isVideo && !activeCall.isCameraOff ? (
              <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                {/* Main Remote Video Stream Simulation */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeCall.partner.avatar}
                  alt={activeCall.partner.displayName}
                  className="w-full h-full object-cover filter brightness-90"
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {activeCall.partner.displayName}
                </div>

                {/* Self Mini Camera Box */}
                <motion.div
                  drag
                  dragConstraints={{ left: -200, right: 0, top: 0, bottom: 200 }}
                  className="absolute bottom-3 right-3 w-28 h-20 rounded-xl overflow-hidden border-2 border-purple-500 shadow-lg cursor-grab active:cursor-grabbing"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                    alt="You"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </div>
            ) : (
              /* Voice Call Pulse Radar */
              <div className="flex flex-col items-center">
                <div className="relative mb-8">
                  <motion.span
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 opacity-20"
                    animate={{ scale: [1, 1.6, 1], opacity: [0.2, 0.05, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  />
                  <motion.span
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 opacity-15"
                    animate={{ scale: [1, 2, 1], opacity: [0.15, 0.02, 0.15] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.5 }}
                  />
                  <Avatar
                    src={activeCall.partner.avatar}
                    alt={activeCall.partner.displayName}
                    size="xl"
                    className="relative z-10 border-4 border-purple-500 shadow-2xl"
                  />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{activeCall.partner.displayName}</h2>
                <p className="text-sm text-purple-300 font-medium flex items-center gap-2">
                  {isRinging ? (
                    "Calling..."
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Voice Connected • HD Audio
                    </>
                  )}
                </p>

                {/* Audio Waveform Visualizer */}
                {!isRinging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-0.5 mt-6 h-8"
                  >
                    {[40, 70, 30, 90, 60, 100, 45, 80, 25, 95, 50, 75].map((h, i) => (
                      <motion.div
                        key={i}
                        className="w-1 rounded-full bg-purple-400/60"
                        animate={{
                          height: [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.8 + i * 0.1,
                          ease: "easeInOut",
                          delay: i * 0.05,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Control Bar Actions */}
          <div className="w-full flex items-center justify-center gap-4 pt-4 border-t border-white/10 relative z-10">
            <button
              onClick={toggleMute}
              aria-label={activeCall.isMuted ? "Unmute Microphone" : "Mute Microphone"}
              className={`p-4 rounded-full transition-all cursor-pointer ${
                activeCall.isMuted
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "bg-white/5 border border-white/10 text-foreground hover:bg-white/10"
              }`}
            >
              {activeCall.isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>

            {isVideo && (
              <button
                onClick={toggleCamera}
                aria-label={activeCall.isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                className={`p-4 rounded-full transition-all cursor-pointer ${
                  activeCall.isCameraOff
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-white/5 border border-white/10 text-foreground hover:bg-white/10"
                }`}
              >
                {activeCall.isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </button>
            )}

            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              aria-label={isSpeakerOn ? "Disable Speaker" : "Enable Speaker"}
              className={`p-4 rounded-full transition-all cursor-pointer ${
                isSpeakerOn
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "bg-white/5 border border-white/10 text-foreground hover:bg-white/10"
              }`}
            >
              <Volume2 className="h-6 w-6" />
            </button>

            <button
              onClick={toggleScreenShare}
              aria-label={activeCall.isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
              className={`p-4 rounded-full transition-all cursor-pointer ${
                activeCall.isScreenSharing
                  ? "gradient-bg-primary text-white"
                  : "bg-white/5 border border-white/10 text-foreground hover:bg-white/10"
              }`}
            >
              <Monitor className="h-6 w-6" />
            </button>

            <Button
              onClick={endCall}
              variant="destructive"
              aria-label="End Call"
              className="rounded-full p-4 h-14 w-14 shadow-lg shadow-red-500/40 hover:scale-105 cursor-pointer"
            >
              <PhoneOff className="h-6 w-6 text-white" />
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
