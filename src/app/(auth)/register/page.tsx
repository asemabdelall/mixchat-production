"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Mail, Lock, Sparkles, ArrowRight, Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { AuthBrand } from "@/shared/components/auth/AuthBrand";
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
    <div className="w-full flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full"
      >
        <div className="relative rounded-3xl bg-[#0c0f1d]/85 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(139,92,246,0.12)] p-5 sm:p-6 overflow-hidden">
          {/* Subtle Corner Ambient Lighting */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Shared Branding Header */}
          <AuthBrand />

          {/* Greeting & Subtitle */}
          <div className="text-center mb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-0.5">
              Create your account
            </h2>
            <p className="text-xs text-slate-400">
              Join Mix Chat and start connecting.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <label htmlFor="register-fullname" className="text-xs font-medium text-slate-300 mb-1 block">
                Display Name
              </label>
              <Input
                id="register-fullname"
                type="text"
                name="name"
                placeholder="Display Name (e.g. Alex Vance)"
                autoComplete="name"
                icon={<User className="h-4 w-4 text-slate-400" />}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                aria-invalid={!!errorMessage}
                className="h-[46px] sm:h-[48px] bg-[#121629]/90 border-white/10 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/40 rounded-xl"
              />
            </div>

            <div>
              <label htmlFor="register-username" className="text-xs font-medium text-slate-300 mb-1 block">
                Username
              </label>
              <Input
                id="register-username"
                type="text"
                name="username"
                placeholder="Username (e.g. alexvance)"
                autoComplete="username"
                icon={<Sparkles className="h-4 w-4 text-slate-400" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                aria-invalid={!!errorMessage}
                className="h-[46px] sm:h-[48px] bg-[#121629]/90 border-white/10 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/40 rounded-xl"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="text-xs font-medium text-slate-300 mb-1 block">
                Email Address
              </label>
              <Input
                id="register-email"
                type="email"
                name="email"
                placeholder="Email Address"
                autoComplete="email"
                icon={<Mail className="h-4 w-4 text-slate-400" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={!!errorMessage}
                className="h-[46px] sm:h-[48px] bg-[#121629]/90 border-white/10 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/40 rounded-xl"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="text-xs font-medium text-slate-300 mb-1 block">
                Password
              </label>
              <Input
                id="register-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Choose Password"
                autoComplete="new-password"
                icon={<Lock className="h-4 w-4 text-slate-400" />}
                rightElement={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowPassword((prev) => !prev);
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 shrink-0" /> : <Eye className="h-4 w-4 shrink-0" />}
                  </button>
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-invalid={!!errorMessage}
                className="h-[46px] sm:h-[48px] bg-[#121629]/90 border-white/10 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/40 rounded-xl"
              />
            </div>

            {/* Primary Sign Up CTA */}
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading || !fullName.trim() || !username.trim() || !email.trim() || !password.trim()}
              className="w-full h-[48px] sm:h-[50px] text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#2563eb] hover:from-[#7c3aed] hover:via-[#4f46e5] hover:to-[#1d4ed8] shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 border border-white/10 rounded-xl text-white transition-all duration-200 mt-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Login Footer Link */}
          <div className="mt-3 text-center text-xs text-slate-400">
            <span>Already have an account? </span>
            <Link
              href="/login"
              className="font-semibold text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1 hover:underline"
            >
              <span>Sign in</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Trust Message below Card */}
      <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-slate-400/80">
        <ShieldCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
        <span>Your privacy and security matter to us</span>
      </div>
    </div>
  );
}

