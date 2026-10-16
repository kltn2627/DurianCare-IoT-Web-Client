export type ChatParticipantRole = "FARMER" | "ENGINEER";
export type ChatConversationStatus = "WAITING" | "IN_PROGRESS" | "RESOLVED";
export type ChatMessageSender = "FARMER" | "ENGINEER";
export type ChatMessageType = "TEXT" | "IMAGE" | "TREATMENT_REGIMEN";

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

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: ChatMessageSender;
  content: string;
  sentAt: string;
  type: ChatMessageType;
  image: string | null;
  regimen?: TreatmentRegimen | null;
}

export interface ChatParticipant {
  name: string;
  phoneNumber: string;
  role: ChatParticipantRole;
  userId?: string;
}

export interface ChatConversation {
  id: string;
  farmer: ChatParticipant;
  engineer: ChatParticipant;
  farm: string;
  zone: string;
  location: string;
  status: ChatConversationStatus;
  activityLabel: string;
  lastMessage: string;
  lastMessageAt: string;
  cropContext: string;
  sensorContext: string;
  messages: ChatMessage[];
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationRequest {
  peerUserId?: string;
  peerPhoneNumber?: string;
  farmerName?: string;
  farmerPhoneNumber?: string;
  engineerName?: string;
  engineerPhoneNumber?: string;
  farm?: string;
  zone?: string;
  location?: string;
  cropContext?: string;
  sensorContext?: string;
  initialMessage?: string;
}

export interface SendChatMessageRequest {
  sender: ChatMessageSender;
  content: string;
  image?: string | null;
}

export interface PublishRegimenRequest {
  sender: "ENGINEER";
  regimen: TreatmentRegimen;
}

export interface UpdateRegimenStepRequest {
  completed: boolean;
}
