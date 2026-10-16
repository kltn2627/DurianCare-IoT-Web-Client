import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowUpRight,
  CalendarDays,
  MessageCircleMore,
  Phone,
  Sprout,
  UsersRound,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { readSession } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Không gian kỹ sư" };

const engineerActions = [
  {
    href: "/dashboard/community",
    icon: UsersRound,
    label: "Kết nối nông hộ",
    text: "Tìm nông hộ bằng số điện thoại, gửi lời mời và quản lý danh sách đã kết nối.",
  },
  {
    href: "/dashboard/engineer/chat",
    icon: MessageCircleMore,
    label: "Phòng chat tư vấn",
    text: "Mở phòng chat với nông hộ đã kết nối, nhận ảnh bệnh và gửi phác đồ điều trị.",
  },
  {
    href: "/dashboard/engineer/calendar",
    icon: CalendarDays,
    label: "Lịch điều trị",
    text: "Theo dõi lịch chăm sóc, tái khám và công việc kỹ thuật liên quan đến vườn.",
  },
];

export default async function EngineerDashboardPage() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore);
  const userName = session?.profile.fullName?.trim() || "kỹ sư";
  const phoneNumber = session?.profile.phoneNumber?.trim() || "Chưa cập nhật";

  return (
    <DashboardShell role="ENGINEER" userName={userName}>
      <div className="space-y-7">
        <section className="grid-pattern overflow-hidden rounded-[24px] bg-[#233f31] p-8 text-white lg:flex lg:items-end lg:justify-between lg:p-10">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#EED56D]">
              DurianCare Engineer Workspace
            </p>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Chào {userName}, đây là không gian tư vấn của kỹ sư.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d4e0d8]">
              Kỹ sư chỉ thấy các công cụ tư vấn: tìm nông hộ, kết nối, chat và lập phác đồ. Các màn duyệt hồ sơ và điều phối hệ thống thuộc quyền Admin.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.08] px-4 py-3 text-sm font-bold lg:mt-0">
            <Phone size={16} className="text-[#EED56D]" />
            {phoneNumber}
          </span>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {engineerActions.map(({ href, icon: Icon, label, text }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-52 flex-col justify-between rounded-[24px] border border-[#dde6dd] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#b7c8ba] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]/40"
            >
              <span className="flex items-start justify-between gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#2E5A44] text-[#EED56D]">
                  <Icon size={22} />
                </span>
                <ArrowUpRight
                  size={18}
                  className="text-[#849087] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2E5A44]"
                />
              </span>
              <span>
                <b className="block text-base font-extrabold text-neutral-950">{label}</b>
                <span className="mt-2 block text-sm leading-6 text-neutral-500">{text}</span>
              </span>
            </Link>
          ))}
        </section>

        <section className="rounded-[24px] border border-[#dce5dc] bg-[#f8faf7] p-5">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#EED56D] text-[#2E5A44]">
              <Sprout size={21} />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-neutral-950">Luồng làm việc đề xuất</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Vào Kết nối nông hộ, tìm bằng số điện thoại và gửi lời mời. Khi hai bên đã kết nối, vào Phòng chat để tạo hoặc mở hội thoại với nông hộ đó.
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
