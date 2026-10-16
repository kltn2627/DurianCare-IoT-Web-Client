import { NextResponse } from "next/server";
import type { MessageResponse, RegisterRequest } from "@/lib/auth/types";
import {
  authErrorResponse,
  backendRequest,
} from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterRequest;
    const result = await backendRequest<MessageResponse>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify(body) },
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
