import { NextResponse } from "next/server";
import type { MessageResponse } from "@/lib/auth/types";
import {
  authErrorResponse,
  backendFormRequest,
} from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await backendFormRequest<MessageResponse>(
      "/api/auth/register/engineer",
      formData,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
