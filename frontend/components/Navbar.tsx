"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="w-full bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            N
          </div>
          <span className="font-bold text-slate-100 text-lg tracking-tight group-hover:text-indigo-400 transition-colors">
            Novel Dashboard
          </span>
        </Link>

        {isAuthenticated && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{user?.email || `User #${user?.userId}`}</span>
            </div>

            <button
              onClick={logout}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-all"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
