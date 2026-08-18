"use client";

import React, { useState, useMemo } from "react";
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
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { AuthBrand } from "@/shared/components/auth/AuthBrand";
import { AuthTabSwitcher } from "@/shared/components/auth/AuthTabSwitcher";
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
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});

  // Real-time validation checks
  const isUsernameValid = useMemo(() => {
    const clean = username.trim().toLowerCase();
    return /^[a-zA-Z0-9_]{3,30}$/.test(clean);
  }, [username]);

  const isEmailValid = useMemo(() => {
    const clean = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  }, [email]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "None", color: "bg-slate-700" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password) && password.length >= 10) score += 1;

    if (score === 1) return { score: 1, label: "Weak", color: "bg-rose-500", text: "text-rose-400" };
    if (score === 2) return { score: 2, label: "Good", color: "bg-amber-500", text: "text-amber-400" };
    return { score: 3, label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" };
  }, [password]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (errorMessage) setErrorMessage(null);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errorMessage) setErrorMessage(null);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errorMessage) setErrorMessage(null);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const newErrors: { username?: string; email?: string; password?: string } = {};

    if (!cleanUsername) {
      newErrors.username = "Please choose a username.";
    } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      newErrors.username = "Username must be 3-30 characters (letters, numbers, underscores).";
    }

    if (!cleanEmail) {
      newErrors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Please create a password.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
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
          "Registration could not be completed. Please check your information.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col">
      {/* Mobile Branding (visible on small screens) */}
      <div className="lg:hidden">
        <AuthBrand compact />
      </div>

      {/* Mode Navigation Tabs */}
      <AuthTabSwitcher activeTab="register" />

      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Create an account
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Join the MixChat community and start connecting today
        </p>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Registration error</span>
            <span className="text-rose-300/90 text-[11px]">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white text-xs cursor-pointer px-1"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Username field */}
        <Input
          id="register-username"
          label="Username"
          type="text"
          name="username"
          placeholder="e.g. alex_rivera"
          autoComplete="username"
          icon={<User className="h-4 w-4" />}
          rightElement={
            isUsernameValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : null
          }
          value={username}
          onChange={handleUsernameChange}
          error={fieldErrors.username}
          helperText="3-30 letters, numbers, and underscores"
          required
          disabled={isLoading}
        />

        {/* Email field */}
        <Input
          id="register-email"
          label="Email Address"
          type="email"
          name="email"
          placeholder="name@example.com"
          autoComplete="email"
          icon={<Mail className="h-4 w-4" />}
          rightElement={
            isEmailValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : null
          }
          value={email}
          onChange={handleEmailChange}
          error={fieldErrors.email}
          required
          disabled={isLoading}
        />

        {/* Password field */}
        <div className="space-y-2">
          <Input
            id="register-password"
            label="Password"
            type={showPassword ? "text" : "password"}
            name="new-password"
            placeholder="Create a strong password"
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
            onChange={handlePasswordChange}
            error={fieldErrors.password}
            required
            disabled={isLoading}
          />

          {/* Dynamic Password Strength Indicator */}
          {password.length > 0 && (
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Password Strength:</span>
                <span className={`font-semibold ${passwordStrength.text}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 h-1.5">
                <div
                  className={`rounded-full transition-all duration-300 ${
                    passwordStrength.score >= 1 ? passwordStrength.color : "bg-white/10"
                  }`}
                />
                <div
                  className={`rounded-full transition-all duration-300 ${
                    passwordStrength.score >= 2 ? passwordStrength.color : "bg-white/10"
                  }`}
                />
                <div
                  className={`rounded-full transition-all duration-300 ${
                    passwordStrength.score >= 3 ? passwordStrength.color : "bg-white/10"
                  }`}
                />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                <span className={`flex items-center gap-1 ${password.length >= 8 ? "text-emerald-400" : ""}`}>
                  <CheckCircle2 className="w-3 h-3" /> Min. 8 characters
                </span>
                <span className={`flex items-center gap-1 ${/[0-9]/.test(password) ? "text-emerald-400" : ""}`}>
                  <CheckCircle2 className="w-3 h-3" /> Contains number
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right transition-all duration-300 text-white font-semibold rounded-2xl text-sm shadow-[0_4px_20px_rgba(139,92,246,0.35)] flex items-center justify-center gap-2 group mt-3 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating your account...</span>
            </>
          ) : (
            <>
              <span>Create Free Account</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      {/* Terms & Privacy Note */}
      <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed">
        By registering, you agree to MixChat&apos;s Community Guidelines and Privacy Policy.
      </p>

      {/* Bottom Switch Link */}
      <div className="text-center mt-4">
        <p className="text-xs text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-purple-400 hover:text-purple-300 font-semibold transition-colors ml-1 inline-flex items-center hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
