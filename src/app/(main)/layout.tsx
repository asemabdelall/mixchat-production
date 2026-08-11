import React from "react";
import { MainLayout } from "@/shared/layouts/MainLayout";

export default function MainRouteLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
