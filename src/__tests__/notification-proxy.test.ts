jest.mock("next/headers", () => ({ cookies: jest.fn(async () => ({ get: jest.fn(() => ({ value: "fixture-only" })) })) }));
jest.mock("@/lib/auth/server", () => ({
  AUTH_COOKIES: { accessToken: "access", refreshToken: "refresh" },
  readSession: jest.fn(() => ({ userId: "fixture-owner" })),
  tokenNeedsRefresh: jest.fn(() => false),
  clearAuthenticationCookies: jest.fn(),
  setRefreshedTokenCookies: jest.fn(),
  rotateRefreshToken: jest.fn(),
  AuthApiError: class extends Error {},
}));

import { PATCH } from "@/app/api/notifications/[[...path]]/route";
import type { NextRequest } from "next/server";

it("strips browser Origin/Referer before Gateway forwarding without changing the bulk route", async () => {
  global.fetch = jest.fn(async () => new Response('{"updatedCount":0}', { status: 200 }));
  const request = new Request("http://localhost:3000/api/notifications/notifications/read-all", {
    method: "PATCH", headers: { origin: "http://localhost:3000", referer: "http://localhost:3000/notifications", cookie: "fixture-only", host: "localhost:3000" },
  });
  const result = await PATCH(request as NextRequest, { params: Promise.resolve({ path: ["notifications", "read-all"] }) });
  expect(result.status).toBe(200);
  const [url, init] = jest.mocked(fetch).mock.calls[0] as unknown as [string, RequestInit];
  expect(new URL(url).pathname).toBe("/api/v1/notification/notifications/read-all");
  expect(init.method).toBe("PATCH");
  const headers = new Headers(init.headers);
  for (const header of ["origin", "referer", "cookie", "host"]) expect(headers.has(header)).toBe(false);
  expect(headers.has("authorization")).toBe(true);
});
