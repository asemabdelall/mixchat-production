"use client";

import React from "react";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";

interface AuthTabSwitcherProps {
  activeTab: "login" | "register";
}

export const AuthTabSwitcher: React.FC<AuthTabSwitcherProps> = ({ activeTab }) => {
  return (
    <div className="grid grid-cols-2 p-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl mb-6 relative">
      <Link
        href="/login"
        className={`flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
          activeTab === "login"
            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
            : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
        }`}
      >
        <LogIn className="w-4 h-4" />
        <span>Sign In</span>
      </Link>

      <Link
        href="/register"
        className={`flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
          activeTab === "register"
            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
            : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
        }`}
      >
        <UserPlus className="w-4 h-4" />
        <span>Create Account</span>
      </Link>
    </div>
  );
};
