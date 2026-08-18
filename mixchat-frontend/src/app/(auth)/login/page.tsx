"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { AuthBrand } from "@/shared/components/auth/AuthBrand";
import { AuthTabSwitcher } from "@/shared/components/auth/AuthTabSwitcher";
import { useAuth } from "@/shared/providers/AuthProvider";
import { ApiClientError } from "@/services/api/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
    if (errorMessage) setErrorMessage(null);
    if (fieldErrors.identifier) {
      setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
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

    const cleanIdentifier = identifier.trim();
    const newErrors: { identifier?: string; password?: string } = {};

    if (!cleanIdentifier) {
      newErrors.identifier = "Please enter your email or username.";
    }
    if (!password) {
      newErrors.password = "Please enter your password.";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await login({
        identifier: cleanIdentifier,
        password,
      });
      router.push("/feed");
    } catch (err: unknown) {
      const apiErr = err as ApiClientError;
      setErrorMessage(
        apiErr.message ||
          "Invalid credentials. Please verify your username or password.",
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
      <AuthTabSwitcher activeTab="login" />

      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Welcome back
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter your credentials to access your MixChat account
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
            <span className="font-semibold block">Authentication failed</span>
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

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          id="login-identifier"
          label="Email or Username"
          type="text"
          name="username"
          placeholder="name@example.com or username"
          autoComplete="username"
          icon={<Mail className="h-4 w-4" />}
          value={identifier}
          onChange={handleIdentifierChange}
          error={fieldErrors.identifier}
          required
          disabled={isLoading}
        />

        <div className="space-y-1">
          <Input
            id="login-password"
            label="Password"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="••••••••••••"
            autoComplete="current-password"
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
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right transition-all duration-300 text-white font-semibold rounded-2xl text-sm shadow-[0_4px_20px_rgba(139,92,246,0.35)] flex items-center justify-center gap-2 group mt-4 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      {/* Bottom Switch Link */}
      <div className="text-center mt-6 pt-2">
        <p className="text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-purple-400 hover:text-purple-300 font-semibold transition-colors ml-1 inline-flex items-center hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
