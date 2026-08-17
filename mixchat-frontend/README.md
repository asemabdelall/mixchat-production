# Mix Chat — Next-Gen Youthful Social Media Platform

Mix Chat is a high-performance, dark-themed social web application built with **Next.js 16 (App Router & Turbopack)**, **React 19**, **Tailwind CSS v4**, and **Framer Motion**.

---

## 🚀 Overview

Mix Chat combines real-time messaging, interactive social feeds, 24-hour stories, anonymous matching radar, live friend radar maps, end-to-end encrypted voice/video calling simulation, and VIP creator monetization.

### Key Features

- 🌟 **Splash & Onboarding Flow**: Dynamic social orbits, 3D glassmorphic badges, and seamless account setup.
- 📱 **Interactive Social Feed**: Full media posts, double-tap heart animations, comments, shares, location tags, and media lightbox previews.
- 📸 **Mix Stories**: Story viewer with auto-progress, story reactions, audience view counts, and multi-mode story creation.
- 💬 **Real-time & Anonymous Chat**: Direct messaging, group chats, anonymous matching radar, secret Q&A links, and identity reveal requests.
- 📞 **Voice & Video Calls**: End-to-end encrypted audio/video call overlay with screen share and mute controls.
- 🗺️ **Live Radar Map**: Interactive friend locator map with Ghost Mode privacy toggles.
- 💎 **Mix Premium**: VIP neon profile badges, creator analytics, custom themes, and subscription plans.
- 🔐 **Privacy & Security**: Granular visibility settings, block/report tools, QR code identity sharing, and storage management.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI & Logic**: React 19, TypeScript
- **Styling**: Tailwind CSS v4, Vanilla CSS Design System, Framer Motion
- **Icons**: Lucide React
- **Forms & Validation**: React Hook Form, Zod

---

## 📁 Project Structure

```
src/
├── app/                  # Next.js App Router pages & layouts
│   ├── (auth)/           # Authentication & splash screens (splash, login, register, etc.)
│   ├── (main)/           # Core application routes (feed, chat, stories, map, profile, etc.)
│   ├── layout.tsx        # Root layout & providers wrapper
│   └── globals.css       # Global design tokens & utility styles
│
├── features/             # Feature-specific components & logic
│   ├── call/             # Voice & video calling overlay
│   ├── chat/             # Direct & anonymous chat components
│   ├── feed/             # Feed post cards & post creator
│   ├── premium/          # VIP subscription modals & badges
│   ├── stories/          # Story viewer & story creator
│   ├── map/              # Interactive radar map
│   └── profile/          # User profile headers & media grids
│
├── shared/               # Globally shared UI, layouts & state providers
│   ├── components/ui/    # Reusable UI primitives (Avatar, Button, Card, Input, Modal, Tabs)
│   ├── layouts/          # Header, DesktopSidebar, MobileNavbar
│   ├── providers/        # AuthProvider, ChatProvider, CallProvider
│   └── services/         # Mock data & service helpers
│
├── lib/                  # Utility functions & class merging helpers
└── types/                # TypeScript type declarations
```

---

## 💻 Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start Next.js development server
npm run dev

# Open http://localhost:3000 in your browser
```

---

## 🧪 Quality Assurance & Build Checks

```bash
# Run TypeScript compilation audit
npx tsc --noEmit

# Run ESLint check
npx eslint .

# Build production bundle
npm run build
```

---

## 📄 License

Private & Proprietary — Mix Chat Team.
