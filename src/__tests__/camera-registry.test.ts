import { cameraClient } from "@/lib/camera/client";
import { apiFetch } from "@/lib/auth/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("@/lib/auth/client", () => ({ apiFetch: jest.fn() }));
beforeEach(() => jest.mocked(apiFetch).mockReset());

it.each([401, 403, 503, 404])("never shows a frame on HTTP %s", async status => {
  jest.mocked(apiFetch).mockResolvedValue(new Response("", {status}));
  await expect(cameraClient.fetchLatestFrame("fixture")).rejects.toMatchObject({status});
});
it("capture-now: 202 means a queued command the camera will fulfil, 201 a finished legacy capture", async () => {
  const command = {id:"c1",cameraId:"fixture",status:"PENDING",reason:"ON_DEMAND"};
  jest.mocked(apiFetch).mockResolvedValueOnce(new Response(JSON.stringify(command), {status:202}));
  expect(await cameraClient.captureNow("fixture")).toEqual({kind:"queued", command});
  jest.mocked(apiFetch).mockResolvedValueOnce(new Response(JSON.stringify({id:"cap"}), {status:201}));
  expect(await cameraClient.captureNow("fixture")).toEqual({kind:"capture", capture:{id:"cap"}});
  jest.mocked(apiFetch).mockResolvedValueOnce(new Response(JSON.stringify({code:"CAMERA_PUSH_UNSUPPORTED"}), {status:409}));
  await expect(cameraClient.captureNow("fixture")).rejects.toMatchObject({status:409});
});
it("waits for a queued capture until it completes", async () => {
  jest.mocked(apiFetch)
    .mockResolvedValueOnce(new Response(JSON.stringify({id:"c1",status:"DELIVERED"})))
    .mockResolvedValueOnce(new Response(JSON.stringify({id:"c1",status:"COMPLETED",capture:{id:"cap"}})));
  const done = await cameraClient.waitForCommand("fixture", "c1", {intervalMs: 1});
  expect(done.status).toBe("COMPLETED");
  expect(apiFetch).toHaveBeenCalledWith("/api/v1/camera/commands/c1?device_id=fixture", undefined);
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
  expect(source).toContain("[refreshSnapshot, endpointVersion, canPreview, clearSnapshot, livePush]");
  // Live view (PUSH): preview requests stop when the tab is hidden or a manual capture runs.
  expect(source).toContain("livePush && pageVisible && captureStep === \"idle\"");
  // Snapshots are requested only for an ONLINE camera, with backoff instead of a fixed interval.
  expect(source).toContain("if (!canPreview) { setPreviewLoading(false); return; }");
  expect(source).toContain("snapshotDelayMs(failuresRef.current)");
  expect(source).toContain("setInterval(poll, 8_000)");
  expect(source).not.toMatch(/LIVE ·|FALLBACK_DEVICES|192\.168\.|camera_url|updateConfig|ip_address/);
});
