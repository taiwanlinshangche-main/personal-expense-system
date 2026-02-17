# Personal Expense Tracker — Product Requirements Document

> **Version:** 1.0
> **Date:** 2026-02-15
> **Author:** PRD generated with Claude Code
> **Status:** Draft — awaiting review

---

## Table of Contents

1. [Research References](#1-research-references)
2. [Product Overview](#2-product-overview)
3. [User Stories & Key Flows](#3-user-stories--key-flows)
4. [Information Architecture & Navigation](#4-information-architecture--navigation)
5. [Data Model (Supabase)](#5-data-model-supabase)
6. [Security & Permissions](#6-security--permissions)
7. [UI/UX Spec (Mobile-First)](#7-uiux-spec-mobile-first)
8. [Animation & Micro-Interactions](#8-animation--micro-interactions)
9. [Analytics & Logging](#9-analytics--logging)
10. [Performance & Quality](#10-performance--quality)
11. [Milestones & Scope](#11-milestones--scope)

---

## 1. Research References

The following 10 references informed this PRD's design and architecture decisions:

### Ref 1 — Ramotion: Expense Tracker App UI/UX Design Concept
- **Source:** [ramotion.com](https://www.ramotion.com/expense-tracker-app-ui-ux-design-concept/)
- **Relevant pattern:** Dashboard card layout with vibrant financial summary, spending-trend sparklines, bottom navigation with 3-4 core tabs
- **Key takeaway:** The dashboard uses a "hero card" showing total balance with a spending-trend graph beneath, followed by categorized expense breakdowns. This card-first layout creates clear visual hierarchy and works exceptionally well on mobile. **Applied to:** Home screen hero card design, account balance cards.

### Ref 2 — UX Planet: Bottom Tab Bar Navigation Best Practices
- **Source:** [uxplanet.org](https://uxplanet.org/bottom-tab-bar-navigation-design-best-practices-48d46a3b0c36)
- **Relevant pattern:** Bottom tab bar with 3–5 destinations, icon + label combos, active state animations
- **Key takeaway:** Limit to 3–5 tabs; use universally recognizable icons with short one-word labels; maintain 48×48px minimum touch targets; active icons should use brand color at full opacity while inactive icons are toned down. 3 tabs creates the cleanest rhythm. **Applied to:** Bottom navbar design with exactly 3 tabs.

### Ref 3 — NN/g: Skeleton Screens 101
- **Source:** [nngroup.com](https://www.nngroup.com/articles/skeleton-screens/)
- **Relevant pattern:** Skeleton loading as perceived performance optimization
- **Key takeaway:** Skeleton screens reduce perceived wait time by 30%+ compared to spinners. They should mirror the actual content layout (not generic blocks) and use a subtle shimmer animation (left-to-right gradient sweep) to signal active loading. **Applied to:** Loading states across all data views.

### Ref 4 — Material Design: Swipe-to-Refresh Pattern
- **Source:** [m1.material.io](https://m1.material.io/patterns/swipe-to-refresh.html)
- **Relevant pattern:** Pull-to-refresh gesture on scrollable lists
- **Key takeaway:** Available at the top of lists/grids sorted by recent content. The refresh indicator appears only when the user's swipe gesture crosses a threshold. Keep the animation smooth (60fps) and provide haptic feedback on trigger. **Applied to:** Transaction list and reimbursement list refresh.

### Ref 5 — Motion (Framer Motion): React Animation Library
- **Source:** [motion.dev](https://motion.dev/docs/react)
- **Relevant pattern:** Declarative animations for React — layout animations, gesture-based interactions, AnimatePresence for enter/exit
- **Key takeaway:** Motion's `layout` prop enables automatic, performant layout animations when DOM order changes (perfect for list reordering/filtering). `AnimatePresence` handles mount/unmount transitions. Gesture props (`whileTap`, `whileHover`, `drag`) enable micro-interactions with zero boilerplate. **Applied to:** All animations in the app — page transitions, list animations, gesture feedback.

### Ref 6 — Supabase Docs: Creating a Client for SSR (Next.js)
- **Source:** [supabase.com](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- **Relevant pattern:** Server-side Supabase client with cookie-based auth, middleware proxy for token refresh
- **Key takeaway:** Use `@supabase/ssr` to create server-side clients. Always call `supabase.auth.getUser()` (not `getSession()`) for server-side auth validation. The middleware must refresh tokens before any Supabase call. Never expose service role key to client. **Applied to:** Proxy layer architecture, auth flow.

### Ref 7 — Supabase Blog: React Query + Next.js App Router Cache Helpers
- **Source:** [supabase.com](https://supabase.com/blog/react-query-nextjs-app-router-cache-helpers)
- **Relevant pattern:** Using React Query (TanStack Query) with Supabase for client-side caching and optimistic updates
- **Key takeaway:** Combine server-side data fetching (RSC) for initial load with client-side React Query for mutations and real-time updates. This gives fast initial renders + instant UI feedback on writes. **Applied to:** Data fetching and caching strategy.

### Ref 8 — Colorhero: Dark Mode Color Palettes 2025
- **Source:** [colorhero.io](https://colorhero.io/blog/dark-mode-color-palettes-2025)
- **Relevant pattern:** Professional blue palette for finance — deep navy background, electric blue accent, high-contrast text
- **Key takeaway:** Use dark grey (#111827) rather than pure black to reduce eye strain. Reserve brightest text for headings. Add 20–30% more padding vs. light mode. Accent colors should be limited and purposeful. **Applied to:** Color system for both light and dark modes.

### Ref 9 — AppMySite: Bottom Navigation Bar Complete 2025 Guide
- **Source:** [blog.appmysite.com](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)
- **Relevant pattern:** Ergonomic bottom bar for one-handed use, tab state persistence
- **Key takeaway:** Bottom navigation supports one-handed use because the bottom of the screen is within natural thumb reach. Each tab should retain scroll position and state when switching, so returning to a tab doesn't reset the user's place. **Applied to:** Tab state persistence, ergonomic FAB placement.

### Ref 10 — Expensify: Expense Reimbursement Guide
- **Source:** [use.expensify.com](https://use.expensify.com/resource-center/guides/expense-reimbursement)
- **Relevant pattern:** Reimbursement workflow: submit → review → approved → paid
- **Key takeaway:** Reimbursement status should be a clear, linear pipeline with visual indicators at each stage. Users need a "pending" count badge to know how many items need action. Quick-action buttons (mark as claimed, mark as paid) reduce friction. **Applied to:** Reimbursement status pipeline, badge counts, quick actions.

---

## 2. Product Overview

### 2.1 Problem Statement

Tracking personal expenses across multiple accounts (cash, credit cards, bank accounts) requires manual effort. When some expenses are company advances (代墊款) that need reimbursement, the cognitive overhead multiplies — users must remember which expenses to claim, track their reimbursement status, and reconcile amounts. Existing apps either don't support the company-advance workflow or are bloated enterprise tools.

### 2.2 Goals

| # | Goal | Measure |
|---|------|---------|
| G1 | **Fast expense logging** — adding a transaction takes < 10 seconds | Time-to-submit measured via analytics |
| G2 | **Instant financial snapshot** — see account balances and spending at a glance | < 2s to meaningful content on Home |
| G3 | **Effortless reimbursement tracking** — never forget to claim a company advance | 100% of pending advances are surfaced; 0 missed claims |
| G4 | **Premium mobile experience** — feels like a native app | Smooth 60fps animations; < 3s initial load on 4G |

### 2.3 Non-Goals

- **Not a budgeting tool** — no budget categories, envelopes, or spending limits (future idea)
- **Not a bank integration** — all data is manually entered
- **Not multi-user collaboration** — single user; multi-user is a future enhancement
- **Not a receipt scanner** — no OCR or image upload (future idea)

### 2.4 Target User / Persona

**Name:** 小明 (Xiao Ming)
**Age:** 28
**Role:** Software engineer at a mid-size company
**Context:** Uses multiple payment methods (credit card, Line Pay, cash). Frequently pays for work-related expenses (meals with clients, office supplies) on personal cards and claims reimbursement monthly. Wants a quick, clean tool — not a full accounting suite. Uses iPhone 15 primarily, one-handed while commuting.

### 2.5 Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Time to log a transaction | < 10 seconds | Analytics: `add_transaction_start` → `add_transaction_submit` |
| Weekly active usage | 5+ sessions/week | Analytics: unique sessions per week |
| Pending reimbursement accuracy | 0 missed claims at month-end | User self-report; all `is_company_advance` transactions have a resolution |
| Page load (Home tab) | < 2s to First Contentful Paint on 4G | Lighthouse / Web Vitals |
| Animation frame rate | 60fps sustained | DevTools Performance profiling |

---

## 3. User Stories & Key Flows

### 3.1 Home Overview

| Field | Detail |
|-------|--------|
| **As a** | user |
| **I want to** | see all my accounts and how much I've spent from each |
| **So that** | I get an instant snapshot of my financial state |

**Definition of "spent":** Total outgoing (negative) transaction amounts within the **current calendar month**. Income/inflows are excluded from the "spent" figure. The balance shown is the account's current balance (initial balance + all-time net transactions).

**Acceptance criteria:**
1. Home screen loads within 2 seconds with skeleton → content transition
2. Each account appears as a card showing: account name, current balance, month-to-date spending
3. A "total" summary card aggregates all accounts
4. Tapping an account card navigates to filtered Transactions tab for that account
5. If no accounts exist, an empty state prompts user to create one

### 3.2 Filter by Account

| Field | Detail |
|-------|--------|
| **As a** | user |
| **I want to** | quickly focus on a single account's transactions |
| **So that** | I can review spending for one card or wallet |

**Acceptance criteria:**
1. Horizontal scrollable chip row at the top of Transactions tab: "全部 (All)" + one chip per account
2. Tapping a chip filters the transaction list with a smooth layout animation
3. Active chip is visually highlighted (filled background)
4. Chip row is sticky below the header on scroll
5. Alternatively, tapping an account card on Home sets the filter and switches to Transactions tab

### 3.3 View Pending Reimbursements (待請款)

| Field | Detail |
|-------|--------|
| **As a** | user |
| **I want to** | see all company-advance expenses I haven't yet claimed |
| **So that** | I can submit my reimbursement request with a complete list |

**Acceptance criteria:**
1. Dedicated "公司請款" tab shows only transactions where `is_company_advance = true`
2. Default filter: "待請款 (Pending)" — shows transactions with `reimbursement_status = 'pending'`
3. Segmented control to switch between: 待請款 (Pending) / 已請款 (Claimed) / 已收款 (Paid)
4. Each item shows: date, amount, note, account name
5. Total pending amount displayed prominently at the top
6. Badge count on bottom nav tab shows number of pending items

### 3.4 Add Account

| Field | Detail |
|-------|--------|
| **As a** | user |
| **I want to** | add a new account (e.g. a credit card, cash wallet) |
| **So that** | I can track its transactions separately |

**Acceptance criteria:**
1. Accessible from Home screen via a "+" button on the accounts section
2. Bottom sheet modal with fields: Account name (required), Initial balance (default 0)
3. Validation: name must be non-empty and unique
4. On success: sheet dismisses, new account card animates into the list
5. Keyboard auto-focuses on the name field

### 3.5 Add Transaction

| Field | Detail |
|-------|--------|
| **As a** | user |
| **I want to** | quickly log an expense or income |
| **So that** | my records stay up to date |

**Acceptance criteria:**
1. Floating Action Button (FAB) visible on all tabs (bottom-right, above nav bar)
2. FAB opens a bottom sheet with fields:
   - Account (required) — dropdown/picker, defaults to last-used account
   - Amount (required) — numeric keypad, defaults to negative (expense)
   - Type toggle: 支出 (Expense, negative) / 收入 (Income, positive)
   - Date (default: today) — date picker
   - Note (optional) — free text
   - 公司代墊 (Company advance) — toggle switch
   - If company advance ON: reimbursement status defaults to "pending"
3. Submit button disabled until Account + Amount are filled
4. On success: confetti/checkmark micro-animation, sheet dismisses, transaction appears in list
5. Total time from FAB tap to successful submit: < 10 seconds for a simple expense

### 3.6 Mark Reimbursement as Claimed / Paid

| Field | Detail |
|-------|--------|
| **As a** | user |
| **I want to** | update a company advance's status as I progress through reimbursement |
| **So that** | I know which expenses are resolved |

**Acceptance criteria:**
1. On the 公司請款 tab, each pending item has a quick-action button: "已請款 (Mark Claimed)"
2. Swipe-right on a pending item also triggers "Mark Claimed" action
3. On the 已請款 segment, each item has a quick-action button: "已收款 (Mark Paid)"
4. Status change animates the item out of the current segment with a smooth exit
5. Confirmation is NOT required for status advancement (but undo toast appears for 5 seconds)

---

## 4. Information Architecture & Navigation

### 4.1 Bottom Navigation Bar

```
┌──────────────────────────────────────────┐
│                                          │
│            (Screen Content)              │
│                                          │
│                                    [FAB] │
├──────────┬──────────┬────────────────────┤
│  🏠 首頁  │ 💼 公司請款 │  📋 交易明細        │
│  Home    │ Reimburse │  Transactions     │
└──────────┴──────────┴────────────────────┘
```

**Behavior:**
- Fixed at viewport bottom, always visible (hides on scroll-down with smooth slide, reappears on scroll-up — ref: iOS Safari-like behavior)
- 3 tabs with icon + label (Traditional Chinese primary, English secondary in this doc only)
- Active tab: filled icon + brand color label + subtle scale-up animation
- 公司請款 tab shows a badge with pending count (e.g. red dot with number)
- Tab state is preserved — switching tabs retains scroll position and filter state (Ref 9)
- Height: 56px + safe area inset (for notched phones)

### 4.2 Account Switching

- **On Home:** Tap any account card to navigate to Transactions tab pre-filtered to that account
- **On Transactions tab:** Horizontal scrollable chip row (sticky below header)
  - Chips: "全部" | "現金" | "信用卡" | … (dynamically from accounts)
  - Tap to filter; animated content transition (Ref 5 — Motion layout animation)
- **On 公司請款 tab:** Account filter also available via chip row (same pattern)

### 4.3 Where "待請款" Lives

- **Primary:** Dedicated bottom nav tab (公司請款) — always one tap away
- **Secondary:** Home screen shows a summary card: "待請款: 3 筆 / NT$4,500" with tap-to-navigate
- **Tertiary:** Badge count on the 公司請款 tab icon — visible from any screen

---

## 5. Data Model (Supabase)

### 5.1 Tables

#### `profiles`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `uuid` | PK, references `auth.users(id)` | Supabase Auth user ID |
| `display_name` | `text` | not null | User's display name |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | |

#### `accounts`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `profiles(id)`, not null | Owner |
| `name` | `text` | not null | e.g. "現金", "玉山信用卡" |
| `initial_balance` | `integer` | not null, default `0` | In smallest currency unit (TWD = 1 dollar) |
| `sort_order` | `integer` | not null, default `0` | For manual ordering |
| `is_archived` | `boolean` | not null, default `false` | Soft-delete |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | |

**Unique constraint:** `(user_id, name)` — one user cannot have duplicate account names.

#### `transactions`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `profiles(id)`, not null | Denormalized for RLS performance |
| `account_id` | `uuid` | FK → `accounts(id)`, not null | Which account |
| `amount` | `integer` | not null | Signed: negative = expense, positive = income. In TWD (smallest unit). |
| `note` | `text` | default `''` | Free-text memo |
| `date` | `date` | not null, default `CURRENT_DATE` | Transaction date |
| `is_company_advance` | `boolean` | not null, default `false` | 公司代墊 |
| `reimbursement_status` | `text` | check constraint | `NULL` if not company advance; `'pending'` / `'claimed'` / `'paid'` if company advance |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | |

**Check constraint on `reimbursement_status`:**
```sql
CHECK (
  (is_company_advance = false AND reimbursement_status IS NULL)
  OR
  (is_company_advance = true AND reimbursement_status IN ('pending', 'claimed', 'paid'))
)
```

### 5.2 Indexes

```sql
-- Fast lookup of transactions by account (most common query)
CREATE INDEX idx_transactions_account_id ON transactions(account_id);

-- Fast lookup of all transactions for a user, ordered by date (Home + Transactions tab)
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

-- Fast lookup of company advances by status (公司請款 tab)
CREATE INDEX idx_transactions_reimbursement
  ON transactions(user_id, reimbursement_status)
  WHERE is_company_advance = true;

-- Accounts by user
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

### 5.3 Account Balance: Computed (Not Stored)

**Decision: Compute balance on read, do not store it.**

**Rationale:**
- Single-user app with low transaction volume (< 10,000 rows) — aggregate queries are fast
- Eliminates consistency bugs from stored balances drifting out of sync
- Simpler write path (no triggers, no race conditions)

**Query pattern:**
```sql
SELECT
  a.id,
  a.name,
  a.initial_balance,
  a.initial_balance + COALESCE(SUM(t.amount), 0) AS current_balance,
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.amount < 0
    AND t.date >= date_trunc('month', CURRENT_DATE)
  ), 0) AS month_spending
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
WHERE a.user_id = $1 AND a.is_archived = false
GROUP BY a.id
ORDER BY a.sort_order;
```

If performance becomes an issue at scale, a materialized view or a `balance` column with a trigger can be introduced later.

### 5.4 Reimbursement Status Enum

Using a `text` column with a `CHECK` constraint instead of a Postgres `ENUM` type.

**Rationale:** Adding values to a Postgres `ENUM` requires an `ALTER TYPE` migration and can be tricky. A `CHECK` constraint on `text` is more flexible, easier to migrate, and equally type-safe at the DB level. The valid values are: `'pending'`, `'claimed'`, `'paid'`.

### 5.5 Example Rows

**accounts:**

| id | user_id | name | initial_balance | sort_order |
|----|---------|------|----------------|------------|
| `a1...` | `u1...` | 現金 | 50000 | 0 |
| `a2...` | `u1...` | 玉山信用卡 | 0 | 1 |
| `a3...` | `u1...` | Line Pay | 10000 | 2 |

**transactions:**

| id | user_id | account_id | amount | note | date | is_company_advance | reimbursement_status |
|----|---------|-----------|--------|------|------|--------------------|---------------------|
| `t1...` | `u1...` | `a2...` | -350 | 午餐 | 2026-02-15 | false | NULL |
| `t2...` | `u1...` | `a2...` | -1200 | 客戶晚餐 | 2026-02-14 | true | pending |
| `t3...` | `u1...` | `a1...` | -80 | 飲料 | 2026-02-14 | false | NULL |
| `t4...` | `u1...` | `a2...` | -3500 | 辦公用品 | 2026-02-10 | true | claimed |
| `t5...` | `u1...` | `a1...` | 30000 | 薪水 | 2026-02-01 | false | NULL |

---

## 6. Security & Permissions

### 6.1 Supabase Auth Assumptions

- **MVP:** Single-user. The user signs in with email/password (Supabase Auth).
- **Future:** Multi-user support. Each user sees only their own data. The data model already includes `user_id` on all tables to support this.
- **No anonymous access.** All API calls require a valid JWT.

### 6.2 Row-Level Security (RLS) Policies

All tables have RLS enabled.

```sql
-- profiles: users can only read/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- accounts: users can only CRUD their own accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own accounts"
  ON accounts FOR ALL USING (auth.uid() = user_id);

-- transactions: users can only CRUD their own transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own transactions"
  ON transactions FOR ALL USING (auth.uid() = user_id);
```

### 6.3 Client vs Server Responsibilities

| Responsibility | Client (Browser) | Server (Next.js Route Handlers) |
|---------------|-------------------|-------------------------------|
| Authentication | Sends JWT in cookie | Validates JWT via `getUser()` |
| Data reads | Calls Next.js API routes | Creates Supabase server client, queries with user's JWT (RLS enforced) |
| Data writes | Sends mutation to API route | Validates input, executes Supabase insert/update |
| Service role key | **NEVER exposed** | Used only if needed for admin ops (not in MVP) |
| Input validation | Basic client-side (UX only) | Canonical validation with Zod schemas |

### 6.4 Proxy Layer Design

```
Browser ──► Next.js Route Handlers (/app/api/...) ──► Supabase (with user's JWT)
               │
               ├─ GET  /api/accounts       → list accounts
               ├─ POST /api/accounts       → create account
               ├─ GET  /api/transactions    → list transactions (with filters)
               ├─ POST /api/transactions    → create transaction
               ├─ PATCH /api/transactions/:id → update (e.g. reimbursement status)
               └─ GET  /api/summary        → home page aggregated data
```

**Why a proxy layer:**
1. **Security:** The Supabase anon key + RLS is safe for client-side use, but Route Handlers allow us to add server-side validation (Zod), rate limiting, and logging without exposing any keys.
2. **Abstraction:** If we later swap Supabase for another DB, only the server layer changes.
3. **Performance:** Route Handlers can aggregate multiple queries (e.g., `/api/summary` joins accounts + transactions) in one round trip, reducing client-side waterfalls.
4. **Middleware:** The Next.js middleware refreshes auth tokens on every request (Ref 6).

---

## 7. UI/UX Spec (Mobile-First)

### 7.0 Design System Foundation

#### Color Palette

**Light mode (default):**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#FFFFFF` | Page background |
| `--bg-secondary` | `#F9FAFB` | Card backgrounds, alternating rows |
| `--bg-tertiary` | `#F3F4F6` | Chip backgrounds, input fields |
| `--text-primary` | `#111827` | Headings, primary content |
| `--text-secondary` | `#6B7280` | Labels, captions |
| `--text-tertiary` | `#9CA3AF` | Placeholder text |
| `--accent` | `#3B82F6` | Primary actions, active states, links |
| `--accent-soft` | `#EFF6FF` | Accent background tints |
| `--expense` | `#EF4444` | Negative amounts (expenses) |
| `--income` | `#10B981` | Positive amounts (income) |
| `--warning` | `#F59E0B` | Pending reimbursement badge |
| `--border` | `#E5E7EB` | Card borders, dividers |

**Dark mode:**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#111827` | Page background (dark grey, not pure black — Ref 8) |
| `--bg-secondary` | `#1F2937` | Cards |
| `--bg-tertiary` | `#374151` | Chips, inputs |
| `--text-primary` | `#F9FAFB` | Headings |
| `--text-secondary` | `#9CA3AF` | Labels |
| `--accent` | `#60A5FA` | Slightly lighter blue for dark bg contrast |
| `--expense` | `#F87171` | Softened red |
| `--income` | `#34D399` | Softened green |

#### Typography

- **Font:** `Inter` (variable weight) via `next/font` — optimized loading, clean geometric sans-serif
- **Scale:** Based on a 1.2 minor-third ratio
  - Display: 28px / 700 (total balance)
  - H1: 22px / 600 (section headers)
  - H2: 18px / 600 (card titles)
  - Body: 16px / 400 (default)
  - Caption: 14px / 400 (secondary info)
  - Small: 12px / 500 (badges, labels)
- **Line height:** 1.5 for body, 1.2 for headings
- **Monospace numbers:** Use `font-variant-numeric: tabular-nums` for all monetary values — ensures alignment in lists

#### Spacing

- Base unit: 4px
- Standard spacing: 8, 12, 16, 20, 24, 32, 40px
- Card padding: 16px
- Section gap: 24px
- Safe area: respect `env(safe-area-inset-bottom)` for bottom nav

#### Borders & Shadows

- Card radius: 16px
- Button radius: 12px
- Chip radius: 9999px (pill)
- Card shadow (light): `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`
- Card shadow (dark): `0 1px 3px rgba(0,0,0,0.3)` + 1px border `--bg-tertiary`

---

### 7.1 Home (首頁)

#### Layout

```
┌─────────────────────────────────┐
│  Header: "首頁"        [avatar] │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │ 💰 總覽 (Overview)          ││
│  │ 總餘額: NT$59,870           ││
│  │ 本月支出: NT$5,130          ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ ⚠ 待請款 3 筆 / NT$4,700   ││
│  │              查看 →         ││
│  └─────────────────────────────┘│
│                                 │
│  我的帳戶 (My Accounts)    [+] │
│  ┌─────────────────────────────┐│
│  │ 現金                        ││
│  │ 餘額: NT$49,920             ││
│  │ 本月支出: NT$80             ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ 玉山信用卡                   ││
│  │ 餘額: NT$-5,050             ││
│  │ 本月支出: NT$5,050          ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Line Pay                    ││
│  │ 餘額: NT$10,000             ││
│  │ 本月支出: NT$0              ││
│  └─────────────────────────────┘│
│                           [FAB] │
├──────────┬──────────┬───────────┤
│ 🏠 首頁  │ 💼 請款   │ 📋 明細   │
└──────────┴──────────┴───────────┘
```

#### Components

**Header:**
- Sticky top bar with page title (left) and avatar/settings icon (right)
- Height: 48px + status bar inset
- Semi-transparent background with backdrop blur on scroll

**Overview Card (hero):**
- Full-width card at top with gradient subtle background (accent-soft)
- Shows aggregated total balance (all accounts) in display typography
- Shows current month total spending in caption below
- Subtle animated number counter on load (counts up from 0 to actual value over 600ms)

**Pending Reimbursement Banner:**
- Appears only when pending count > 0
- Amber/warning color left border accent
- Shows: count + total amount + "查看 →" link
- Tapping navigates to 公司請款 tab with pending filter
- Dismissible? No — always visible when pending items exist

**Account Cards:**
- Vertically stacked, full-width
- Each shows: name, current balance (computed), month spending
- Balance color: positive = `--text-primary`, negative = `--expense`
- Right chevron icon indicating tappable
- Tap → navigates to Transactions tab filtered to that account
- "[+]" button in section header opens Add Account bottom sheet

**Empty State:**
- Illustration (simple line art, not Lottie) + "尚無帳戶，新增第一個帳戶" + CTA button
- Appears when user has 0 accounts

**Loading State:**
- Skeleton screens matching the card layout (Ref 3)
- Shimmer effect: left-to-right gradient sweep, 1.5s duration, infinite loop
- 3 skeleton cards + 1 skeleton hero card

**Error State:**
- Inline error banner below header: "無法載入資料，請重試" + retry button
- Does not replace entire screen — previously loaded data persists if available

---

### 7.2 Company Reimbursement (公司請款)

#### Layout

```
┌─────────────────────────────────┐
│  Header: "公司請款"             │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │ 待請款總額: NT$4,700        ││
│  └─────────────────────────────┘│
│                                 │
│  [待請款] [已請款] [已收款]      │
│                                 │
│  Chip row: [全部] [現金] [信用卡]│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 02/14  客戶晚餐    -NT$1,200││
│  │        玉山信用卡     [已請款]││
│  ├─────────────────────────────┤│
│  │ 02/10  辦公用品    -NT$3,500││
│  │        玉山信用卡     [已請款]││
│  └─────────────────────────────┘│
│                           [FAB] │
├──────────┬──────────┬───────────┤
│ 🏠 首頁  │ 💼 請款   │ 📋 明細   │
└──────────┴──────────┴───────────┘
```

#### Components

**Summary Card:**
- Shows total pending reimbursement amount in display typography
- Updates dynamically as items are marked claimed/paid
- When on "已請款" segment: shows "已請款總額: NT$X,XXX"
- When on "已收款" segment: shows "本月已收款: NT$X,XXX"

**Segmented Control:**
- 3 segments: 待請款 (Pending) / 已請款 (Claimed) / 已收款 (Paid)
- Pill-style indicator slides between segments with spring animation (Ref 5)
- Each segment shows count in parentheses: "待請款 (3)"
- Default selection: 待請款

**Account Filter Chips:**
- Same horizontal scrollable chip pattern as Transactions tab
- Filters reimbursement list by account

**Transaction List:**
- Grouped by date (sticky date headers)
- Each row: date, note, amount, account name, action button
- **Swipe right:** reveals green "已請款" action (pending → claimed) or "已收款" action (claimed → paid)
- **Quick-action button:** on the right side of each row, labeled with the next status
- On status change: item animates out (slide + fade) with `AnimatePresence` (Ref 5), undo toast appears at bottom for 5 seconds

**Empty State:**
- Per-segment empty states:
  - 待請款: "沒有待請款項目 🎉" (celebratory — no pending is good!)
  - 已請款: "尚無已請款項目"
  - 已收款: "尚無已收款記錄"

---

### 7.3 Transactions (交易明細)

#### Layout

```
┌─────────────────────────────────┐
│  Header: "交易明細"      [搜尋] │
├─────────────────────────────────┤
│  Chip row: [全部] [現金] [信用卡]│
│                                 │
│  2026年2月15日 (六)             │
│  ┌─────────────────────────────┐│
│  │ 午餐           -NT$350     ││
│  │ 玉山信用卡                   ││
│  ├─────────────────────────────┤│
│  │ 客戶晚餐 🏢    -NT$1,200   ││
│  │ 玉山信用卡       待請款      ││
│  └─────────────────────────────┘│
│                                 │
│  2026年2月14日 (五)             │
│  ┌─────────────────────────────┐│
│  │ 飲料            -NT$80     ││
│  │ 現金                        ││
│  └─────────────────────────────┘│
│                                 │
│  ...                            │
│                           [FAB] │
├──────────┬──────────┬───────────┤
│ 🏠 首頁  │ 💼 請款   │ 📋 明細   │
└──────────┴──────────┴───────────┘
```

#### Components

**Header:**
- Title "交易明細" + search icon (right)
- Search icon opens an animated search bar (expands from icon position)
- Search filters by note text (client-side filter for snappy UX)

**Account Filter Chips:**
- Horizontal scrollable chip row, sticky below header
- "全部" selected by default
- If navigated from Home account card, the relevant account chip is pre-selected

**Transaction List:**
- Grouped by date with sticky date section headers
- Date header format: "2026年2月15日 (六)" — year-month-day + day of week
- Each transaction row:
  - Left: note text (primary) + account name (caption)
  - Right: amount (expense in red, income in green)
  - If company advance: small 🏢 icon beside note + "待請款/已請款/已收款" tag
- Pull-to-refresh gesture (Ref 4)
- Infinite scroll / pagination: load 50 items initially, load more on scroll to bottom

**Tap on transaction row:**
- Opens detail bottom sheet with all fields + edit/delete actions
- Edit opens the same bottom sheet as Add but pre-filled
- Delete requires confirmation dialog: "確定要刪除這筆交易？"

**Empty State:**
- "尚無交易記錄" + illustration + "新增第一筆交易" CTA button

---

### 7.4 Add Transaction Bottom Sheet

```
┌─────────────────────────────────┐
│  ─── (drag handle)              │
│                                 │
│  新增交易                       │
│                                 │
│  [支出 ●] [○ 收入]     toggle   │
│                                 │
│  金額                           │
│  ┌─────────────────────────────┐│
│  │ NT$ 350                     ││
│  └─────────────────────────────┘│
│                                 │
│  帳戶                           │
│  ┌─────────────────────────────┐│
│  │ 玉山信用卡              ▼   ││
│  └─────────────────────────────┘│
│                                 │
│  日期                           │
│  ┌─────────────────────────────┐│
│  │ 2026/02/15              📅  ││
│  └─────────────────────────────┘│
│                                 │
│  備註                           │
│  ┌─────────────────────────────┐│
│  │ 午餐                        ││
│  └─────────────────────────────┘│
│                                 │
│  ☐ 公司代墊                     │
│                                 │
│  ┌─────────────────────────────┐│
│  │         儲存交易              ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Behavior:**
- Opens as a bottom sheet (not full page) — slides up with spring animation
- Can be dismissed by dragging down or tapping overlay
- Amount field auto-focuses with numeric keyboard
- Account dropdown defaults to last-used account (stored in `localStorage`)
- Date defaults to today; tapping opens native date picker
- "公司代墊" toggle: when ON, a subtle blue highlight appears on the toggle area
- Submit button: full-width, accent color, disabled state when required fields empty
- On submit success: sheet slides down + checkmark animation overlays briefly (300ms)

---

### 7.5 Add Account Bottom Sheet

```
┌─────────────────────────────────┐
│  ─── (drag handle)              │
│                                 │
│  新增帳戶                       │
│                                 │
│  帳戶名稱                       │
│  ┌─────────────────────────────┐│
│  │ e.g. 玉山信用卡              ││
│  └─────────────────────────────┘│
│                                 │
│  初始餘額                       │
│  ┌─────────────────────────────┐│
│  │ NT$ 0                      ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │         新增帳戶              ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Behavior:**
- Compact bottom sheet (does not need to be full-height)
- Name field auto-focuses
- Validation: duplicate name shows inline error "此帳戶名稱已存在"
- On success: sheet dismisses, new account card animates into the list from below (Ref 5)

---

## 8. Animation & Micro-Interactions

### 8.1 Motion Principles

| Principle | Specification |
|-----------|--------------|
| **Duration range** | 150ms (micro) — 400ms (page transitions) — never > 500ms |
| **Easing** | Spring-based for physical feel: `type: "spring", stiffness: 300, damping: 30`. CSS fallback: `cubic-bezier(0.32, 0.72, 0, 1)` (Apple-like deceleration) |
| **Reduced motion** | All animations respect `prefers-reduced-motion: reduce`. When active: instant state changes, no movement, opacity transitions only (150ms). Implementation: wrap Motion components in a `useReducedMotion()` hook check |
| **Performance** | Animate only `transform` and `opacity` (GPU-composited). Never animate `width`, `height`, `top`, `left` |
| **Consistency** | Same easing and duration for the same class of animation across the app |

### 8.2 Implementation: Motion (Framer Motion) Library

**Why Motion (Ref 5):**
- Declarative API fits React component model
- `layout` prop handles layout shift animations automatically
- `AnimatePresence` handles enter/exit without manual state management
- Gesture props (`whileTap`, `drag`) built in
- Tree-shakeable — only import what's used (~15KB for core)

**Where NOT to use Motion:**
- Simple hover/focus states → CSS transitions (0 JS overhead)
- Skeleton shimmer → CSS `@keyframes` (runs on compositor thread)
- Bottom nav active indicator slide → CSS `transition: transform` on a pseudo-element

### 8.3 Animation Catalog

#### Page Transitions (Tab Switches)

```tsx
// Shared layout ID on bottom nav indicator
<motion.div layoutId="tab-indicator" className="tab-active-bg" />

// Content crossfade between tabs
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2 }}
  />
</AnimatePresence>
```
- Tab indicator: slides horizontally using `layoutId` (shared layout animation)
- Content: subtle crossfade + 8px vertical shift (200ms)
- No horizontal slide — tabs are not sequential, so directional animation would be misleading

#### Account Switch (Chip Filter)

```tsx
// Chip active background slides via layoutId
<motion.span layoutId="chip-active" className="chip-bg" />

// Transaction list re-renders with layout animation
<motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
  {filteredTransactions.map(tx => (
    <motion.div key={tx.id} layout animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <TransactionRow tx={tx} />
    </motion.div>
  ))}
</motion.div>
```
- Active chip background pill slides to the tapped chip (shared `layoutId`)
- Transaction list items animate position smoothly as the list filters (Motion `layout` prop)
- Items entering: fade in + slide up (150ms)
- Items exiting: fade out (100ms)

#### Add Transaction — Success Animation

```tsx
// On successful submit:
<motion.div
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.8, opacity: 0 }}
  transition={{ type: "spring", stiffness: 400, damping: 20 }}
>
  <CheckCircleIcon className="text-income w-16 h-16" />
</motion.div>
```
- Sheet slides down (200ms spring)
- Green checkmark scales up from center (300ms spring) then fades out
- New transaction item slides into the list from the top with a gentle spring
- Keep it simple — no confetti (that's for games, not finance)

#### List Item Insert / Remove

- **Insert (new transaction):** `initial={{ opacity: 0, height: 0 }}` → `animate={{ opacity: 1, height: "auto" }}` (300ms spring)
- **Remove (swipe action / status change):** item slides right + fades out (200ms), remaining items collapse upward with `layout` animation
- **Reorder (when sort changes):** Motion `layout` prop handles position interpolation automatically

#### Skeleton Loading (CSS-only)

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-tertiary) 25%,
    var(--bg-secondary) 50%,
    var(--bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```
- Matches exact dimensions of real content (card height, text line widths)
- Uses CSS only — no JS runtime cost
- Respects reduced motion: `@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }`

#### Bottom Sheet Open / Close

- **Open:** `y: "100%"` → `y: 0` with spring (stiffness: 400, damping: 35). Overlay fades in 200ms.
- **Close:** reverse + drag-to-dismiss (if dragged > 30% of sheet height, dismiss; else snap back)
- **Backdrop:** semi-transparent overlay (#000 at 40% opacity) fades in/out

#### Number Counter (Home Balance)

- On data load, animate the balance number from 0 to actual value over 600ms
- Use `useMotionValue` + `useTransform` + `animate` from Motion
- Easing: ease-out for a satisfying deceleration
- Disabled when reduced motion is preferred

#### FAB Press

- `whileTap={{ scale: 0.92 }}` — subtle 8% shrink on press (instant feedback)
- Shadow elevation increases slightly on press

#### Pull-to-Refresh

- Custom implementation using touch events + Motion
- Indicator: small spinner appears above list, max pull distance 80px
- On release past threshold: spinner stays, data refreshes, spinner exits with fade

#### Undo Toast

- Enters from bottom: `initial={{ y: 50, opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`
- Auto-dismisses after 5 seconds with fade-out
- Contains "已更新" message + "復原" (Undo) button

---

## 9. Analytics & Logging

### 9.1 Event Tracking

| Event Name | Trigger | Properties |
|-----------|---------|-----------|
| `page_view` | Tab switch or initial load | `tab_name`, `timestamp` |
| `add_transaction_start` | FAB tapped | `source_tab` |
| `add_transaction_submit` | Transaction saved successfully | `amount`, `is_company_advance`, `account_id`, `time_to_submit_ms` |
| `add_transaction_cancel` | Bottom sheet dismissed without saving | `fields_filled_count` |
| `add_account_submit` | Account created | `initial_balance` |
| `filter_account` | Account chip tapped | `account_id`, `tab_name` |
| `reimbursement_status_change` | Status updated | `from_status`, `to_status`, `transaction_id` |
| `reimbursement_undo` | Undo toast tapped | `reverted_status` |
| `reimbursement_segment_switch` | Segmented control tapped | `segment_name` |
| `search_open` | Search icon tapped | `tab_name` |
| `search_query` | Search text entered (debounced 500ms) | `query_length` |
| `pull_to_refresh` | Pull-to-refresh triggered | `tab_name` |
| `transaction_detail_view` | Transaction row tapped | `transaction_id` |
| `transaction_delete` | Transaction deleted | `transaction_id` |

### 9.2 Implementation

- Use a lightweight analytics wrapper (e.g., a custom `track()` function)
- MVP: log events to `console.log` in development + a simple `events` table in Supabase (or a free tier of PostHog/Mixpanel)
- Events are fire-and-forget (non-blocking, no impact on UX)
- No PII in event properties — use IDs, not names

### 9.3 Error Logging

- Client-side: catch unhandled errors with `window.onerror` and React error boundaries
- Server-side: try/catch in all Route Handlers, log to stdout (Vercel captures this automatically)
- Log format: `{ timestamp, error_message, stack, route, user_id (hashed) }`
- MVP: console-based. Future: Sentry integration.

---

## 10. Performance & Quality

### 10.1 Performance Budget

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint (4G) | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Web Vitals |
| Total Blocking Time | < 200ms | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Web Vitals |
| JS bundle (initial route) | < 100KB gzipped | Next.js bundle analyzer |
| Time to Interactive | < 3s on 4G | Lighthouse |

### 10.2 Caching Strategy

| Layer | Strategy | Details |
|-------|----------|---------|
| **Server Components (RSC)** | Dynamic rendering | Auth-dependent data cannot be statically cached. Use `export const dynamic = 'force-dynamic'` for data routes. |
| **Route Handlers** | Short TTL cache headers | `Cache-Control: private, max-age=0, must-revalidate` for authenticated data. |
| **Client-side** | React Query (TanStack Query) | `staleTime: 30s` for account/transaction lists. `gcTime: 5min`. Optimistic updates for mutations. (Ref 7) |
| **Mutation invalidation** | On successful write, invalidate relevant query keys | e.g., after adding a transaction, invalidate `['transactions', accountId]` and `['accounts']` (balance changed) |
| **Static assets** | Immutable cache | Next.js `_next/static` files get `Cache-Control: public, max-age=31536000, immutable` by default |

### 10.3 Optimistic Updates

For snappy UX, mutations should update the UI immediately before server confirmation:
- **Add transaction:** Insert into local React Query cache immediately; roll back on server error
- **Status change (reimbursement):** Move item to new segment immediately; roll back if API fails
- Error rollback shows a toast: "操作失敗，請重試"

### 10.4 Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Color contrast | WCAG AA minimum (4.5:1 for text, 3:1 for large text). Verified for both light and dark modes. |
| Focus management | Bottom sheet traps focus when open. Tab navigation works for all interactive elements. |
| Screen reader | All icons have `aria-label`. Transaction amounts include sign in `aria-label` (e.g., "支出 350 元"). |
| Reduced motion | All animations disabled or simplified via `prefers-reduced-motion` media query. |
| Touch targets | Minimum 44×44px for all interactive elements (Ref 2). FAB: 56×56px. |
| Language | `lang="zh-Hant"` on `<html>` element. |

---

## 11. Milestones & Scope

### 11.1 MVP (Milestone 1)

**Goal:** Core expense tracking with reimbursement workflow. Ship in ~3–4 weeks.

| Feature | Included |
|---------|----------|
| Supabase schema + RLS + seed data | Yes |
| Auth (email/password login) | Yes |
| Home tab with account cards + overview | Yes |
| Add account (bottom sheet) | Yes |
| Add transaction (bottom sheet + FAB) | Yes |
| Transactions tab with date grouping | Yes |
| Account filter chips | Yes |
| Company reimbursement tab (3-segment) | Yes |
| Mark claimed / paid (swipe + button) | Yes |
| Undo toast | Yes |
| Skeleton loading | Yes |
| Core animations (tab switch, list, bottom sheet) | Yes |
| Dark mode | Yes |
| Mobile responsive (375px–428px primary) | Yes |
| Basic analytics (console + event structure) | Yes |

### 11.2 V1 Enhancements (Milestone 2)

| Feature | Description |
|---------|-------------|
| Search | Full-text search across transaction notes |
| Edit transaction | Edit all fields from detail bottom sheet |
| Delete transaction | With confirmation dialog |
| Account reorder | Drag-and-drop to reorder accounts on Home |
| Pull-to-refresh | On transaction and reimbursement lists |
| Number counter animation | Animated balance on Home |
| PWA support | `manifest.json`, service worker for offline shell |
| Tablet/desktop layout | 2-column layout for wider screens |

### 11.3 Future Ideas (Backlog)

| Idea | Notes |
|------|-------|
| **Categories / tags** | Predefined + custom categories for expenses (餐飲, 交通, 娛樂, etc.) |
| **Monthly charts** | Pie chart for category breakdown, bar chart for daily spending |
| **Export CSV** | Download transaction history as CSV |
| **Multi-currency** | Support JPY, USD with exchange rate |
| **Receipt attachments** | Photo upload to Supabase Storage |
| **Recurring transactions** | Auto-create daily/weekly/monthly entries |
| **Multi-user** | Shared household accounts |
| **Budget limits** | Set monthly budget per category with alerts |
| **Bank statement import** | Parse CSV/OFX from bank exports |
| **Notifications** | Monthly summary push notification (PWA) |

---

## Assumptions

1. **Currency:** TWD (New Taiwan Dollar), stored as integers (1 = NT$1). No decimal handling needed.
2. **Single user MVP:** Auth exists but multi-user features (sharing, roles) are deferred.
3. **Manual entry only:** No bank integrations, OCR, or imports in MVP.
4. **Deployment:** Vercel (free tier) for Next.js; Supabase free tier for database.
5. **No categories in MVP:** Transactions have only a free-text note field. Categories are a V2 feature.
6. **Timezone:** All dates are stored as `date` (no timezone) — the user's local date at time of entry.
7. **Language:** UI is in Traditional Chinese (zh-Hant). No i18n framework needed for MVP — hardcoded strings.
8. **Balance can go negative:** Credit card accounts will naturally have negative balances. No enforcement.
9. **"Spent" = sum of negative amounts in current calendar month.** Income is excluded from spending calculation.
10. **Reimbursement flow is linear:** pending → claimed → paid. No skipping steps, no reversal (use undo within 5s window only).

---

*End of PRD — v1.0*
