"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Workspace } from "@/types";
import { Brand } from "./brand";
import {
  CloseIcon,
  DeviceIcon,
  HistoryIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
} from "./icons";

interface AppShellProps {
  user: { name: string; email: string };
  workspaces: Workspace[];
  children: React.ReactNode;
}

const NAV = [
  { href: "/app", label: "نظرة عامة", icon: DeviceIcon },
  { href: "/app/members", label: "الأعضاء", icon: UsersIcon },
  { href: "/app/audit", label: "سجل التدقيق", icon: HistoryIcon },
  { href: "/app/settings", label: "الإعدادات", icon: SettingsIcon },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function AppShell({ user, workspaces, children }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const workspaceId =
    searchParams.get("ws") ?? workspaces[0]?.id ?? "";
  const currentWorkspace = workspaces.find((item) => item.id === workspaceId);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function withWorkspace(href: string): string {
    return workspaceId ? `${href}?ws=${workspaceId}` : href;
  }

  function isActive(href: string): boolean {
    if (href === "/app") {
      return pathname === "/app" || pathname.startsWith("/app/devices");
    }
    return pathname.startsWith(href);
  }

  function onWorkspaceChange(nextId: string) {
    router.push(`/app?ws=${nextId}`);
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-5">
      <div className="flex items-center justify-between">
        <Brand />
        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-panel2 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="إغلاق القائمة"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-2xl border border-line/80 bg-panel2/50 p-3">
        <label className="mb-2 block text-[11px] font-medium text-muted" htmlFor="workspace-select">
          مساحة العمل
        </label>
        <div className="relative">
          <select
            id="workspace-select"
            className="w-full appearance-none rounded-xl border border-line bg-[#081220] px-3 py-2.5 pe-8 text-sm font-semibold text-ink focus:border-brand/60 focus:outline-none"
            value={workspaceId}
            onChange={(event) => onWorkspaceChange(event.target.value)}
          >
            {workspaces.length === 0 ? (
              <option value="">لا توجد مساحة</option>
            ) : null}
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {currentWorkspace
            ? `دورك: ${
                currentWorkspace.role === "owner"
                  ? "مالك"
                  : currentWorkspace.role === "member"
                    ? "عضو"
                    : "مشاهد"
              }`
            : "أنشئ مساحة من الإعدادات"}
        </p>
      </div>

      <nav className="space-y-1" aria-label="التنقل الرئيسي">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={withWorkspace(item.href)}
              className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""}`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-line/70 bg-panel2/40 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line/80 py-2 text-xs font-medium text-muted transition hover:border-danger/40 hover:text-danger disabled:opacity-50"
          >
            <LogOutIcon className="h-4 w-4" />
            {loggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}
          </button>
        </div>
        <p className="px-1 text-[10px] leading-5 text-muted/70">
          أداة بموافقة صريحة. لا مراقبة خفية ولا صلاحيات متجاوزة.
        </p>
        <p className="px-1 text-[10px] text-muted/70">
          برمجة وتصميم Baran Avisat —{" "}
          <a className="transition hover:text-ink" href="mailto:baranavisat@gmail.com">
            baranavisat@gmail.com
          </a>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-e border-line/60 bg-[#080f1a]/80 backdrop-blur lg:block">
        {sidebar}
      </aside>

      <div className="lg:hidden">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-[#080f1a]/90 px-4 py-3 backdrop-blur">
          <Brand compact />
          <div className="flex items-center gap-2">
            <span className="chip max-w-[150px] truncate">{currentWorkspace?.name ?? "بدون مساحة"}</span>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-line p-2 text-muted"
              aria-label="فتح القائمة"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="إغلاق القائمة"
            />
            <div className="absolute inset-y-0 right-0 w-[86%] max-w-xs border-s border-line bg-[#080f1a] shadow-2xl">
              {sidebar}
            </div>
          </div>
        ) : null}
      </div>

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
