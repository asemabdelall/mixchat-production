"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileNavbar } from "./MobileNavbar";
import { Header } from "./Header";
import { PageTransition } from "@/shared/components/ui/PageTransition";
import { PwaInstallPrompt } from "@/shared/components/pwa/PwaInstallPrompt";
import { useChat } from "@/shared/providers/ChatProvider";
import { useAuth } from "@/shared/providers/AuthProvider";
import { Loader2 } from "lucide-react";

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { activeChatId } = useChat();
  const { status, isAuthenticated } = useAuth();

  useEffect(() => {
    if (status === "loading") return;

    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [status, isAuthenticated, router]);

  // Screen Presentation Classification System
  const isChatRoute = pathname === "/chat";

  const isImmersiveRoute =
    pathname === "/reels" ||
    pathname === "/anonymous" ||
    (isChatRoute && activeChatId !== null);

  const isFocusedRoute =
    pathname === "/profile/edit" || pathname.startsWith("/settings");

  // Hide global header on /chat and focused routes
  const showGlobalHeader = !isImmersiveRoute && !isFocusedRoute && !isChatRoute;
  const showMobileNavbar = !isImmersiveRoute && !isFocusedRoute;

  if (status === "loading" || !isAuthenticated) {
    return (
      <div
        className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-[#070913] text-white"
        suppressHydrationWarning
      >
        <div className="flex flex-col items-center gap-3" suppressHydrationWarning>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.5)] animate-pulse">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
          <span className="text-xs text-slate-400 font-medium tracking-wide">
            Restoring session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden bg-[#090c15] text-foreground selection:bg-purple-500 selection:text-white"
      suppressHydrationWarning
    >
      {/* Desktop Sidebar (fixed left) */}
      <DesktopSidebar />

      {/* Main Content Viewport Area */}
      <div
        className="flex-1 min-h-0 flex flex-col w-full overflow-hidden relative lg:pl-64"
      >
        {/* Global Fixed Header */}
        {showGlobalHeader && (
          <div
            className="fixed top-0 left-0 right-0 z-30 lg:left-64"
          >
            <Header />
          </div>
        )}

        {/* Dynamic Scrollable Viewport Container (Isolated Native Scroll) */}
        <main
          className={`flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain select-auto ${
            isImmersiveRoute
              ? "p-0 flex flex-col overflow-hidden"
              : isChatRoute
                ? "p-0 lg:p-3 flex flex-col overflow-hidden w-full h-full max-w-none"
                : isFocusedRoute
                  ? `px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] lg:pb-8 ${
                      showGlobalHeader
                        ? "pt-[calc(4.25rem+env(safe-area-inset-top,0px))] sm:pt-[calc(4.5rem+env(safe-area-inset-top,0px))] lg:pt-20"
                        : "pt-3 sm:pt-6 lg:pt-8"
                    }`
                  : `px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] lg:pb-8 ${
                      showGlobalHeader
                        ? "pt-[calc(4.25rem+env(safe-area-inset-top,0px))] sm:pt-[calc(4.5rem+env(safe-area-inset-top,0px))] lg:pt-20"
                        : "pt-3 sm:pt-6 lg:pt-8"
                    }`
          }`}
        >
          <PageTransition>
            {!isImmersiveRoute && (
              <PwaInstallPrompt variant="banner" className="mb-4" />
            )}
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Floating Mobile Bottom Navigation Bar (anchored directly to viewport root) */}
      {showMobileNavbar && <MobileNavbar />}
    </div>
  );
};
