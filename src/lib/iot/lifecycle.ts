import { IotApiError } from "./client";
import type { IotAlert, IotDevice } from "./types";

/** Device lifecycle, configuration and alert-rule API (iot-service via the Gateway). */
export type IotMetric = "TEMPERATURE" | "HUMIDITY" | "SOIL_MOISTURE" | "LIGHT";
export type IotSeverity = "INFO" | "WARNING" | "CRITICAL";

export type IotLatestMetric = { value: number; unit: string; measuredAt: string | null } | null;

export type IotDeviceDetail = IotDevice & {
  latestByMetric?: {
    temperature: IotLatestMetric;
    humidity: IotLatestMetric;
    soilMoisture: IotLatestMetric;
    /** Latest probe verdict; when newer than the last valid percentage, soilMoisture is null. */
    soilSensor?: { status: string; raw: number | null; measuredAt: string | null } | null;
    light: IotLatestMetric;
  };
};

export type IotDeviceConfig = {
  deviceId: string;
  publishIntervalSeconds: number | null;
  alertsEnabled: boolean;
  configVersion: number | null;
  deliveryStatus: "NOT_CONFIGURED" | "PENDING" | "DELIVERED" | "APPLIED";
  deliveredAt: string | null;
  appliedVersion: number | null;
  appliedAt: string | null;
  updatedAt: string | null;
  deviceSupportsRemoteConfig: boolean;
};

export type IotAlertRule = {
  id: string;
  farmId: string;
  cultivationAreaId: string | null;
  deviceId: string | null;
  metric: IotMetric;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  hysteresis: number;
  severity: IotSeverity;
  enabled: boolean;
  notify: boolean;
  scope: "FARM" | "ZONE" | "DEVICE";
  updatedAt: string | null;
};

export type IotDefaultRule = { metric: IotMetric; unit: string; minValue: number | null; maxValue: number | null };

