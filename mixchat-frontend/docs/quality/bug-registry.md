# MIX CHAT — Bug Registry

| Bug ID | Area | Route | Severity | Category | Description | Root Cause | Status | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MX-UI-001** | Navigation | `/chat` | P0 | Mobile Layout | Mobile active chat displays global Header + MobileNavbar + Chat Header + Composer, squeezing message list. | `MainLayout` applies universal shell (`Header` + `MobileNavbar` + `p-4`) unconditionally to all routes. | **FIXED** | Static / App Shell V2 |
| **MX-UI-002** | Map V2 | `/map` | P0 | Map Interaction | Map user preview card close (X) button unreliable or background click does not clear selection. | Missing event propagation control (`e.stopPropagation()`) and lack of empty canvas click dismissal. | **FIXED** | Static / Map V2 Layering |
| **MX-UI-003** | Profile | `/profile/edit` | P1 | Mobile Layout | Mobile navbar covers Save/Cancel form controls in Edit Profile. | `EditProfilePage` rendered under `STANDARD` layout instead of `FOCUSED` layout. | **FIXED** | Static / Shell V2 |
| **MX-UI-004** | Navigation | `/stories` | P1 | Viewport | Story Viewer displays global header and bottom navbar during 24h story playback. | Story Viewer rendered under `STANDARD` layout instead of `IMMERSIVE` layout. | **FIXED** | Static / Shell V2 |
| **MX-UI-005** | Quick Create | Global | P1 | Modal Flow | Quick Create `+` sub-modals trigger scroll locking or z-index collisions with global header. | Absence of standardized z-index scale (`z-10` to `z-50`) across modal overlays. | **FIXED** | Static / Overlay Scale |
| **MX-HYD-001** | Shell Layout | Global (`DesktopSidebar`) | P0 | Hydration / DOM Nesting | React Hydration Failure: `"In HTML, <a> cannot be a descendant of <a>."` | `DesktopSidebar.tsx` user card wrapped `<Link href="/profile">` around `<Link href="/settings">`. | **FIXED** | Static & HTML Structural Audit |

---

## Permanent Quality Rules

1. **No Nested Interactive Elements**: Under no circumstances may an `<a` / `<Link>` contain another `<a` / `<Link>` or `<button>`. Outer containers must be non-interactive `div` elements, with actions rendered as sibling elements.
2. **Hydration Determinism**: All initial state initialized from browser storage (`localStorage`) must utilize `useEffect` or SSR-matching default fallbacks to guarantee 100% markup parity during initial client hydration.
