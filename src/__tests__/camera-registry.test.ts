import { cameraClient } from "@/lib/camera/client";
import { apiFetch } from "@/lib/auth/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("@/lib/auth/client", () => ({ apiFetch: jest.fn() }));
beforeEach(() => jest.mocked(apiFetch).mockReset());

it.each([401, 403, 503])("does not report snapshot connectivity on HTTP %s", async status => {
  jest.mocked(apiFetch).mockResolvedValue(new Response("", {status}));
  expect(await cameraClient.pingSnapshot("fixture")).toBe(false);
});
it.each([["text/html", "error"], ["image/jpeg", ""]])("rejects invalid snapshot %s", async (type, body) => {
  jest.mocked(apiFetch).mockResolvedValue(new Response(body, {headers:{"Content-Type":type}}));
  await expect(cameraClient.fetchSnapshotBlob("fixture")).rejects.toMatchObject({status:502});
});
it("loads current registry metadata rather than a private camera address", async () => {
  const device = {cameraId:"fixture",status:"ONLINE",endpointVersion:"version-b",snapshotUrl:"/api/v1/camera/snapshot?device_id=fixture"};
  jest.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({devices:[device]})));
  expect((await cameraClient.listDevices()).devices[0]).toEqual(device);
  expect(apiFetch).toHaveBeenCalledWith("/api/v1/camera/devices", undefined);
});
it("keeps generation and endpoint-change guards and avoids claiming a video stream", () => {
  const source = readFileSync(join(process.cwd(),"src/components/camera/CameraSection.tsx"),"utf8");
  expect(source).toContain("generation !== snapshotGeneration.current");
  expect(source).toContain("[refreshSnapshot, endpointVersion]");
  expect(source).toContain("setInterval(poll, 8_000)");
  expect(source).not.toMatch(/LIVE ·|FALLBACK_DEVICES|192\.168\./);
});
