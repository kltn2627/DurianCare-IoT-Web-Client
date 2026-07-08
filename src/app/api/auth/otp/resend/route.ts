import { NextResponse } from "next/server";
import type { MessageResponse } from "@/lib/auth/types";
import {
  authErrorResponse,
  backendRequest,
} from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email: string };
    const result = await backendRequest<MessageResponse>(
      "/api/auth/otp/resend",
      { method: "POST", body: JSON.stringify(body) },
    );
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
