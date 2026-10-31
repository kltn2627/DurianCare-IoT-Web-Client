import { iotClient } from "@/lib/iot/client";

beforeEach(() => { global.fetch = jest.fn(); });
it("uses the official proxy, leaves unknown zone unassigned and sends no actor claims", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"device":{"id":"registry-fixture"}}', { status: 201 }));
  await iotClient.registerDevice(" esp32-fixture ", "owned-farm");
  expect(fetch).toHaveBeenCalledWith("/api/backend/iot/devices", expect.objectContaining({
    method: "POST", body: JSON.stringify({ deviceUid: "esp32-fixture", farmId: "owned-farm", cultivationAreaId: null, status: "ACTIVE" }),
  }));
});
it.each([400, 401, 403, 409, 503])("preserves registration HTTP %s instead of faking a success", async status => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"message":"rejected"}', { status }));
  await expect(iotClient.registerDevice("fixture", "other-farm")).rejects.toMatchObject({ status });
});
