"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Sparkles, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { useAuth } from "@/shared/providers/AuthProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [fullName, setFullName] = useState("Alex Vance");
  const [username, setUsername] = useState("alexvance");
  const [email, setEmail] = useState("alex.vance@mixchat.app");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !username.trim()) {
      setErrorMessage("Please enter your display name and username.");
      return;
    }
    if (!email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email);
      router.push("/verify-otp");
    } catch {
      setErrorMessage("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-panel p-8 shadow-2xl border-white/10">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
        <p className="text-xs text-muted-foreground">Join Mix Chat today for instant feed, stories & video calls</p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          label="Display Name"
          placeholder="Display Name (e.g. Alex Vance)"
          icon={<User className="h-4 w-4" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Input
          type="text"
          label="Username"
          placeholder="Username (e.g. alexvance)"
          icon={<Sparkles className="h-4 w-4" />}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <Input
          type="email"
          label="Email Address"
          placeholder="Email Address"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          type={showPassword ? "text" : "password"}
          label="Password"
          placeholder="Choose Password"
          icon={<Lock className="h-4 w-4" />}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading || !fullName.trim() || !username.trim() || !email.trim() || !password.trim()}
          className="w-full h-12 text-base font-semibold shadow-lg shadow-purple-500/30 mt-2"
        >
          <span>Get Started Free</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-purple-400 hover:text-purple-300">
          Sign In
        </Link>
      </p>
    </Card>
  );
}
