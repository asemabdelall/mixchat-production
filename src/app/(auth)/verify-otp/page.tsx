"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const canResend = resendTimer === 0;
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  const handleResend = () => {
    setResendTimer(60);
    setOtp(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push("/onboarding");
    }, 1000);
  };

  return (
    <Card className="glass-panel p-8 shadow-2xl border-white/10 text-center">
      <Link href="/login" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Login</span>
      </Link>

      <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-bg-primary text-white shadow-xl mx-auto mb-4">
        <ShieldCheck className="h-8 w-8" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Verify Your Number</h2>
      <p className="text-xs text-muted-foreground mb-6">
        Enter the 6-digit code sent to <span className="text-purple-300 font-medium">+1 (555) 019-9867</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-11 h-13 text-center text-xl font-bold rounded-xl bg-white/5 border border-white/15 focus:border-purple-500 focus:bg-purple-500/10 focus:outline-none transition-all text-white"
            />
          ))}
        </div>

        <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="text-purple-300 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Resend Verification Code</span>
            </button>
          ) : (
            <span>
              Resend code in <strong className="text-purple-400">00:{resendTimer.toString().padStart(2, "0")}</strong>
            </span>
          )}
        </div>

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={otp.some((d) => !d) || isLoading}
          className="w-full h-12 text-base font-semibold shadow-lg shadow-purple-500/30"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span>Verify & Continue</span>
        </Button>
      </form>
    </Card>
  );
}
