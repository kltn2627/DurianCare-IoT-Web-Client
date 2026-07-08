"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Leaf,
  LogOut,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { authClient } from "@/lib/auth/client";
import type { DashboardRole } from "@/lib/auth/types";
import { notificationClient } from "@/lib/notification/client";

type DashboardShellProps = {
  role: DashboardRole;
  userName?: string;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
};

const ownerNav: NavItem[] = [
  { href: "/dashboard/client", label: "Tổng quan" },
  { href: "/dashboard/client/sensors", label: "Cảm biến IoT" },
  { href: "/dashboard/client/diagnosis", label: "Nhật ký AI" },
  { href: "/dashboard/client/authorization", label: "Ủy quyền" },
  { href: "/dashboard/client/calendar", label: "Lịch canh tác" },
  { href: "/dashboard/client/crops", label: "Vụ mùa & QR" },
  { href: "/dashboard/client/chat", label: "Chat AI & kỹ sư" },
  { href: "/dashboard/client/knowledge", label: "Kiến thức" },
  { href: "/notifications", label: "Thông báo" },
];

const adminNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Tổng quan" },
  { href: "/dashboard/admin/expert-chat", label: "Điều phối chat" },
  { href: "/dashboard/admin/knowledge", label: "Bài viết" },
  { href: "/dashboard/admin/calendar", label: "Lịch điều trị" },
  { href: "/notifications", label: "Thông báo" },
];

const engineerNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Tổng quan" },
  { href: "/dashboard/admin/expert-chat", label: "Phòng chat" },
  { href: "/dashboard/admin/knowledge", label: "Tri thức" },
  { href: "/dashboard/admin/calendar", label: "Lịch điều trị" },
  { href: "/notifications", label: "Thông báo" },
];

const roleLabels: Record<DashboardRole, string> = {
  OWNER: "Chủ vườn",
  ADMIN: "Quản trị viên",
  ENGINEER: "Kỹ sư nông nghiệp",
};

function buildNav(role: DashboardRole) {
  if (role === "ADMIN") return adminNav;
  if (role === "ENGINEER") return engineerNav;
  return ownerNav;
}

function getInitials(name?: string) {
  if (!name) return "DC";
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "DC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function DashboardShell({ role, userName, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const navItems = useMemo(() => buildNav(role), [role]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const currentName = user?.profile.fullName ?? userName ?? "Người dùng";
  const currentAvatar = user?.profile.avatarUrl ?? null;
  const currentInitials = getInitials(currentName);

  useEffect(() => {
    let active = true;
    notificationClient
      .count()
      .then((result) => {
        if (active) setNotificationCount(result.count);
      })
      .catch(() => {
        if (active) setNotificationCount(null);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const closeMenus = () => {
      setProfileMenuOpen(false);
      setMenuOpen(false);
    };

    window.addEventListener("resize", closeMenus);
    return () => window.removeEventListener("resize", closeMenus);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      await authClient.logout();
    } finally {
      router.push("/login");
      router.refresh();
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-neutral-900">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href={role === "OWNER" ? "/dashboard/client" : "/dashboard/admin"}
            className="flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-neutral-50"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#2E5A44] text-[#EED56D] shadow-sm">
              <Leaf size={20} />
            </span>
            <span className="hidden sm:block">
              <strong className="block text-[14px] tracking-tight text-neutral-900">
                DurianCare
              </strong>
              <span className="block text-[11px] text-neutral-500">
                {roleLabels[role]}
              </span>
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${
                    active
                      ? "bg-[#edf3ee] text-[#2E5A44]"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/search"
              className="inline-flex size-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-600 transition-all duration-200 hover:border-[#c8d9cf] hover:bg-[#f4f8f4] hover:text-[#2E5A44] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4418]"
              aria-label="Tìm kiếm"
            >
              <Search size={18} />
            </Link>

            <Link
              href="/notifications"
              className="relative inline-flex size-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-600 transition-all duration-200 hover:border-[#c8d9cf] hover:bg-[#f4f8f4] hover:text-[#2E5A44] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4418]"
              aria-label="Thông báo"
            >
              <Bell size={18} />
              {notificationCount != null && notificationCount > 0 ? (
                <span className="absolute right-2 top-2 min-w-4 rounded-full bg-[#EED56D] px-1 py-0.5 text-[10px] font-bold leading-none text-[#2E5A44]">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              ) : null}
            </Link>

            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((current) => !current)}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2 transition-all duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4418]"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
              >
                <span className="grid size-8 overflow-hidden rounded-xl bg-[#edf3ee] text-[#2E5A44]">
                  {currentAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentAvatar} alt={currentName} className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-[11px] font-bold">
                      {currentInitials}
                    </span>
                  )}
                </span>
                <span className="leading-tight">
                  <strong className="block max-w-[140px] truncate text-[13px] text-neutral-900">
                    {currentName}
                  </strong>
                  <span className="block text-[11px] text-neutral-500">{roleLabels[role]}</span>
                </span>
              </button>

              {profileMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg shadow-[#00000010]">
                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <UserRound size={16} className="text-[#2E5A44]" />
                    Hồ sơ của tôi
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-red-700 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2E5A44] px-4 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:opacity-60 md:hidden"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">
                {loggingOut ? "Đang thoát..." : "Đăng xuất"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex size-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-700 transition-all duration-200 hover:bg-neutral-50 lg:hidden"
              aria-label="Mở menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-neutral-200 bg-white lg:hidden">
            <div className="mx-auto max-w-7xl space-y-2 px-4 py-4 sm:px-6">
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                <span className="grid size-9 overflow-hidden rounded-xl bg-[#edf3ee] text-[#2E5A44]">
                  {currentAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentAvatar} alt={currentName} className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-[11px] font-bold">
                      {currentInitials}
                    </span>
                  )}
                </span>
                <div className="leading-tight">
                  <strong className="block text-[13px] text-neutral-900">{currentName}</strong>
                  <span className="block text-[11px] text-neutral-500">{roleLabels[role]}</span>
                </div>
              </div>

              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-[13px] font-semibold transition-all duration-200 ${
                      active
                        ? "bg-[#edf3ee] text-[#2E5A44]"
                        : "bg-neutral-50 text-neutral-600"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.href === "/notifications" && notificationCount ? (
                      <span className="rounded-full bg-[#EED56D] px-2 py-1 text-[10px] font-bold text-[#2E5A44]">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}

              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-[13px] font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-50"
              >
                <UserRound size={16} className="text-[#2E5A44]" />
                Hồ sơ của tôi
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E5A44] px-4 py-3 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-[#244a37]"
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

export type { DashboardRole };
