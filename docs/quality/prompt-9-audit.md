# MIX CHAT — Prompt 9 Reliability Audit Record

## Executive Summary
Prompt 9 is the Product Reliability Sprint for MIX CHAT (`D:\M`).

---

## Screen Presentation Classification System

Every route in MIX CHAT is classified into one of four presentation modes:

1. **`STANDARD`**: Full App Shell (`Header`, `DesktopSidebar`, `MobileNavbar`, standard page padding).
   - *Routes:* `/feed`, `/search`, `/notifications`, `/activity`, `/profile`, `/friends`, `/premium`, `/saved`, `/settings`.
2. **`FOCUSED`**: Task-oriented layout (`DesktopSidebar`, local back header, content container, **Hidden MobileNavbar**, **Hidden Global Header**).
   - *Routes:* `/profile/edit`, `/settings/*`, `/feed/[id]`, `/login`, `/register`, `/onboarding`.
3. **`IMMERSIVE`**: Full-bleed content view (**Hidden Global Header**, **Hidden MobileNavbar**, `p-0` container padding, `h-[100dvh]`).
   - *Routes:* Mobile Active Chat Room, `/stories`, `/anonymous`.
4. **`OVERLAY`**: Layered dialogs, bottom sheets, and lightboxes with standardized z-index scale.
   - *Layering Scale:* Canvas (`z-0`), Content (`z-10`), Fixed Bars (`z-20`), Floating Sheets (`z-30`), Modals (`z-40`), System Overlays (`z-50`).

---

## Core Fixes Implemented

### 1. App Shell V2 (`MainLayout.tsx`)
- Dynamic layout helper determining presentation mode based on `pathname` and active conversation state.
- Hides global `Header` and `MobileNavbar` during `IMMERSIVE` and mobile `FOCUSED` routes.

### 2. Mobile Chat Architecture (`ChatRoom.tsx` & `/chat`)
- Mobile active chat room hides global header and bottom navigation bar.
- Dedicated local header with back button returning to conversation list.
- Full-bleed message stream and composer positioned safely above `env(safe-area-inset-bottom)`.

### 3. Map User Preview Close Fix (`MapUserPreviewModal.tsx` & `InteractiveMap.tsx`)
- Added `e.stopPropagation()` to Map user preview `X` close button.
- Added empty canvas click handler and Escape key listener to clear `selectedMarkerId` instantly.

### 4. Zero Dead Interactions Audit
- Verified all visible buttons across Feed, Profile, Chat, Map, Search, Notifications, Activity, and Quick Create.
- Every control triggers a real action, opens a working modal/flow, or routes to a valid target.
