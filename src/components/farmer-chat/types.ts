export type FarmerChatMode = "AI" | "EXPERT";
export type FarmerMessageSender = "OWNER" | "ASSISTANT" | "EXPERT";
export type FarmerMessageType = "TEXT" | "IMAGE" | "TREATMENT_REGIMEN";
export type ExpertRequestStatus = "DRAFT" | "WAITING_ASSIGNMENT" | "ASSIGNED";
export type FarmerConversationStatus = "WAITING" | "IN_PROGRESS" | "RESOLVED";

export interface TreatmentStep {
  completed: boolean;
  day: number;
  task: string;
}

export interface TreatmentRegimen {
  diagnosis: string;
  expectedOutcome: string;
  followUpDate: string;
  steps: TreatmentStep[];
  title: string;
}

export interface FarmerMessage {
  id: string;
  sender: FarmerMessageSender;
  content: string;
  sentAt: string;
  type: FarmerMessageType;
  image: string | null;
  regimen?: TreatmentRegimen | null;
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

export interface FarmerExpertConversation {
  activityLabel: string;
  cropContext: string;
  engineerInitials: string;
  engineerName: string;
  farm: string;
  id: string;
  lastMessage: string;
  lastMessageAt: string;
  location: string;
  messages: FarmerMessage[];
  online: boolean;
  sensorContext: string;
  specialty: string;
  status: FarmerConversationStatus;
  unreadCount: number;
  zone: string;
  zoneId: string;
}

export interface FarmerChatState {
  mode: FarmerChatMode;
  aiMessages: FarmerMessage[];
  expertConversations: FarmerExpertConversation[];
  activeExpertId: string;
  expertQuery: string;
  expertFilter: "ALL" | FarmerConversationStatus;
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
  | { type: "SELECT_EXPERT_CONVERSATION"; id: string }
  | { type: "SEARCH_EXPERT_CONVERSATIONS"; value: string }
  | { type: "FILTER_EXPERT_CONVERSATIONS"; value: FarmerChatState["expertFilter"] }
  | { type: "SEND_OWNER_MESSAGE"; mode: FarmerChatMode }
  | { type: "ADD_AI_RESPONSE"; message: FarmerMessage }
  | { type: "TOGGLE_REGIMEN_PROGRESS"; messageId: string; day: number };
