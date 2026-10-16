export type ConnectionRelationStatus =
  | "NONE"
  | "REQUEST_SENT"
  | "REQUEST_RECEIVED"
  | "CONNECTED"
  | "BLOCKED";

export type UserConnectionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "BLOCKED"
  | "DISCONNECTED";

export type UserConnectionSource = "PHONE_SEARCH" | "COMMUNITY";

export type ConnectionUser = {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  avatar: string | null;
  role: "FARMER" | "ENGINEER" | string;
  status: string;
  region: string | null;
  specialization: string | null;
  relationStatus: ConnectionRelationStatus;
  connectionId: string | null;
};

export type UserConnection = {
  id: string;
  requesterId: string;
  receiverId: string;
  requesterRole: string;
  receiverRole: string;
  status: UserConnectionStatus;
  source: UserConnectionSource;
  user: ConnectionUser;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  disconnectedAt: string | null;
};

export type ConnectionPage<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
