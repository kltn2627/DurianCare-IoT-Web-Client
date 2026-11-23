import { NextResponse } from "next/server";
import { proxyAuthenticatedGatewayRequest } from "@/lib/auth/gatewayProxy";

/**
 * Opens or renews the live view of a camera (POST ?device_id=).
 * The gateway checks the viewer's farm access and returns `streamPath` plus a short-lived token; the browser
 * then loads the MJPEG stream straight from the gateway (`streamUrl`), because a serverless proxy cannot hold
 * a long-lived streaming response.
 */
export async function POST(request: Request) {
  const upstream = await proxyAuthenticatedGatewayRequest(request, "/api/v1/camera/live/start");
  const payload = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
  const base = (process.env.DURIANCARE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
  const streamPath = payload?.streamPath;
  const body = upstream.ok && typeof streamPath === "string" && streamPath.startsWith("/api/v1/public/cameras/")
    ? { ...payload, streamUrl: `${base}${streamPath}` }
    : payload ?? { error: "Live view unavailable" };
  const response = NextResponse.json(body, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  for (const cookie of upstream.headers.getSetCookie()) response.headers.append("set-cookie", cookie);
  return response;
}
