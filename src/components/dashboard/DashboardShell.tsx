"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Bot,
  ChevronDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPinned,
  Menu,
  MessageCircle,
  Microscope,
  QrCode,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
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
  icon: typeof LayoutDashboard;
};

const ownerNav: NavItem[] = [
  {
    href: "/dashboard/client/cultivation-zones",
    label: "Khu canh tác",
    icon: MapPinned,
  },
  { href: "/dashboard/client", label: "Tổng quan", icon: LayoutDashboard },
  {
    href: "/dashboard/client/sensors",
    label: "Cảm biến IoT",
    icon: Microscope,
  },
  { href: "/dashboard/client/diagnosis", label: "Phân tích AI", icon: Bot },
  {
    href: "/dashboard/client/authorization",
    label: "Ủy quyền",
    icon: ShieldCheck,
  },
  {
    href: "/dashboard/client/calendar",
    label: "Lịch chăm sóc",
    icon: CalendarDays,
  },
  { href: "/dashboard/client/crops", label: "Vụ mùa & QR", icon: QrCode },
  { href: "/dashboard/community", label: "Cộng đồng", icon: UsersRound },
  {
    href: "/dashboard/client/chat",
    label: "Chat AI & kỹ sư",
    icon: MessageCircle,
  },
  { href: "/dashboard/client/knowledge", label: "Kiến thức", icon: BookOpen },
  { href: "/notifications", label: "Thông báo", icon: Bell },
];

void ownerNav;

const adminNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/dashboard/community", label: "Cộng đồng", icon: UsersRound },
  {
    href: "/dashboard/admin/expert-chat",
    label: "Điều phối chat",
    icon: MessageCircle,
  },
  { href: "/dashboard/admin/knowledge", label: "Bài viết", icon: BookOpen },
  {
    href: "/dashboard/admin/calendar",
    label: "Lịch điều trị",
    icon: CalendarDays,
  },
  { href: "/notifications", label: "Thông báo", icon: Bell },
];

const engineerNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/dashboard/community", label: "Cộng đồng", icon: UsersRound },
  {
    href: "/dashboard/admin/expert-chat",
    label: "Phòng chat",
    icon: MessageCircle,
  },
  { href: "/dashboard/admin/knowledge", label: "Tri thức", icon: BookOpen },
  {
    href: "/dashboard/admin/calendar",
    label: "Lịch điều trị",
    icon: CalendarDays,
  },
  { href: "/notifications", label: "Thông báo", icon: Bell },
];

const ownerNavFixed: NavItem[] = [
  { href: "/dashboard/client", label: "Tổng quan", icon: LayoutDashboard },
  {
    href: "/dashboard/client/cultivation-zones",
    label: "Khu canh tác",
    icon: MapPinned,
  },
  {
    href: "/dashboard/client/sensors",
    label: "Cảm biến IoT",
    icon: Microscope,
  },
  {
    href: "/dashboard/client/calendar",
    label: "Lịch chăm sóc",
    icon: CalendarDays,
  },
  { href: "/dashboard/client/diagnosis", label: "Phân tích AI", icon: Bot },
  { href: "/dashboard/client/crops", label: "Vụ mùa & QR", icon: QrCode },
  {
    href: "/dashboard/client/authorization",
    label: "Ủy quyền",
    icon: ShieldCheck,
  },
  {
    href: "/dashboard/client/chat",
    label: "Chat AI & kỹ sư",
    icon: MessageCircle,
  },
  { href: "/dashboard/client/knowledge", label: "Kiến thức", icon: BookOpen },
  { href: "/dashboard/community", label: "Cộng đồng", icon: UsersRound },
];

const roleLabels: Record<DashboardRole, string> = {
  OWNER: "Chủ vườn",
  ADMIN: "Quản trị viên",
  ENGINEER: "Kỹ sư nông nghiệp",
};

const SIDEBAR_STORAGE_KEY = "duriancare.dashboard.sidebar.collapsed";

