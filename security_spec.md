# CareerToday Firestore Security Specification

## 1. Data Invariants
1. Public visitors (customers) have strictly **read-only** access (`get`, `list`) to `/jobs` and `/news`. They can never create, update, or delete any job posting or blog article.
2. Root co-administrators are bootstrapped as `nhungcam1902@gmail.com` and `hr@careertoday.com.vn`. Any verified administrator (`isAdmin()`: signed in with `email_verified == true` and either a bootstrapped root admin or listed in `/admins/{lowercase_email}`) may create, update, or delete documents in `/jobs` and `/news`, and may add or remove co-administrators in `/admins`.
3. Every `/jobs`, `/news`, and `/admins` document enforces strict key allowlists (`hasAll` + `hasOnly`), exact primitive types, explicit string `.size()` bounds matching `firebase-blueprint.json`, caller identity binding (`authorId` / `addedBy == request.auth.uid`, `addedByEmail == callerEmail()`), and server-enforced `createdAt == request.time`.
4. Bootstrapped root admin emails (`nhungcam1902@gmail.com` and `hr@careertoday.com.vn`) and the active admin's own email cannot be removed via `/admins` deletion, preventing accidental self-lockout or root lockout.
5. Client `list` or non-admin `get` on `/admins` by unauthenticated or non-admin users is strictly forbidden (`PII` isolation).

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `create` on `/jobs/1001` -> Denied.
2. Non-admin authenticated user `create` on `/jobs/1001` -> Denied.
3. Co-admin email (`hr@careertoday.com.vn`) with `email_verified: false` -> Denied (`isVerified()` guard).
4. Admin attempting shadow field injection (`extraField: "hack"`) on `/jobs/1001` or `/admins/other@example.com` -> Denied (`keys().hasOnly(...)`).
5. Admin attempting `create` on `/admins/other@example.com` with `addedBy` != `request.auth.uid` -> Denied.
6. Admin attempting `create` on `/admins/other@example.com` where `incoming().email != adminId` -> Denied.
7. Non-admin authenticated user attempting `create` on `/admins/hacker@example.com` to escalate privileges -> Denied (`isAdmin()` guard).
8. Admin attempting `delete` on `/admins/hr@careertoday.com.vn` or self-deletion -> Denied.
9. Unauthenticated `delete` on `/jobs/1001` or `/news/2001` -> Denied.
10. Non-admin authenticated `update` on `/news/2001` -> Denied.
11. Unauthenticated `read` or non-admin `read` on another user's `/admins/{email}` -> Denied.
12. Client `update` on `/admins/{email}` -> Denied (`allow update: if false`).
