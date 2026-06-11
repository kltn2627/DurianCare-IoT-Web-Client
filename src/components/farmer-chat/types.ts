export type FarmerChatMode = "AI" | "EXPERT";
export type FarmerMessageSender = "OWNER" | "ASSISTANT" | "EXPERT";
export type FarmerMessageType = "TEXT" | "IMAGE";
export type ExpertRequestStatus = "DRAFT" | "WAITING_ASSIGNMENT" | "ASSIGNED";

export interface FarmerMessage {
  id: string;
  sender: FarmerMessageSender;
  content: string;
  sentAt: string;
  type: FarmerMessageType;
  image: string | null;
}

export interface FarmerZone {
  id: string;
  name: string;
  crop: string;
  snapshot: string;
}

export interface FarmerAttachment {
  name: string;
  preview: string;
}

export interface FarmerChatState {
  mode: FarmerChatMode;
  aiMessages: FarmerMessage[];
  expertMessages: FarmerMessage[];
  aiDraft: string;
  expertDraft: string;
  aiAttachment: FarmerAttachment | null;
  expertAttachment: FarmerAttachment | null;
  selectedZoneId: string;
  requestStatus: ExpertRequestStatus;
}

export type FarmerChatAction =
  | { type: "SET_MODE"; mode: FarmerChatMode }
  | { type: "SET_DRAFT"; mode: FarmerChatMode; value: string }
  | {
      type: "SET_ATTACHMENT";
      mode: FarmerChatMode;
      attachment: FarmerAttachment;
    }
  | { type: "REMOVE_ATTACHMENT"; mode: FarmerChatMode }
  | { type: "SELECT_ZONE"; zoneId: string }
  | { type: "SEND_OWNER_MESSAGE"; mode: FarmerChatMode }
  | { type: "ADD_AI_RESPONSE"; message: FarmerMessage };
