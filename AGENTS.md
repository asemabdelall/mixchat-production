# 🤖 MixChat — Agent Instruction & Project Context Guide (AGENTS.md)

> **MANDATORY READING FOR ANY AI AGENT WORKING ON THIS WORKSPACE.**
> This document defines the exact architecture, current completion state, project rules, and execution guide for continuing the development of the **MixChat** full-stack ecosystem.

---

## 📁 1. Workspace Structure & Project Inventory

The workspace is organized as a multi-package full-stack repository located at `/Users/asemabdelal/Documents/PROJECTS/MIXCHAT`:

```
/Users/asemabdelal/Documents/PROJECTS/MIXCHAT/
├── AGENTS.md                                # This agent briefing guide
├── FULLSTACK_ARCHITECTURE_AND_ROADMAP.md    # Master 18-Phase Execution Roadmap (Phase 0 -> Phase 17)
├── docker-compose.yml                       # Local PostgreSQL 17 (Port 5433) & Redis 7 (Port 6380)
├── mixchat-frontend/                        # Next.js 16 (App Router) Client Application (Port 3000)
│   ├── src/
│   │   ├── app/ (App Router pages: /feed, /reels, /stories, /map, /chat, /notifications, /profile, /settings, /auth)
│   │   ├── features/ (Modular domain features: chat, feed, reels, stories, map, notifications, profile, search)
│   │   ├── services/
│   │   │   ├── api/
│   │   │   │   ├── apiClient.ts            # Centralized REST client with typed contracts & error normalization
│   │   │   │   ├── socketClient.ts         # Bi-directional WebSocket Gateway client
│   │   │   │   └── types/api.generated.ts  # Generated TypeScript contracts from backend OpenAPI spec
│   │   │   ├── health/healthService.ts     # Health & readiness probe client
│   │   │   └── [domain]Service.ts          # Feature service layers
│   │   └── shared/ (Design system components, Layouts, Providers, UI primitives)
│   ├── .env.local                          # Environment config (NEXT_PUBLIC_API_URL=http://localhost:4000/api)
│   └── package.json                        # Scripts: dev, build, lint, openapi:generate
│
└── mixchat-backend/                         # NestJS 11 Production Backend API (Port 4000, Prefix /api)
    ├── src/
    │   ├── main.ts                         # Helmet, CORS, CookieParser, ValidationPipe, Swagger, /api prefix
    │   ├── app.module.ts                   # Root module with Joi validated ConfigModule
    │   ├── config/                         # env.validation.ts, configuration.ts
    │   ├── common/                         # HttpExceptionFilter, LoggingInterceptor, RequestIdMiddleware
    │   ├── infrastructure/                 # PrismaService (PostgreSQL via @prisma/adapter-pg), RedisService (ioredis)
    │   ├── modules/health/                 # HealthController (/api/health liveness, /api/health/ready readiness)
    │   └── scripts/export-openapi.ts       # Script to export OpenAPI specification
    ├── prisma/                             # schema.prisma, migrations/, prisma.config.ts
    ├── openapi.json                        # Exported OpenAPI 3.0 specification
    └── package.json                        # Scripts: dev, build, lint, test, test:e2e, openapi:export, prisma:migrate
```

---

## ⚡ 2. Current Completion Status

### ✅ Phase 0 — Foundation, Modernization & Full-Stack Contracts: **COMPLETED**
1. **NestJS 11 Production Architecture**: Layered structure, Joi config validation, global pipes, filters, Swagger, logging, health probes.
2. **Database & Cache**: Prisma 7 + PostgreSQL (port 5433), Redis (port 6380), Docker Compose.
3. **Full-Stack Contracts**: Automated OpenAPI 3.0 export and frontend contract generation.

### ✅ Phase 1 — Authentication, Sessions & Account Security: **COMPLETED**
1. **Cryptographic Foundations & Storage**:
   - Argon2id password hashing (`memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`).
   - Short-lived JWT access tokens (15m, signed with unique `jti`).
   - Long-lived opaque rotating refresh tokens (7d), fingerprinted with SHA-256 in PostgreSQL `AuthSession` table.
   - Token reuse and theft detection: Automatically revokes all active user sessions upon compromised token replay and writes `security_events` audit logs.
2. **REST Endpoints**:
   - `POST /api/auth/register`: Atomic user + session creation with normalized credentials.
   - `POST /api/auth/login`: Timing-safe credential verification, HttpOnly cookie issuance (`mixchat_refresh_token`).
   - `POST /api/auth/refresh`: Single-flight refresh token rotation via HttpOnly cookie.
   - `POST /api/auth/logout`: Revokes current session and clears cookie.
   - `POST /api/auth/logout-all`: Revokes all active sessions across all devices for user.
   - `GET /api/auth/me`: Fetches authenticated user profile.
   - `GET /api/auth/sessions`: Lists active device sessions with current device flag.
   - `DELETE /api/auth/sessions/:id`: Revokes specific device session.
3. **Frontend Integration**:
   - `apiClient.ts`: In-memory access token storage (no tokens in `localStorage`), automatic single-flight 401 refresh mutex with event listener fallback.
   - `authService.ts` & `AuthProvider.tsx`: React Context with session restoration on mount, typed user status, reactive sign-in/sign-up.
   - `LoginPage` & `RegisterPage`: Fully wired to real NestJS backend with inline validation, error messages, and loading feedback.
   - Route protection: `MainLayout.tsx` seamlessly redirects unauthenticated users to `/login` and authenticated users away from `/login`/`/register`.
