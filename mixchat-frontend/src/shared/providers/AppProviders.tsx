"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { CallProvider } from "@/features/calls/context/CallProvider";
import { NetworkProvider } from "./NetworkProvider";
import { ServiceWorkerRegister } from "../components/pwa/ServiceWorkerRegister";
import { PwaZoomGuard } from "../components/pwa/PwaZoomGuard";
import { OfflineBanner } from "../components/pwa/OfflineBanner";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <AuthProvider>
          <CallProvider>
            <ServiceWorkerRegister />
            <PwaZoomGuard />
            <OfflineBanner />
            {children}
          </CallProvider>
        </AuthProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
};
