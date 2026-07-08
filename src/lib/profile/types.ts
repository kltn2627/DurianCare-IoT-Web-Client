import type { ApiErrorBody, AuthRole } from "@/lib/auth/types";

export type ProfileGender = "MALE" | "FEMALE" | "OTHER" | "";
export type ProfileAccountStatus = "PENDING" | "ACTIVE" | "BLOCKED" | string;

export interface ProfileRecord {
  userId: string;
  email: string;
  role: AuthRole;
  accountStatus: ProfileAccountStatus;
  fullName: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  gender: ProfileGender | string | null;
  address: string | null;
  provinceCity: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateRequest {
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: ProfileGender | string;
  address?: string;
  provinceCity?: string;
  bio?: string;
}

export interface ProfileAvatarResponse {
  avatarUrl: string;
}

export interface ProfileDeleteAvatarResponse {
  message: string;
}

export type ProfileApiErrorBody = ApiErrorBody;
