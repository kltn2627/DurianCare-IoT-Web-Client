export type ConversationStatus = "WAITING" | "IN_PROGRESS" | "RESOLVED";
export type MessageSender = "OWNER" | "EXPERT";
export type MessageType = "TEXT" | "IMAGE" | "TREATMENT_REGIMEN";

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

export interface ExpertMessage {
  id: string;
  sender: MessageSender;
  content: string;
  sentAt: string;
  type: MessageType;
  image: string | null;
  regimen?: TreatmentRegimen | null;
}

export interface ExpertConversation {
  id: string;
  ownerName: string;
  initials: string;
  farm: string;
  zone: string;
  location: string;
  status: ConversationStatus;
  activityLabel: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  online: boolean;
  cropContext: string;
  sensorContext: string;
  messages: ExpertMessage[];
}

export interface PendingAttachment {
  name: string;
  preview: string;
}

export interface ExpertChatState {
  conversations: ExpertConversation[];
  activeId: string;
  query: string;
  filter: "ALL" | ConversationStatus;
  draft: string;
  attachment: PendingAttachment | null;
  regimenDraft: TreatmentRegimen;
  showRegimenPlanner: boolean;
}

export type ExpertChatAction =
  | { type: "SELECT_CONVERSATION"; id: string }
  | { type: "SEARCH"; value: string }
  | { type: "FILTER"; value: ExpertChatState["filter"] }
  | { type: "UPDATE_DRAFT"; value: string }
  | { type: "SET_ATTACHMENT"; attachment: PendingAttachment }
  | { type: "REMOVE_ATTACHMENT" }
  | { type: "SEND_MESSAGE" }
  | { type: "SET_STATUS"; status: ConversationStatus }
  | { type: "TOGGLE_REGIMEN_PLANNER" }
  | { type: "UPDATE_REGIMEN_FIELD"; field: keyof Omit<TreatmentRegimen, "steps">; value: string }
  | { type: "UPDATE_REGIMEN_STEP"; index: number; value: string }
  | { type: "ADD_REGIMEN_STEP" }
  | { type: "REMOVE_REGIMEN_STEP"; index: number }
  | { type: "PUBLISH_REGIMEN" }
  | { type: "TOGGLE_REGIMEN_PROGRESS"; messageId: string; day: number };
