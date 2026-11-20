# NOVA MOTION AI — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity & PII Isolation**: User documents (`/users/{userId}`) contain PII (`email`) and are strictly readable only by the owning user (`request.auth.uid == userId`) or a verified admin (`isAdmin()`).
2. **No Self-Assigned Privileges**: A user creating `/users/{userId}` can only assign `role == 'free'` and `planId == 'free'` unless they already satisfy `isAdmin()`, and non-admins can never mutate their own `role`, `suspended`, `id`, `email`, or `createdAt` fields.
3. **Master Gate Project Ownership**: Every `/projects/{projectId}/characters`, `/locations`, `/scenes`, and `/exports` sub-collection document verifies parent project ownership via `get(/databases/$(database)/documents/projects/$(projectId)).data.userId == request.auth.uid` on single-doc reads/writes, while `allow list` validates `resource.data.userId == request.auth.uid || isAdmin()` without costly `get()` calls.
4. **Immutable Ledgers & Audit Logs**: `/transactions` and `/auditLogs` are append-only by owning verified users (or admins); non-admins cannot tamper with historical financial or audit records.
5. **Terminal State Locking**: Once `/generations/{jobId}` reaches `'completed'`, `'failed'`, or `'cancelled'`, or `/supportTickets/{ticketId}` reaches `'resolved'`, non-admins cannot mutate them.
6. **Temporal Integrity & Strict Allowlists**: Every document creation requires `createdAt == request.time` and every mutable update requires `updatedAt == request.time`, paired with `keys().hasAll(...)`, `keys().hasOnly(...)`, and `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Attack Payloads
1. **Self-Admin Escalation on Create (`/users/attacker1`)**: `{ "id": "attacker1", "role": "super_admin", "planId": "annual_2", ... }` -> **MUST RETURN `PERMISSION_DENIED`**.
2. **Role Tampering on Update (`/users/attacker1`)**: `{ "role": "admin", "updatedAt": request.time }` -> **MUST RETURN `PERMISSION_DENIED`**.
3. **Email Spoof Admin Bypass**: User with `token.email == 'conseildor70@gmail.com'` and `token.email_verified == false` reading `/auditLogs` -> **MUST RETURN `PERMISSION_DENIED`**.
4. **PII Blanket Read (`/users/victim1`)**: Signed-in non-admin requesting `get(/users/victim1)` -> **MUST RETURN `PERMISSION_DENIED`**.
5. **Shadow / Ghost Field Injection (`/projects/proj_1`)**: Valid project payload plus `{ "isVerified": true }` -> **MUST RETURN `PERMISSION_DENIED`**.
6. **Orphan Sub-Collection Write (`/projects/nonexistent_proj/scenes/scn_1`)**: Creating a scene under a non-existent or foreign project -> **MUST RETURN `PERMISSION_DENIED`**.
7. **Unverified Client Timestamp Spoof (`/projects/proj_2`)**: Creating a project with `"createdAt": "2020-01-01T00:00:00Z"` instead of `request.time` -> **MUST RETURN `PERMISSION_DENIED`**.
8. **ID Poisoning (`/projects/<1500-char-id>`)**: Single-doc operation with oversized or invalid-regex ID -> **MUST RETURN `PERMISSION_DENIED`**.
9. **Terminal State Re-opening (`/generations/gen_done`)**: Non-admin attempting to reset `status: "completed"` back to `"pending"` -> **MUST RETURN `PERMISSION_DENIED`**.
10. **Ledger Tampering (`/transactions/tx_1`)**: Owner attempting `update` or `delete` on an existing transaction -> **MUST RETURN `PERMISSION_DENIED`**.
11. **Query Scraping Without Filter (`/projects`)**: Non-admin calling unconstrained collection list without `where('userId', '==', uid)` -> **MUST RETURN `PERMISSION_DENIED`**.
12. **Type / Boundary Exhaustion (`/projects/proj_3/scenes/scn_2`)**: Scene with `durationSeconds: 120` (> 15s limit) or `visualPrompt` > 4000 chars -> **MUST RETURN `PERMISSION_DENIED`**.
