# Security Specification & Payload Audit — VoltPay

## 1. Data Invariants
1. **User Profile Ownership & PII Isolation**: A `/users/{userId}` document can only be read or written by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Wallet Bounds & Identity Integrity**: `walletBalance` must be a number between `0` and `1,000,000`. `uid` and `createdAt` are immutable after creation.
3. **Saved Contacts Master Gate**: `/users/{userId}/contacts/{contactId}` documents require the parent `/users/{userId}` document to exist, `userId == request.auth.uid`, valid 10-digit Indian phone numbers (`^[0-9]{10}$`), valid operator IDs (`jio`, `airtel`, `vi`, `bsnl`), and server timestamps (`request.time`).
4. **Immutable Transaction Ledger**: `/users/{userId}/transactions/{txId}` records can only be created by the verified owner and cannot be modified or deleted (`allow update, delete: if false`) once committed.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Profile Read**: Read `/users/u1` with `auth: null`.
2. **Cross-User PII Read**: Authenticated user `u2` attempts `get` on `/users/u1`.
3. **Unverified Email Write**: Authenticated user `u1` with `email_verified: false` attempts to create `/users/u1`.
4. **UID Spoofing on Profile**: User `u1` attempts to create `/users/u1` with `uid: "u2"`.
5. **Shadow Field Injection on Profile**: User `u1` attempts to create `/users/u1` with extra field `isAdmin: true`.
6. **Negative Wallet Tampering**: User `u1` attempts to update `walletBalance` to `-500`.
7. **Immutable CreatedAt Overwrite**: User `u1` attempts to alter `createdAt` during profile update.
8. **Invalid Document ID Poisoning**: User `u1` attempts to write `/users/u1/contacts/invalid id with spaces!`.
9. **Invalid Phone Pattern on Contact**: User `u1` attempts to save contact with `phoneNumber: "123"`.
10. **Cross-User Subcollection List**: User `u2` attempts `list` on `/users/u1/transactions`.
11. **Transaction Ledger Tampering**: User `u1` attempts `update` on `/users/u1/transactions/tx1` to change `totalPaid: 0`.
12. **Client-Spoofed Timestamp**: User `u1` sends a custom `Date` for `createdAt` instead of `request.time`.
