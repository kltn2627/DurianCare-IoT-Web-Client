import { farmLabelOf, loadOwnerOverview, ownerStatCards, SIGNED_OUT_OVERVIEW } from "@/lib/dashboard/ownerOverview";

const devices = [
  { id: "1", deviceUid: "esp32-01", name: "esp32-01", farmId: "farm-khoa-luan-2026", cultivationAreaId: null, status: "ACTIVE",
    connectivityStatus: "ONLINE", lastSeenAt: "2026-10-18T13:55:34.913Z", telemetryState: "HAS_TELEMETRY",
    latestTelemetry: { deviceUid: "esp32-01", id: "t", humidity: 86.6, light: null, measuredAt: null, receivedAt: "2026-10-18T13:55:34.913Z",
      soilMoisture: 100, temperature: 30.1, units: { humidity: "%", light: "raw", temperature: "°C" } } },
];

function backend(overrides: Record<string, unknown | Error> = {}) {
  const data: Record<string, unknown> = {
    "/api/farms": [{ id: "farm-khoa-luan-2026", name: "Vườn sầu riêng Cai Lậy", zoneCount: 4 }],
    "/api/farms/farm-khoa-luan-2026/zones": [{ treeCount: 50 }, { treeCount: 26 }, { treeCount: 25 }, { treeCount: 25 }],
    "/api/iot/devices": { devices },
    "/api/iot/alerts?status=ALERTING": { alerts: [] },
    ...overrides,
  };
  const calls: string[] = [];
  const get = async (path: string) => {
    calls.push(path);
    const value = data[path];
    if (value instanceof Error || value === undefined) throw value ?? new Error(`404 ${path}`);
    return value;
  };
  return { get, calls };
}

describe("owner dashboard overview (real data only)", () => {
  it("builds every card from farm-scoped API data", async () => {
    const overview = await loadOwnerOverview(backend().get);
    expect(farmLabelOf(overview)).toBe("VƯỜN SẦU RIÊNG CAI LẬY");
    expect(ownerStatCards(overview)).toEqual([
      { label: "Tổng cây quản lý", value: "126", note: "4 phân khu canh tác", icon: "Trees" },
      { label: "Trạm IoT hoạt động", value: "1/1", note: "Kết nối ổn định", icon: "Radio" },
      { label: "Độ ẩm đất trung bình", value: "100%", note: "Đất đang quá ẩm · 1 cảm biến", icon: "Droplets" },
      { label: "Cảnh báo cần xử lý", value: "00", note: "Không có cảnh báo IoT đang mở", icon: "ShieldAlert" },
    ]);
  });

  it("fails sections independently and never substitutes demo values", async () => {
    const overview = await loadOwnerOverview(backend({ "/api/iot/alerts?status=ALERTING": new Error("503"),
      "/api/farms/farm-khoa-luan-2026/zones": new Error("500") }).get);
    const cards = ownerStatCards(overview);
    expect(cards[0]).toMatchObject({ value: "--", note: "Không tải được dữ liệu" });
    expect(cards[1]).toMatchObject({ value: "1/1" });
    expect(cards[3]).toMatchObject({ value: "--", note: "Không tải được dữ liệu" });
    expect(JSON.stringify(cards)).not.toMatch(/440|79%|12\/12/);
  });

  it("reports device API failure honestly", async () => {
    const overview = await loadOwnerOverview(backend({ "/api/iot/devices": new Error("401") }).get);
    const cards = ownerStatCards(overview);
    expect(cards[1]).toEqual({ label: "Trạm IoT hoạt động", value: "--", note: "Không tải được trạng thái thiết bị", icon: "Radio" });
    expect(cards[2]).toMatchObject({ value: "--", note: "Không tải được dữ liệu" });
  });

  it("handles no soil sensor, no farms and signed-out states", async () => {
    const noSoil = await loadOwnerOverview(backend({ "/api/iot/devices": { devices: [{ ...devices[0], latestTelemetry: null }] } }).get);
    expect(ownerStatCards(noSoil)[2]).toMatchObject({ value: "--", note: "Chưa có cảm biến độ ẩm đất" });
    const noFarms = await loadOwnerOverview(backend({ "/api/farms": [] }).get);
    expect(farmLabelOf(noFarms)).toBe("CHƯA CÓ TRANG TRẠI");
    expect(ownerStatCards(noFarms)[0]).toMatchObject({ value: "0", note: "0 phân khu canh tác" });
    expect(ownerStatCards(SIGNED_OUT_OVERVIEW).map((c) => c.value)).toEqual(["--", "--", "--", "--"]);
  });
});
