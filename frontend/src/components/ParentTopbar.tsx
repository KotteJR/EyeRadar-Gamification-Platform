"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function ParentTopbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-30 bg-white border-b border-neutral-200/80">
      <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
        <Link href="/parent" className="inline-flex">
          <Image
            src="/full-logo.svg"
            alt="eyeRadar"
            width={120}
            height={20}
            className="h-5 w-auto"
            priority
          />
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            <span className="text-[13px] font-medium text-neutral-700 hidden sm:block">{user.displayName}</span>
            <ChevronDown size={14} className="text-neutral-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-neutral-100 py-1.5 z-50">
              <div className="px-3 py-2 border-b border-neutral-50">
                <p className="text-[13px] font-semibold text-neutral-900 truncate">{user.displayName}</p>
                <p className="text-[11px] text-neutral-400 capitalize">{user.role}</p>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-neutral-500 hover:text-red-500 hover:bg-red-50 transition-colors font-medium"
              >
                <LogOut size={14} strokeWidth={1.5} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
