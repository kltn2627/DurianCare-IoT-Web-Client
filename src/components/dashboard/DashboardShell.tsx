"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Leaf, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

export type DashboardRole = "OWNER" | "ADMIN" | "ENGINEER";

const ownerNav = [
  ["Tổng quan", "/dashboard/client"],
  ["Cảm biến IoT", "/dashboard/client#sensors"],
  ["Nhật ký AI", "/dashboard/client#diagnosis"],
  ["Ủy quyền vườn", "/dashboard/client#authorization"],
  ["Vụ mùa & QR", "/dashboard/client#crops"],
];

const adminNav = [
  ["Tổng quan hệ thống", "/dashboard/admin"],
  ["Mật độ dịch bệnh", "/dashboard/admin#diseases"],
  ["Danh mục phác đồ", "/dashboard/admin#protocols"],
  ["Hồ sơ kỹ sư", "/dashboard/admin#engineers"],
];

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHashSnapshot() {
  return window.location.hash;
}

export function DashboardShell({
  role,
  userName,
  children,
}: {
  role: DashboardRole;
  userName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hash = useSyncExternalStore(subscribeToHash, getHashSnapshot, () => "");
  const [open, setOpen] = useState(false);
  const profileName = userName ?? (role === "OWNER" ? "Nguyễn Minh" : "Tài khoản nội bộ");
  const nav = role === "OWNER" ? ownerNav : adminNav;
  const roleLabel = role === "OWNER" ? "Chủ trang trại" : role === "ENGINEER" ? "Kỹ sư hệ thống" : "Quản trị viên";
  const isActive = (href: string) => {
    const [targetPath, targetHash = ""] = href.split("#");
    if (pathname !== targetPath) return false;
    return targetHash ? hash === `#${targetHash}` : hash === "";
  };

  const logout = () => {
    sessionStorage.removeItem("durian-session");
    document.cookie = "durian-role=; path=/; max-age=0; samesite=lax";
    router.push("/login");
  };

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-[#dfe6df] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-8 px-5 lg:px-8">
          <Link href={role === "OWNER" ? "/dashboard/client" : "/dashboard/admin"} className="flex shrink-0 items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[14px_14px_14px_5px] bg-[#2E5A44] text-[#EED56D]">
              <Leaf size={23} />
            </span>
            <span>
              <b className="block text-[18px] tracking-[-.5px] text-[#2E5A44]">DurianCare</b>
              <small className="block text-[7px] font-bold tracking-[2.2px] text-[#87958c]">{role === "OWNER" ? "FARM OWNER" : "CONTROL CENTER"}</small>
            </span>
          </Link>

          <nav className="hidden h-full flex-1 items-center justify-center gap-1 lg:flex">
            {nav.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className={`relative flex h-10 items-center rounded-xl px-3 text-[12px] font-semibold transition-colors duration-200 ${
                  isActive(href)
                    ? "bg-[#edf3ee] text-[#2E5A44]"
                    : "text-[#68776e] hover:bg-[#f6f8f5] hover:text-[#2E5A44]"
                }`}
              >
                {label}
                {isActive(href) && <i className="absolute -bottom-[17px] left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-[#D8B43F]" />}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button className="hidden size-9 place-items-center rounded-xl border border-[#e4e9e3] text-[#607067] sm:grid" aria-label="Tìm kiếm"><Search size={18} /></button>
            <button className="relative hidden size-9 place-items-center rounded-xl border border-[#e4e9e3] text-[#607067] sm:grid" aria-label="Thông báo">
              <Bell size={18} /><i className="absolute right-2 top-2 size-1.5 rounded-full bg-[#D6A928]" />
            </button>
            <Link href="/profile" className={`hidden items-center gap-2 rounded-xl border-l border-[#e4e8e3] py-1 pl-3 pr-2 transition-colors md:flex ${pathname === "/profile" ? "bg-[#edf3ee]" : "hover:bg-[#f5f7f4]"}`}>
              <span className="grid size-9 place-items-center rounded-xl bg-[#f2d86e] text-[11px] font-extrabold text-[#2E5A44]">
                {profileName.split(" ").slice(-2).map((word) => word[0]).join("")}
              </span>
              <span><b className="block text-[11px]">{profileName}</b><small className="text-[8px] text-[#89958e]">{roleLabel}</small></span>
              <UserRound size={14} className="text-[#87938b]" />
            </Link>
            <button onClick={logout} className="hidden size-9 place-items-center rounded-xl text-[#7a887f] hover:bg-[#f3f5f1] md:grid" aria-label="Đăng xuất"><LogOut size={17} /></button>
            <button onClick={() => setOpen(!open)} className="grid size-10 place-items-center rounded-xl border border-[#e1e6df] lg:hidden" aria-label="Mở menu">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="grid gap-1 border-t border-[#e7ebe5] bg-white p-4 lg:hidden">
            {nav.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)} className={`rounded-xl px-4 py-3 text-sm font-semibold ${isActive(href) ? "bg-[#edf3ee] text-[#2E5A44]" : "text-[#516158] hover:bg-[#f5f7f4]"}`}>{label}</Link>)}
            <Link href="/profile" onClick={() => setOpen(false)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${pathname === "/profile" ? "bg-[#edf3ee] text-[#2E5A44]" : "text-[#516158] hover:bg-[#f5f7f4]"}`}><UserRound size={17} /> Thông tin hồ sơ</Link>
            <button onClick={logout} className="mt-2 flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#9b4f3d]"><LogOut size={17} /> Đăng xuất</button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">{children}</main>
    </div>
  );
}
