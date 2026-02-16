"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Home,
  ShoppingBag,
  LogOut,
  Star,
  ChevronDown,
  Map,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const teacherNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/games", label: "Game Catalog", icon: Gamepad2 },
];

const studentNav: NavItem[] = [
  { href: "/student", label: "Home", icon: Home },
  { href: "/student/map", label: "Adventure Map", icon: Map },
  { href: "/student/games", label: "Games", icon: Gamepad2 },
  { href: "/student/shop", label: "Avatar Shop", icon: ShoppingBag },
];

export default function Sidebar() {
  const pathname = usePathname();
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

  const isStudent = user.role === "student";
  const navItems = isStudent ? studentNav : teacherNav;
  const rootPath = isStudent ? "/student" : "/";

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md z-30 border-b border-neutral-100">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href={rootPath} className="flex items-center gap-2 flex-shrink-0">
            <img src="/full-logo.svg" alt="eyeRadar" className="h-[18px]" />
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === rootPath
                  ? pathname === item.href
                  : pathname.startsWith(item.href) && item.href !== rootPath;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-cream text-neutral-900"
                      : "text-neutral-400 hover:text-neutral-900"
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 hover:bg-cream rounded-full pl-1 pr-3 py-1 transition-colors"
          >
            {isStudent ? (
              <Avatar
                config={user.avatarConfig}
                seed={user.username}
                size={30}
                className="rounded-full"
              />
            ) : (
              <div className="w-[30px] h-[30px] rounded-full bg-neutral-200 flex items-center justify-center text-[11px] font-semibold text-neutral-600">
                {user.displayName.charAt(0)}
              </div>
            )}
            <span className="text-[13px] font-medium text-neutral-700 hidden sm:block">
              {user.displayName}
            </span>
            {isStudent && (
              <span className="hidden sm:flex items-center gap-0.5 text-[11px] text-neutral-400 font-medium">
                <Star size={10} className="text-amber-400" fill="currentColor" />
                Lv {user.age >= 10 ? 3 : user.age >= 7 ? 2 : 1}
              </span>
            )}
            <ChevronDown size={14} className="text-neutral-400" />
          </button>

          {/* Dropdown */}
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
