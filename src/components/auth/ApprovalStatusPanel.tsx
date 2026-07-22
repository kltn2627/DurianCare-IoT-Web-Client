"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeCheck, LoaderCircle, LogOut, ShieldBan } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { isPendingApproval, isRejected } from "@/lib/auth/types";

export function ApprovalStatusPanel() {
  const router = useRouter();
  const { user, loading, logout, refreshSession } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const status = user?.accountStatus ?? user?.profile.accountStatus ?? "PENDING_APPROVAL";

  const content = useMemo(() => {
    if (isRejected(status)) {
      return {
        title: "Hồ sơ kỹ sư chưa được chấp thuận",
        icon: <ShieldBan size={24} />,
        tone: "text-[#8b4935]",
        bg: "bg-[#fff5f1]",
        border: "border-[#f0d6ce]",
        message:
          "Hồ sơ chuyên môn của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết lý do chi tiết hoặc nộp lại hồ sơ đã cập nhật.",
      };
    }

    if (isPendingApproval(status)) {
      return {
        title: "Hồ sơ đang chờ quản trị viên duyệt",
        icon: <BadgeCheck size={24} />,
        tone: "text-[#6d5b15]",
        bg: "bg-[#fff9e8]",
        border: "border-[#f1e1aa]",
        message:
          "Tài khoản của bạn đã xác minh email nhưng vẫn cần quản trị viên xem xét hồ sơ chuyên môn và tài liệu đính kèm trước khi được phép truy cập trải nghiệm kỹ sư.",
      };
    }

    return {
      title: "Tài khoản đã sẵn sàng",
      icon: <BadgeCheck size={24} />,
      tone: "text-[#2E5A44]",
      bg: "bg-[#f1f8f3]",
      border: "border-[#d9e8dd]",
      message:
        "Trạng thái hiện tại của tài khoản đã hợp lệ. Bạn có thể quay lại trang đăng nhập hoặc làm mới phiên để vào đúng khu vực làm việc.",
    };
  }, [status]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSession();
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex w-full max-w-2xl items-center justify-center rounded-[28px] border border-[#e0e7e0] bg-white p-8 text-neutral-500 shadow-[0_18px_60px_rgba(35,61,46,0.08)]">
        Đang tải trạng thái tài khoản...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-2xl rounded-[28px] border border-[#e0e7e0] bg-white p-8 shadow-[0_18px_60px_rgba(35,61,46,0.08)]">
        <p className="text-lg font-extrabold text-[#203329]">Phiên đăng nhập không hợp lệ</p>
        <p className="mt-3 text-sm leading-7 text-neutral-600">
          Vui lòng đăng nhập lại để tiếp tục xem trạng thái phê duyệt.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2E5A44] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#254c39]"
        >
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-[28px] border border-[#e0e7e0] bg-white p-8 shadow-[0_18px_60px_rgba(35,61,46,0.08)]">
        <div className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 ${content.bg} ${content.border}`}>
          <span className={content.tone}>{content.icon}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[1.6px] text-neutral-500">
              Trạng thái tài khoản
            </p>
            <h1 className={`mt-1 text-xl font-extrabold ${content.tone}`}>{content.title}</h1>
          </div>
        </div>

        <p className="mt-6 text-[15px] leading-7 text-neutral-600">{content.message}</p>

        <div className="mt-6 grid gap-3 rounded-2xl bg-[#f8faf8] p-4 text-[13px] text-neutral-600 sm:grid-cols-2">
          <InfoBox label="Email" value={user?.email ?? "—"} />
          <InfoBox label="Vai trò" value={user?.role ?? "—"} />
          <InfoBox label="Trạng thái" value={String(status)} />
          <InfoBox label="Hồ sơ" value={user?.profile.fullName ?? "—"} />
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2E5A44] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#254c39] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? <LoaderCircle size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
            Làm mới trạng thái
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d8e1d8] px-4 py-3 text-[13px] font-bold text-neutral-700 transition hover:border-[#b8c7b9] hover:bg-[#f8fbf8]"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-3 text-[13px] font-bold text-[#2E5A44] transition hover:bg-[#eff5ef]"
          >
            <AlertTriangle size={16} />
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e5ebe5] bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-800">{value}</p>
    </div>
  );
}
