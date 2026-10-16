import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIES,
  AuthApiError,
  clearAuthenticationCookies,
  rotateRefreshToken,
  setRefreshedTokenCookies,
  tokenNeedsRefresh,
} from "@/lib/auth/server";

export async function proxyAuthenticatedGatewayRequest(
  request: Request,
  targetPath: string,
) {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(AUTH_COOKIES.accessToken)?.value;
  const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;
  let rotatedTokens: Awaited<ReturnType<typeof rotateRefreshToken>> | null = null;
  const method = request.method.toUpperCase();
  const requestBody = ["GET", "HEAD"].includes(method)
    ? undefined
    : await request.arrayBuffer();

  try {
    if (tokenNeedsRefresh(accessToken)) {
      if (!refreshToken) throw new AuthApiError(401, unauthorizedBody());
      rotatedTokens = await rotateRefreshToken(refreshToken);
      accessToken = rotatedTokens.accessToken;
    }

    let backendResponse = await forward(
      request,
      targetPath,
      accessToken!,
      requestBody,
    );
    if (backendResponse.status === 401 && refreshToken && !rotatedTokens) {
      rotatedTokens = await rotateRefreshToken(refreshToken);
      backendResponse = await forward(
        request,
        targetPath,
        rotatedTokens.accessToken,
        requestBody,
      );
    }

    const response = new NextResponse(await backendResponse.arrayBuffer(), {
      status: backendResponse.status,
      headers: responseHeaders(backendResponse.headers),
    });
    if (rotatedTokens) setRefreshedTokenCookies(response, rotatedTokens);
    if (backendResponse.status === 401) clearAuthenticationCookies(response);
    return response;
  } catch (error) {
    const status = error instanceof AuthApiError ? error.status : 503;
    const body =
      error instanceof AuthApiError
        ? error.body
        : {
            status,
            error: "Service Unavailable",
            message: "Không thể kết nối đến DurianCare Gateway.",
          };
    const response = NextResponse.json(body, { status });
    if (status === 401) clearAuthenticationCookies(response);
    return response;
  }
}

async function forward(
  request: Request,
  targetPath: string,
  accessToken: string,
  body: ArrayBuffer | undefined,
) {
  const sourceUrl = new URL(request.url);
  const backendBase = (
    process.env.DURIANCARE_API_URL ?? "http://localhost:8080"
  ).replace(/\/$/, "");
  const normalizedPath = targetPath.startsWith("/")
    ? targetPath
    : `/${targetPath}`;
  const target = `${backendBase}${normalizedPath}${sourceUrl.search}`;
  const headers = new Headers(request.headers);
  [
    "host",
    "cookie",
    "content-length",
    "connection",
    "origin",
    "referer",
  ].forEach((name) =>
    headers.delete(name),
  );
  headers.set("authorization", `Bearer ${accessToken}`);
  const method = request.method.toUpperCase();
  return fetch(target, { method, headers, body, cache: "no-store" });
}

function responseHeaders(source: Headers) {
  const headers = new Headers();
  ["content-type", "location", "retry-after"].forEach((name) => {
    const value = source.get(name);
    if (value) headers.set(name, value);
  });
  return headers;
}

function unauthorizedBody() {
  return {
    status: 401,
    error: "Unauthorized",
    message: "Phiên đăng nhập đã hết hạn.",
  };
}
