# MixChat Phase 16 — Performance, Security & Production Hardening Report

Date: 2026-08-16  
Status: implementation and automated verification complete; release-environment checks listed under **Open release checks** remain for Phase 17.

## 1. Measurement environment

- Apple M3, 16 GB RAM, macOS, Node.js 22.22.2, npm 10.9.7.
- Local PostgreSQL 17 on port 5433 and Redis 7 on port 6380 in Docker; MinIO was healthy for the existing local media configuration.
- Frontend measurements used a Next.js production build served on port 3100 and Lighthouse 13.4.1 mobile defaults.
- API load figures are local development measurements on one machine. They establish a repeatable baseline; they are not a capacity promise for production infrastructure.
- The deterministic benchmark dataset contained 10,000 users, 200,000 follows, 10,000 media objects, 100,000 posts, 10,000 post-media rows, 300,000 likes, 50,000 comments, 100,000 notifications, 1,000 stories, 1,000 reels, 1,000 conversations, 2,000 participants, and 50,000 messages. It was removed after testing.

## 2. Lighthouse and frontend performance

### Before and after

| Route | Run | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/login` | Before | 76 | 92 | 96 | 100 | 1.60 s | 4.30 s | 330 ms | 0 | 3.60 s |
| `/login` | After | 89 | 100 | 96 | 100 | 1.06 s | 3.80 s | 17 ms | 0.0055 | 1.06 s |
| `/register` | Before | 75 | 92 | 96 | 100 | 1.20 s | 4.50 s | 270 ms | 0 | 4.90 s |
| `/register` | After | 89 | 100 | 96 | 100 | 1.06 s | 3.78 s | 15 ms | 0 | 1.06 s |
| `/splash` | Before | 67 | 92 | 96 | 100 | 1.20 s | 5.40 s | 460 ms | 0 | 3.70 s |
| `/splash` | After | 92 | 100 | 96 | 100 | 1.06 s | 3.44 s | 1 ms | 0 | 1.06 s |

The splash route reached the 90+ performance target. Login and registration improved materially but both remain at 89 on mobile emulation. Their remaining LCP is primarily the shared Next.js/React client bootstrap and visual authentication shell, not long main-thread blocking. A reproducible budget command is now available:

```bash
cd mixchat-frontend
npm run build
npm run start
npm run benchmark:lighthouse
```

Use `LIGHTHOUSE_BASE_URL` when the production server is not on port 3000. Reports are written to `.lighthouse/`. Budgets prevent performance below 85, accessibility/best-practices/SEO below 95, FCP above 2.5 s, LCP above 4.5 s, TBT above 300 ms, or CLS above 0.1.

### Bundle and render findings

- Public auth pages previously mounted location, chat, notifications, calls, and their socket/provider effects. Those providers now mount only in the authenticated route layout.
- Splash content now renders immediately during session restoration. Its prior animation/auth delay accounted for about 1,115 ms; the final observed render delay was about 73 ms.
- Auth hero motion wrappers were removed from the LCP path, priority was assigned to the LCP image, and static `<img>` uses were converted to `next/image` where appropriate.
- Lighthouse transferred JavaScript was approximately 287 KB for login, 280 KB for register, and 289 KB for splash. This is not a route-specific bundle regression claim: it is network transfer observed by Lighthouse after provider splitting.
- Feed rendering is capped at 100 mounted items, chat at 300 messages per conversation, and reels at 30 items. Off-screen feed/chat content uses `content-visibility`.
- Reels preload only the active and adjacent video, pause inactive media, and clean up playback. Upload previews revoke object URLs on replacement, removal, completion, and unmount. Voice-note playback already had event/resource cleanup and seek support.
- Dynamic authenticated avatars and attachment media remain native images where signed or runtime URLs make the Next image optimizer inappropriate; those exceptions are explicit.
- No React DevTools browser session was available, so component-level commit traces were not captured. The provider split, bounded DOMs, Lighthouse main-thread data, and effect/resource review are the evidence used here.

## 3. Database and query performance

### Query counts

Counts are service-level Prisma queries for the same seeded data and requested page size.

| Scenario | Before | After | Result |
| --- | ---: | ---: | --- |
| Feed, limit 20 | 11 | 11 | Constant |
| Feed, limit 50 | 11 | 11 | Constant |
| User search, limit 20 | 82 | 6 | N+1 removed |
| User search, limit 50 | 202 | 6 | N+1 removed |
| Comments, limit 50 | 5 | 5 | Constant |
| Active stories | 9 | 9 | Constant |
| Following reels | 9 | 9 | Constant |
| Notifications, limit 50 | 3 | 3 | Constant |
| Conversations, limit 30 | 10 | 10 | Constant |
| Messages, limit 30 | 8 | 8 | Constant |
| Universal search | 23 | 23 | Bounded multi-domain query |
| Snap Map friends | 4 | 4 | Constant |

The N+1 fix adds `SocialPolicyService.getRelationshipSnapshots()`, which resolves follows, follow requests, blocks, and close-friend state with four batch queries. User search and social connection lists now use that path, select only required fields, and retain stable ordering.

`npm run benchmark:queries` records counts, SQL time, slow queries, duplicate fingerprints, and wall time. It now fails on a per-scenario query-budget regression. Instrumentation is opt-in with `PRISMA_QUERY_METRICS=true` and is disabled in production.

### EXPLAIN ANALYZE results

| Query | Before | After/warm | Plan finding |
| --- | ---: | ---: | --- |
| Home feed | 0.382 ms | 0.084 ms | Composite pagination/index path |
| Following feed | 0.472 ms | — | Already bounded/indexed |
| Post detail | 0.078 ms | — | Primary-key lookup |
| Comments | 0.113 ms | — | Composite comment cursor index |
| Followers | 0.513 ms | 0.085 ms | Social composite cursor index |
| Post content search | 85.958 ms | 5.238 ms | Trigram bitmap scan replaced 100k-row sequential scan |
| Trending | — | 0.036 ms | Engagement/date composite index |
| Stories | 0.224 ms | — | Indexed active-story lookup |
| Reels, For You | 0.075 ms | — | Indexed bounded candidate set |
| Reels, Following | 0.230 ms | — | Indexed relationship/feed path |
| Notifications | 0.107 ms | — | Recipient/time cursor index |
| Conversations | 0.248 ms | — | Participant and conversation indexes |
| Messages | 0.252 ms | — | Backward message-history index scan |
| Snap Map | 0.079 ms | — | Small indexed social lookup plus Redis locations |

The first cold post-search run was 94.872 ms; the warmed run was 5.238 ms. A deliberately broad user query matching all 10,000 users remained a sequential scan at about 15 ms, which PostgreSQL correctly preferred over a low-selectivity index scan.

Migration `20260816090000_restore_search_and_pagination_indexes` restores GIN trigram indexes for username, display name, bio, post content, and location. It also adds social cursor and trending indexes. A later pre-Phase-16 migration had inadvertently dropped earlier trigram indexes; the new migration restores them with `CREATE INDEX CONCURRENTLY`. Prisma schema and migration history agree, and all 19 migrations are applied locally.

### Pagination, counters, and transactions

- Feed, comments, social lists, notifications, chat, and map retain stable opaque cursor pagination.
- Trending-post cursors now include `likesCount` and use the correct lexicographic predicate over likes, creation time, and ID. A regression test covers equal-score and page-boundary behavior.
- Existing transactional counters remain in place. No approximate cache counter was introduced. Mutations use transactions/idempotent compound keys and existing non-negative guards.
- Chat send retains its conversation row lock and short persistence-first transaction. Tests cover concurrent group sends, unread counts, idempotency, and monotonic reads.

## 4. API load baseline

Each route ran for five seconds at concurrency 10 against the local development Nest process.

| Endpoint | Requests | Throughput | p50 | p95 | p99 | Max | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Feed | 1,579 | 314.6 req/s | 27.01 ms | 56.77 ms | 93.72 ms | 271.40 ms | 0 |
| Universal search | 656 | 130.0 req/s | 70.66 ms | 120.63 ms | 266.33 ms | 352.35 ms | 0 |
| Notifications | 5,269 | 1,052.9 req/s | 8.86 ms | 15.00 ms | 19.85 ms | 46.32 ms | 0 |
| Conversations | 2,731 | 545.0 req/s | 16.92 ms | 31.47 ms | 40.46 ms | 55.64 ms | 0 |

`npm run benchmark:load` creates an isolated temporary account, runs these scenarios, and removes it. The figures are measurements, not estimates. They do not establish “thousands of simultaneous users”; that claim requires Phase 17 staging topology, external load generators, production-like latency, and horizontal replica testing.

## 5. Redis and realtime

- Redis used 1.64 MB during the audit. The local allocator fragmentation ratio was 5.86 at this very small dataset size; `maxmemory` was not configured locally and must be set by the managed production service.
- Presence socket sets and presence records are TTL-bound (maximum observed TTL: 24 hours). Typing keys use four seconds. Search history, locations, rate limits, and notification-related keys retain bounded TTL/data policies.
- Anonymous global and interest queues were the unbounded exception. Stale members are now pruned after 10 minutes and queue keys expire after 20 minutes, including on candidate reads.
- Presence lookup is restricted to users who share an active conversation and excludes blocked relationships. Presence updates fan out to relevant user rooms rather than globally.
- Socket.IO now enforces configured origin checks, a 1 MB payload maximum, no per-message deflate, DTO validation with unknown-field rejection, UUID validation, a 100-user presence lookup ceiling, and separate message/typing/presence rate limits.
- Typing-stop now checks membership. Conversation join/leave and message/read paths retain membership/IDOR enforcement.
- The Redis Socket.IO adapter had a shutdown override collision. Server close now delegates to the base adapter; Redis pub/sub disposal is separate and awaited.
- Existing realtime E2E coverage passed, including unauthorized room access, cross-instance delivery, disconnect cleanup, messaging races, and idempotency. A large synthetic multi-host WebSocket churn test was not run; that remains a staging capacity test.

## 6. Backend hardening

### HTTP, headers, CORS, cookies, and CSRF

- JSON and URL-encoded request bodies are capped at 256 KiB, URL-encoded parameters at 100, and oversized input returns sanitized HTTP 413 rather than a 500.
- Compression is enabled above 1 KiB. Express trust-proxy behavior is explicit rather than implicit.
- Production Helmet configuration, HSTS, frame denial, MIME sniff prevention, referrer policy, permissions policy, and frontend CSP are configured.
- CORS permits only the configured frontend origin (plus localhost:3000 in development), sends credentials only to an accepted origin, and uses an explicit method/header allowlist.
- Unsafe browser methods additionally require a matching `Origin`. Requests without `Origin` remain allowed for native/server clients. This is the CSRF defense appropriate to the HttpOnly refresh-cookie design.
- Refresh cookies remain HttpOnly, SameSite=Lax, path-scoped, and use the validated secure-cookie setting. Production configuration must set secure cookies.
- Request IDs are length/character bounded. Production errors are normalized and do not reveal stack traces or internal exception bodies.

### Authentication and abuse controls

- Registration: 5 attempts per credential/IP scope per 15 minutes.
- Login: 10 attempts per credential/IP scope per 15 minutes.
- Refresh/logout: 60 requests per identity/IP scope per 15 minutes.
- A coarse IP ceiling remains as a secondary defense, with Redis keys namespaced by environment and hashed credential identifiers.
- Password Argon2id, access-token JTI, rotating opaque refresh tokens, replay detection, session revocation, and timing-safe credential behavior remain unchanged.
- Production startup rejects the documented development JWT secret. Swagger defaults off in production. Persistent-auth debug behavior is disabled in production.

### Authorization, validation, and injection review

- Controllers accept bounded DTOs rather than Prisma input objects; global validation strips/rejects undeclared input. No mass-assignment path was found.
- Existing block, account status, ownership, conversation membership, Close Friends, Ghost Mode, and anonymous-session policies remain centralized and covered across the relevant E2E/unit suites.
- Raw SQL uses Prisma tagged templates/parameter binding. No unsafe raw query or shell-command construction was found.
- No backend arbitrary-URL fetch path was found. Map endpoints use configured providers, media uploads use configured R2 endpoints, and push endpoints come from registered subscriptions.
- No `dangerouslySetInnerHTML` use was found. User content and mentions render as React text. No user-controlled external redirect was found; push navigation is constrained to an internal path.
- Logs do not intentionally emit access/refresh tokens, cookies, passwords, presigned credentials, or push key material. Request logging uses sanitized production errors.

### Uploads, R2, push, and browser storage

- R2 presign/finalize paths enforce authentication, ownership, declared media type, size/type restrictions, canonical object keys, and READY-state transitions. Signed media was not changed to public immutable caching.
- Web Push subscription ownership, per-category preferences, preview redaction, block/suspension suppression, dead-endpoint pruning, and logout-all revocation remain enforced. Push failures stay off the originating request’s critical path.
- Access tokens remain memory-only. IndexedDB/local-storage offline data is namespaced by user and cleared during logout/logout-all.
- Service worker v3 no longer precaches `/`, never caches authenticated navigations/HTML, restricts runtime caching to an allowlist of same-origin static assets, excludes arbitrary R2/user images, and caps the cache at 150 entries.

## 7. Production configuration and lifecycle

- PostgreSQL pool size, connection timeout, statement timeout, and application name are explicit. Current defaults are 10 connections, 5-second connect timeout, and 15-second statement timeout. Production sizing must account for `replica count × pool max` against the database connection limit.
- Nest graceful shutdown is enabled; HTTP connections force-close within the platform shutdown lifecycle, Socket.IO server close delegates correctly, and Redis adapter clients are disposed.
- Liveness and readiness endpoints already exist. Readiness verifies PostgreSQL and Redis rather than returning a static success.
- Story expiration and other cron work were reviewed. The existing workers use idempotent status predicates/batches, but there is no distributed leader lock. Run one scheduler replica or add a database/Redis lease before enabling schedulers on multiple production replicas.
- External R2 and Push failures are bounded and logged without failing unrelated domain commits. Database/Redis failure behavior is exposed through readiness. Destructive infrastructure fault injection was not performed against the developer’s running services.
- No new Sentry, OpenTelemetry, or Prometheus vendor was selected: the brief explicitly avoided introducing unchosen observability infrastructure. Phase 17 should connect the existing request IDs, structured logs, health checks, query/load budgets, and platform metrics to the selected production stack.
- Backup/restore was not validated because no staging/production backup target or credentials were in scope. Phase 17 must perform an actual PostgreSQL restore drill and verify Redis is treated as disposable ephemeral state.

## 8. Security findings and disposition

| Severity | Finding | Disposition |
| --- | --- | --- |
| High | Local ignored backend `.env` contains live-looking R2 and VAPID private material | Not copied or printed. Owner must rotate these external credentials, then replace the local file. Git ignores `.env`; no committed copy was found in the inspected workspace. This is the only known unresolved High item. |
| High | `@nestjs/swagger` dependency chain resolved vulnerable `js-yaml` 5.2.1 | Fixed with a scoped 5.3.0 override; production audit is clean. |
| High | Presence lookup/fanout could expose status beyond a relevant social context | Fixed with shared-conversation authorization, block exclusion, bounded queries, and targeted rooms. |
| High | Service worker could cache private navigation responses or arbitrary user media | Fixed with navigation exclusion and a bounded same-origin static allowlist. |
| Medium | User search relationship state caused 4 queries per result | Fixed: 82/202 queries became 6/6. |
| Medium | Trigram indexes had been dropped by a later migration | Fixed with a concurrent-index migration and schema alignment. |
| Medium | Oversized parser errors became HTTP 500 and body limits were implicit | Fixed with explicit limits and safe 413 normalization. |
| Medium | WebSocket origin, event sizes, validation, and abuse ceilings were incomplete | Fixed. |
| Medium | Production Swagger/JWT fallback behavior was too permissive | Fixed with production-safe defaults and startup validation. |
| Medium | Anonymous matchmaking queues had no global stale-member bound | Fixed with prune and expiry policies. |
| Medium | Redis Socket.IO adapter shutdown method shadowed server close | Fixed and covered by the passing realtime shutdown suite. |
| Low | CSP requires `'unsafe-inline'` for current Next.js bootstrap/styles | Documented limitation. Scripts otherwise default to self and production excludes `unsafe-eval`; objects/frames are denied and connect/media sources are allowlisted. A nonce-based CSP would require opting the app into dynamic rendering and should be evaluated with deployment caching in Phase 17. |

Production dependency audits report zero vulnerabilities for both frontend and backend (`npm audit --omit=dev`). The repository scan found no committed secret in the inspected files. Secrets themselves are deliberately omitted from this report.

## 9. Verification results

- Backend build: passed.
- Backend lint: 0 errors and 0 warnings.
- Backend unit tests: 155/155 passed across 25 suites.
- Backend E2E tests: 139/139 passed across 15 suites.
- Frontend TypeScript: passed with 0 errors.
- Frontend lint: 0 errors and 0 warnings.
- Frontend production build: passed; 41 static/dynamic routes compiled.
- Prisma validation: passed.
- Prisma migration status: 19 migrations applied and up to date.
- Backend production dependency audit: 0 vulnerabilities.
- Frontend production dependency audit: 0 vulnerabilities.
- Live HTTP probes: allowed-origin preflight 204 with the expected origin/credentials; hostile browser origin 403; 300 KiB JSON body 413; security headers and CSP present.

Regression coverage added or strengthened includes origin validation, safe HTTP exception normalization, auth rate limiting, trending cursor ordering, query-count budgets, anonymous queue cleanup, WebSocket validation/authorization/limits, and the pre-existing privacy/concurrency E2E suites. Two pre-existing test fixture reference errors in map/safety tests were corrected so the complete gate could run.

## 10. Open release checks

These do not invalidate the implemented hardening, but they prevent claiming deployment readiness before Phase 17:

1. Rotate the live-looking ignored R2/VAPID credentials. This is an external secret-management action and the only unresolved known High finding.
2. Run authenticated interactive CSP smoke tests through feed, upload, stories, reels, chat/voice, map tiles, push registration, and logout in a real production-origin browser. The in-app Browser integration returned no browser instances during this audit, so only public production pages, response headers, builds, and automated API/E2E paths were validated.
3. Run distributed WebSocket churn/load against the intended multi-replica staging topology and verify adapter cleanup, sticky-session/load-balancer behavior, CPU, memory, and Redis fanout under sustained connections.
4. Perform a PostgreSQL backup/restore drill and select/connect production telemetry and alerting.
5. Decide whether scheduler jobs run on a single worker replica or gain a distributed lease.

No Critical finding is known. One High local-secret finding remains and is explicitly listed rather than concealed. Performance claims above are based on recorded measurements. The changes did not intentionally weaken privacy, security, accessibility, or existing UI/UX. Phase 17 deployment, Playwright journeys, CI/CD, and release functionality were not implemented prematurely.

## 11. Reproduction commands

```bash
# Backend data and query diagnostics (never run against production)
cd mixchat-backend
npm run benchmark:seed
npm run benchmark:queries
npm run benchmark:explain
npm run benchmark:load
npm run benchmark:cleanup

# Backend gates
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e
npm audit --omit=dev
npx prisma validate
npx prisma migrate status

# Frontend gates and performance budget
cd ../mixchat-frontend
npx tsc --noEmit
npm run lint
npm run build
npm audit --omit=dev
npm run start
npm run benchmark:lighthouse
```

Recommended next action after completing the five release checks above: **Phase 17 — Full E2E, Deployment & Release**.
