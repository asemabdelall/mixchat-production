# MIX CHAT — Backend Integration Map & System Specification

> **Document Version**: 1.0 (Prompt 11 Audit)  
> **Status**: Comprehensive Frontend-to-Backend Architecture Map  
> **Purpose**: Serves as the authoritative integration blueprint for backend developers connecting REST APIs, WebSockets, WebRTC, and Object Storage to the MIX CHAT frontend.

---

## 1. Domain Map Summary

```
                      ┌─────────────────────────────────────────┐
                      │              MIX CHAT API               │
                      └────────────────────┬────────────────────┘
                                           │
         ┌───────────────────┬─────────────┼─────────────┬───────────────────┐
         ▼                   ▼             ▼             ▼                   ▼
┌──────────────────┐ ┌──────────────┐ ┌─────────┐ ┌──────────────┐ ┌──────────────────┐
│   Auth & Identity│ │ Social Graph │ │ Content │ │ Realtime Chat│ │ Media & Storage  │
└──────────────────┘ └──────────────┘ └─────────┘ └──────────────┘ └──────────────────┘
```

---

## 2. Comprehensive Domain Specifications

### 2.1 Authentication & Session Management
- **Frontend Entrypoints**: `login/page.tsx`, `register/page.tsx`, `verify-otp/page.tsx`, `forgot-password/page.tsx`, `AuthProvider.tsx`.
- **TypeScript Models**: `User`, `AuthSession` (`token`, `refreshToken`, `expiresAt`).
- **Frontend Actions**: `login()`, `logout()`, `verifyOtp()`, `requestPasswordReset()`.
- **Expected REST APIs**:
  - `POST /api/v1/auth/register` -> Returns temporary OTP token.
  - `POST /api/v1/auth/verify-otp` -> Validates 6-digit code, returns JWT access token + HTTP-only refresh cookie.
  - `POST /api/v1/auth/login` -> Returns JWT + user profile.
  - `POST /api/v1/auth/refresh` -> Issues new access token.
  - `POST /api/v1/auth/logout` -> Invalidates session refresh token.
- **Realtime**: N/A.
- **Storage/Security**: Store access token in memory/Context, refresh token in `HttpOnly, Secure, SameSite=Strict` cookie. Passwords hashed via Argon2id.

---

### 2.2 User Profiles & Identity
- **Frontend Entrypoints**: `profile/page.tsx`, `profile/[username]/page.tsx`, `profile/edit/page.tsx`.
- **TypeScript Models**: `User` (`id`, `username`, `displayName`, `avatar`, `coverImage`, `bio`, `role`, `stats`, `location`, `badge`).
- **Frontend Actions**: `updateProfile()`, `updateAvatar()`, `updateCover()`, `togglePrivacy()`.
- **Expected REST APIs**:
  - `GET /api/v1/users/me` -> Fetch current user profile.
  - `GET /api/v1/users/:username` -> Fetch public user profile by username.
  - `PATCH /api/v1/users/me` -> Update bio, display name, location, social links.
  - `POST /api/v1/users/me/avatar` -> Upload new avatar image.
- **Storage/Security**: Avatars & covers stored on S3/R2 CDN with image optimization (WebP/AVIF).

---

### 2.3 Social Graph & Relationships
- **Frontend Entrypoints**: `friends/page.tsx`, `profile/[username]/followers/page.tsx`, `SocialConnectionsList.tsx`.
- **TypeScript Models**: `FriendRequest`, `UserRelationship` (`status: "none" | "following" | "friends" | "blocked"`).
- **Frontend Actions**: `followUser()`, `unfollowUser()`, `sendFriendRequest()`, `acceptFriendRequest()`, `blockUser()`.
- **Expected REST APIs**:
  - `GET /api/v1/users/:id/followers` -> Paginated list of followers.
  - `GET /api/v1/users/:id/following` -> Paginated list of following users.
  - `POST /api/v1/relationships/follow` -> Follow target user.
  - `DELETE /api/v1/relationships/unfollow` -> Unfollow target user.
  - `POST /api/v1/relationships/block` -> Block user and purge direct chat threads.
- **Realtime**: Push WebSocket event `relationship:updated` for friend request accepts.

---

### 2.4 Social Feed & Posts
- **Frontend Entrypoints**: `feed/page.tsx`, `feed/[id]/page.tsx`, `CreatePostModal.tsx`, `FeedPostCard.tsx`.
- **TypeScript Models**: `Post` (`id`, `userId`, `user`, `content`, `mediaUrls`, `hashtags`, `likesCount`, `commentsCount`, `quotePost`).
- **Frontend Actions**: `createPost()`, `likePost()`, `commentPost()`, `quotePost()`, `deletePost()`.
- **Expected REST APIs**:
  - `GET /api/v1/feed` -> Paginated timeline feed (chronological / algorithmic hybrid).
  - `POST /api/v1/posts` -> Create post with optional media attachments.
  - `GET /api/v1/posts/:id` -> Fetch single post details & comments stream.
  - `POST /api/v1/posts/:id/like` -> Toggle post like.
  - `POST /api/v1/posts/:id/comments` -> Add comment.
