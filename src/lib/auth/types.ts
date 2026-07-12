export type AuthRole = "ADMIN" | "ENGINEER" | "EXPERT" | "FARMER" | "GUEST";
export type DashboardRole = "ADMIN" | "ENGINEER" | "OWNER";
export type AccountStatus =
  | "PENDING_VERIFICATION"
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "REJECTED"
  | "BLOCKED"
  | string;
export type EngineerApplicationStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | string;

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
  workplace?: string | null;
  specialization?: string | null;
  yearsExperience?: number | null;
  certificateUrls?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: AuthRole;
  accountStatus: AccountStatus;
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

export interface EngineerRegistrationRequest extends RegisterRequest {
  workplace: string;
  specialization: string;
  yearsExperience: number;
  biography: string;
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

export interface EngineerApplicationSummary {
  applicationId: string;
  userId: string;
  email: string;
  fullName: string;
  workplace: string;
  specialization: string;
  yearsExperience: number;
  status: EngineerApplicationStatus;
  reviewedAt: string | null;
  createdAt: string;
}

export interface EngineerApplicationDocument {
  documentId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  documentUrl: string;
  uploadedAt: string;
}

export interface EngineerApplicationDetail extends EngineerApplicationSummary {
  biography: string;
  rejectionReason: string | null;
  reviewedBy: string | null;
  updatedAt: string;
  documents: EngineerApplicationDocument[];
}

export interface ReviewEngineerApplicationRequest {
  rejectionReason?: string | null;
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
  if (role === "ENGINEER" || role === "EXPERT") return "ENGINEER";
  if (role === "ADMIN") return "ADMIN";
  return null;
}

export function dashboardPathFor(role: AuthRole, accountStatus?: AccountStatus | null) {
  if (isPendingApproval(accountStatus) || isRejected(accountStatus)) return "/approval";
  if (role === "FARMER") return "/dashboard/client";
  if (role === "ENGINEER" || role === "EXPERT" || role === "ADMIN") return "/dashboard/admin";
  return "/login";
}

export function isPendingApproval(accountStatus?: AccountStatus | null) {
  return accountStatus === "PENDING_VERIFICATION" || accountStatus === "PENDING_APPROVAL";
}

export function isRejected(accountStatus?: AccountStatus | null) {
  return accountStatus === "REJECTED";
}
