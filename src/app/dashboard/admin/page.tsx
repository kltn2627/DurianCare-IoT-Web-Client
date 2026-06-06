import type { Metadata } from "next";
import { Activity, MapPinned } from "lucide-react";
import { DiseasePieChart } from "@/components/charts/DiseasePieChart";
import { AdminManagement } from "@/components/dashboard/AdminManagement";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StatCards } from "@/components/dashboard/StatCards";
import { dashboardStats, systemFarms } from "@/constants/durianMockData";

export const metadata: Metadata = { title: "Trung tâm quản trị" };

export default function AdminDashboardPage() {
  return (
    <DashboardShell role="ADMIN">
      <div className="space-y-5">
        <section id="overview" className="grid-pattern scroll-mt-24 overflow-hidden rounded-[24px] bg-[#213f30] p-6 text-white lg:flex lg:items-center lg:justify-between lg:p-8">
          <div><p className="text-[8px] font-extrabold tracking-[1.5px] text-[#EED56D]">DURIANCARE CONTROL CENTER • 06/06/2026</p><h1 className="mt-3 text-2xl font-extrabold tracking-[-1px] sm:text-3xl">Trung tâm điều hành hệ sinh thái</h1><p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#cbd9cf]">Theo dõi sức khỏe toàn hệ thống, chuẩn hóa phác đồ và kiểm soát chất lượng đội ngũ kỹ sư.</p></div>
          <span className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.08] px-4 py-3 text-[9px] font-bold lg:mt-0"><Activity size={16} className="text-[#EED56D]" /> Hệ thống hoạt động bình thường</span>
        </section>
        <StatCards items={dashboardStats.admin} />

        <section className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
          <article id="diseases" className="panel scroll-mt-24 p-5 lg:p-6">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><Activity size={20} /></span><div><h2 className="text-[15px] font-bold">Mật độ dịch bệnh toàn hệ thống</h2><p className="mt-1 text-[10px] text-[#7e8b83]">Tần suất 5 nhóm nhãn AI trong 30 ngày gần nhất</p></div></div>
            <DiseasePieChart />
          </article>
          <article className="panel p-5 lg:p-6">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><MapPinned size={20} /></span><div><h2 className="text-[15px] font-bold">Sức khỏe các trang trại</h2><p className="mt-1 text-[10px] text-[#7e8b83]">Điểm ưu tiên giám sát hôm nay</p></div></div>
            <div className="mt-5 space-y-3">{systemFarms.map((farm) => <div key={farm.name} className="rounded-2xl border border-[#e2e7e0] p-4"><div className="flex items-start justify-between gap-3"><span><b className="block text-[11px]">{farm.name}</b><small className="mt-1 block text-[8px] text-[#849087]">{farm.location} • {farm.zones} phân khu</small></span><span className={`rounded-full px-2 py-1 text-[7px] font-bold ${farm.alerts > 5 ? "bg-[#f8eae5] text-[#95523d]" : "bg-[#e9f2ea] text-[#39704f]"}`}>{farm.alerts} cảnh báo</span></div><div className="mt-4 flex items-center gap-3"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8ece7]"><i className="block h-full rounded-full bg-[#4f8063]" style={{ width: `${farm.health}%` }} /></span><b className="text-[9px]">{farm.health}%</b></div></div>)}</div>
          </article>
        </section>

        <AdminManagement />
      </div>
    </DashboardShell>
  );
}
