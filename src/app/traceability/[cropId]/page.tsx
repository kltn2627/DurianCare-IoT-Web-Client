import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Leaf,
  MapPin,
  ScanSearch,
  ShieldCheck,
  Sprout,
  ThermometerSun,
} from "lucide-react";
import { cropHealthHistory, cropLots, sensorTimeline, treatmentLog } from "@/constants/durianMockData";
import { diseaseLabels } from "@/lib/labels";
import { PublicActions } from "@/components/traceability/PublicActions";
import { TraceabilityChart } from "@/components/traceability/TraceabilityChart";
import { MockDataBanner } from "@/components/shared/MockDataBanner";
import type { PublicTraceData } from "@/lib/export/types";

type PageProps = { params: Promise<{ cropId: string }> };

const MARKET_LABEL: Record<string, string> = {
  CHINA: "🇨🇳 Trung Quốc (GACC)",
  EU: "🇪🇺 Liên minh Châu Âu",
  US: "🇺🇸 Hoa Kỳ",
  JAPAN: "🇯🇵 Nhật Bản",
  DOMESTIC: "🇻🇳 Việt Nam (VietGAP)",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cropId } = await params;
  return {
    title: `Truy xuất ${cropId}`,
    description: "Hồ sơ nông sản sạch được xác thực bởi DurianCare IoT",
  };
}

