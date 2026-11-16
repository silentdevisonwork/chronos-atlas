# Security Specification & Hardening Audit

## 1. Data Invariants
1. **Owner-Only Isolation**: Documents under `/users/{userId}/private/profile` and `/users/{userId}/progress/state` may only be read or written by the authenticated user whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **PII Separation**: Email, display name, and photo URL live exclusively inside `/users/{userId}/private/profile`. Blanket reads and collection `list` queries are denied.
3. **Strict Schema & Bounds**: Every string and array enforces explicit `.size()` bounds to prevent resource exhaustion, and `keys().hasAll(...) && keys().hasOnly(...)` rejects shadow fields.
4. **Temporal & Identity Integrity**: `uid` must equal `request.auth.uid` on creation and remain immutable on update; `updatedAt` must equal `request.time`.

## 2. Red-Team "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read of `/users/u1/private/profile`
2. Cross-user read of `/users/u2/private/profile` by authenticated user `u1`
3. Unverified email write (`email_verified: false`) to `/users/u1/private/profile`
4. Shadow field injection (`isAdmin: true`) in `/users/u1/private/profile`
5. Identity spoofing (`uid: "u2"`) inside `/users/u1/progress/state`
6. Oversized `displayName` (> 120 chars) in `/users/u1/private/profile`
7. Oversized `favoriteIds` array (> 200 items) in `/users/u1/progress/state`
8. Invalid `theme: "neon"` enum value in `/users/u1/progress/state`
9. Client-spoofed `updatedAt` timestamp not equal to `request.time`
10. Invalid path `userId` containing special characters (`../admin`)
11. Modifying immutable `uid` during an update on `/users/u1/progress/state`
12. Collection `list` scraping on `/users/{userId}/private` or `/users`
