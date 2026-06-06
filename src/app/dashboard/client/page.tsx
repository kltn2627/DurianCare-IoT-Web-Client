import type { Metadata } from "next";
import { Bot, CalendarDays, Leaf, Map, Radio } from "lucide-react";
import { AuthorizationManager } from "@/components/dashboard/AuthorizationManager";
import { CropQrBuilder } from "@/components/dashboard/CropQrBuilder";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StatCards } from "@/components/dashboard/StatCards";
import { SensorCharts } from "@/components/charts/SensorCharts";
import { dashboardStats, diagnosisHistory, farmZones } from "@/constants/durianMockData";
import { diseaseLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "Dashboard chủ trang trại" };

export default function ClientDashboardPage() {
  return (
    <DashboardShell role="OWNER">
      <div className="space-y-5">
        <section id="overview" className="grid-pattern scroll-mt-24 overflow-hidden rounded-[24px] bg-[#294f3b] p-6 text-white shadow-xl shadow-[#2e5a4418] lg:flex lg:items-center lg:justify-between lg:p-8">
          <div><p className="flex items-center gap-2 text-[8px] font-extrabold tracking-[1.5px] text-[#EED56D]"><i className="live-dot size-1.5 rounded-full bg-[#EED56D]" /> TRANG TRẠI MINH PHÁT • 06/06/2026</p><h1 className="mt-3 text-2xl font-extrabold tracking-[-1px] sm:text-3xl">Chào buổi sáng, anh Minh.</h1><p className="mt-2 max-w-xl text-[11px] leading-5 text-[#d2ded5]">Hệ thống IoT vận hành ổn định. Có 3 cảnh báo và 2 yêu cầu hợp tác mới cần xem xét.</p></div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:mt-0">
            <div className="rounded-2xl border border-white/10 bg-white/[.08] px-5 py-4"><small className="text-[8px] text-[#c8d6cc]">Thời tiết tại vườn</small><b className="mt-1 block text-xl">29.3°C</b></div>
            <div className="rounded-2xl bg-[#EED56D] px-5 py-4 text-[#294f3b]"><small className="text-[8px] font-semibold">Sức khỏe vườn</small><b className="mt-1 block text-xl">92%</b></div>
          </div>
        </section>

        <StatCards items={dashboardStats.owner} />
        <SensorCharts />

        <section id="diagnosis" className="panel scroll-mt-24 p-5 lg:p-6">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><Bot size={20} /></span><div><h2 className="text-[15px] font-bold">Nhật ký dịch bệnh AI từ Mobile App</h2><p className="mt-1 text-[10px] text-[#7e8b83]">Ca quét lá được đồng bộ vào hồ sơ từng gốc cây</p></div></div>
          <div className="mt-5 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead><tr className="bg-[#f6f8f5] text-[7px] tracking-[.8px] text-[#859189]"><th className="rounded-l-lg px-4 py-3">MÃ GỐC CÂY</th><th className="px-4 py-3">PHÂN KHU</th><th className="px-4 py-3">LOẠI BỆNH AI</th><th className="px-4 py-3">THỜI GIAN PHÁT HIỆN</th><th className="rounded-r-lg px-4 py-3">ĐỘ CHÍNH XÁC</th></tr></thead>
              <tbody>{diagnosisHistory.map((item) => <tr key={item.id} className="border-b border-[#ebeee9] text-[9px]"><td className="px-4 py-4"><b>{item.treeCode}</b><small className="mt-1 block text-[7px] text-[#8a968e]">{item.id}</small></td><td className="px-4 py-4">{item.zone}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1.5 text-[8px] font-bold ${item.disease === "Healthy_Leaf" ? "bg-[#e9f2ea] text-[#39704f]" : "bg-[#fbf1ca] text-[#7b6015]"}`}>{diseaseLabels[item.disease]}</span><small className="mt-1 block font-mono text-[7px] text-[#8b968f]">{item.disease}</small></td><td className="px-4 py-4">{item.detectedAt}</td><td className="px-4 py-4"><b className="text-[11px]">{item.confidence}%</b><span className="ml-2 inline-block h-1.5 w-14 overflow-hidden rounded-full bg-[#e7ebe6] align-middle"><i className="block h-full rounded-full bg-[#4e8062]" style={{ width: `${item.confidence}%` }} /></span></td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <AuthorizationManager />
        <CropQrBuilder />

        <section className="grid gap-3 md:grid-cols-3">
          {[["Sơ đồ phân khu", `${farmZones.length} khu vườn đang quản lý`, Map], ["Lịch canh tác", "5 công việc trong 7 ngày tới", CalendarDays], ["Thiết bị tại vườn", "12 trạm đang trực tuyến", Radio]].map(([title, subtitle, Icon]) => {
            const CardIcon = Icon as typeof Leaf;
            return <article key={String(title)} className="panel flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><CardIcon size={19} /></span><span><b className="block text-[11px]">{String(title)}</b><small className="mt-1 block text-[8px] text-[#87938b]">{String(subtitle)}</small></span></article>;
          })}
        </section>
      </div>
    </DashboardShell>
  );
}
