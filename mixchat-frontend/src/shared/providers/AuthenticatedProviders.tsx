"use client";

import type { ReactNode } from "react";
import { ChatProvider } from "./ChatProvider";
import { LocationProvider } from "./LocationProvider";
import { NotificationsProvider } from "./NotificationsProvider";
import { PushPermissionPrompt } from "@/shared/components/pwa/PushPermissionPrompt";

export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <ChatProvider>
        <NotificationsProvider>
          <PushPermissionPrompt />
          {children}
        </NotificationsProvider>
      </ChatProvider>
    </LocationProvider>
  );
}