function buildNav(role: DashboardRole) {
  if (role === "ADMIN")
    return adminNav.filter((item) => item.href !== "/notifications");
  if (role === "ENGINEER")
    return engineerNav.filter((item) => item.href !== "/notifications");
  return ownerNavFixed;
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

function isActivePath(pathname: string, item: NavItem, items: NavItem[]) {
  const matches = items
    .filter(
      (candidate) =>
        pathname === candidate.href ||
        pathname.startsWith(`${candidate.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.href === item.href;
}

export function DashboardShell({
  role,
  userName,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const navItems = useMemo(() => buildNav(role), [role]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState<number | null>(
    null,
  );
  const [loggingOut, setLoggingOut] = useState(false);

  const currentName = user?.profile.fullName ?? userName ?? "Người dùng";
  const currentAvatar = user?.profile.avatarUrl ?? null;
  const currentInitials = getInitials(currentName);
  const homeHref = role === "OWNER" ? "/dashboard/client" : "/dashboard/admin";

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

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
    setMobileOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

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

  const profileButton = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setProfileMenuOpen((current) => !current)}
        className="inline-flex min-h-14 w-14 items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-white px-2 py-2 text-left shadow-sm transition hover:bg-neutral-50 sm:w-80 sm:justify-start sm:px-3"
        aria-haspopup="menu"
        aria-expanded={profileMenuOpen}
      >
        <span className="grid size-11 shrink-0 overflow-hidden rounded-2xl bg-[#e4efe7] text-[#2E5A44]">
          {currentAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentAvatar}
              alt={currentName}
              className="size-full object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-sm font-extrabold">
              {currentInitials}
            </span>
          )}
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <strong className="block max-w-[190px] truncate text-base font-extrabold text-neutral-950">
            {currentName}
          </strong>
          <span className="block truncate text-[13px] font-bold text-neutral-600">
            {roleLabels[role]}
          </span>
        </span>
        <ChevronDown
          size={18}
          className="ml-auto hidden text-neutral-500 sm:block"
        />
      </button>

      {profileMenuOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl shadow-black/10"
          role="menu"
        >
          <Link
            href="/profile"
            className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold text-neutral-800 transition hover:bg-[#eef6ef] hover:text-[#2E5A44]"
            role="menuitem"
          >
            <UserRound size={17} />
            Thông tin nhà vườn
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            role="menuitem"
          >
            <LogOut size={17} />
            {loggingOut ? "Đang thoát..." : "Đăng xuất"}
          </button>
        </div>
      ) : null}
    </div>
  );

  const sidebar = (
    <aside
      className={`flex h-full flex-col border-r border-neutral-200 bg-white shadow-sm transition-[width] duration-200 ${collapsed ? "w-[82px]" : "w-[248px]"}`}
    >
      <div className="flex min-h-[76px] items-center gap-3 border-b border-neutral-100 px-4">
        <Link
          href={homeHref}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2 text-left"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#2E5A44] text-[#EED56D] shadow-sm">
            <Leaf size={21} />
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <strong className="block truncate text-base font-extrabold tracking-tight text-neutral-950">
                DurianCare
              </strong>
              <span className="block truncate text-[13px] font-semibold text-neutral-600">
                {roleLabels[role]}
              </span>
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="hidden size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50 lg:inline-flex"
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 lg:hidden"
          aria-label="Đóng menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div className="grid gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item, navItems);
            const count =
              item.href === "/notifications" && notificationCount
                ? notificationCount
                : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-bold transition ${
                  active
                    ? "bg-[#2E5A44] text-white shadow-sm"
                    : "text-neutral-700 hover:bg-[#eef6ef] hover:text-[#244a37]"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed ? (
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                ) : null}
                {!collapsed && count ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${active ? "bg-white text-[#2E5A44]" : "bg-[#EED56D] text-[#2E5A44]"}`}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
                {collapsed && count ? (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-[#EED56D]" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-neutral-100 px-3 py-2 text-center text-xs font-semibold text-neutral-400">
        {!collapsed ? "DurianCare IoT" : "DC"}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-neutral-950">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block">
        {sidebar}
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          />
          <div className="relative h-full max-w-[86vw]">{sidebar}</div>
        </div>
      ) : null}

      <div
        className={`min-h-screen transition-[padding] duration-200 ${collapsed ? "lg:pl-[82px]" : "lg:pl-[248px]"}`}
      >
        <header className="hidden border-b border-neutral-200/80 bg-white/88 backdrop-blur lg:block">
          <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-end gap-3 px-6">
            <Link
              href="/search"
              className="inline-flex size-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50"
              aria-label="Tìm kiếm"
            >
              <Search size={23} />
            </Link>
            <Link
              href="/notifications"
              className="relative inline-flex size-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50"
              aria-label="Thông báo"
            >
              <Bell size={23} />
              {notificationCount != null && notificationCount > 0 ? (
                <span className="absolute right-2.5 top-2.5 min-w-5 rounded-full bg-[#EED56D] px-1 py-0.5 text-xs font-extrabold leading-none text-[#2E5A44]">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              ) : null}
            </Link>
            {profileButton}
          </div>
        </header>

        <header className="border-b border-neutral-200/80 bg-white/90 backdrop-blur lg:hidden">
          <div className="flex min-h-[64px] items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex size-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-800"
              aria-label="Mở menu"
            >
              <Menu size={21} />
            </button>
            <Link
              href={homeHref}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-[#2E5A44] text-[#EED56D]">
                <Leaf size={19} />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-base font-extrabold text-neutral-950">
                  DurianCare
                </strong>
                <span className="block truncate text-xs font-semibold text-neutral-600">
                  {roleLabels[role]}
                </span>
              </span>
            </Link>
            <Link
              href="/search"
              className="inline-flex size-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700"
              aria-label="Tìm kiếm"
            >
              <Search size={21} />
            </Link>
            {profileButton}
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5 lg:px-6 lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}

export type { DashboardRole };
