import { statusFromSoil } from "@/lib/iot/client";
import { stationStat, summarizeIotDevices, type IotSummary } from "@/lib/iot/summary";
import type { IotAlertListResponse, IotDevice, IotDeviceListResponse } from "@/lib/iot/types";
import type { FarmSummary, ZoneSummary } from "@/lib/trees/types";

/** GET a Gateway path such as "/api/farms"; must throw on a non-2xx response. */
export type OverviewGet = (path: string) => Promise<unknown>;

export type OwnerOverview = {
  signedOut: boolean;
  farms: Pick<FarmSummary, "id" | "name" | "zoneCount">[] | null;
  trees: number | null;
  zones: number | null;
  alerts: number | null;
  devices: IotDevice[] | null;
};

export const SIGNED_OUT_OVERVIEW: OwnerOverview = {
  signedOut: true, farms: null, trees: null, zones: null, alerts: null, devices: null,
};

async function settle<T>(work: () => Promise<T>): Promise<T | null> {
  try { return await work(); } catch { return null; }
}

/** Every value comes from the farm-scoped backend; a failed section is null, never a demo value. */
export async function loadOwnerOverview(get: OverviewGet): Promise<OwnerOverview> {
  const [farms, devices, alerts] = await Promise.all([
    settle(async () => (await get("/api/farms")) as FarmSummary[]),
    settle(async () => ((await get("/api/iot/devices")) as IotDeviceListResponse).devices ?? []),
    settle(async () => ((await get("/api/iot/alerts?status=ALERTING")) as IotAlertListResponse).alerts?.length ?? 0),
  ]);
  const zoneLists = farms
    ? await settle(() => Promise.all(farms.map((f) =>
        get(`/api/farms/${encodeURIComponent(f.id)}/zones`) as Promise<ZoneSummary[]>)))
    : null;
  return {
    signedOut: false,
    farms: farms ? farms.map(({ id, name, zoneCount }) => ({ id, name, zoneCount })) : null,
    zones: zoneLists ? zoneLists.reduce((n, list) => n + list.length, 0) : null,
    trees: zoneLists ? zoneLists.flat().reduce((n, z) => n + (Number(z.treeCount) || 0), 0) : null,
    alerts,
    devices,
  };
}

export function iotSummaryOf(overview: OwnerOverview): IotSummary {
  if (overview.signedOut) return { state: "signed-out" };
  return overview.devices ? summarizeIotDevices(overview.devices) : { state: "error" };
}

export function farmLabelOf(overview: OwnerOverview) {
  if (overview.signedOut) return "DURIANCARE";
  if (!overview.farms) return "TRANG TRẠI";
  if (overview.farms.length === 0) return "CHƯA CÓ TRANG TRẠI";
  if (overview.farms.length === 1) return overview.farms[0].name.toLocaleUpperCase("vi-VN");
  return `${overview.farms.length} TRANG TRẠI`;
}

const SOIL_NOTES: Record<string, string> = {
  OPTIMAL: "Trong ngưỡng tối ưu",
  DRY_WARNING: "Đất đang khô",
  WET_WARNING: "Đất đang quá ẩm",
};

const UNAVAILABLE = "Không tải được dữ liệu";

export function ownerStatCards(overview: OwnerOverview) {
  const signedOutNote = "Đăng nhập để xem";
  const soilReadings = (overview.devices ?? [])
    .map((d) => d.latestTelemetry?.soilMoisture ?? d.latestTelemetry?.soil_moisture)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const soilAvg = soilReadings.length ? soilReadings.reduce((a, b) => a + b, 0) / soilReadings.length : null;
  const station = stationStat(iotSummaryOf(overview));

  return [
    {
      label: "Tổng cây quản lý",
      value: overview.trees === null ? "--" : String(overview.trees),
      note: overview.signedOut ? signedOutNote : overview.zones === null ? UNAVAILABLE : `${overview.zones} phân khu canh tác`,
      icon: "Trees",
    },
    { label: "Trạm IoT hoạt động", value: station.value, note: station.note, icon: "Radio" },
    {
      label: "Độ ẩm đất trung bình",
      value: soilAvg === null ? "--" : `${Math.round(soilAvg)}%`,
      note: overview.signedOut ? signedOutNote
        : overview.devices === null ? UNAVAILABLE
        : soilAvg === null ? "Chưa có cảm biến độ ẩm đất"
        : `${SOIL_NOTES[statusFromSoil(soilAvg) ?? "OPTIMAL"]} · ${soilReadings.length} cảm biến`,
      icon: "Droplets",
    },
    {
      label: "Cảnh báo cần xử lý",
      value: overview.alerts === null ? "--" : String(overview.alerts).padStart(2, "0"),
      note: overview.signedOut ? signedOutNote
        : overview.alerts === null ? UNAVAILABLE
        : overview.alerts === 0 ? "Không có cảnh báo IoT đang mở" : "Cảnh báo IoT đang mở",
      icon: "ShieldAlert",
    },
  ];
}
