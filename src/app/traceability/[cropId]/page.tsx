import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, CheckCircle2, Droplets, Leaf, MapPin, ScanSearch, ShieldCheck, Sprout, ThermometerSun } from "lucide-react";
import { cropHealthHistory, cropLots, sensorTimeline, treatmentLog } from "@/constants/durianMockData";
import { diseaseLabels } from "@/lib/labels";
import { PublicActions } from "@/components/traceability/PublicActions";
import { TraceabilityChart } from "@/components/traceability/TraceabilityChart";

type PageProps = { params: Promise<{ cropId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cropId } = await params;
  return { title: `Truy xuất ${cropId}`, description: "Sổ tay nông sản sạch được xác thực bởi DurianCare" };
}

export function generateStaticParams() {
  return cropLots.map((crop) => ({ cropId: crop.id }));
}

export default async function TraceabilityPage({ params }: PageProps) {
  const { cropId } = await params;
  const crop = cropLots.find((item) => item.id === cropId);
  if (!crop) notFound();
  const averageTemperature = (sensorTimeline.reduce((sum, item) => sum + item.temperature, 0) / sensorTimeline.length).toFixed(1);
  const averageSoil = Math.round(sensorTimeline.reduce((sum, item) => sum + item.soilMoisture, 0) / sensorTimeline.length);

  return (
    <main className="min-h-screen pb-12">
      <header className="grid-pattern bg-[#244b37] text-white">
        <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-[14px_14px_14px_5px] bg-[#EED56D] text-[#2E5A44]"><Leaf size={22} /></span><span><b className="block text-lg">DurianCare</b><small className="text-[13px] font-bold tracking-[2px] text-[#c7d8cc]">VERIFIED PRODUCE</small></span></div>
            <PublicActions />
          </div>
          <div className="pb-10 pt-12 text-center sm:pb-14 sm:pt-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[14px] font-bold tracking-[1px] text-[#EED56D]"><BadgeCheck size={13} /> HỒ SƠ ĐÃ XÁC THỰC</span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-[-1.2px] sm:text-5xl">Sổ tay nông sản sạch</h1>
            <p className="mx-auto mt-4 max-w-xl text-[14px] leading-6 text-[#d1ded5]">Toàn bộ hành trình của lô sầu riêng được ghi nhận minh bạch từ cảm biến, AI và nhật ký canh tác thực tế.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-7 max-w-[1100px] space-y-5 px-4 sm:px-6">
        <section className="panel overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="p-5 sm:p-7">
              <small className="text-[14px] font-bold tracking-[1.3px] text-[#8a968e]">MÃ ĐỊNH DANH VỤ MÙA</small>
              <h2 className="mt-2 break-all text-xl font-extrabold text-[#2E5A44] sm:text-2xl">{crop.id}</h2>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[["Giống", crop.variety], ["Số cây", `${crop.trees} cây`], ["Ngày trồng", crop.plantedAt], ["Thu hoạch", crop.harvestAt]].map(([label, value]) => <span key={label}><small className="block text-[14px] text-[#89958d]">{label}</small><b className="mt-1 block text-[13px]">{value}</b></span>)}
              </div>
            </div>
            <div className="bg-[#fbf3cd] p-5 sm:p-7">
              <div className="flex items-start gap-3"><MapPin size={18} className="mt-1 shrink-0 text-[#7b6118]" /><span><small className="text-[14px] font-bold text-[#897333]">NGUỒN GỐC CANH TÁC</small><b className="mt-1 block text-[15px]">{crop.farm}</b><p className="mt-2 text-[15px] leading-5 text-[#736b4e]">{crop.zone}, Cai Lậy, Tiền Giang<br />Quy trình canh tác có giám sát IoT</p></span></div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="panel flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#806315]"><ThermometerSun size={20} /></span><span><small className="text-[14px] text-[#89958d]">Nhiệt độ trung bình</small><b className="mt-1 block text-lg">{averageTemperature}°C</b></span></article>
          <article className="panel flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><Droplets size={20} /></span><span><small className="text-[14px] text-[#89958d]">Độ ẩm đất trung bình</small><b className="mt-1 block text-lg">{averageSoil}%</b></span></article>
          <article className="panel flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><Sprout size={20} /></span><span><small className="text-[14px] text-[#89958d]">Sức khỏe trước thu hoạch</small><b className="mt-1 block text-lg">99.1%</b></span></article>
        </section>

        <section className="panel p-5 sm:p-7">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><Droplets size={20} /></span><div><h2 className="text-[15px] font-bold">Nhật ký môi trường IoT</h2><p className="mt-1 text-[15px] text-[#849087]">Mẫu dữ liệu đại diện được ghi nhận xuyên suốt vụ mùa</p></div></div>
          <div className="mt-5"><TraceabilityChart /></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="panel p-5 sm:p-7">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#7e6215]"><ScanSearch size={20} /></span><div><h2 className="text-[15px] font-bold">Lịch sử sức khỏe cây trồng</h2><p className="mt-1 text-[15px] text-[#849087]">Đánh giá định kỳ bằng AI thị giác</p></div></div>
            <div className="mt-6 space-y-0">{cropHealthHistory.map((item, index) => <div key={item.date} className="grid grid-cols-[24px_1fr] gap-3"><span className="flex flex-col items-center"><i className="mt-1.5 size-2.5 rounded-full bg-[#4d8061] ring-4 ring-[#e9f1ea]" />{index < cropHealthHistory.length - 1 && <i className="h-full w-px bg-[#dfe6df]" />}</span><div className="pb-5"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-[13px]">{diseaseLabels[item.status]}</b><small className="text-[14px] text-[#87938b]">{item.date}</small></div><p className="mt-1 text-[14px] leading-4 text-[#75837a]">{item.note} • Độ tin cậy {item.confidence}%</p></div></div>)}</div>
          </article>

          <article className="panel p-5 sm:p-7">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><CalendarDays size={20} /></span><div><h2 className="text-[15px] font-bold">Nhật ký bón phân & phun thuốc</h2><p className="mt-1 text-[15px] text-[#849087]">Ghi nhận vật tư và người thực hiện</p></div></div>
            <div className="mt-5 space-y-3">{treatmentLog.map((item) => <div key={`${item.date}-${item.type}`} className="rounded-xl border border-[#e4e8e2] p-3"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-[#eef3ee] px-2 py-1 text-[13px] font-bold text-[#4a7359]">{item.type}</span><small className="text-[14px] text-[#849087]">{item.date}</small></div><b className="mt-2 block text-[13px]">{item.detail}</b><p className="mt-1 text-[14px] text-[#7e8a82]">{item.dosage} • {item.operator}</p></div>)}</div>
          </article>
        </section>

        <section className="grid-pattern rounded-[22px] bg-[#2E5A44] p-6 text-white sm:p-8">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#EED56D] text-[#2E5A44]"><ShieldCheck size={28} /></span>
            <div className="flex-1"><p className="text-[14px] font-bold tracking-[1.4px] text-[#EED56D]">CAM KẾT AN TOÀN DURIANCARE</p><h2 className="mt-2 text-xl font-extrabold">Đạt chuẩn thời gian cách ly thuốc an toàn</h2><p className="mt-2 text-[13px] leading-5 text-[#d0ddd4]">Lần xử lý sinh học gần nhất cách ngày thu hoạch 37 ngày. Hồ sơ đáp ứng yêu cầu an toàn thực phẩm và quy trình kiểm soát nội bộ.</p></div>
            <CheckCircle2 size={32} className="shrink-0 text-[#EED56D]" />
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 py-5 text-center text-[14px] text-[#829087] sm:flex-row sm:text-left"><span className="flex items-center gap-2"><Leaf size={14} className="text-[#2E5A44]" /> Hồ sơ được tổng hợp bởi DurianCare Smart Farm OS</span><span className="flex items-center gap-2"><ShieldCheck size={14} /> Xác thực ngày 06/06/2026</span></footer>
      </div>
    </main>
  );
}

