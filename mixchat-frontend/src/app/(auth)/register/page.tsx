"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { AuthBrand } from "@/shared/components/auth/AuthBrand";
import { useAuth } from "@/shared/providers/AuthProvider";
import { ApiClientError } from "@/services/api/apiClient";

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerAccount } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername) {
      setErrorMessage("Please enter a username.");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      setErrorMessage(
        "Username must be 3-30 characters, letters, numbers, and underscore only.",
      );
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      await registerAccount({
        email: cleanEmail,
        username: cleanUsername,
        password,
      });
      router.push("/feed");
    } catch (err: unknown) {
      const apiErr = err as ApiClientError;
      setErrorMessage(
        apiErr.message ||
          "Registration failed. Please check your information and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full">
        <div className="relative rounded-3xl bg-[#0c0f1d]/85 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(139,92,246,0.12)] p-5 sm:p-6 overflow-hidden">
          {/* Subtle Corner Ambient Lighting */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Shared Branding Header */}
          <AuthBrand />

          {/* Greeting & Subtitle */}
          <div className="text-center mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-0.5">
              Create your account
            </h2>
            <p className="text-xs text-slate-400">
              Join MixChat and connect with friends
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="register-username"
              label="Username"
              type="text"
              name="username"
              placeholder="your_username"
              autoComplete="username"
              icon={<User className="h-4 w-4" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />

            <Input
              id="register-email"
              label="Email Address"
              type="email"
              name="email"
              placeholder="name@example.com"
              autoComplete="email"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />

            <Input
              id="register-password"
              label="Password (min. 8 characters)"
              type={showPassword ? "text" : "password"}
              name="new-password"
              placeholder="••••••••••••"
              autoComplete="new-password"
              icon={<Lock className="h-4 w-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex min-h-8 min-w-8 items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-[0_4px_20px_rgba(139,92,246,0.35)] transition-all flex items-center justify-center gap-2 group mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Security Badge */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-center gap-1.5 text-[11px] text-slate-400 select-none">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
            <span>Secure registration with Argon2id password hashing</span>
          </div>

          {/* Switch to Login */}
          <div className="text-center mt-3 pt-2">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
