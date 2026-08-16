export type CommunityRole = "ADMIN" | "ENGINEER" | "FARMER" | string;

export type CommunityPostStatus = "PUBLISHED" | "REPORTED" | "HIDDEN";
export type CommunityPostVisibility = "PUBLIC" | "CONNECTIONS";
export type CommunityReactionType = "LIKE" | "LOVE" | "WOW" | "SAD" | "HAHA";
export type CommunityMediaType = "IMAGE" | "VIDEO";

export type CommunityAuthor = {
  id: string;
  fullName: string;
  avatar: string | null;
  role: CommunityRole;
  region: string | null;
};

export type CommunityMedia = {
  id: string;
  type: CommunityMediaType;
  url: string;
  contentType: string;
};

export type CommunityComment = {
  id: string;
  author: CommunityAuthor;
  content: string;
  parentId: string | null;
  replies: CommunityComment[];
  createdAt: string;
};

export type CommunityPost = {
  id: string;
  author: CommunityAuthor;
  topic: string;
  content: string;
  visibility: CommunityPostVisibility;
  status: CommunityPostStatus;
  media: CommunityMedia[];
  tags: string[];
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  myReaction: CommunityReactionType | null;
  comments: CommunityComment[];
  createdAt: string;
  updatedAt: string;
};

export type CommunityPage<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
