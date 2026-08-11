"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 1000);
  };

  return (
    <Card className="glass-panel p-8 shadow-2xl border-white/10 text-center">
      <Link href="/login" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Login</span>
      </Link>

      {!isSent ? (
        <>
          <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
          <p className="text-xs text-muted-foreground mb-6">
            Enter your registered email address and we&apos;ll send you a password reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email Address"
              placeholder="name@example.com"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" isLoading={isLoading} className="w-full h-12 text-base font-semibold shadow-lg shadow-purple-500/30">
              <span>Send Reset Link</span>
            </Button>
          </form>
        </>
      ) : (
        <div className="space-y-4 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-bg-primary text-white shadow-xl mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Reset Link Sent!</h3>
          <p className="text-xs text-muted-foreground">
            We sent an email to <span className="text-purple-300 font-medium">{email || "your email"}</span> with instructions to reset your password.
          </p>

          <Link href="/login" className="block pt-4">
            <Button variant="glass" className="w-full h-12">
              Return to Login
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