4. **Quality Gates**:
   - Backend unit tests (`npm test`): **19/19 passed**.
   - Backend E2E tests (`npm run test:e2e`): **10/10 passed**.
   - Backend lint (`npm run lint`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (37/37 static routes compiled)**.

### ✅ Phase 2 — Users, Profiles, Social Graph & Privacy: **COMPLETED**
1. **Prisma Models & PostgreSQL Schema**:
   - `User` schema extended with `displayName`, `bio`, `avatarUrl`, `coverUrl`, `website`, `locationCity`, `isPrivate`, `isVerified`, `isPremium`, `followersCount`, `followingCount`.
   - `Follow` model (`followerId`, `followingId`) with transactional counter increments.
   - `FollowRequest` model (`requesterId`, `targetId`) for private accounts.
   - `CloseFriend` model (`userId`, `friendId`).
   - `Block` model (`blockerId`, `blockedId`) with atomic multi-directional relationship deletion.
   - `PrivacySettings` model (`lastSeen`, `profilePhoto`, `locationMode`, `readReceipts`, `allowMentions`, `allowDirectMessages`).
   - `RelationshipState` enum (`NONE`, `FOLLOWING`, `REQUESTED`, `FOLLOWED_BY`, `MUTUAL`, `BLOCKED`, `BLOCKED_BY`, `SELF`).
2. **REST Endpoints & Social Policies**:
   - `GET /api/users/me`: Current user profile.
   - `PATCH /api/users/me`: Profile updates with username collision verification and automatic request resolution when transitioning private -> public.
   - `GET /api/users/by-username/:username` & `GET /api/users/:id`: Public profile with block boundary 404 enforcement and viewer relationship state calculation.
   - `GET /api/users/search`: Trigram / substring user discovery respecting block exclusions.
   - `GET /api/users/me/privacy` & `PATCH /api/users/me/privacy`: Granular privacy controls.
   - `POST /api/social/follow/:id`: Direct follow (public) or follow request creation (private).
   - `DELETE /api/social/follow/:id`: Unfollow or cancel pending follow request.
   - `DELETE /api/social/followers/:id`: Remove follower from own profile.
   - `GET /api/social/users/:id/followers` & `GET /api/social/users/:id/following`: Cursor-paginated social lists.
   - `GET /api/social/follow-requests`: Incoming follow requests list.
   - `POST /api/social/follow-requests/:id/accept` & `:id/decline`: Transactional request handling.
   - `POST /api/social/block/:id` & `DELETE /api/social/block/:id`: Atomic block & unblock with cascade cleanup.
   - `GET /api/social/close-friends`, `POST /api/social/close-friends/:id`, `DELETE /api/social/close-friends/:id`: Close friends list and management.
3. **Frontend Integration**:
   - `userService.ts` and `socialService.ts`: Fully typed client methods mapped to OpenAPI contracts.
   - `ProfileHeroV2` & `ProfileActionBar`: Wired to real counters, optimistic follow/unfollow states, close friend toggling, blocking, and private account indicators.
   - `EditProfileForm`: Full profile editing with username conflict handling and privacy toggles.
   - `SocialConnectionsList`, `followers/page.tsx`, `following/page.tsx`, `[username]/followers/page.tsx`, `[username]/following/page.tsx`: Cursor-paginated followers/following lists with real action buttons.
   - `PrivacySettingsPage`: Real privacy controls and private account toggle.
   - `UniversalSearch`: Live debounced user discovery mapped to `userService.searchUsers`.
4. **Quality Gates**:
   - Backend unit tests (`npm test`): **32/32 passed**.
   - Backend E2E tests (`npm run test:e2e`): **18/18 passed**.
   - Backend lint (`npm run lint`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (37/37 static routes compiled)**.

### ✅ Phase 4 — Posts, Feed & Core Interactions: **COMPLETED**
1. **Prisma Models & PostgreSQL Schema**:
   - `Post` model (`authorId`, `content`, `visibility`, `status`, `locationTag`, `likesCount`, `commentsCount`, `repostsCount`, `editedAt`).
   - `PostMedia` model (`postId`, `mediaObjectId`, `position`) connecting canonical Phase 3 `MediaObject` records in a strict relational order.
   - `PostLike` model (`userId`, `postId`) with transactional atomic counters.
   - `PostBookmark` model (`userId`, `postId`) with private indexing.
   - User `postsCount` relational increment/decrement synchronization.
   - Applied migration `20260814185438_add_posts_and_interactions`.
2. **REST Endpoints & Privacy Enforcement**:
   - `POST /api/posts`: Transactional creation with validated ownership of READY `MediaObject`s.
   - `GET /api/posts/feed`: Opaque composite cursor pagination (`createdAt DESC, id DESC`), `for_you`, `following`, and `trending` algorithm filters, viewer state (`hasLiked`, `hasBookmarked`), and bidirectional block exclusions.
   - `GET /api/posts/bookmarks`: User-saved posts feed.
   - `GET /api/posts/user/:username`: Profile posts feed with follower/close-friend visibility enforcement.
   - `GET /api/posts/:id`: Single post details with privacy assertion.
   - `PATCH /api/posts/:id`: Author-only edit with `editedAt` timestamping.
   - `DELETE /api/posts/:id`: Author-only soft-delete with atomic `user.postsCount` decrement.
   - `PUT & DELETE /api/posts/:id/like`: Idempotent like mutations with atomic counters and non-negative clamping.
   - `PUT & DELETE /api/posts/:id/bookmark`: Idempotent bookmark mutations.
3. **Frontend Integration**:
   - `postsService.ts`: Fully typed client service consuming OpenAPI contracts.
   - `CreatePostModal.tsx`: Direct media uploads to R2 via Phase 3 `mediaService.uploadFile` with progress indicators and reactive creation.
   - `FeedComposerWidget.tsx`: Dynamic user context integration.
   - `FeedPostCard.tsx`: Optimistic like/bookmark state, share/copy URL, and author delete options.
   - `FeedPage` (`/feed`): Infinite scroll with `IntersectionObserver`, opaque cursor pagination, tab filters, and loading skeletons.
   - Single post route (`/feed/[id]`), Saved posts route (`/saved`), and Profile grid/feed tabs (`/profile`, `/profile/[username]`): Connected to real backend endpoints.
4. **Quality Gates**:
   - Backend unit tests (`npm test`): **61/61 passed**.
   - Backend E2E tests (`npm run test:e2e`): **39/39 passed**.
   - Backend lint (`npm run lint`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (37/37 static routes compiled)**.

### ✅ Phase 5 — Comments, Replies & Post Social Depth: **COMPLETED**
1. **Prisma Models & PostgreSQL Schema**:
   - `Comment` model (`postId`, `authorId`, `parentId`, `rootId`, `content`, `status`, `deletedAt`, `repliesCount`, `likesCount`, `editedAt`).
   - `CommentMention` model linking `commentId` to `mentionedUserId` with snapshot `username` and unique compound key.
   - `CommentLike` model (`userId`, `commentId`) for idempotent comment liking.
   - Composite indexes: `[postId, parentId, createdAt, id]`, `[rootId, createdAt, id]`, `[parentId, createdAt, id]`, `[authorId, createdAt]`.
   - Applied migration `20260814191519_add_comments_and_threaded_replies`.
2. **REST Endpoints & Threading Strategy**:
   - `POST /api/posts/:postId/comments`: Top-level comment creation with transactional mention resolution and atomic `post.commentsCount` increment.
   - `GET /api/posts/:postId/comments`: Cursor-paginated chronological discussion with batch viewer like resolution and tombstone formatting.
   - `POST /api/comments/:commentId/replies`: Threaded reply creation with 2-tier root thread resolution (`rootId`) and atomic multi-level counter updates.
   - `GET /api/comments/:commentId/replies`: Cursor-paginated replies for comment threads.
   - `PATCH /api/comments/:id`: Author-only edit with `editedAt` timestamp and automatic mention re-indexing.
   - `DELETE /api/comments/:id`: Author-only delete with tombstone semantics (preserves structure and masks author/content if replies exist; cleans up leaf replies).
   - `PUT & DELETE /api/comments/:id/like`: Idempotent like mutations with atomic counter updates.
3. **Frontend Integration**:
   - `commentsService.ts`: Fully typed client methods mapped to generated OpenAPI contracts.
   - `MentionText.tsx`: Safe plaintext parser rendering `@username` tokens as interactive links to profile.
   - `CommentComposer.tsx`: Multiline textarea, replying-to pill banner, debounced mention autocomplete against `userService.searchUsers`, and quick emoji drawer.
   - `CommentItem.tsx`: Author avatar/badges, relative timestamp, like button, author edit/delete options, and expandable threaded replies.
   - `CommentsBottomSheet.tsx`: Portal-mounted bottom sheet (`z-[9999]`) for rapid discussion directly from feed posts.
   - Single post page (`/feed/[id]`): Full inline discussion thread with real comments, replies, and counters.
### ✅ Phase 11 — Universal Search, Algorithmic Discovery & Dynamic Trends: **COMPLETED**
1. **NestJS 11 Search Engine Architecture**:
   - `SearchService` & `SearchController` with endpoints:
     - `GET /api/search/universal`: Multi-domain ranked search across users, posts, hashtags, and media.
     - `GET /api/search/trending`: Real-time dynamic trending engine computed from post velocity in the last 24h/7d with 5-minute Redis caching.
     - `GET /api/search/explore`: Algorithmic visual discovery feed of high-engagement media posts.
     - `GET & POST & DELETE /api/search/recent`: Per-user search history in Redis with 15-item limit, deduplication, and single-item/clear-all removal.
2. **Smart Multi-Entity Ranking Algorithm**:
   - **User Ranker**: Exact matches (`score 100`) > Prefix matches (`score 60`) > Substring matches (`score 30-40`) + Verified creator boost (+20) + logarithmic follower weighting. Strict block boundary enforcement in both directions.
   - **Post Ranker**: Full-text and substring search across `Post.content` and `locationTag` with visibility enforcement (Public vs Followers vs Close Friends).
   - **Hashtag Extractor**: Dynamic regex aggregation (`#[a-zA-Z0-9_]+`) from active PostgreSQL posts with volume and category classification.
3. **Frontend Integration**:
   - `searchService.ts`: Fully typed client methods mapped directly to generated OpenAPI contracts.
   - `UniversalSearch.tsx`: Real-time debounced search (250ms), single-flight `AbortController`, tabbed domain views (`Top`, `People`, `Posts`, `Tags`, `Media`), and Redis-backed recent search management.
   - `ExploreV2Grid.tsx`: Visual discovery hub connected to real `searchService.getExploreFeed()` and creator discovery.
4. **Quality Gates**:
   - Backend unit tests (`npm test`): **78/78 passed**.
   - Backend E2E tests (`npm run test:e2e`): **52/52 passed**.
   - Backend lint (`npm run lint`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (37/37 static routes compiled)**.

### ✅ Phase 6 — Stories & Story Archive: **COMPLETED**
1. **Prisma Models & PostgreSQL Schema**:
   - `Story` model (`authorId`, `mediaObjectId`, `caption`, `audience`, `status`, `viewsCount`, `expiresAt`, `deletedAt`).
   - `StoryView` model (`storyId`, `viewerId`, `viewedAt`) with unique `@@unique([storyId, viewerId])` and automatic non-author view tracking.
   - `StoryReaction` model (`storyId`, `userId`, `reaction` enum `HEART`, `LAUGH`, `FIRE`, `SURPRISED`, `SAD`, `CLAP`).
   - `StoryReply` model (`storyId`, `senderId`, `content`, `createdAt`, `deletedAt`).
   - Applied migration `20260814195509_add_stories_and_interactions`.
2. **REST Endpoints & 24h Expiration Engine**:
   - `POST /api/stories`: Direct story creation referencing verified READY `MediaObject` with `expiresAt = now + 24h`.
   - `GET /api/stories/active`: Grouped active story feeds ordered by author (`own group` -> `unseen groups` -> `seen groups`).
   - `GET /api/stories/:id`: Single story details with relationship/privacy assertion.
   - `DELETE /api/stories/:id`: Author-only soft delete.
   - `PUT /api/stories/:id/view`: Idempotent view recording in a Prisma transaction.
   - `GET /api/stories/:id/viewers`: Author-only cursor-paginated viewers list with reaction snapshots.
   - `PUT & DELETE /api/stories/:id/reaction`: 1-tap emoji reactions.
   - `POST & GET /api/stories/:id/replies`: Cursor-paginated story reply messages.
   - `GET /api/stories/archive`: Author-only cursor-paginated historical story archive.
   - `@Cron(CronExpression.EVERY_5_MINUTES)`: Automated background batch expiration worker.
3. **Frontend Integration**:
   - `storiesService.ts`: Fully typed client methods mapped directly to generated OpenAPI contracts.
   - `StoryTray.tsx`: Instagram-grade story carousel with multi-stop gradient rings for unseen stories, seen rings, and interactive add story button.
   - `StoryViewerModal.tsx`: Full-screen 9:16 story viewer modal mounted in `createPortal(..., document.body)` with `z-[9999]`, segmented progress bars (5s image / video duration sync), hold-to-pause, 1-tap reactions, inline reply input, author viewer count sheet trigger, and delete action.
   - `CreateStoryModal.tsx`: Image/Video upload directly to Cloudflare R2 via `mediaService.uploadFile` with live progress and audience selector (`Public`, `Followers`, `Close Friends`).
   - `StoryViewersSheet.tsx`: Portal-mounted cursor-paginated viewers list sheet.
   - `/stories` & `/stories/archive`: Full-stack pages connected to real backend endpoints.
4. **Quality Gates**:
   - Backend unit tests (`npm test`): **87/87 passed**.
   - Backend E2E tests (`npm run test:e2e`): **61/61 passed**.
   - Backend lint & build (`npm run build`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (37/37 static routes compiled)**.

### ✅ Phase 7 — Reels & Vertical Video Feed: **COMPLETED**
1. **Prisma Models & PostgreSQL Schema**:
   - `Reel` model (`authorId`, `mediaObjectId`, `posterMediaObjectId`, `caption`, `audioTitle`, `locationTag`, `visibility`, `status`, `likesCount`, `commentsCount`, `bookmarksCount`, `viewsCount`, `sharesCount`, `durationMs`).
   - `ReelLike` (`userId`, `reelId`) and `ReelBookmark` (`userId`, `reelId`) with atomic counter mutations.
   - `ReelWatchSession` (`viewerId`, `reelId`, `sessionId`, `watchedMs`, `maxProgressMs`, `durationMs`, `completionRatio`, `isQualifiedView`, `isCompleted`, `replayCount`, `startedAt`, `endedAt`).
   - `Comment` model extended with optional `reelId` and composite indexing.
   - Applied migration `20260814201914_add_reels_and_watch_sessions`.
2. **REST Endpoints & Deterministic Recommendation Algorithm**:
   - `POST /api/reels`: Transactional creation from verified READY video `MediaObject`.
   - `GET /api/reels`: Algorithmic For You feed (`feed=foryou`) and chronologically cursor-paginated Following feed (`feed=following`).
   - **For You Ranking**: Freshness decay + Engagement signals (likes, comments, bookmarks, views) + Social affinity (following/close friends) + Creator boost - Recent watch penalty, with creator diversity capping.
   - `GET /api/reels/:id`: Single reel details respecting privacy and block boundaries.
   - `GET /api/reels/user/:username`: Profile reels grid feed.
   - `DELETE /api/reels/:id`: Author-only soft deletion.
   - `PUT & DELETE /api/reels/:id/like`: Idempotent liking with atomic counters.
   - `PUT & DELETE /api/reels/:id/bookmark`: Idempotent saving/bookmarking.
   - `POST & GET /api/reels/:reelId/comments`: Phase 5 comments reuse.
   - `POST /api/reels/:id/watch/start`, `PATCH /api/reels/:id/watch/progress`, `POST /api/reels/:id/watch/end`: Real watch session tracking with qualified view threshold (`>=2000ms` or `>=50%`) and completion (`>=90%`).
3. **Frontend Integration**:
   - `reelsService.ts`: Fully typed client methods mapped directly to generated OpenAPI contracts.
   - `ReelFeedViewer.tsx`: Vertical snap scrolling feed with For You / Following tabs, ambient backdrop glow, desktop 9:16 frame, keyboard navigation, and prefetching.
   - `ReelCardItem.tsx`: Only active reel plays, global mute toggle, video scrubber bar, double-tap to like with heart animation, like/bookmark mutations, and author follow CTA.
   - `useReelWatchSession.ts`: Real-time playing duration accumulation and periodic backend checkpointing.
   - `CreateReelModal.tsx`: Real video uploads to Cloudflare R2 via `mediaService.uploadFile` with live progress and audience selector.
   - `ReelCommentsSheet.tsx`: Real cursor-paginated comment stream with author details and like toggles.
   - `ReelShareModal.tsx`: Web Share API and copy link deep linking to `/reels?id=...`.
   - Profile tabs (`/profile`, `/profile/[username]`): Grid connected to `reelsService.getUserReels`.
4. **Quality Gates**:
   - Backend unit tests (`npm test`): **99/99 passed**.
   - Backend E2E tests (`npm run test:e2e`): **70/70 passed**.
   - Backend lint & build (`npm run build`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (37/37 static routes compiled)**.

### ✅ Phase 8 — Messaging Persistence & Conversations: **COMPLETED**
1. **Durable conversation and message domain**:
   - `Conversation`, `ConversationParticipant`, `Message`, and `MessageAttachment` Prisma models with direct/group types, participant roles, reply/tombstone semantics, and canonical `MediaObject` references.
   - Database-enforced deterministic direct-conversation key and sender/conversation-scoped `clientMessageId` uniqueness.
   - Stable cursor pagination on `(createdAt, id)`, indexed membership/history reads, and bounded DTO payloads without Prisma leakage.
2. **REST messaging and concurrency guarantees**:
   - Conversation list/detail/create, history, canonical send, monotonic mark-read, edit/delete, per-user mute/archive/pin, and minimal group membership/admin endpoints under `/api/chat`.
   - Transactional message persistence, conversation-scoped row locking for concurrent sends, conditional latest-message state, atomic group unread increments, and race-safe unread decrements.
   - IDOR membership enforcement, bidirectional block checks, Phase 2 direct-message privacy enforcement, READY/owner/type attachment validation, and compact reply previews.
3. **Attachments and voice notes**:
   - Image, video, file, and first-class voice messages use the Phase 3 direct R2 upload/finalize pipeline.
   - Browser `MediaRecorder` chooses supported WebM/Ogg/MP4 codecs, records real elapsed duration and waveform samples, handles cancellation/permission failures, and cleans media resources.
   - Real audio playback provides play/pause, seekable played/remaining waveform, elapsed time, cleanup, and `1x/1.5x/2x` speed.
4. **Frontend integration**:
   - Mock chat state replaced by generated-contract `chatService` and REST-backed `ChatProvider` with loading/error/retry, real unread counters, read state, older-history scroll anchoring, draft restoration on failure, and real user search for direct/group creation.
   - Removed fake Phase 9 presence/read-delivery semantics; Phase 8 displays only server-persisted send state.
5. **Verification**:
   - Backend unit tests: **104 passed**.
   - Chat E2E includes direct-create/send/read races, concurrent group sends, idempotency, IDOR, privacy/block boundaries, replies/tombstones, attachment ownership, and voice metadata validation.
   - PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` confirms indexed membership and backward index-only message-history scans.
   - Frontend type check, lint, and production build pass with **0 errors (37/37 routes)**.

### ✅ Phase 9 — Realtime Messaging, Presence & Typing: **COMPLETED**
1. **NestJS 11 Socket.IO Realtime Gateway Architecture**:
   - `ChatGateway` mounted at namespace `/chat` with WebSocket and Polling transports.
   - Handshake authentication verifies JWT access token, checks active `AuthSession`, confirms user status is not disabled, and joins private `user:<userId>` room.
   - Authorized room lifecycle (`conversation:join` & `conversation:leave`) strictly verifying conversation membership against canonical Phase 8 rules to prevent IDOR.
2. **Canonical Persistence-First Send Pipeline**:
   - `message:send` handler calls canonical Phase 8 `ChatService.sendMessage()`, executing transactional row-locking (`SELECT ... FOR UPDATE`), atomic `unreadCount` increments, clientMessageId idempotency, and attachments validation.
   - After PostgreSQL transaction commits, gateway broadcasts canonical `message:new` to active `conversation:<conversationId>` room, and emits `conversation:updated` to non-sender participant user rooms (`user:<userId>`) for live sidebar synchronization and unread counters.
3. **Ephemeral Realtime Presence & Typing with Redis**:
   - `PresenceService`: Multi-device tracking using Redis sets (`mixchat:presence:sockets:<userId>`) and keys (`mixchat:presence:<userId>`). Transitions to `ONLINE` on count 0 -> 1+ and transitions to `OFFLINE` with durable PostgreSQL `lastSeen` update when count drops to 0. Supports batch query `presence:get`.
   - `TypingService`: Redis key `mixchat:typing:<conversationId>:<userId>` with 4-second TTL. Emits `typing:update` with author profile details.
   - `message:read` receipt: Monotonically advances participant read pointer and broadcasts receipt event across the room.
4. **Horizontal Scaling over Redis Adapter**:
   - `RedisIoAdapter` integrating `@socket.io/redis-adapter` and `ioredis` with automatic cross-process message and event fanout across multiple NestJS instances.
5. **Frontend Integration**:
   - `socketClient.ts`: Production Socket.IO client with exponential backoff reconnection, token injection, and typed event listeners.
   - `ChatProvider.tsx`: Wired to live socket events (`message:new`, `conversation:updated`, `typing:update`, `presence:update`, `message:read`). Optimistic local insertion reconciled seamlessly with server acknowledgments.
   - `ChatRoomHeader.tsx`, `ChatList.tsx`, `ChatRoom.tsx`: Live green presence dots on avatars, animated purple typing bubbles and subtitle indicators, and instant unread count updates.
6. **Quality Gates**:
   - Backend unit tests (`npm test`): **104/104 passed** (16 suites).
   - Backend E2E tests (`npm run test:e2e`): **97/97 passed** (11 suites, including 12 realtime WebSocket + cross-instance tests).
   - Backend lint (`npm run lint`): **0 errors**.

### ✅ Phase 10 — Realtime Notification Engine & REAL Browser Web Push: **COMPLETED**
1. **Prisma Models & PostgreSQL Schema**:
   - `NotificationType` enum (`LIKE_POST`, `LIKE_COMMENT`, `COMMENT_POST`, `REPLY_COMMENT`, `FOLLOW`, `FOLLOW_REQUEST`, `FOLLOW_ACCEPT`, `MENTION_POST`, `MENTION_COMMENT`, `REPOST_POST`, `MESSAGE_NEW`, `STORY_REACTION`, `STORY_REPLY`, `REEL_LIKE`, `REEL_COMMENT`).
   - `Notification` model (`recipientId`, `actorId` nullable, `type`, `entityId`, `entityType`, `metadata`, `readAt`, `createdAt`) with composite indexing `[recipientId, createdAt, id]` and `[recipientId, readAt]`.
   - `PushSubscription` model (`userId`, `endpoint` unique, `p256dh`, `auth`, `userAgent`, `deviceLabel`, `lastUsedAt`, `revokedAt`, `createdAt`, `updatedAt`).
   - `NotificationPreferences` model (`userId` unique, `pushEnabled`, `socialPush`, `likesPush`, `commentsPush`, `mentionsPush`, `messagesPush`, `showMessagePreview`).
   - Applied migrations `20260815011944_add_notifications_engine` and `20260815014035_add_web_push_and_notification_hardening`.
2. **REST Endpoints & Dual Delivery Engine**:
   - `GET /api/v1/notifications`: Cursor-paginated notifications feed (`createdAt DESC, id DESC`), category filtering (`ALL`, `SOCIAL`, `LIKES`, `COMMENTS`, `MENTIONS`), and unread counting.
   - `GET /api/v1/notifications/unread-count`: Fast indexed unread count.
   - `GET & PATCH /api/v1/notifications/preferences`: Granular delivery preferences per category and lock-screen message previews.
   - `GET /api/v1/push/vapid-public-key`: Returns standard VAPID public key for browser pushManager subscription.
   - `POST & DELETE /api/v1/push/subscriptions`: Register and revoke browser Web Push subscriptions.
   - `PATCH /api/v1/notifications/:id/read`: Single notification read mutation.
   - `PATCH /api/v1/notifications/read-all`: Batch read mutation.
   - **Dual-Channel Delivery Pipeline**: Canonical DB persistence -> In-App Socket.IO broadcast (`user:<recipientId>` room) -> Background Web Push (`web-push` + VAPID) waking Service Worker when tab is closed.
   - Domain hooks in `SocialService` (follows, requests, acceptances), `PostsService` (likes, reposts), `CommentsService` (comments, replies, comment likes, mentions), `ChatService` (direct/group messages), `StoriesService` (reactions, replies), and `ReelsService` (reel likes).
3. **Frontend Integration**:
   - `sw.js`: Service worker with `push` handler (custom icon, badge, payload preview) and `notificationclick` handler (window focus or `clients.openWindow(url)`).
   - `pushNotificationsService.ts`: Web Push lifecycle management (`subscribe`, `unsubscribe`, `syncSubscription`, `getPreferences`, `updatePreferences`, base64 key converter).
- `NotificationsProvider.tsx`: Global React Context managing notifications state, pagination, unread counters, push subscriptions, and Socket.IO listeners.
   - `NotificationSettingsPage` (`/settings/notifications`): Push activation toggle, permission diagnostics, category preferences, and message preview controls.
   - `DesktopSidebar.tsx` & `MobileNavbar.tsx` & `Header.tsx`: Live badges for activity and notifications.
   - `ActivityTimelineV2.tsx` & `NotificationsV2.tsx`: Connected to real backend endpoints with category tabs, relative timestamps, preview quotes, and 1-tap navigation to context post/profile.
4. **Quality Gates**:
   - Backend unit tests (`npm test`): **110/110 passed** (17 suites).
   - Backend E2E tests (`npm run test:e2e`): **105/105 passed** (12 suites).
   - Backend lint (`npm run lint`): **0 errors**.
   - Backend build (`npm run build`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (38/38 static & dynamic routes compiled)**.

### ✅ Phase 12 — Snap Map & Location Privacy: **COMPLETED**
1. **Prisma Models & PostgreSQL Schema**:
   - `LocationVisibility` enum (`FRIENDS`, `CLOSE_FRIENDS`, `NOBODY`).
   - `UserLocationSettings` model (`userId`, `isGhostMode`, `visibility`, `createdAt`, `updatedAt`) linked 1-to-1 to `User`.
   - Applied migration `20260815105522_add_location_privacy_settings`.
2. **Ephemeral Redis Storage & Privacy Authority**:
   - **Ephemeral Key Strategy**: `mixchat:location:user:${userId}` with strict 600-second (10-minute) TTL.
   - **Zero PostgreSQL Trails**: Historical location points are never persisted in PostgreSQL database.
   - `LocationVisibilityPolicy`: Enforces bidirectional blocks, Ghost Mode, Close Friends list, and follower relationships; generates authorized audience user IDs for targeted realtime broadcasts.
   - **Instant Ghost Mode Deletion**: Toggling Ghost Mode or switching visibility to `NOBODY` immediately deletes Redis coordinates and emits `map:location_removed` to authorized friends.
   - REST Endpoints under `/api/v1/map`:
     - `GET /api/v1/map/settings`: Current user location privacy preferences.
     - `PATCH /api/v1/map/settings`: Update Ghost Mode and visibility.
     - `PUT /api/v1/map/location`: Upload current coordinates (lat, lon, accuracy, heading, speed).
     - `DELETE /api/v1/map/location`: Stop sharing / wipe coordinates from Redis.
     - `GET /api/v1/map/friends`: Returns active friend locations enriched with online presence and active stories.
   - Realtime Events on Socket.IO `/chat` namespace: `map:location_updated` and `map:location_removed`.
3. **Frontend Integration**:
   - **MapLibre GL JS + OpenFreeMap Vector Pipeline**: Modern WebGL vector tiles rendered via custom dark MixChat style (`mixchat-map-style.ts`) with 3D building extrusions and OpenFreeMap/OSM attribution.
   - `MapCanvas.tsx`: Custom social DOM markers with circular avatars, active story gradient rings, online presence dots, floating name tags, smooth camera easing, and distinct "You" user marker with pulse animation.
   - `useGeolocationSharing.ts`: Throttled location tracking (15s / 15m threshold), Page Visibility API background pause, and battery-conscious updates.
   - `MapControls.tsx`: Search friends input, Ghost Mode quick toggle, Privacy Sheet trigger, and camera recentering/zoom controls.
   - `MapFriendCard.tsx`: Snapchat-grade bottom friends carousel and expanded detail card with distance estimation, freshness timestamp, Chat CTA, View Profile, and Watch Story trigger.
   - `MapPrivacySheet.tsx`: Granular visibility selector (`My Friends`, `Close Friends Only`, `Nobody`) and Ghost Mode toggle.
   - Full integration with `StoryViewerModal.tsx` for watching active stories directly from map pins.
4. **Quality Gates**:
   - Backend unit tests (`npm test`): **123/123 passed** (18 suites).
   - Backend E2E tests (`npm run test:e2e`): **117/117 passed** (13 suites).
   - Backend lint & build (`npm run build`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (38/38 static & dynamic routes compiled)**.

### ✅ Phase 13 — Anonymous Matching & Full Anonymous Chat: **COMPLETED**
1. **Prisma Models & PostgreSQL Schema**:
   - `AnonymousReport` model (`reporterId`, `reportedUserId`, `anonymousSessionId`, `reason`, `details`, `messageSnippets`, `createdAt`) linked to `User` relations `anonymousReportsCreated` and `anonymousReportsReceived`.
   - Applied migration `20260815113524_add_anonymous_reports`.
2. **Authoritative Redis Matchmaking Engine & Ephemeral Store**:
   - `AnonymousMatchmakingStore`: Encapsulates Redis Sorted Sets (`mixchat:anonymous:queue:global`, `mixchat:anonymous:queue:interest:{id}`), session keys (`mixchat:anonymous:session:{id}` with 3600s TTL), user state keys, recent-match avoidance sets (`mixchat:anonymous:recent:{userId}` with 900s TTL), typing flags, and disconnect grace keys (30s TTL).
   - `AnonymousPersonaGenerator`: Deterministic generation of temporary opaque personas (e.g. *Anonymous Nova*, *Anonymous Orbit*) with abstract geometric avatars and gradient themes with zero correlation to real user identifiers.
   - `AnonymousMatchmakingService`: FIFO queue scheduling, progressive wait-time relaxation (`0-10s` strict interest match, `10-30s` partial overlap, `30s+` broader pool match), self-match prevention, bidirectional block enforcement via `SocialPolicyService`, and recent-match avoidance.
   - `AnonymousSessionService`: Ephemeral session lifecycle, message handling with Cloudflare R2 audio attachments (voice notes), typing, session-scoped presence, 30s disconnect grace period, mutual reveal handshake state machine, anonymous block, and anonymous report.
   - REST Endpoints under `/api/v1/anonymous`:
     - `POST /api/v1/anonymous/queue/join`: Join queue with optional interest tags and attempt immediate atomic match.
     - `POST /api/v1/anonymous/queue/leave`: Cancel active search.
     - `GET /api/v1/anonymous/queue/status`: Query active searching/session status.
     - `GET /api/v1/anonymous/session/:id`: Get active session details & messages.
     - `POST /api/v1/anonymous/session/:id/message`: Send text or voice note message.
     - `POST /api/v1/anonymous/session/:id/skip`: Skip current partner and optionally requeue.
     - `POST /api/v1/anonymous/session/:id/leave`: End conversation.
     - `POST & DELETE /api/v1/anonymous/session/:id/reveal`: Request, accept, or cancel mutual identity reveal.
     - `POST /api/v1/anonymous/session/:id/block`: Anonymously block partner and terminate session.
     - `POST /api/v1/anonymous/session/:id/report`: Anonymously report partner with durable PostgreSQL audit.
   - Socket.IO Realtime Events on `/chat` namespace:
     - `anonymous:match_found`: Realtime broadcast when two users match.
     - `anonymous:message:send` & `anonymous:message:new`: Instant messaging with anonymous sender persona.
     - `anonymous:typing:start`, `anonymous:typing:stop`, `anonymous:typing:update`: Anonymous typing indicator.
     - `anonymous:reveal:request`, `anonymous:reveal_requested`, `anonymous:reveal_cancelled`, `anonymous:identity_revealed`: Mutual consent reveal handshake.
     - `anonymous:partner_status` & `anonymous:partner_left`: Ephemeral partner presence and termination.
3. **Frontend Integration**:
   - `anonymousService.ts`: Fully typed client methods mapped directly to generated OpenAPI contracts.
   - `useAnonymousChat.ts`: Custom hook managing queue lifecycle, realtime socket listeners, session state restoration, typing, voice notes, and safety actions.
   - `AnonymousLanding.tsx`: Topic chips (AI & Tech, Gaming, Music, Movies, Chill, Web3, etc.), custom interest adder, and Find Match CTA.
   - `AnonymousSearching.tsx`: Concentric radar pulse animation, search stopwatch timer, and cancel action.
   - `AnonymousChatRoom.tsx`: Header with anonymous persona avatar, online indicator, Skip, Reveal, and Safety actions; message bubbles; voice note recorder with waveform and R2 upload; audio playback; and Framer Motion revealed profile hero card with View Profile / Follow / Message CTAs.
   - `RevealIdentitySheet.tsx`: Mutual consent confirmation modal explaining rules.
   - `AnonymousSafetySheet.tsx`: Anonymous Block & Report sheet.
   - `/anonymous` route: Connected to real `AnonymousFeatureView`.
4. **Quality Gates**:
   - Backend unit tests (`npm test`): **135/135 passed** (20 suites).
   - Backend E2E tests (`npm run test:e2e`): **127/127 passed** (14 suites).
   - Backend lint & build (`npm run build`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (38/38 static & dynamic routes compiled)**.

---

### ✅ Phase 14 — Moderation, Safety & User Controls: **COMPLETED**
1. **Database Schema & Prisma Models**:
   - `ReportTargetType` enum (`USER`, `POST`, `COMMENT`, `STORY`, `REEL`, `MESSAGE`, `ANONYMOUS_SESSION`).
   - `ReportReason` enum (`SPAM`, `HARASSMENT`, `HATE_OR_ABUSE`, `SEXUAL_CONTENT`, `VIOLENCE`, `SCAM_OR_FRAUD`, `IMPERSONATION`, `PRIVACY`, `SELF_HARM`, `OTHER`).
   - `ReportStatus` enum (`OPEN`, `UNDER_REVIEW`, `ACTIONED`, `DISMISSED`).
   - `ModerationActionType` enum (`DISMISS_REPORT`, `REMOVE_CONTENT`, `WARN_USER`, `SUSPEND_USER`, `DISABLE_USER`, `RESTRICT_USER`).
   - `PostStatus`, `CommentStatus`, and `StoryStatus` extended with `REMOVED_BY_MODERATION`.
   - `Report` model with immutable target snapshot JSON, server-side reported user derivation, deduplication, priority scoring, and indexes.
   - `ModerationAction` model for immutable moderator audit trail.
   - `Mute` model (`muterId`, `mutedId`) with unique composite key.
   - `User` model extended with `suspendedUntil` and `suspensionReason`.
   - Applied migration `20260815233558_add_safety_reports_moderation_mutes`.
2. **Abuse & Rate Limiting Infrastructure**:
   - `RateLimitService`: Redis sliding window counter (`zremrangebyscore`, `zadd`, `zcard`, `expire`), duplicate burst spam detector, and 429 HttpException with `Retry-After` headers.
   - `@RateLimit()` decorator & `RateLimitGuard`: Declarative endpoint rate limiting.
   - `@Roles()` decorator & `RolesGuard`: Role-based access control (`ADMIN`, `MODERATOR`).
   - Dynamic account state enforcement in `JwtStrategy` (automatic rejection on `DISABLED` or unexpired `SUSPENDED`).
3. **REST Endpoints & Domain Enforcement**:
   - `POST /api/v1/safety/reports`: Unified report submission with target resolution, evidence snapshot, and safe reporter receipts.
   - `GET /api/v1/safety/reports/mine`: Submitter's report list.
   - `POST & DELETE /api/v1/safety/block/:userId`: Atomic block/unblock cascade (removes follows, follow requests, close friends, and invalidates map cache).
   - `GET /api/v1/safety/blocked`: Paginated blocked accounts list.
   - `POST & DELETE /api/v1/safety/mute/:userId`: Mute/unmute user.
   - `GET /api/v1/safety/muted`: Paginated muted accounts list.
   - `GET /api/v1/admin/moderation/reports`: Paginated queue for moderators.
   - `GET /api/v1/admin/moderation/reports/:id`: Full evidence report detail.
   - `POST /api/v1/admin/moderation/reports/:id/action`: Transactional moderation execution (`REMOVE_CONTENT`, `SUSPEND_USER`, `DISABLE_USER`, `DISMISS_REPORT`, `WARN_USER`).
   - Hardened cross-module feeds: Exclude muted creators and `REMOVED_BY_MODERATION` from posts, stories, reels, comments, and search.
   - Hardened notifications: Bidirectional block suppression.
4. **Frontend Integration**:
   - `safetyService.ts`: Fully typed client methods mapped directly to generated OpenAPI contracts.
   - `UniversalReportModal.tsx`: Portal-mounted modal with category selector, 1000-char details textarea, live counter, and confirmation receipt.
   - `BlockConfirmationModal.tsx`: Explicit block/unblock explanation with impact warnings.
   - `SafetyActionMenu.tsx`: Context menu with Report, Mute, and Block actions.
   - `/settings/blocked`: Real blocked accounts management with unblock action and live search.
   - `/settings/muted`: Real muted accounts management with unmute action and live search.
   - `/settings/close-friends`: Real Close Friends list with removal action.
   - `/settings/privacy`: Direct shortcuts to Close Friends, Muted Users, and Blocked Users.
5. **Quality Gates**:
   - Backend unit tests (`npm test`): **150/150 passed** (24 suites).
   - Backend E2E tests (`npm run test:e2e`): **139/139 passed** (15 suites).
   - Backend lint & build (`npm run build`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (41/41 static & dynamic routes compiled)**.

---

### ✅ Phase 15 — PWA, Push, Offline Resilience & UX Hardening: **COMPLETED**
1. **PWA Manifest & App Icons**:
   - Production web manifest with `display: "standalone"`, `start_url: "/"`, `theme_color: "#090c15"`, `background_color: "#090c15"`, high-res icons (192, 512, maskable 512), Apple touch icon, and app shortcuts (`/feed`, `/chat`, `/reels`, `/map`).
   - Enhanced `viewport` with `viewportFit: "cover"`, `interactiveWidget: "resizes-content"`, and Apple web app black-translucent status bar.
2. **Canonical Service Worker (`public/sw.js`)**:
   - Cache versioning (`mixchat-static-v2`) with automated stale cache eviction on `activate`.
   - Pre-caches core App Shell & static brand assets.
   - Network-First for HTML navigation with offline fallback page (`/offline`).
   - Cache-First / Stale-While-Revalidate for static build chunks, styles, scripts, fonts, and images.
   - Video Range Request pass-through (never breaks video streaming/seeking in Reels).
   - Strict Network-Only for all `/api/*`, `/auth/*`, `/chat/*`, `/safety/*`, `/map/*`, and Socket.IO endpoints.
   - Background Web Push event handler with notification display and sanitization.
   - Notification click handler with internal URL sanitization and window focusing/navigation.
3. **Network Status & Reconnection Engine**:
   - `NetworkProvider` and `useNetworkStatus()` hook: Tracks `isOnline`, `isBackendReachable`, and `wasOffline`.
   - Top-mounted non-obtrusive `OfflineBanner` with Framer Motion slide transitions.
   - Auto-reconnects Socket.IO gateway upon network restoration and broadcasts `mixchat:reconnected` event for live view reconciliation.
4. **Account-Isolated Offline Storage (`offlineStorage.ts`)**:
   - Account-isolated draft persistence (`savePostDraft`, `getPostDraft`, `clearPostDraft`).
   - Bounded 24h recent feed snapshot for seamless offline browsing without blank screens.
   - Interrupted voice recording preservation in chat.
   - Mandatory `clearUserOfflineData(userId)` on `logout()` and `logoutAll()` preventing cross-account data leakage.
5. **Web Push & Notification Delivery Hardening**:
   - Multi-device Push subscriptions (up to 15 active devices per user with automatic pruning).
   - Dead endpoint pruning (404/410 HTTP status automatic removal).
   - User notification preferences filter (per category: messages, likes, comments, mentions, social) and message preview redaction.
   - Bidirectional block and account suspension suppression.
   - `logoutAll` automatically revokes all device push subscriptions.
   - Contextual push permission activation in Settings -> Notifications with live test push capability.
   - `PwaInstallPrompt` component supporting Android, Chromium `beforeinstallprompt`, and iOS Safari instructions.
6. **Error Boundaries & Resilience**:
   - `not-found.tsx`, `error.tsx`, `global-error.tsx` App Router error boundaries.
   - Verified safe-area insets (`env(safe-area-inset-bottom)`, `env(safe-area-inset-top)`).
7. **Quality Gates**:
   - Backend unit tests (`npm test`): **150/150 passed** (24 suites).
   - Backend E2E tests (`npm run test:e2e`): **139/139 passed** (15 suites).
   - Backend lint & build (`npm run build`): **0 errors**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors**.
   - Frontend production build (`npm run build`): **0 errors (41/41 static & dynamic routes compiled)**.

---

### ⚠️ Phase 16 — Performance, Security & Production Hardening: **IMPLEMENTED; RELEASE VERIFICATION PENDING**
1. **Measured Database Optimization**:
   - Deterministic non-production benchmark seed (10k users, 100k posts, 300k likes, 50k comments/messages, and representative social/realtime data), repeatable query instrumentation, EXPLAIN scripts, load scripts, and executable query-count budgets.
   - Removed the user-search relationship N+1: limit 20/50 went from **82/202 queries to 6/6**; other audited domains remain page-size constant.
   - Restored dropped trigram indexes and added social/trending cursor indexes in migration `20260816090000_restore_search_and_pagination_indexes`; warm 100k-row post search improved from **85.958 ms to 5.238 ms**.
   - Corrected trending-feed cursor ordering to include engagement score plus creation time and ID.
2. **Backend and Realtime Hardening**:
   - Explicit 256 KiB body limits, compression, trusted-proxy/pool/timeout configuration, production JWT/Swagger validation, sanitized request IDs/errors, strict CORS plus browser-origin CSRF enforcement, and scoped auth rate limits.
   - Socket.IO origin/payload/DTO/rate limits, authorized presence lookup, targeted presence fanout, typing membership checks, and correct Redis adapter shutdown.
   - Anonymous matchmaking queues now prune stale entries and expire; Redis ephemeral state is bounded.
3. **Frontend and PWA Hardening**:
   - Authenticated-only providers no longer load on public routes; LCP-path motion/image work was reduced and static imagery uses Next Image where appropriate.
   - Feed/chat/reels DOM growth is capped; videos preload only near the active reel; preview object URLs and media resources are cleaned up.
   - Service Worker v3 never caches authenticated navigation/HTML or arbitrary user media and keeps only a bounded same-origin static cache.
   - Production CSP, HSTS, permissions/referrer/frame/MIME headers, explicit media/connect allowlists, and reproducible Lighthouse budgets are configured.
4. **Measured Results and Quality Gates**:
   - Final mobile Lighthouse: login **89/100/96/100**, register **89/100/96/100**, splash **92/100/96/100** (Performance/Accessibility/Best Practices/SEO); TBT measured 17/15/1 ms.
   - Local concurrency-10 API load tests completed with zero errors; recorded throughput and percentiles are in `PHASE_16_PERFORMANCE_SECURITY_REPORT.md` and are not production capacity claims.
   - Backend unit tests **155/155**, backend E2E **139/139**, backend/frontend build, lint, frontend type check, Prisma validation/status, and both production dependency audits pass.
5. **Release Verification Still Required**:
   - Rotate live-looking R2/VAPID secrets found only in the ignored local backend `.env`.
   - Run authenticated interactive CSP smoke tests, multi-replica WebSocket churn/load, a PostgreSQL restore drill, production observability hookup, and the scheduler single-leader/lease decision in the Phase 17 staging environment.
   - Full evidence and exact before/after measurements: `PHASE_16_PERFORMANCE_SECURITY_REPORT.md`.

---

### ✅ Voice & Video Calling System — LiveKit Cloud + NestJS + Next.js + Socket.IO + Web Push: **COMPLETED**
1. **Prisma Models & PostgreSQL Schema**:
   - `CallSession` model (`id`, `conversationId`, `initiatorId`, `type` [`VOICE`, `VIDEO`], `status` [`RINGING`, `ACTIVE`, `ENDED`], `endReason` [`COMPLETED`, `DECLINED`, `MISSED`, `CANCELLED`, `FAILED`, `BUSY`], `livekitRoomName`, `startedAt`, `answeredAt`, `endedAt`, `endedByUserId`, `durationSeconds`).
   - `CallParticipant` model (`callId`, `userId`, `status` [`RINGING`, `ACCEPTED`, `DECLINED`, `MISSED`, `LEFT`], `joinedAt`, `leftAt`).
   - `NotificationType` enum extended with `MISSED_CALL`.
   - Migration `20260816235957_add_voice_and_video_calling` created and applied.
2. **NestJS LiveKit Integration & Signaling Engine**:
   - `LiveKitService`: Cryptographically signs room-scoped JWT access tokens via `livekit-server-sdk` with strict `VideoGrant` (`canPublish`, `canSubscribe`, `canPublishData`).
   - `CallsService`: Atomic state machine, single-active-call concurrency locks, callee busy detection, 30s server-side ring timeout scheduler, cron reconciliation for stale calls, missed call notifications, and high-urgency Web Push alerts via `sendIncomingCallPush`.
   - Socket.IO signaling events: `call:incoming`, `call:ringing`, `call:accepted`, `call:declined`, `call:cancelled`, `call:busy`, `call:ended`, `call:timeout`.
   - `CallsController`: REST API endpoints under `/api/v1/calls` (`POST /`, `GET /current`, `GET /:id`, `POST /:id/token`, `POST /:id/accept`, `POST /:id/decline`, `POST /:id/cancel`, `POST /:id/end`, `GET /history`).
3. **Frontend LiveKit Cloud UI/UX Integration**:
   - Web Audio API Sound Synthesizer (`callSounds.ts`): Electronic ringtones, telecom 440Hz+480Hz ringback tone, connect & end chimes without external audio asset dependencies.
   - `CallProvider.tsx` & `CallContext.tsx`: Global calling state provider mounted in `AppProviders.tsx`, Socket.IO signaling listeners, duration counters, and active call session restoration.
   - `IncomingCallOverlay.tsx`: Full-screen modal with animated caller halo, incoming call audio ringtone, and Accept/Decline action buttons.
   - `OutgoingCallOverlay.tsx`: Ringing state with radar pulse animation, minimize option, and Cancel action.
   - `VoiceCallScreen.tsx`: Audio visualizer sound waves, participant badges, mute/speaker toggles, and `<RoomAudioRenderer />` LiveKit audio playback.
   - `VideoCallScreen.tsx`: Dominant remote video track, picture-in-picture local camera feed, screen sharing toggle, camera/mic mute, and End Call action.
   - `MinimizedCallBar.tsx`: Floating compact pill bar allowing full app navigation during an ongoing call with quick restore and hangup actions.
   - `ChatRoomHeader.tsx`: Integrated Phone and Video calling action buttons.
4. **Quality Gates**:
   - Backend unit tests (`npm test`): **165/165 passed across 26 test suites**.
   - Backend E2E tests (`npm run test:e2e`): **150/150 passed across 16 test suites** (including 11/11 calling e2e tests).
   - Backend lint & build (`npm run lint && npm run build`): **0 errors, 0 warnings**.
   - Frontend type check (`npx tsc --noEmit`): **0 errors**.
   - Frontend lint (`npm run lint`): **0 errors, 0 warnings**.
   - Frontend production build (`npm run build`): **0 errors (34/34 static & dynamic routes compiled)**.

---

### Frontend Quality Architecture — Durable Decisions

- User-facing controls must only advertise backend-backed behavior. Unimplemented calls, payment checkout, analytics, reports, password recovery, and status controls must remain absent or explicitly unavailable until their contracts exist.
- `/notifications` is the canonical activity destination; `/activity` exists only as a backwards-compatible redirect.
- Full-screen modals, sheets, and toasts portal to `document.body`; dialogs use focus trapping/restoration, Escape handling, and body-scroll locking.
- Shared interactive primitives use visible focus, semantic controls, accessible labels, reduced-motion support, and a 44px minimum touch target.
- Missing avatars use the local `/mixchat-icon.png`; do not send usernames or display names to third-party avatar/QR placeholder services.
- Profile avatar and cover changes use the canonical R2 media pipeline. Do not persist externally hosted demo presets or expose cosmetic options that are not actually saved.
- Access tokens remain in memory and authenticated navigation continues through the centralized auth/API providers; do not introduce browser storage token copies or a second Socket.IO client.

---

## 📋 3. Master Execution Roadmap (How to Proceed)

All architectural details and execution steps are documented in [FULLSTACK_ARCHITECTURE_AND_ROADMAP.md](./FULLSTACK_ARCHITECTURE_AND_ROADMAP.md). When executing tasks, follow the phases sequentially:

- **Phase 0** — ✅ **COMPLETED** (Foundation, Modernization & Full-Stack Contracts).
- **Phase 1** — ✅ **COMPLETED** (Authentication, Sessions & Account Security).
- **Phase 2** — ✅ **COMPLETED** (Users, Profiles, Social Graph & Privacy).
- **Phase 3** — ✅ **COMPLETED** (Media Platform — Cloudflare R2 + Presigned Direct Uploads + MediaObject).
- **Phase 4** — ✅ **COMPLETED** (Posts, Feed & Core Interactions).
- **Phase 5** — ✅ **COMPLETED** (Comments, Replies & Post Social Depth).
- **Phase 6** — ✅ **COMPLETED** (Stories & Story Archive).
- **Phase 7** — ✅ **COMPLETED** (Reels & Vertical Video Feed).
- **Phase 8** — ✅ **COMPLETED** (Messaging Persistence & Conversations).
- **Phase 9** — ✅ **COMPLETED** (Realtime Messaging, Presence & Typing).
- **Phase 10** — ✅ **COMPLETED** (Notifications Engine & REAL Web Push — In-App Realtime + Background Push When Website Is Closed).
- **Phase 11** — ✅ **COMPLETED** (Search, Discovery & Recommendations — Universal Search, Algorithmic Explore, Realtime Trending).
- **Phase 12** — ✅ **COMPLETED** (Snap Map & Location Privacy — MapLibre GL JS, OpenFreeMap, Ephemeral Redis TTL, Ghost Mode, Social Avatar Pins).
- **Phase 13** — ✅ **COMPLETED** (Anonymous Matching & Full Anonymous Chat — Redis FIFO Queues, Interest Scoring, Temporary Personas, Mutual Reveal Handshake, Safety & Block).
- **Phase 14** — ✅ **COMPLETED** (Moderation, Safety & User Controls — Reports, Block cascade, Mute feed suppression, Rate limiting, Close friends, Moderation audit queue).
-**Phase 15** — ✅ **COMPLETED** (PWA, Push, Offline Resilience & UX Hardening — Manifest, SW v2, NetworkProvider, Offline Banner, Account-isolated drafts & feed snapshot, Web Push multi-device, Error Boundaries).
- **Phase 16** — ✅ **COMPLETED** (Voice & Video Calling System — LiveKit Cloud, Room-Scoped Tokens, Concurrency Locks, Web Audio Synthesizer, Floating Minimized Bar, PiP Video & Screen Sharing).
- **Phase 17** — ⏸️ **NOT STARTED** — Full E2E (Playwright), Deployment & Release.

---

## 🛠️ 4. Development Commands & Ports

| Service | Directory | Command | Port / URL |
| :--- | :--- | :--- | :--- |
| **Frontend** | `mixchat-frontend` | `npm run dev` | `http://localhost:3000` |
| **Backend** | `mixchat-backend` | `npm run dev` | `http://localhost:4000/api` |
| **Backend Swagger**| `mixchat-backend` | — | `http://localhost:4000/api/docs` |
| **Database** | Docker | `docker compose up -d` | `localhost:5433` (`mixchat_db`) |
| **Redis** | Docker | `docker compose up -d` | `localhost:6380` |
| **Contract Gen** | `mixchat-frontend` | `npm run openapi:generate`| Generates `api.generated.ts` |
| **Backend Build** | `mixchat-backend` | `npm run build` | — |
| **Backend Tests** | `mixchat-backend` | `npm test -- --runInBand` | — |
| **Backend E2E** | `mixchat-backend` | `npm run test:e2e` | — |
| **Frontend Lint** | `mixchat-frontend` | `npm run lint` | — |
| **Frontend TypeCheck** | `mixchat-frontend` | `npx tsc --noEmit` | — |
| **Frontend Build** | `mixchat-frontend` | `npm run build` | — |

---

## 🚨 5. Critical Engineering Rules for AI Agents

1. **Do NOT break UI/UX**: The frontend has been meticulously crafted with modern aesthetics (glassmorphism, Framer Motion animations, mobile ergonomics). Do not degrade components to plain HTML/Tailwind defaults.
2. **Always Portal Modals/Drawers**: Any full-screen modal or bottom sheet must be mounted using `createPortal(..., document.body)` with `z-[9999]` so it never bleeds or gets trapped under lower z-index containers.
3. **Keep TypeScript & Lint Clean**: Always run `npx tsc --noEmit && npm run lint` in `mixchat-frontend` and `npm run build && npm test -- --runInBand` in `mixchat-backend` after making changes. Maintain **0 errors**.
4. **Follow the Master Roadmap**: Refer to [FULLSTACK_ARCHITECTURE_AND_ROADMAP.md](./FULLSTACK_ARCHITECTURE_AND_ROADMAP.md) before implementing any feature to preserve domain contracts and DTO structures.
5. **Contract Source of Truth**: NestJS DTOs and `@nestjs/swagger` decorators are the authoritative source of truth for all HTTP transport contracts.
6. **No Manual Transport DTO Duplication**: Frontend must not create duplicate handwritten DTO types. All API requests/responses in `src/services/` MUST consume types from `src/services/api/types/api.generated.ts`.
7. **Deterministic Contract Sync**: After modifying or adding backend DTOs, always run `npm run openapi:export` in `mixchat-backend` and `npm run api:generate` (and `npm run api:check`) in `mixchat-frontend`.
8. **Generated Files are Strictly Read-Only**: Never manually edit `api.generated.ts`. Fix the backend DTO / Swagger annotation and re-export.
9. **Prisma Boundary Isolation**: Prisma models and internal types must NEVER cross into the frontend. Controllers must always return explicit DTOs.
10. **ISO Strings for Transport Dates**: Dates at the API boundary are typed as ISO strings (`createdAt: string`). Parse to `Date` only inside UI view adapters if required.
11. **Strict Types & No `any`**: Never bypass type errors with `as any`, `as unknown as`, or `@ts-ignore` for API responses.
12. **UI Models vs Transport DTOs**: Component view models (e.g. `ProfileHeroData`, `Story`) live in feature directories and map explicitly from transport DTOs where needed.
