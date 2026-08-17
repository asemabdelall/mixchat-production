"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/providers/AuthProvider";
import { Loader2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status, isAuthenticated } = useAuth();

  useEffect(() => {
    if (status === "loading") return;
    if (isAuthenticated) {
      router.replace("/feed");
    }
  }, [status, isAuthenticated, router]);

  if (status === "loading" || isAuthenticated) {
    return (
      <main className="min-h-[100dvh] w-full flex items-center justify-center bg-[#070914] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-4 bg-[#070914] relative overflow-hidden text-foreground">
      {/* Glow Orbs Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[430px] relative z-10 my-auto">
        {children}
      </div>
    </main>
  );
}
