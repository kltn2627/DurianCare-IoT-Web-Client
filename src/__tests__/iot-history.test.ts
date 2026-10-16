import { completeTelemetryHistory, loadDashboardHistory } from "@/lib/iot/history";
import nextConfig from "../../next.config";
const query = { from: "2026-10-01T00:00:00Z", to: "2026-10-15T00:00:00Z" };
const row = (id: string) => ({ id, device_id: "esp32-01", timestamp: "2026-10-14T00:00:00Z", temperature: 30, air_humidity: 80 });
beforeEach(() => { global.fetch = jest.fn(); });

it("loads actual range pages beyond 1000 with fixed scope and upper bound", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ offset: 0,
    data: Array.from({length: 1000}, (_, i) => row(String(i))) })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ offset: 1000, data: [row("1000")] })));
  const rows = await completeTelemetryHistory("esp32-01", query);
  expect(rows).toHaveLength(1001);
  expect(rows[0].humidity).toBe(80);
  for (const [url] of jest.mocked(fetch).mock.calls) {
    const params = new URL(String(url), "http://localhost").searchParams;
    expect(params.get("device_id")).toBe("esp32-01");
    expect(params.get("from")).toBe(query.from);
    expect(params.get("to")).toBe(query.to);
  }
  expect(String(jest.mocked(fetch).mock.calls[1][0])).toContain("offset=1000");
});

it("represents a truly empty interval without generating readings", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"offset":0,"data":[]}'));
  expect(await completeTelemetryHistory("esp32-01", query)).toEqual([]);
});

it.each([401,403,500,503])("preserves HTTP %s without returning stale partial history", async status => {
  jest.mocked(fetch).mockResolvedValue(new Response('{}', {status}));
  await expect(completeTelemetryHistory("esp32-01", query)).rejects.toMatchObject({status});
});

it.each([
  { offset: 9, data: [] },
  { offset: 0, data: [row("same"), row("same")] },
  { offset: 0, data: [{...row("other"), device_id: "foreign-device"}] },
  { offset: 0, data: [{...row("future"), timestamp: "2099-01-01"}] },
])("rejects inconsistent pagination, duplicate IDs and out-of-scope data", async page => {
  jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(page)));
  await expect(completeTelemetryHistory("esp32-01", query)).rejects.toThrow();
});

it("does not bypass the authenticated catch-all proxy for sensor reads", async () => {
  const rewrites = await nextConfig.rewrites!();
  expect(rewrites).toHaveProperty("beforeFiles");
  if (!Array.isArray(rewrites)) {
    expect(rewrites.beforeFiles?.some(rule => rule.source.includes("sensors"))).toBe(false);
    expect(rewrites.beforeFiles?.some(rule => rule.source.includes("camera"))).toBe(true);
  }
});

it("keeps authorized registry data explicitly incomplete if deployed legacy integration is missing", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({telemetry: Array.from({length:1000},(_,i)=>row(String(i)))})))
    .mockResolvedValueOnce(new Response('{"message":"Authenticated user is required"}',{status:401}));
  const result = await loadDashboardHistory("esp32-01", query);
  expect(result.readings).toHaveLength(1000);
  expect(result.incomplete).toBe(true);
});
