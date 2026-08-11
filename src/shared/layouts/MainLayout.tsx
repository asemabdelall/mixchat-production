"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileNavbar } from "./MobileNavbar";
import { Header } from "./Header";
import { CallOverlay } from "@/features/call/components/CallOverlay";
import { useChat } from "@/shared/providers/ChatProvider";

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { activeChatId } = useChat();

  // Screen Presentation Classification System
  const isImmersiveRoute =
    pathname.startsWith("/stories") ||
    pathname === "/reels" ||
    pathname === "/anonymous" ||
    (pathname === "/chat" && activeChatId !== null);

  const isFocusedRoute =
    pathname === "/profile/edit" ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/verify-otp" ||
    pathname === "/welcome";

  const showGlobalHeader = !isImmersiveRoute && !isFocusedRoute;
  const showMobileNavbar = !isImmersiveRoute && !isFocusedRoute;

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-purple-500 selection:text-white">
      {/* Desktop Sidebar (fixed left) */}
      <DesktopSidebar />

      {/* Main Content Viewport Area */}
      <div
        className={`lg:pl-64 flex flex-col min-h-screen ${
          showMobileNavbar ? "pb-20 lg:pb-0" : "pb-0"
        }`}
      >
        {/* Global Sticky Header */}
        {showGlobalHeader && <Header />}

        {/* Dynamic Viewport Container */}
        <main
          className={
            isImmersiveRoute
              ? "flex-1 w-full mx-auto p-0 flex flex-col h-[100dvh] overflow-hidden"
              : isFocusedRoute
              ? "flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 max-w-5xl animate-in fade-in duration-200"
              : "flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl animate-in fade-in duration-200"
          }
        >
          {children}
        </main>
      </div>

      {/* Voice & Video Call Overlay Dialog */}
      <CallOverlay />

      {/* Mobile Navigation Bar (fixed bottom) */}
      {showMobileNavbar && <MobileNavbar />}
    </div>
  );
};
