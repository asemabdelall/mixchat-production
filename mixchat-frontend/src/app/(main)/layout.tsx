import React from "react";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { AuthenticatedProviders } from "@/shared/providers/AuthenticatedProviders";

export default function MainRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedProviders>
      <MainLayout>{children}</MainLayout>
    </AuthenticatedProviders>
  );
}
