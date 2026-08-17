# MixChat Phase 8 — Implementation Report

Phase 8 is implemented as a REST-only durable messaging layer. No Socket.IO gateway, presence, typing, or realtime delivery semantics were added; Phase 9 can call the exported canonical `ChatService.sendMessage` path rather than duplicating message creation.

## Data and invariants

- Direct conversations use a sorted two-user `directKey` protected by a unique database constraint. The service recovers the winning row after a concurrent unique conflict.
- Messages are unique by `(conversationId, senderId, clientMessageId)` and a retry returns the canonical existing DTO.
- Sending runs in a transaction and locks only the target conversation row before creating the message, advancing last-message state, and atomically incrementing every active recipient participant.
- Read state stores `lastReadMessageId`, `lastReadAt`, and `unreadCount`. It advances monotonically and uses an atomic clamped decrement so a concurrent later send cannot be cleared accidentally.
- Message deletion is a tombstone. Reply targets and history order remain stable.
- Attachments reference READY Phase 3 `MediaObject` rows. The sender must own every object and its media kind must match the message type.

## HTTP surface

- `POST/GET /api/chat/conversations`
- `GET/PATCH /api/chat/conversations/:id`
- `GET/POST /api/chat/conversations/:id/messages`
- `PATCH /api/chat/conversations/:id/read`
- `PATCH /api/chat/conversations/:id/state`
- `PATCH/DELETE /api/chat/messages/:id`
- Minimal group update, add/remove member, and leave endpoints under `/api/chat/conversations/:id`

All endpoints require JWT authentication and active membership. Direct creation enforces `allowDirectMessages`; direct sends recheck bidirectional blocks.

## Voice lifecycle

The composer uses `getUserMedia` and `MediaRecorder`, probes supported WebM/Ogg/MP4 formats, captures live analyser levels, uploads the resulting file through the existing R2 presigned PUT/finalize flow, and then sends a `VOICE` message with duration and bounded waveform metadata. Playback uses a real `HTMLAudioElement` with play/pause, seek, actual progress, elapsed/total time, speed selection, and cleanup.

## Performance evidence

On the local PostgreSQL dataset, conversation membership used `conversation_participants_user_id_conversation_id_idx`; message history used a backward index-only scan on `messages_conversation_id_created_at_id_idx`. The representative history query completed in approximately 0.27 ms. Payloads use bounded includes rather than per-item database queries.

## Verification and limitation

- Prisma schema validation and migrations pass.
- Backend build and 104 unit tests pass.
- Full backend E2E passes: 83 tests, including concurrency, privacy, IDOR, attachment, and read/send race coverage.
- Frontend type check, lint, contract check, and production build pass.
- The in-app browser runtime exposed no connected browser during verification. Therefore microphone permission/device behavior was not falsely marked as manually verified; it still requires one real-device smoke test when a browser is connected.
