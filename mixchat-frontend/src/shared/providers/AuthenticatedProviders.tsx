"use client";

import type { ReactNode } from "react";
import { ChatProvider } from "./ChatProvider";
import { LocationProvider } from "./LocationProvider";
import { NotificationsProvider } from "./NotificationsProvider";

export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <ChatProvider>
        <NotificationsProvider>{children}</NotificationsProvider>
      </ChatProvider>
    </LocationProvider>
  );
}
