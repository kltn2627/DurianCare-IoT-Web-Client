import { IotApiError } from "@/lib/iot/client";
import { iotLifecycleClient, lifecycleErrorMessage, validateRuleForm } from "@/lib/iot/lifecycle";

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe("IoT device lifecycle client", () => {
  afterEach(() => jest.restoreAllMocks());

  it("claims through the gateway with the activation code and target zone", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(ok({ device: { provisioningStatus: "CLAIMED" } }));
    await iotLifecycleClient.claimDevice({ deviceUid: "esp32-77", claimCode: "ABCDE-12345", farmId: "farm-1", cultivationAreaId: "zone-a" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backend/iot/devices/claim");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ deviceUid: "esp32-77", claimCode: "ABCDE-12345", farmId: "farm-1", cultivationAreaId: "zone-a" });
  });

  it("uses PUT for configuration, scoped rule listing and admin provisioning", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(ok({}));
    await iotLifecycleClient.saveConfig("dev 1", { publishIntervalSeconds: 30, alertsEnabled: true });
    await iotLifecycleClient.listRules("farm-1", "zone-a");
    await iotLifecycleClient.provisionDevice({ deviceUid: "esp32-78", deviceType: "SENSOR", name: null });
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method ?? "GET"])).toEqual([
      ["/api/backend/iot/devices/dev%201/config", "PUT"],
      ["/api/backend/iot/alert-rules?farmId=farm-1&cultivationAreaId=zone-a", "GET"],
      ["/api/backend/iot/devices/provision", "POST"],
    ]);
  });

  it("surfaces the HTTP status as an IotApiError", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 410, json: async () => ({ message: "Claim code has expired" }) } as unknown as Response);
    const error = await iotLifecycleClient.claimDevice({ deviceUid: "x-1", claimCode: "AAAAA-AAAAA", farmId: "f", cultivationAreaId: null }).catch((e) => e);
    expect(error).toBeInstanceOf(IotApiError);
    expect(error.status).toBe(410);
  });
});

describe("IoT lifecycle messages and validation", () => {
  it("maps claim outcomes to Vietnamese messages without echoing backend text", () => {
    const msg = (status: number, message = "x") => lifecycleErrorMessage(new IotApiError(message, status), "fallback");
    expect(msg(410)).toMatch(/hết hạn/);
    expect(msg(429)).toMatch(/sai mã quá nhiều lần/);
    expect(msg(409, "Device is already claimed")).toMatch(/đã được kích hoạt/);
    expect(msg(409, "Device is already registered")).toMatch(/đã tồn tại/);
    expect(msg(409, "A rule for this metric already exists in this scope")).toMatch(/Đã có ngưỡng/);
    expect(msg(403)).toMatch(/không có quyền/);
    expect(msg(500, "java.lang.NullPointerException")).not.toMatch(/java/);
    expect(lifecycleErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
  });

  it("validates thresholds before sending", () => {
    expect(validateRuleForm("SOIL_MOISTURE", 55, 90, 3)).toBeNull();
    expect(validateRuleForm("SOIL_MOISTURE", null, null, 0)).toMatch(/ít nhất một ngưỡng/);
    expect(validateRuleForm("HUMIDITY", 80, 70, 0)).toMatch(/nhỏ hơn/);
    expect(validateRuleForm("HUMIDITY", null, 120, 0)).toMatch(/0–100/);
    expect(validateRuleForm("HUMIDITY", 40, 50, 6)).toMatch(/Vùng đệm quá lớn/);
    expect(validateRuleForm("TEMPERATURE", null, 36, -1)).toMatch(/Vùng đệm/);
  });
});
