import { cameraClient } from "@/lib/camera/client";
import { CameraApiError } from "@/lib/camera/client";
import { apiFetch } from "@/lib/auth/client";

beforeEach(() => { global.fetch = jest.fn(); });

it("opens the live stream through the authenticated route and returns the gateway MJPEG URL", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
    streamUrl: "https://gw.example/api/v1/public/cameras/cam-1/live.mjpeg?token=1.abc", renewAfterMs: 15000,
  }), { status: 200 }));
  const live = await cameraClient.startLive("cam-1");
  expect(fetch).toHaveBeenCalledWith("/api/camera/live?device_id=cam-1", expect.objectContaining({ method: "POST" }));
  expect(live).toEqual({ streamUrl: "https://gw.example/api/v1/public/cameras/cam-1/live.mjpeg?token=1.abc", renewAfterMs: 15000 });
});

it("rejects an unexpected stream URL and reports old firmware as 409", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ streamUrl: "https://evil.example/x.mjpeg" }), { status: 200 }));
  await expect(cameraClient.startLive("cam-1")).rejects.toMatchObject({ status: 502 });
  jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "unsupported" }), { status: 409 }));
  const err = await cameraClient.startLive("cam-1").catch((e: unknown) => e);
  expect(err).toBeInstanceOf(CameraApiError);
  expect((err as CameraApiError).status).toBe(409);
});

it("apiFetch sends JSON bodies with a JSON content type", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response("{}", { status: 202 }));
  await apiFetch("/api/v1/camera/capture-now", { method: "POST", body: JSON.stringify({ preview: true }) });
  const init = jest.mocked(fetch).mock.calls[0][1] as RequestInit;
  expect(new Headers(init.headers).get("content-type")).toBe("application/json");
});
