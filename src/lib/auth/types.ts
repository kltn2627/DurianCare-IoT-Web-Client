export type AuthRole = "ADMIN" | "EXPERT" | "FARMER" | "GUEST";
export type DashboardRole = "ADMIN" | "ENGINEER" | "OWNER";

export interface UserProfile {
  fullName: string;
  phoneNumber: string | null;
  farmAddress: string | null;
  avatarUrl: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  provinceCity?: string | null;
  bio?: string | null;
  accountStatus?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: AuthRole;
  profile: UserProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: AuthRole;
}

export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
}

export interface AuthenticationResponse extends AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  accessTokenExpiresIn: number;
}

export interface AccessTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshTokenExpiresIn: number;
}

export interface MessageResponse {
  message: string;
}

export interface ApproveExpertResponse {
  message: string;
}

export interface ApiErrorBody {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  retryAfterSeconds?: number;
}

export function toDashboardRole(role: AuthRole): DashboardRole | null {
  if (role === "FARMER") return "OWNER";
  if (role === "EXPERT") return "ENGINEER";
  if (role === "ADMIN") return "ADMIN";
  return null;
}

export function dashboardPathFor(role: AuthRole) {
  if (role === "FARMER") return "/dashboard/client";
  if (role === "EXPERT" || role === "ADMIN") return "/dashboard/admin";
  return "/login";
}
