import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIES,
  AuthApiError,
  clearAuthenticationCookies,
  readSession,
  rotateRefreshToken,
  setRefreshedTokenCookies,
  tokenNeedsRefresh,
} from "@/lib/auth/server";

type RouteContext = { params: Promise<{ path?: string[] }> };

const API_BASE_URL = (
  process.env.DURIANCARE_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

async function proxy(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  const session = readSession(cookieStore);
  const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;
  let accessToken = cookieStore.get(AUTH_COOKIES.accessToken)?.value;
  let rotatedTokens: Awaited<ReturnType<typeof rotateRefreshToken>> | null = null;
  const method = request.method.toUpperCase();
  const requestBody = ["GET", "HEAD"].includes(method)
    ? undefined
    : await request.arrayBuffer();

  if (!session) {
    const response = NextResponse.json(
      {
        status: 401,
        error: "Unauthorized",
        message: "Chưa có phiên đăng nhập hợp lệ.",
      },
      { status: 401 },
    );
    clearAuthenticationCookies(response);
    return response;
  }

  try {
    if (tokenNeedsRefresh(accessToken)) {
      if (!refreshToken) throw new AuthApiError(401, unauthorizedBody());
      rotatedTokens = await rotateRefreshToken(refreshToken);
      accessToken = rotatedTokens.accessToken;
    }

    let backendResponse = await forward(
      request,
      context,
      accessToken!,
      session.userId,
      requestBody,
    );

    if (backendResponse.status === 401 && refreshToken && !rotatedTokens) {
      rotatedTokens = await rotateRefreshToken(refreshToken);
      backendResponse = await forward(
        request,
        context,
        rotatedTokens.accessToken,
        session.userId,
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
  request: NextRequest,
  context: RouteContext,
  accessToken: string,
  userId: string,
  body: ArrayBuffer | undefined,
) {
  const { path = [] } = await context.params;
  const sourceUrl = new URL(request.url);
  const target = `${API_BASE_URL}/api/v1/notification${path.length ? `/${path.join("/")}` : ""}${sourceUrl.search}`;
  const requestHeaders = new Headers(request.headers);
  ["host", "cookie", "content-length", "connection"].forEach((name) =>
    requestHeaders.delete(name),
  );
  requestHeaders.set("authorization", `Bearer ${accessToken}`);
  requestHeaders.set("x-auth-user-id", userId);
  return fetch(target, {
    method: request.method.toUpperCase(),
    headers: requestHeaders,
    body,
    cache: "no-store",
  });
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

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
