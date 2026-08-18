"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/providers/AuthProvider";
import { Loader2 } from "lucide-react";
import { AuthShowcase } from "@/shared/components/auth/AuthShowcase";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/feed");
    }
  }, [isAuthenticated, router]);

  if (status === "loading" || isAuthenticated) {
    return (
      <main className="app-viewport flex items-center justify-center text-white bg-[#080b14]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-purple-500" />
          <span className="text-xs text-slate-400 font-medium">Securing session...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="app-viewport flex flex-col lg:flex-row items-stretch justify-between overflow-y-auto custom-scrollbar bg-[#080b14] text-foreground">
      {/* Background Ambient Glow Elements */}
      <div className="fixed -top-24 left-10 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[170px] pointer-events-none" />
      <div className="fixed -bottom-24 right-10 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[170px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-pink-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Left Side: Desktop Cinematic Showcase */}
      <AuthShowcase />

      {/* Right Side: Authentication Form Area (No boxed container, full edge-to-edge) */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-14 xl:p-20 relative z-10 my-auto">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </main>
  );
}