export type IotAdminDevice = {
  id: string;
  deviceUid: string;
  name: string;
  deviceType: "SENSOR" | "CAMERA";
  provisioningStatus: "PROVISIONED" | "CLAIMED";
  status: string;
  farmId: string | null;
  cultivationAreaId: string | null;
  claimedAt: string | null;
  createdAt: string | null;
  claimCodeStatus: "PENDING" | "CLAIMED" | "REVOKED" | null;
  claimCodeExpiresAt: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new IotApiError(body?.message ?? "Yêu cầu không thành công.", response.status);
  return body as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const enc = encodeURIComponent;

export const iotLifecycleClient = {
  getDevice: (id: string) => request<{ device: IotDeviceDetail; openAlerts: IotAlert[] }>(`/iot/devices/${enc(id)}`),
  claimDevice: (body: { deviceUid: string; claimCode: string; farmId: string; cultivationAreaId: string | null; name?: string | null }) =>
    request<{ device: IotDevice }>("/iot/devices/claim", json("POST", body)),
  updateDevice: (id: string, body: { name?: string | null; cultivationAreaId?: string | null }) =>
    request<{ device: IotDevice }>(`/iot/devices/${enc(id)}`, json("PATCH", body)),
  getConfig: (id: string) => request<{ config: IotDeviceConfig }>(`/iot/devices/${enc(id)}/config`),
  saveConfig: (id: string, body: { publishIntervalSeconds: number; alertsEnabled: boolean }) =>
    request<{ config: IotDeviceConfig }>(`/iot/devices/${enc(id)}/config`, json("PUT", body)),
  acknowledgeAlert: (id: string) => request<{ alert: IotAlert }>(`/iot/alerts/${enc(id)}/acknowledge`, { method: "POST" }),
  listRules: (farmId: string, cultivationAreaId: string | null) => {
    const params = new URLSearchParams({ farmId });
    if (cultivationAreaId) params.set("cultivationAreaId", cultivationAreaId);
    return request<{ rules: IotAlertRule[]; defaults: IotDefaultRule[] }>(`/iot/alert-rules?${params}`);
  },
  createRule: (body: {
    farmId: string; cultivationAreaId: string | null; deviceId?: string | null; metric: IotMetric;
    minValue: number | null; maxValue: number | null; hysteresis: number; severity: IotSeverity; notify: boolean;
  }) => request<{ rule: IotAlertRule }>("/iot/alert-rules", json("POST", body)),
  updateRule: (id: string, body: Partial<Pick<IotAlertRule, "minValue" | "maxValue" | "hysteresis" | "severity" | "enabled" | "notify">>) =>
    request<{ rule: IotAlertRule }>(`/iot/alert-rules/${enc(id)}`, json("PATCH", body)),
  deleteRule: (id: string) => request<{ deleted: boolean }>(`/iot/alert-rules/${enc(id)}`, { method: "DELETE" }),
  // Administrator inventory
  listAdminDevices: () => request<{ devices: IotAdminDevice[] }>("/iot/admin/devices"),
  provisionDevice: (body: { deviceUid: string; deviceType: "SENSOR" | "CAMERA"; name: string | null }) =>
    request<{ device: IotDevice; claimCode: string; claimCodeExpiresAt: string }>("/iot/devices/provision", json("POST", body)),
  regenerateClaimCode: (id: string) =>
    request<{ claimCode: string; claimCodeExpiresAt: string }>(`/iot/devices/${enc(id)}/claim-code`, { method: "POST" }),
};

export const METRIC_LABELS: Record<IotMetric, string> = {
  TEMPERATURE: "Nhiệt độ không khí",
  HUMIDITY: "Độ ẩm không khí",
  SOIL_MOISTURE: "Độ ẩm đất",
  LIGHT: "Ánh sáng",
};

export const SEVERITY_LABELS: Record<IotSeverity, string> = { INFO: "Thông tin", WARNING: "Cảnh báo", CRITICAL: "Nghiêm trọng" };

export const DELIVERY_LABELS: Record<IotDeviceConfig["deliveryStatus"], string> = {
  NOT_CONFIGURED: "Chưa cấu hình",
  PENDING: "Đã lưu, chờ gửi tới thiết bị",
  DELIVERED: "Đã gửi, chờ thiết bị xác nhận",
  APPLIED: "Thiết bị đã áp dụng",
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  TEMPERATURE_HIGH: "Nhiệt độ cao", TEMPERATURE_LOW: "Nhiệt độ thấp",
  HUMIDITY_HIGH: "Độ ẩm không khí cao", HUMIDITY_LOW: "Độ ẩm không khí thấp",
  SOIL_MOISTURE_HIGH: "Đất quá ẩm", SOIL_MOISTURE_LOW: "Đất quá khô",
  LIGHT_HIGH: "Ánh sáng mạnh", LIGHT_LOW: "Ánh sáng yếu",
  DEVICE_OFFLINE: "Mất kết nối",
};

/** Vietnamese message for a lifecycle error (never the raw backend text). */
export function lifecycleErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof IotApiError)) return fallback;
  const byStatus: Record<number, string> = {
    400: "Thông tin chưa đúng. Vui lòng kiểm tra mã thiết bị, mã kích hoạt và các giá trị đã nhập.",
    401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    403: "Bạn không có quyền với vườn hoặc khu này.",
    404: "Không tìm thấy thiết bị.",
    409: /claimed/i.test(error.message) ? "Thiết bị này đã được kích hoạt trước đó."
      : /registered/i.test(error.message) ? "Mã thiết bị đã tồn tại trong hệ thống."
        : /rule/i.test(error.message) ? "Đã có ngưỡng cho chỉ số này ở phạm vi này." : "Dữ liệu đã thay đổi. Vui lòng tải lại.",
    410: "Mã kích hoạt đã hết hạn. Vui lòng xin mã mới.",
    429: "Nhập sai mã quá nhiều lần. Vui lòng xin mã kích hoạt mới.",
  };
  return error.status >= 500 ? "Dịch vụ IoT đang gặp lỗi. Vui lòng thử lại sau." : byStatus[error.status] ?? fallback;
}

/** Validates a threshold form before it is sent; returns a Vietnamese message or null. */
export function validateRuleForm(metric: IotMetric, min: number | null, max: number | null, hysteresis: number) {
  const bounds: Record<IotMetric, [number, number]> = {
    TEMPERATURE: [-20, 70], HUMIDITY: [0, 100], SOIL_MOISTURE: [0, 100], LIGHT: [0, 100000],
  };
  const [lo, hi] = bounds[metric];
  if (min === null && max === null) return "Nhập ít nhất một ngưỡng (thấp hoặc cao).";
  for (const value of [min, max]) {
    if (value !== null && (!Number.isFinite(value) || value < lo || value > hi)) return `Ngưỡng phải nằm trong khoảng ${lo}–${hi}.`;
  }
  if (min !== null && max !== null && min >= max) return "Ngưỡng thấp phải nhỏ hơn ngưỡng cao.";
  if (!Number.isFinite(hysteresis) || hysteresis < 0) return "Vùng đệm phải lớn hơn hoặc bằng 0.";
  if (min !== null && max !== null && hysteresis * 2 >= max - min) return "Vùng đệm quá lớn so với khoảng ngưỡng.";
  return null;
}
