"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Github, Chrome } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { useAuth } from "@/shared/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("alex.vance@mixchat.app");
  const [password, setPassword] = useState("••••••••••••");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await login(email);
    setIsLoading(false);
    router.push("/feed");
  };

  const handleSocialClick = (e: React.MouseEvent) => {
    e.preventDefault();
    login(email);
    router.push("/feed");
  };

  return (
    <Card className="glass-panel p-8 shadow-2xl border-white/10">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-xs text-muted-foreground">Sign in to access your feed, chats, and live map</p>
      </div>

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

        <Input
          type="password"
          label="Password"
          placeholder="••••••••••••"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground">
            <input type="checkbox" defaultChecked className="rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500" />
            <span>Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-purple-400 hover:text-purple-300 transition-colors">Forgot password?</Link>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full h-12 text-base font-semibold shadow-lg shadow-purple-500/30">
          <span>Sign In</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-white/10" />
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Or continue with</span>
        <div className="h-[1px] flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="glass" size="sm" onClick={handleSocialClick}>
          <Chrome className="h-4 w-4" />
          <span>Google</span>
        </Button>
        <Button variant="glass" size="sm" onClick={handleSocialClick}>
          <Github className="h-4 w-4" />
          <span>GitHub</span>
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-purple-400 hover:text-purple-300">
          Create one now
        </Link>
      </p>
    </Card>
  );
}
