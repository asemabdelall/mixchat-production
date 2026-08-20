export type UserRole = "user" | "creator" | "verified" | "admin";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  coverImage?: string;
  bio?: string;
  online: boolean;
  lastSeen?: string;
  isPremium: boolean;
  role?: UserRole;
  followersCount: number;
  followingCount: number;
  location?: {
    lat: number;
    lng: number;
    city: string;
    statusMessage?: string;
  };
  isFollowing?: boolean;
}

export interface StoryHighlight {
  id: string;
  title: string;
  coverImage: string;
  stories: Story[];
  createdAt?: string;
}

export interface Hashtag {
  tag: string;
  postsCount: number;
  isTrending?: boolean;
  category?: string;
}

export interface Story {
  id: string;
  userId: string;
  user: User;
  mediaUrl: string;
  mediaType: "image" | "video" | "text";
  backgroundColor?: string;
  caption?: string;
  timestamp: string;
  duration: number; // in seconds
  viewsCount: number;
  isLiked?: boolean;
  audience?: "public" | "friends" | "close_friends";
}

export interface Comment {
  id: string;
  postId: string;
  user: User;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
  replyToUsername?: string;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  content: string;
  mediaUrls?: string[];
  mediaItems?: Array<{
    url: string;
    kind: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
  }>;
  mediaType?: "image" | "video" | "carousel";
  videoUrl?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  repostsCount?: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isReposted?: boolean;
  isRepost?: boolean;
  repostedBy?: User;
  originalPost?: Post;
  createdAt: string;
  comments?: Comment[];
  locationTag?: string;
  backgroundTheme?: string;
  audience?: "public" | "friends" | "close_friends";
}

export type MessageType =
  "text" | "image" | "voice" | "video" | "file" | "system";

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // user IDs
}

export interface MessageReply {
  id: string;
  senderName: string;
  text: string;
}

export interface Message {
  id: string;
  clientMessageId?: string;
  chatId: string;
  senderId: string;
  sender?: User;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  waveform?: number[];
  fileName?: string;
  fileSize?: string;
  createdAt: string;
  createdAtIso?: string;
  deletedAt?: string;
  isRead: boolean;
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  reactions?: MessageReaction[];
  replyTo?: MessageReply;
  isPinned?: boolean;
  isForwarded?: boolean;
}

export interface Chat {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
  groupAdminId?: string;
  updatedAt: string;
  pinnedMessageId?: string;
  isPinnedConvo?: boolean;
  isArchived?: boolean;
  isRequest?: boolean;
  isMuted?: boolean;
  muteUntil?: string;
}
