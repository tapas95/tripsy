# Tripsy — Product & Technical Spec

## Vision
Tripsy is a production-ready mobile app for tracking travel expenses on group trips. Multiple users join a trip, log shared expenses, split bills between members (equal, custom, or percentage), optionally attach receipts, and settle up who owes whom — all synced live across devices.

This is not an MVP cut-down — auth, group membership, splitting, and sync are all core from day one.

---

## Core Features

1. **Authentication** — sign up / log in (email + Google), user profile with name, avatar, default currency.
2. **Trips & Groups** — create a trip, invite members via code/link, members join/leave.
3. **Expenses** — amount, category, date, note, paid-by member.
4. **Splitting** — equal split, custom amount per person, or percentage split. Every expense is split-aware even if only one person is involved.
5. **Receipts** — optional photo attachment (camera or gallery) per expense. Never required.
6. **Balances & Settlement** — per-trip "who owes whom" summary with simplified debts (not a naive everyone-owes-everyone list). Mark debts as settled.
7. **Sync** — real-time backend required from day one since group data is shared and live; no local-only mode.

---

## Data Model

```
User
- id
- name
- email
- avatarUrl
- defaultCurrency

Trip
- id
- name
- startDate
- endDate
- currency
- createdBy (User.id)

TripMember
- tripId
- userId
- role ("owner" | "member")
- joinedAt

Expense
- id
- tripId
- amount
- category
- date
- note
- paidByUserId
- receiptUrl (nullable)
- createdAt

ExpenseSplit
- expenseId
- userId
- shareAmount
  # one row per person owing a portion of the expense —
  # equal/custom/percentage splits all resolve to this same shape

Settlement
- id
- tripId
- fromUserId
- toUserId
- amount
- settledAt
```

---

## Screens

**Auth flow**
1. Splash / loading
2. Login
3. Sign up
4. Forgot password

**Core app**
5. Trip list (home)
6. Create trip
7. Join trip (invite code/link)
8. Trip detail — members, expense feed, balance summary
9. Trip settings — rename, dates, currency, manage members

**Expenses**
10. Add expense — amount, category, date, note, paid-by, split method
11. Split method picker (modal) — equal / custom / percentage
12. Expense detail — view/edit, see receipt
13. Attach receipt (modal) — camera/gallery

**Balances & settlement**
14. Balances view — simplified "who owes whom" per trip
15. Settle up — mark a debt paid, optional confirmation

**Account**
16. Profile
17. Settings — notifications, account, logout

~17 total screens (2 are modals rather than full navigable routes: split picker, receipt attach), so the real navigation stack is ~13-14 screens.

---

## Tech Stack

- **Frontend:** React Native + TypeScript
- **Styling:** Tailwind via NativeWind
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime)
  - Auth: Supabase Auth (email + Google OAuth)
  - Database: Postgres tables matching the data model above — relational shape fits split/settlement queries natively
  - Storage: Supabase Storage for receipt images
  - Realtime: Supabase Realtime for live trip/expense sync across members' devices
- **State management:** React Query for server state sync

---

## Design Tokens

See `tokens.ts` and `tailwind.config.js` (already generated) for full values. Summary:

**Color**
- Ink `#1B3A5C` — primary
- Marigold `#F2A93B` — accent / CTAs
- Postmark Teal `#2F9E8F` — settled/success
- Coral `#E1574F` — danger / "you owe"
- Paper `#F7F6F3` — background
- Ink Black `#1B2430` — primary text
- Slate `#6B7280` — secondary text

**Type**
- Display: Space Grotesk (headers, hero amounts)
- Body: Inter (UI text)
- Numeric: IBM Plex Mono, tabular figures (all currency amounts — signature visual element)

**Spacing:** 4px grid — 4/8/12/16/20/24/32/40/48/64
**Radius:** sm 6 / md 10 / lg 16 / full 999

---

## Coding Conventions (for agy / GEMINI.md)

- Functional components with hooks only, no class components
- TypeScript strict mode
- Components under ~150 lines; split if larger
- All currency amounts rendered in `font.numeric`, right-aligned, tabular-nums
- Explain file changes after each edit
- Ask before adding new dependencies
- Commit after each working step; small reviewable diffs over large ones

---

---

## Real-World Member Management & Advanced Expense Splitting (Implementation Spec)

### 1. Real-World Member Invitations & Joining Flow
- **Phone Contacts Integration (`expo-contacts`)**: 
  - Ability to pick a friend directly from phone contacts in `AddMemberModal`.
  - Automatically populates contact Name & Phone / Email.
  - Generates pre-filled SMS / WhatsApp invitation message with 1-tap deep link.
- **Native 1-Tap Share Sheet (`Share.share`)**:
  - Direct sharing via WhatsApp, Messages, Email, Telegram, AirDrop.
- **Phone Number Matching on Sign-Up & Profile**:
  - Added Phone Number (`phone`) field on `SignUpScreen` and `ProfileScreen` (E.164 format: `+919876543210`).
  - Automatic trip matching: When a user registers with a phone number that matches `invited_phone`, Supabase automatically connects them to the trip!
- **App-Not-Installed Journey (Clipboard Auto-Detection & Post-Signup Auto-Claim)**:
  - If an invited friend installs the app, on first launch the app inspects the Clipboard (`expo-clipboard`) for invite links (`tripsy://join?code=XYZ`).
  - Immediately after registration, the app prompts: *"🎉 You have a pending invitation to [Trip Name]! [Join Trip]"*.

### 2. Advanced 4-Mode Expense Splitting
- **Equal Split (with Member Toggles)**:
  - Checkboxes (`[✓] Member`) next to each member to split equally only among participating members.
- **Exact Amounts**:
  - Custom currency input per member with live `Allocated: ₹X / Total: ₹Y` validation badge.
- **Percentages (%)**:
  - % input per member with automatic 100% total validator.
- **Shares / Ratios**:
  - Steppers (`1x`, `2x`) for proportional splitting (e.g. 2 shares for couples, 1 share for individuals).

---

## Out of Scope (explicitly not v1)
- Multi-currency conversion within a single trip (single currency per trip)
- Bill splitting across trips (splits are always scoped to one trip)
- Offline-first conflict resolution beyond Supabase Realtime defaults