- **Realtime**: WebSocket `feed:new_post` for real-time feed updates.

---

### 2.5 Ephemeral Stories (24h)
- **Frontend Entrypoints**: `stories/page.tsx`, `StoryViewerModal.tsx`, `CreateStoryModal.tsx`, `StoryHighlightsTray.tsx`.
- **TypeScript Models**: `Story` (`id`, `userId`, `mediaUrl`, `mediaType`, `caption`, `expiresAt`, `viewsCount`).
- **Expected REST APIs**:
  - `GET /api/v1/stories/feed` -> Active non-expired stories grouped by user.
  - `POST /api/v1/stories` -> Upload story (TTL 24 hours).
  - `POST /api/v1/stories/:id/view` -> Record view impression.
- **Storage**: Automatic lifecycle expiry policy (S3 lifecycle rule purging raw files after 24 hours unless saved to Highlights).

---

### 2.6 Short Video Reels (Reels V1)
- **Frontend Entrypoints**: `/reels/page.tsx`, `ReelFeedViewer.tsx`, `ReelCardItem.tsx`, `CreateReelModal.tsx`, `ReelCommentsSheet.tsx`.
- **TypeScript Models**: `Reel`, `ReelAudio`, `ReelComment`, `ReelShareData`.
- **Expected REST APIs**:
  - `GET /api/v1/reels` -> Infinite scroll vertical recommendation feed.
  - `GET /api/v1/reels/:id` -> Single reel view.
  - `POST /api/v1/reels` -> Publish short reel video + metadata.
  - `POST /api/v1/reels/:id/like` -> Toggle reel like.
  - `POST /api/v1/reels/:id/comments` -> Add reel comment.
- **Media Transcoding**: Video uploaded raw, transcoded asynchronously via FFmpeg/HLS into multi-bitrate adaptive streams (`720p`, `1080p`) with thumbnail posters generated automatically.

---

### 2.7 Direct Messaging & Group Chat
- **Frontend Entrypoints**: `/chat/page.tsx`, `ChatRoom.tsx`, `ChatList.tsx`, `ChatProvider.tsx`.
- **TypeScript Models**: `Chat`, `Message`, `AnonymousMatch`.
- **Expected WebSocket Events**:
  - `message:send` -> Client dispatches message payload.
  - `message:received` -> Server broadcasts message to chat room room.
  - `message:typing` -> Broadcasts typing indicator.
  - `message:read_ack` -> Broadcasts read receipt updates (`sent` -> `delivered` -> `read`).
- **REST Fallback APIs**:
  - `GET /api/v1/chats` -> List user conversations.
  - `GET /api/v1/chats/:id/messages` -> Paginated message history (cursor-based pagination).
  - `POST /api/v1/chats/group` -> Create group chat room.
  - `POST /api/v1/chats/:id/members` -> Add/remove group members.
- **Storage**: Voice notes (`.mp4`/`.webm` audio) uploaded to object storage before sending payload reference.

---

### 2.8 Anonymous Matching Engine
- **Frontend Entrypoints**: `/anonymous/page.tsx`, `AnonymousChatContainer.tsx`.
- **TypeScript Models**: `AnonymousMatch` (`id`, `topic`, `status`, `partner`).
- **Expected Architecture**:
  - **Queue System**: Redis Sorted Sets / In-Memory PubSub queue matching users based on selected topic.
  - `WS match:join_queue` -> Submits user to topic pool.
  - `WS match:found` -> Emits paired temporary channel ID to both clients.
  - `POST /api/v1/anonymous/reveal-request` -> Handles identity reveal authorization.

---

### 2.9 Social Discovery Map V2
- **Frontend Entrypoints**: `/map/page.tsx`, `InteractiveMap.tsx`, `MapUserPreviewModal.tsx`.
- **TypeScript Models**: `MapUserMarker` (`id`, `coordinates: [lat, lng]`, `status`, `lastActive`).
- **Expected APIs**:
  - `POST /api/v1/location/ping` -> Updates user's geo-location (PostGIS / MongoDB 2dsphere index).
  - `GET /api/v1/location/nearby?lat=...&lng=...&radius=5000` -> Returns nearby active friends with spatial privacy offset (if enabled).

---

### 2.10 Voice & Video Calls (WebRTC)
- **Frontend Entrypoints**: `CallProvider.tsx`, `ActiveCallModal.tsx`.
- **Expected Architecture**:
  - Signaling server over WebSocket (`call:offer`, `call:answer`, `call:ice_candidate`, `call:end`).
  - STUN/TURN Servers (Coturn / Twilio Network Traversal) for NAT traversal.
