# ⚡ MixChat — Next-Gen Real-Time Social & Calling Ecosystem

<div align="center">

![MixChat Banner](https://img.shields.io/badge/MixChat-Full--Stack%20Ecosystem-4f46e5?style=for-the-badge&logo=rocket)

[![Next.js](https://img.shields.io/badge/Next.js-16.3.0%20App%20Router-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0.1%20Enterprise-ea2845?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![LiveKit](https://img.shields.io/badge/LiveKit%20Cloud-WebRTC%20Calling-00D084?style=flat-square&logo=livekit)](https://livekit.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17%20via%20Prisma%207-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7%20Cache%20%26%20Queues-dc382d?style=flat-square&logo=redis)](https://redis.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4%20Modern%20UI-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Unit%20Tests-165%2F165%20Passed-22c55e?style=flat-square)](https://jestjs.io/)
[![E2E Tests](https://img.shields.io/badge/E2E%20Tests-150%2F150%20Passed-22c55e?style=flat-square)](https://jestjs.io/)

**MixChat** is a production-grade, state-of-the-art social ecosystem combining real-time messaging, LiveKit Cloud voice & video calling, vertical video reels, 24h expiring stories, anonymous interest-based matchmaking, interactive snap maps, algorithmic feeds, and full PWA offline resilience.

</div>

---

## 🌟 Key Features

### 📞 1. Voice & Video Calling System (LiveKit Cloud)
- **Real-Time WebRTC Media Transport**: Powered by LiveKit Cloud for zero-latency, HD audio & video feeds across all devices and browsers.
- **Room-Scoped Token Security**: NestJS cryptographically signs short-lived JWT access tokens with strict `VideoGrant` parameters.
- **Picture-in-Picture & Screen Sharing**: Seamless floating local camera preview, screen sharing toggles, and audio visualizer wave graphics.
- **Web Audio API Synthesizer**: Zero external asset dependencies for realistic electronic ringtones, 440Hz+480Hz telecom ringback, and status chimes.
- **Floating Minimized Call Bar**: Persistent compact pill allowing uninterrupted app navigation and chatting during an active call.
- **High-Urgency Web Push Alerts**: Wakes offline and background devices upon incoming calls.

### 💬 2. Real-Time Messaging & Direct Conversations
- **Durable Persistence**: Monotonic read receipts, client-side message deduplication, and atomic conversation locking.
- **Rich Media & Audio Notes**: Inline audio waveforms, image/video carousels, and presigned Cloudflare R2 direct uploads.
- **Group Chats & Role Management**: Multi-participant discussions with admin controls and presence indicators.

### 🎭 3. Anonymous Matchmaking & Instant Personas
- **Redis FIFO Matchmaking Queues**: High-concurrency matching with interest overlap ranking.
- **Temporary Personas**: Unique randomized pseudonyms and avatars protecting user privacy.
- **Mutual Reveal Handshake**: Both parties must approve identity revelation before transitioning into a permanent direct conversation.

### 🗺️ 4. Snap Map & Real-Time Location Sharing
- **MapLibre GL JS & OpenFreeMap**: Interactive, responsive vector map with custom social avatar pins.
- **Ephemeral Location TTL**: Live coordinates stored exclusively in Redis with automatic expiration.
- **Ghost Mode**: 1-tap granular location privacy controls.

### 🎬 5. Reels & Vertical Video Experience
- **Smart Recommendation Engine**: Algorithmic For You feed with decay freshness, engagement velocity, and creator diversity.
- **Watch Session Telemetry**: Qualified view tracking, completion ratios, and periodic watch progress checkpoints.

### 📸 6. Stories & 24h Story Archive
- **Instagram-Grade Story Viewer**: Full-screen 9:16 viewer with synchronized progress bars, hold-to-pause, and tap reactions.
- **Automated Lifecycle Worker**: Cron reconciliation worker archiving stories automatically at `expiresAt = createdAt + 24h`.

### 🔍 7. Universal Search & Real-Time Trending Engine
- **Multi-Domain Ranked Discovery**: Intelligent search across Users, Posts, Hashtags, and Media.
- **Dynamic Trending**: Velocity scores calculated from 24h/7d post engagement with Redis caching.

### 🛡️ 8. Safety, Moderation & Privacy
- **Bi-Directional Block System**: Atomic relationship cleanup across feeds, search, chats, and calls.
- **Granular Controls**: Close friends lists, custom DM permissions, and audit moderation queues.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend (Next.js 16 App Router)"]
        UI[Tailwind CSS v4 & Lucide UI]
        State[CallContext & ChatProvider]
        PWA[Service Worker v3 & Web Push]
        LiveKitClient[LiveKit React Components]
    end

    subgraph Gateway ["Reverse Proxy & Ingress"]
        CORS[Strict CORS & Origin Validation]
        RateLimit[Redis Rate Limiting]
    end

    subgraph Backend ["Backend API (NestJS 11)"]
        Auth[Argon2id + JWT + Rotating Refresh]
        CallsModule[Calls Orchestration & Signaling]
        ChatModule[Socket.IO Real-Time Gateway]
        LiveKitSDK[LiveKit Server SDK]
        CronWorker[Cron Workers & Schedulers]
    end

    subgraph MediaAndStorage ["Cloud & Media Infrastructure"]
        LiveKitCloud[LiveKit Cloud WebRTC Media]
        R2[Cloudflare R2 Object Storage]
        Postgres[(PostgreSQL 17 DB)]
        Redis[(Redis 7 Cache & Queues)]
    end

    UI --> Gateway
    Gateway --> Backend
    CallsModule --> LiveKitSDK
    LiveKitSDK --> LiveKitCloud
    LiveKitClient <--> LiveKitCloud
    ChatModule <--> State
    Backend --> Postgres
    Backend --> Redis
    Backend --> R2
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, Lucide Icons, MapLibre GL JS |
| **Media Transport** | LiveKit Cloud, `@livekit/components-react`, `livekit-client`, `livekit-server-sdk` |
| **Backend** | NestJS 11, TypeScript, Socket.IO, `@prisma/adapter-pg`, Joi, Passport JWT, Argon2id |
| **Database** | PostgreSQL 17 via Prisma 7 ORM |
| **Cache & Realtime** | Redis 7 (`ioredis`), Ephemeral Queues, Redis Socket.IO Adapter |
| **Object Storage** | Cloudflare R2 (S3-compatible API with presigned direct uploads) |
| **Push Notifications** | Web Push (VAPID, Service Worker background push) |
| **Containerization** | Docker, Docker Compose |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) `>= 20.x`
- [Docker](https://www.docker.com/) & Docker Compose
- [npm](https://www.npmjs.com/) `>= 10.x`

### 2. Clone Repository
```bash
git clone https://github.com/mohamedmohamedeg2009-lgtm/mix-chat.git
cd mix-chat
```

### 3. Start Infrastructure (PostgreSQL & Redis)
```bash
docker compose up -d
```
> Runs PostgreSQL on port `5433` and Redis on port `6380`.

### 4. Configure Environment Variables

#### Backend (`mixchat-backend/.env`):
```env
NODE_ENV=development
PORT=4000
API_PREFIX=api
FRONTEND_URL=http://localhost:3000
SWAGGER_ENABLED=true

# Database & Cache
DATABASE_URL=postgresql://mixchat:mixchat_dev_secret@localhost:5433/mixchat_db?schema=public
REDIS_URL=redis://localhost:6380

# JWT Secrets
JWT_SECRET=mixchat_jwt_super_secret_development_key_32bytes_long
JWT_ACCESS_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION_DAYS=7

# LiveKit Cloud (Voice & Video Calling)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Cloudflare R2 Object Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET=mixchat-media

# Web Push VAPID
WEB_PUSH_VAPID_PUBLIC_KEY=your-public-key
WEB_PUSH_VAPID_PRIVATE_KEY=your-private-key
WEB_PUSH_VAPID_SUBJECT=mailto:admin@mixchat.app
```

#### Frontend (`mixchat-frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### 5. Run Database Migrations
```bash
cd mixchat-backend
npx prisma migrate dev
```

### 6. Start Development Servers

In terminal 1 (Backend):
```bash
cd mixchat-backend
npm run start:dev
```
> API available at `http://localhost:4000/api/v1`  
> Swagger Documentation at `http://localhost:4000/api/docs`

In terminal 2 (Frontend):
```bash
cd mixchat-frontend
npm run dev
```
> Application available at `http://localhost:3000`

---

## 🧪 Quality Gates & Testing

MixChat adheres to strict quality gates with comprehensive automated testing:

```bash
# Run all Backend Unit Tests (165/165 passing)
cd mixchat-backend && npm test

# Run all Backend End-to-End Tests (150/150 passing)
cd mixchat-backend && npm run test:e2e

# Run Frontend Type Check & Linting
cd mixchat-frontend && npx tsc --noEmit && npm run lint

# Build Production Frontend Bundle (34/34 routes)
cd mixchat-frontend && npm run build
```

---

## 📂 Project Structure

```
mix-chat/
├── mixchat-backend/               # NestJS 11 API Server
│   ├── prisma/                    # PostgreSQL Schema & Migrations
│   ├── src/
│   │   ├── config/                # Environment validation & schema
│   │   ├── common/                # Filters, interceptors, middleware & guards
│   │   ├── infrastructure/        # Prisma, Redis & R2 Storage services
│   │   └── modules/               # Domain feature modules:
│   │       ├── auth/              # Authentication & token rotation
│   │       ├── calls/             # LiveKit calling orchestration & tokens
│   │       ├── chat/              # Real-time WebSocket messaging gateway
│   │       ├── feed/ & posts/     # Posts & algorithmic feed
│   │       ├── reels/             # Vertical video ranking & sessions
│   │       ├── stories/           # 24h Stories & viewer tracking
│   │       ├── map/               # Geo-location & snap map
│   │       ├── anonymous/         # Matchmaking & temporary personas
│   │       ├── notifications/     # Notifications & Web Push engine
│   │       └── search/            # Universal multi-entity search
│   └── test/                      # E2E test suites (150 tests)
│
├── mixchat-frontend/              # Next.js 16 (App Router) PWA
│   ├── public/                    # Service Worker v3, icons, assets
│   └── src/
│       ├── app/                   # App Router pages (/feed, /reels, /chat, /map, etc.)
│       ├── features/              # Feature modules (calls, chat, feed, reels, etc.)
│       ├── services/              # API clients, WebSockets & generated types
│       └── shared/                # Layouts, UI primitives & providers
│
├── docker-compose.yml             # Local PostgreSQL & Redis services
├── docker-compose.fullstack.yml   # Full stack production orchestration
├── FULLSTACK_ARCHITECTURE_AND_ROADMAP.md # Detailed 18-phase roadmap
└── README.md                      # Project documentation
```

---

## 📄 License

This project is licensed under the MIT License.
