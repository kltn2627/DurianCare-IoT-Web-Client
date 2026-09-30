import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BookOpenText,
  FileSearch,
  MapPinned,
  MessageCircleMore,
} from "lucide-react";
import { DiseasePieChart } from "@/components/charts/DiseasePieChart";
import { AdminManagement } from "@/components/dashboard/AdminManagement";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StatCards } from "@/components/dashboard/StatCards";
import { dashboardStats, systemFarms } from "@/constants/durianMockData";

export const metadata: Metadata = { title: "Trung tâm quản trị" };

export default async function AdminDashboardPage() {
  return (
    <DashboardShell role="ADMIN">
      <div className="space-y-8">
        <section id="overview" className="grid-pattern scroll-mt-24 overflow-hidden rounded-[24px] bg-[#213f30] p-8 text-white lg:flex lg:items-center lg:justify-between lg:p-10">
          <div><p className="text-sm font-extrabold tracking-[1.5px] text-[#EED56D]">DURIANCARE CONTROL CENTER • 06/06/2026</p><h1 className="mt-4 text-2xl font-extrabold tracking-[-1px] sm:text-3xl">Trung tâm điều hành hệ sinh thái</h1><p className="mt-2 max-w-2xl text-sm leading-5 text-[#cbd9cf]">Theo dõi sức khỏe toàn hệ thống, chuẩn hóa phác đồ và kiểm soát chất lượng đội ngũ kỹ sư.</p></div>
          <span className="mt-7 inline-flex items-center gap-4 rounded-xl border border-white/10 bg-white/[.08] px-5 py-4 text-[15px] font-bold lg:mt-0"><Activity size={16} className="text-[#EED56D]" /> Hệ thống hoạt động bình thường</span>
        </section>
        <StatCards items={dashboardStats.admin} />

        <Link
          href="/dashboard/admin#engineer-approvals"
          className="group flex flex-col gap-4 rounded-[24px] border border-[#dce4dc] bg-white p-5 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[#b7c8ba] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]/40 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex min-w-0 items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#2E5A44] text-[#EED56D]">
              <FileSearch size={21} />
            </span>
            <span className="min-w-0">
              <b className="block text-base font-extrabold text-neutral-950">Phê duyệt hồ sơ kỹ sư</b>
              <span className="mt-1 block text-sm text-neutral-500">
                Xem hồ sơ đang chờ duyệt, chứng chỉ đính kèm và quyết định phê duyệt hoặc từ chối.
              </span>
            </span>
          </span>
          <ArrowUpRight className="shrink-0 text-[#829087] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2E5A44]" size={20} />
        </Link>

        <section className="grid gap-9 xl:grid-cols-[1fr_.85fr]">
          <article id="diseases" className="panel scroll-mt-24 p-7 lg:p-8">
            <div className="flex items-center gap-7"><span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><Activity size={20} /></span><div><h2 className="text-[15px] font-bold">Mật độ dịch bệnh toàn hệ thống</h2><p className="mt-1 text-[13px] text-[#7e8b83]">Tần suất 5 nhóm nhãn AI trong 30 ngày gần nhất</p></div></div>
            <DiseasePieChart />
          </article>
          <article className="panel p-7 lg:p-8">
            <div className="flex items-center gap-7"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><MapPinned size={20} /></span><div><h2 className="text-[15px] font-bold">Sức khỏe các trang trại</h2><p className="mt-1 text-[13px] text-[#7e8b83]">Điểm ưu tiên giám sát hôm nay</p></div></div>
            <div className="mt-7 space-y-5">{systemFarms.map((farm) => <div key={farm.name} className="rounded-2xl border border-[#e2e7e0] p-5"><div className="flex items-start justify-between gap-7"><span><b className="block text-sm">{farm.name}</b><small className="mt-1 block text-sm text-[#849087]">{farm.location} • {farm.zones} phân khu</small></span><span className={`rounded-full px-2 py-1 text-[13px] font-bold ${farm.alerts > 5 ? "bg-[#f8eae5] text-[#95523d]" : "bg-[#e9f2ea] text-[#39704f]"}`}>{farm.alerts} cảnh báo</span></div><div className="mt-5 flex items-center gap-7"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8ece7]"><i className="block h-full rounded-full bg-[#4f8063]" style={{ width: `${farm.health}%` }} /></span><b className="text-[15px]">{farm.health}%</b></div></div>)}</div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <Link
            href="/dashboard/admin/knowledge"
            className="group relative overflow-hidden rounded-[24px] border border-[#dce4dc] bg-[#f8faf7] p-5 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[#b7c8ba] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]/40"
          >
            <div className="absolute right-0 top-0 h-full w-32 bg-[radial-gradient(circle_at_top_right,rgba(238,213,109,.42),transparent_68%)]" />
            <div className="relative flex items-start justify-between gap-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#2E5A44] text-[#EED56D]">
                <BookOpenText size={21} />
              </span>
              <ArrowUpRight className="text-[#829087] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2E5A44]" size={18} />
            </div>
            <div className="relative mt-8 max-w-lg">
              <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-[#8a741f]">Knowledge operations</p>
              <h2 className="mt-2 text-lg font-extrabold tracking-tight text-neutral-900">Thư viện kỹ thuật sầu riêng</h2>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">Biên soạn, phân loại và xuất bản hướng dẫn canh tác cho cộng đồng chủ vườn.</p>
            </div>
          </Link>

          <Link
            href="/dashboard/admin/expert-chat"
            className="group overflow-hidden rounded-[24px] border border-[#385a49] bg-[#294b3a] p-5 text-white transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-[#254434] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8B43F]/60"
          >
            <div className="flex items-start justify-between gap-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#EED56D] text-[#2E5A44]">
                <MessageCircleMore size={21} />
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-xs font-bold">
                <i className="size-1.5 rounded-full bg-[#EED56D]" /> 3 hội thoại cần xử lý
              </span>
            </div>
            <div className="mt-8">
              <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-[#EED56D]">Expert response desk</p>
              <h2 className="mt-2 text-lg font-extrabold tracking-tight">
                Bảng điều phối tư vấn
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#c8d6ce]">
                Phân loại yêu cầu cứu trợ và chỉ định kỹ sư phù hợp, không tham gia trả lời trực tiếp.
              </p>
            </div>
          </Link>
        </section>

        <AdminManagement />
      </div>
    </DashboardShell>
  );
}