async function fetchPublicTrace(code: string): Promise<PublicTraceData | null> {
  try {
    const iotUrl = (process.env.IOT_SERVICE_URL ?? "http://localhost:3001").replace(/\/$/, "");
    const res = await fetch(`${iotUrl}/api/v1/public/traceability/${encodeURIComponent(code)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<PublicTraceData>;
  } catch {
    return null;
  }
}

// ── Real-data view ────────────────────────────────────────────────────────────

function RealTraceView({ data }: { data: PublicTraceData }) {
  const d = data;
  const score = d.export_score;
  const scoreColor = score != null && score >= 80 ? "#2E5A44" : score != null && score >= 70 ? "#b45309" : "#dc2626";

  return (
    <main className="min-h-screen pb-12">
      <header className="grid-pattern bg-[#244b37] text-white">
        <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[14px_14px_14px_5px] bg-[#EED56D] text-[#2E5A44]">
                <Leaf size={22} />
              </span>
              <span>
                <b className="block text-lg">DurianCare</b>
                <small className="text-[13px] font-bold tracking-[2px] text-[#c7d8cc]">VERIFIED PRODUCE</small>
              </span>
            </div>
            <PublicActions />
          </div>
          <div className="pb-10 pt-12 text-center sm:pb-14 sm:pt-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold tracking-[1px] text-[#EED56D]">
              <BadgeCheck size={13} /> ĐÃ KIỂM ĐỊNH XUẤT KHẨU
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-[-1.2px] sm:text-5xl">Hồ sơ xuất xưởng sầu riêng</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#d1ded5]">
              Vụ mùa được xác thực bởi hệ thống IoT DurianCare. Quét mã để kiểm tra nguồn gốc và kết quả thẩm định.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-7 max-w-[1100px] space-y-5 px-4 sm:px-6">
        {/* Farm & batch info */}
        <section className="panel overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="p-5 sm:p-7">
              <small className="text-sm font-bold tracking-[1.3px] text-[#8a968e]">MÃ TRUY XUẤT NGUỒN GỐC</small>
              <h2 className="mt-2 break-all text-xl font-extrabold text-[#2E5A44] sm:text-2xl">
                {d.traceability_code}
              </h2>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Giống", d.farm.variety],
                  ["Lô hàng", d.farm.batch_code],
                  ["Bắt đầu vụ", d.farm.start_date ? new Date(d.farm.start_date).toLocaleDateString("vi-VN") : "—"],
                  ["Thu hoạch", d.farm.harvest_date ? new Date(d.farm.harvest_date).toLocaleDateString("vi-VN") : "—"],
                ].map(([label, value]) => (
                  <span key={label}>
                    <small className="block text-sm text-[#89958d]">{label}</small>
                    <b className="mt-1 block text-[13px]">{value}</b>
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-[#fbf3cd] p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="mt-1 shrink-0 text-[#7b6118]" />
                <span>
                  <small className="text-sm font-bold text-[#897333]">NÔNG TRẠI</small>
                  <b className="mt-1 block text-[15px]">{d.farm.name}</b>
                  <p className="mt-2 text-[13px] leading-5 text-[#736b4e]">
                    Thị trường: {MARKET_LABEL[d.farm.target_market] ?? d.farm.target_market}
                  </p>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Certifications */}
        <section className="grid gap-3 sm:grid-cols-3">
          <article className="panel flex items-center gap-4 p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <BadgeCheck size={20} />
            </span>
            <span>
              <small className="text-sm text-[#89958d]">Điểm xuất khẩu</small>
              <b className="mt-1 block text-lg" style={{ color: scoreColor }}>
                {score != null ? `${score}/100` : "N/A"}
              </b>
            </span>
          </article>
          {d.env_averages && (
            <>
              <article className="panel flex items-center gap-4 p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#806315]">
                  <ThermometerSun size={20} />
                </span>
                <span>
                  <small className="text-sm text-[#89958d]">Nhiệt độ TB suốt vụ</small>
                  <b className="mt-1 block text-lg">
                    {d.env_averages.avg_temperature != null ? `${d.env_averages.avg_temperature}°C` : "—"}
                  </b>
                </span>
              </article>
              <article className="panel flex items-center gap-4 p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
                  <Droplets size={20} />
                </span>
                <span>
                  <small className="text-sm text-[#89958d]">Độ ẩm đất TB</small>
                  <b className="mt-1 block text-lg">
                    {d.env_averages.avg_humidity != null ? `${d.env_averages.avg_humidity}%` : "—"}
                  </b>
                </span>
              </article>
            </>
          )}
        </section>

        {/* Assessment summary */}
        {d.assessment_summary && (
          <section className="panel p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
                <ScanSearch size={20} />
              </span>
              <div>
                <h2 className="text-[15px] font-bold">Kết quả thẩm định xuất khẩu</h2>
                <p className="mt-0.5 text-[13px] text-[#849087]">
                  Đánh giá {new Date(d.assessment_summary.assessed_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                ["Dư lượng", d.assessment_summary.residue_score],
                ["Môi trường", d.assessment_summary.env_score],
                ["Bệnh hại", d.assessment_summary.disease_score],
                ["Tổng điểm", d.assessment_summary.overall_score],
              ].map(([label, val]) => {
                const v = val as number;
                const cl = v >= 80 ? "text-green-700 bg-green-50" : v >= 70 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50";
                return (
                  <div key={label as string} className={`rounded-xl p-3 text-center ${cl}`}>
                    <div className="text-[11px] font-bold uppercase tracking-wide">{label}</div>
                    <div className="mt-1 text-[22px] font-black">{v}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Certifications */}
        <section className="panel p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold">Tiêu chuẩn đạt chuẩn</h2>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {d.certification.standards.map((s) => (
              <span key={s} className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-[12px] font-semibold text-green-700">
                <CheckCircle2 size={12} /> {s}
              </span>
            ))}
          </div>
        </section>

        {/* Chemical log */}
        {d.chemical_log.length > 0 && (
          <section className="panel p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#7e6215]">
                <CalendarDays size={20} />
              </span>
              <div>
                <h2 className="text-[15px] font-bold">Nhật ký phun thuốc / bón phân</h2>
                <p className="mt-0.5 text-[13px] text-[#849087]">{d.chemical_log.length} lần ghi nhận</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {d.chemical_log.map((item, i) => (
                <div key={i} className="rounded-xl border border-[#e4e8e2] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-[#eef3ee] px-2 py-1 text-[12px] font-bold text-[#4a7359]">
                      {item.chemical_id}
                    </span>
                    <small className="text-sm text-[#849087]">
                      {new Date(item.applied_at).toLocaleDateString("vi-VN")}
                    </small>
                  </div>
                  <p className="mt-1 text-[12px] text-[#7e8a82]">
                    {item.dose_kg_per_ha} kg/ha{item.stage ? ` · ${item.stage}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer guarantee */}
        <section className="grid-pattern rounded-[22px] bg-[#2E5A44] p-6 text-white sm:p-8">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#EED56D] text-[#2E5A44]">
              <ShieldCheck size={28} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold tracking-[1.4px] text-[#EED56D]">CAM KẾT AN TOÀN DURIANCARE</p>
              <h2 className="mt-2 text-xl font-extrabold">Lô hàng được kiểm định và xuất xưởng hợp lệ</h2>
              <p className="mt-2 text-[13px] leading-5 text-[#d0ddd4]">
                Dữ liệu cảm biến IoT được bảo chứng 24/7 trong suốt vụ mùa. Hồ sơ không thể chỉnh sửa sau khi đóng gói.
              </p>
            </div>
            <CheckCircle2 size={32} className="shrink-0 text-[#EED56D]" />
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 py-5 text-center text-sm text-[#829087] sm:flex-row sm:text-left">
          <span className="flex items-center gap-2">
            <Leaf size={14} className="text-[#2E5A44]" /> Hồ sơ xác thực bởi DurianCare Smart Farm OS
          </span>
          {d.farm.finalized_at && (
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} /> Xuất xưởng {new Date(d.farm.finalized_at).toLocaleDateString("vi-VN")}
            </span>
          )}
        </footer>
      </div>
    </main>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TraceabilityPage({ params }: PageProps) {
  const { cropId } = await params;

  // Try real API first
  const realData = await fetchPublicTrace(cropId);
  if (realData) return <RealTraceView data={realData} />;

  // Fall back to mock data (demo cropIds)
  const crop = cropLots.find((item) => item.id === cropId);
  if (!crop) notFound();

  const averageTemperature = (
    sensorTimeline.reduce((sum, item) => sum + item.temperature, 0) / sensorTimeline.length
  ).toFixed(1);
  const averageSoil = Math.round(
    sensorTimeline.reduce((sum, item) => sum + item.soilMoisture, 0) / sensorTimeline.length
  );

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-[1100px] px-4 pt-4 sm:px-6">
        <MockDataBanner />
      </div>
      <header className="grid-pattern bg-[#244b37] text-white">
        <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[14px_14px_14px_5px] bg-[#EED56D] text-[#2E5A44]">
                <Leaf size={22} />
              </span>
              <span>
                <b className="block text-lg">DurianCare</b>
                <small className="text-[13px] font-bold tracking-[2px] text-[#c7d8cc]">VERIFIED PRODUCE</small>
              </span>
            </div>
            <PublicActions />
          </div>
          <div className="pb-10 pt-12 text-center sm:pb-14 sm:pt-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold tracking-[1px] text-[#EED56D]">
              <BadgeCheck size={13} /> HỒ SƠ ĐÃ XÁC THỰC
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-[-1.2px] sm:text-5xl">Sổ tay nông sản sạch</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#d1ded5]">
              Toàn bộ hành trình của lô sầu riêng được ghi nhận minh bạch từ cảm biến, AI và nhật ký canh tác thực tế.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-7 max-w-[1100px] space-y-5 px-4 sm:px-6">
        <section className="panel overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="p-5 sm:p-7">
              <small className="text-sm font-bold tracking-[1.3px] text-[#8a968e]">MÃ ĐỊNH DANH VỤ MÙA</small>
              <h2 className="mt-2 break-all text-xl font-extrabold text-[#2E5A44] sm:text-2xl">{crop.id}</h2>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[["Giống", crop.variety], ["Số cây", `${crop.trees} cây`], ["Ngày trồng", crop.plantedAt], ["Thu hoạch", crop.harvestAt]].map(([label, value]) => (
                  <span key={label}>
                    <small className="block text-sm text-[#89958d]">{label}</small>
                    <b className="mt-1 block text-[13px]">{value}</b>
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-[#fbf3cd] p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="mt-1 shrink-0 text-[#7b6118]" />
                <span>
                  <small className="text-sm font-bold text-[#897333]">NGUỒN GỐC CANH TÁC</small>
                  <b className="mt-1 block text-[15px]">{crop.farm}</b>
                  <p className="mt-2 text-[15px] leading-5 text-[#736b4e]">
                    {crop.zone}, Cai Lậy, Tiền Giang<br />Quy trình canh tác có giám sát IoT
                  </p>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="panel flex items-center gap-4 p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#806315]"><ThermometerSun size={20} /></span>
            <span><small className="text-sm text-[#89958d]">Nhiệt độ trung bình</small><b className="mt-1 block text-lg">{averageTemperature}°C</b></span>
          </article>
          <article className="panel flex items-center gap-4 p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><Droplets size={20} /></span>
            <span><small className="text-sm text-[#89958d]">Độ ẩm đất trung bình</small><b className="mt-1 block text-lg">{averageSoil}%</b></span>
          </article>
          <article className="panel flex items-center gap-4 p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><Sprout size={20} /></span>
            <span><small className="text-sm text-[#89958d]">Sức khỏe trước thu hoạch</small><b className="mt-1 block text-lg">99.1%</b></span>
          </article>
        </section>

        <section className="panel p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><Droplets size={20} /></span>
            <div>
              <h2 className="text-[15px] font-bold">Nhật ký môi trường IoT</h2>
              <p className="mt-1 text-[15px] text-[#849087]">Mẫu dữ liệu đại diện được ghi nhận xuyên suốt vụ mùa</p>
            </div>
          </div>
          <div className="mt-5"><TraceabilityChart /></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="panel p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#7e6215]"><ScanSearch size={20} /></span>
              <div>
                <h2 className="text-[15px] font-bold">Lịch sử sức khỏe cây trồng</h2>
                <p className="mt-1 text-[15px] text-[#849087]">Đánh giá định kỳ bằng AI thị giác</p>
              </div>
            </div>
            <div className="mt-6 space-y-0">
              {cropHealthHistory.map((item, index) => (
                <div key={item.date} className="grid grid-cols-[24px_1fr] gap-3">
                  <span className="flex flex-col items-center">
                    <i className="mt-1.5 size-2.5 rounded-full bg-[#4d8061] ring-4 ring-[#e9f1ea]" />
                    {index < cropHealthHistory.length - 1 && <i className="h-full w-px bg-[#dfe6df]" />}
                  </span>
                  <div className="pb-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b className="text-[13px]">{diseaseLabels[item.status]}</b>
                      <small className="text-sm text-[#87938b]">{item.date}</small>
                    </div>
                    <p className="mt-1 text-sm leading-4 text-[#75837a]">{item.note} • Độ tin cậy {item.confidence}%</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]"><CalendarDays size={20} /></span>
              <div>
                <h2 className="text-[15px] font-bold">Nhật ký bón phân & phun thuốc</h2>
                <p className="mt-1 text-[15px] text-[#849087]">Ghi nhận vật tư và người thực hiện</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {treatmentLog.map((item) => (
                <div key={`${item.date}-${item.type}`} className="rounded-xl border border-[#e4e8e2] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#eef3ee] px-2 py-1 text-[13px] font-bold text-[#4a7359]">{item.type}</span>
                    <small className="text-sm text-[#849087]">{item.date}</small>
                  </div>
                  <b className="mt-2 block text-[13px]">{item.detail}</b>
                  <p className="mt-1 text-sm text-[#7e8a82]">{item.dosage} • {item.operator}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid-pattern rounded-[22px] bg-[#2E5A44] p-6 text-white sm:p-8">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#EED56D] text-[#2E5A44]">
              <ShieldCheck size={28} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold tracking-[1.4px] text-[#EED56D]">CAM KẾT AN TOÀN DURIANCARE</p>
              <h2 className="mt-2 text-xl font-extrabold">Đạt chuẩn thời gian cách ly thuốc an toàn</h2>
              <p className="mt-2 text-[13px] leading-5 text-[#d0ddd4]">
                Lần xử lý sinh học gần nhất cách ngày thu hoạch 37 ngày. Hồ sơ đáp ứng yêu cầu an toàn thực phẩm và quy trình kiểm soát nội bộ.
              </p>
            </div>
            <CheckCircle2 size={32} className="shrink-0 text-[#EED56D]" />
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 py-5 text-center text-sm text-[#829087] sm:flex-row sm:text-left">
          <span className="flex items-center gap-2">
            <Leaf size={14} className="text-[#2E5A44]" /> Hồ sơ được tổng hợp bởi DurianCare Smart Farm OS
          </span>
          <span className="flex items-center gap-2"><ShieldCheck size={14} /> Xác thực ngày 06/06/2026</span>
        </footer>
      </div>
    </main>
  );
}
