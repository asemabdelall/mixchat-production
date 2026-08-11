"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { AuthBrand } from "@/shared/components/auth/AuthBrand";
import { useAuth } from "@/shared/providers/AuthProvider";

// SVG Icons for Social Authentication matching visual reference
const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.14C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.59H1.29C.47 8.23 0 10.06 0 12s.47 3.77 1.29 5.41l3.99-3.14z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.59l3.99 3.14c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-5 h-5 shrink-0 fill-white" viewBox="0 0 24 24">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.09c.68-.82 1.14-1.97.01-3.09-1.01.04-2.25.68-2.96 1.51-.63.73-1.18 1.91-1.03 3.03 1.13.09 2.3-.63 3.98-1.45z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#1877F2"
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("alex.vance@mixchat.app");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
      router.push("/feed");
    } catch {
      setErrorMessage("Invalid credentials. Please check your email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialClick = (e: React.MouseEvent, provider: string) => {
    e.preventDefault();
    setErrorMessage(`${provider} authentication is coming soon. Please sign in with your email.`);
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
          <div className="text-center mb-3.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-0.5 flex items-center justify-center gap-1.5">
              <span>Welcome back</span>
              <span className="inline-block">👋</span>
            </h2>
            <p className="text-xs text-slate-400">
              Sign in to access your chats, feed and live map
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-3.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label htmlFor="login-email" className="text-xs font-medium text-slate-300 mb-1 block">
                Email address
              </label>
              <Input
                id="login-email"
                type="email"
                name="email"
                placeholder="Enter your email"
                autoComplete="email"
                icon={<Mail className="h-4 w-4 text-slate-400" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={!!errorMessage}
                className="h-[52px] bg-[#121629]/90 border-white/10 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/40 rounded-xl"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="text-xs font-medium text-slate-300 mb-1 block">
                Password
              </label>
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
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
                className="h-[52px] bg-[#121629]/90 border-white/10 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/40 rounded-xl"
              />
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-3.5 w-3.5 rounded border-white/20 bg-[#121629] text-indigo-600 focus:ring-indigo-500/60 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                />
                <span>Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-sm"
              >
                Forgot password?
              </Link>
            </div>

            {/* Primary Sign In CTA */}
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full h-[52px] text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#2563eb] hover:from-[#7c3aed] hover:via-[#4f46e5] hover:to-[#1d4ed8] shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 border border-white/10 rounded-xl text-white transition-all duration-200 mt-1"
            >
              <span>Sign in</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Social Auth Divider */}
          <div className="my-3 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-[11px] text-slate-400 font-normal">or continue with</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          {/* Social Auth Providers Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={(e) => handleSocialClick(e, "Google")}
              aria-label="Continue with Google"
              className="flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl bg-[#121629]/70 hover:bg-[#181d36] border border-white/10 hover:border-purple-500/30 transition-all duration-200 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <GoogleIcon />
              <span className="text-[11px] font-medium text-slate-200 group-hover:text-white transition-colors">
                Google
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSocialClick(e, "Apple")}
              aria-label="Continue with Apple"
              className="flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl bg-[#121629]/70 hover:bg-[#181d36] border border-white/10 hover:border-purple-500/30 transition-all duration-200 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <AppleIcon />
              <span className="text-[11px] font-medium text-slate-200 group-hover:text-white transition-colors">
                Apple
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSocialClick(e, "Facebook")}
              aria-label="Continue with Facebook"
              className="flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl bg-[#121629]/70 hover:bg-[#181d36] border border-white/10 hover:border-purple-500/30 transition-all duration-200 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <FacebookIcon />
              <span className="text-[11px] font-medium text-slate-200 group-hover:text-white transition-colors">
                Facebook
              </span>
            </button>
          </div>

          {/* Registration Link */}
          <div className="mt-3 text-center text-xs text-slate-400">
            <span>Don&apos;t have an account? </span>
            <Link
              href="/register"
              className="font-semibold text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1 hover:underline"
            >
              <span>Create one</span>
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
