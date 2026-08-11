"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { ChatProvider } from "./ChatProvider";
import { CallProvider } from "./CallProvider";

import { LocationProvider } from "./LocationProvider";
import { ReelsProvider } from "./ReelsProvider";
import { ServiceWorkerRegister } from "../components/pwa/ServiceWorkerRegister";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <ChatProvider>
            <CallProvider>
              <ReelsProvider>
                <ServiceWorkerRegister />
                {children}
              </ReelsProvider>
            </CallProvider>
          </ChatProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
