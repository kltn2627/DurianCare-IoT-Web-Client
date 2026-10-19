"use client";

import { useEffect, useRef, useState } from "react";
import { StatCards } from "@/components/dashboard/StatCards";
import { farmLabelOf, iotSummaryOf, loadOwnerOverview, ownerStatCards, type OwnerOverview } from "@/lib/dashboard/ownerOverview";
import { connectivityLabel, type IotSummary } from "@/lib/iot/summary";
import { formatVietnamDate, msUntilNextMinute, vietnamGreeting } from "@/lib/time/vietnamClock";

// Telemetry/heartbeat arrive about every 60 s and the backend marks STALE after 3 intervals,
// so a 30 s refresh keeps the dashboard within one interval without hammering the API.
const IOT_REFRESH_MS = 30_000;
// Browser side: "/api/farms" -> "/api/backend/farms" (cookie-authenticated proxy to the Gateway).
async function browserGet(path: string) {
  const response = await fetch(`/api/backend/${path.replace(/^\/api\//, "")}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function OwnerDashboardLive({
  initialNowIso,
  initialOverview,
  userName,
}: {
  initialNowIso: string;
  initialOverview: OwnerOverview;
  userName: string;
}) {
  const [now, setNow] = useState(() => new Date(initialNowIso));
  const [overview, setOverview] = useState<OwnerOverview>(initialOverview);
  const inFlight = useRef(false);
  const requestSeq = useRef(0);

  // Clock: re-render at each minute boundary so the date and greeting roll over while the page stays open.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, msUntilNextMinute(current));
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  // Overview polling (signed-out sessions have no token for the proxy, so they are not polled).
  useEffect(() => {
    if (initialOverview.signedOut) return;
    let cancelled = false;
    const refresh = async () => {
      if (inFlight.current || document.visibilityState === "hidden") return;
      inFlight.current = true;
      const seq = ++requestSeq.current;
      try {
        const next = await loadOwnerOverview(browserGet);  // sections fail independently
        if (!cancelled && seq === requestSeq.current) setOverview(next);
      } finally {
        inFlight.current = false;
      }
    };
    const interval = setInterval(refresh, IOT_REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initialOverview.signedOut]);

  const summary: IotSummary = iotSummaryOf(overview);
  const stats = ownerStatCards(overview);

  return (
    <>
      <section className="grid-pattern overflow-hidden rounded-[24px] bg-[#294f3b] p-8 text-white shadow-xl shadow-[#2e5a4418] lg:flex lg:items-center lg:justify-between lg:p-10">
        <div>
          <p className="flex items-center gap-4 text-sm font-extrabold tracking-[1.5px] text-[#EED56D]">
            <i className="live-dot size-1.5 rounded-full bg-[#EED56D]" />{" "}
            {farmLabelOf(overview)} • {formatVietnamDate(now)}
          </p>
          <h1 className="mt-4 text-2xl font-extrabold !text-white sm:text-3xl">
            {vietnamGreeting(now)}, {userName}.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-5 text-[#d2ded5]">{describe(summary)}</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-7 lg:mt-0">
          <div className="rounded-2xl border border-white/10 bg-white/[.08] px-7 py-5">
            <small className="text-sm text-[#c8d6cc]">Telemetry mới nhất</small>
            <b className="mt-1 block text-xl">
              {summary.state === "ok" && summary.temperature !== null ? `${formatNumber(summary.temperature)}°C` : "--"}
            </b>
          </div>
          <div className="rounded-2xl bg-[#EED56D] px-7 py-5 text-[#294f3b]">
            <small className="text-sm font-semibold">Thiết bị IoT</small>
            <b className="mt-1 block text-xl">{summary.state === "ok" ? String(summary.total).padStart(2, "0") : "--"}</b>
            <small className="mt-1 block text-xs font-bold">
              {summary.state === "ok" ? connectivityLabel(summary.primaryStatus) : summary.state === "error" ? "Không tải được" : "--"}
            </small>
          </div>
        </div>
      </section>

      <StatCards items={stats} />
    </>
  );
}

function describe(summary: IotSummary) {
  if (summary.state === "signed-out") return "Đăng nhập để xem telemetry IoT theo farm/khu được cấp quyền.";
  if (summary.state === "error") return "Không thể tải telemetry IoT lúc này. Web không dùng giá trị mẫu.";
  if (!summary.primaryName) return "Chưa có device registry nào thuộc phạm vi farm/khu bạn được quyền xem.";
  return `IoT đang đọc từ ${summary.primaryName}. Kết nối: ${connectivityLabel(summary.primaryStatus)}.`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
