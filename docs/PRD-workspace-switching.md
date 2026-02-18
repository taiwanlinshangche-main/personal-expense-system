# PRD: Workspace Switching (Personal / Company)

## Problem

The user manages two separate financial contexts — **Personal** and **Company** — but the app currently treats everything as one flat bucket. There is no way to separate personal expenses from company expenses, leading to mixed data in trends, summaries, and account balances.

## Goal

Add a **workspace** concept so the user can switch between "Personal" and "Company" profiles in Settings. Each workspace has its own accounts, transactions, categories, and trends — completely isolated.

- **Personal** workspace: Cash, SinoPac ATM, SinoPac Card, Taiwan Bank (current defaults)
- **Company** workspace: Taiwan Bank (single account)

---

## Current State Analysis

### Data Model (Single User, No Workspace)
```
profiles (id, display_name)
  └── accounts (user_id → profiles.id, name, group, initial_balance)
  └── categories (user_id → profiles.id, name, emoji)
  └── transactions (user_id → profiles.id, account_id → accounts.id, amount, ...)
```

### Key Files Affected
| Layer | File | Impact |
|-------|------|--------|
| **Schema** | `supabase/schema.sql` | New `workspaces` table, add `workspace_id` FK to accounts/categories/transactions |
| **Types** | `src/types/database.ts` | New `Workspace` type, update all entity types |
| **API Utils** | `src/lib/supabase/api-utils.ts` | Return active workspace_id |
| **Validation** | `src/lib/validations.ts` | Add workspace schemas |
| **API: Seed** | `src/app/api/seed/route.ts` | Create both workspaces + per-workspace defaults |
| **API: All routes** | `src/app/api/*/route.ts` | Filter by workspace_id (7 route files) |
| **State** | `src/hooks/useAppData.ts` | Add `currentWorkspace`, `workspaces`, `switchWorkspace` |
| **State** | `src/components/layout/AppShell.tsx` | Manage workspace state, refetch on switch |
| **UI: Settings** | `src/components/ui/SettingsSheet.tsx` | Workspace switcher UI |
| **UI: Overview** | `src/components/home/OverviewTab.tsx` | Dynamic account rendering (no more hardcoded rows) |
| **UI: Add Tx** | `src/components/ui/AddTransactionSheet.tsx` | Account list from current workspace only |
| **UI: Header** | `src/components/home/HomeContent.tsx` | Show active workspace indicator |

### What Does NOT Change
- Auth model (still anon user, no login)
- Tab structure (Overview, Expenses, Trends, Claims)
- Chart animations, calendar, date pickers
- Transaction row component
- Toast, BottomSheet, other base UI components

---

## Data Model Design

### New Table: `workspaces`
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Personal" | "Company"
  type TEXT NOT NULL DEFAULT 'personal', -- 'personal' | 'company'
  emoji TEXT DEFAULT '',                 -- optional icon
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false, -- which one is currently selected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
```

### Schema Migrations (Existing Tables)

#### accounts: add workspace_id
```sql
ALTER TABLE accounts ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
-- Backfill existing rows to "Personal" workspace
-- Then make NOT NULL
ALTER TABLE accounts ALTER COLUMN workspace_id SET NOT NULL;
-- Update unique constraint
ALTER TABLE accounts DROP CONSTRAINT accounts_user_id_name_key;
ALTER TABLE accounts ADD CONSTRAINT accounts_workspace_name_key UNIQUE(workspace_id, name);
```

#### categories: add workspace_id
```sql
ALTER TABLE categories ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE categories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE categories DROP CONSTRAINT categories_user_id_name_key;
ALTER TABLE categories ADD CONSTRAINT categories_workspace_name_key UNIQUE(workspace_id, name);
```

#### transactions: add workspace_id
```sql
ALTER TABLE transactions ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE transactions ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX idx_transactions_workspace ON transactions(workspace_id);
```

### Entity Relationship After Migration
```
profiles
  └── workspaces (user_id → profiles.id)
        ├── accounts (workspace_id → workspaces.id)
        ├── categories (workspace_id → workspaces.id)
        └── transactions (workspace_id → workspaces.id, account_id → accounts.id)
```

### Default Data Per Workspace

**Personal (seeded on first load):**
| Account | Group | Initial Balance |
|---------|-------|----------------|
| Cash | null | 0 |
| SinoPac ATM | sinopac | 0 |
| SinoPac Card | sinopac | 0 |
| Taiwan Bank | null | 0 |

| Category | Emoji |
|----------|-------|
| Food | 🍔 |
| Transport | 🚗 |
| Living | 🏠 |
| Love | ❤️ |

**Company (seeded on first load):**
| Account | Group | Initial Balance |
|---------|-------|----------------|
| Taiwan Bank | null | 0 |

| Category | Emoji |
|----------|-------|
| Travel | ✈️ |
| Meals | 🍱 |
| Office | 🖥️ |
| Transport | 🚕 |

---

## API Design

### New Endpoints

#### `GET /api/workspaces`
Returns all workspaces for the user.
```json
[
  { "id": "uuid-1", "name": "Personal", "type": "personal", "emoji": "🏠", "is_active": true },
  { "id": "uuid-2", "name": "Company", "type": "company", "emoji": "🏢", "is_active": false }
]
```

#### `PATCH /api/workspaces/:id/activate`
Sets one workspace as active, deactivates all others.
```json
{ "success": true, "workspace": { ... } }
```

### Modified Endpoints (All Existing Routes)

Every existing API route must accept and filter by workspace_id.

**Option A (Query param):** `GET /api/transactions?workspace_id=xxx`
**Option B (Header):** `X-Workspace-Id: xxx`
**Option C (Derive from is_active):** Server looks up active workspace for user

**Recommended: Option C** — The server reads the user's `is_active` workspace. This means:
- No client changes needed for every API call
- Workspace switch = one PATCH call, then refetch

**`getClient()` update:**
```typescript
export async function getClient() {
  // ... existing env check ...
  const supabase = createServerClient(url, serviceKey);

  // Look up active workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", ANON_USER_ID)
    .eq("is_active", true)
    .single();

  return {
    supabase,
    userId: ANON_USER_ID,
    workspaceId: workspace?.id ?? null,
    errorResponse: null,
  };
}
```

Every route then filters: `.eq("workspace_id", workspaceId)`

### Route-by-Route Changes

| Route | Change |
|-------|--------|
| `GET /api/summary` | Filter accounts by workspace_id |
| `GET /api/accounts` | Filter by workspace_id |
| `POST /api/accounts` | Include workspace_id in insert |
| `GET /api/transactions` | Filter by workspace_id |
| `POST /api/transactions` | Include workspace_id in insert |
| `PATCH /api/transactions/:id` | Verify tx belongs to active workspace |
| `DELETE /api/transactions/:id` | Verify tx belongs to active workspace |
| `GET /api/categories` | Filter by workspace_id |
| `POST /api/categories` | Include workspace_id in insert |
| `DELETE /api/categories/:id` | Verify category belongs to active workspace |
| `POST /api/seed` | Create both workspaces + defaults for each |

---

## UI Design

### Settings Sheet — Workspace Switcher
```
┌─────────────────────────────────┐
│  Settings                       │
│                                 │
│  Workspace                      │
│  ┌────────────┐ ┌────────────┐  │
│  │ 🏠 Personal│ │ 🏢 Company │  │
│  │  ● active  │ │            │  │
│  └────────────┘ └────────────┘  │
│                                 │
│  Categories                     │
│  (per-workspace categories)     │
│  ...                            │
└─────────────────────────────────┘
```

When user taps a workspace card:
1. Call `PATCH /api/workspaces/:id/activate`
2. Refetch all data (accounts, transactions, categories)
3. UI updates to show that workspace's data
4. All tabs (Overview, Expenses, Trends, Claims) reflect the new workspace

### Header — Active Workspace Indicator
Show a small label or emoji next to the avatar to indicate which workspace is active:
```
[👤]  🏠 Personal                    [🔍]
Overview  Expenses  Trends  Claims
```

When in Company mode:
```
[👤]  🏢 Company                     [🔍]
Overview  Expenses  Trends  Claims
```

### OverviewTab — Dynamic Accounts
**Current problem:** Hardcodes Cash/SinoPac/Taiwan Bank rows.
**Fix:** Render accounts dynamically from the workspace's account list.

For Personal workspace → shows Cash, SinoPac (ATM+Card), Taiwan Bank
For Company workspace → shows only Taiwan Bank

### AddTransactionSheet — Workspace-Scoped Accounts
The account selector only shows accounts from the active workspace.
Company mode → only Taiwan Bank available.

---

## State Management Changes

### AppDataContext additions
```typescript
interface AppDataContextType {
  // NEW
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;

  // EXISTING (unchanged interface, but data is workspace-scoped)
  accounts: AccountWithBalance[];
  transactions: TransactionWithAccount[];
  categories: Category[];
  // ... rest unchanged
}
```

### AppShell changes
```typescript
// On mount: fetch workspaces first, then fetch workspace-scoped data
useEffect(() => {
  fetchWorkspaces().then(() => fetchData());
}, []);

// Switch workspace handler
const switchWorkspace = async (workspaceId: string) => {
  await fetch(`/api/workspaces/${workspaceId}/activate`, { method: 'PATCH' });
  setWorkspaces(prev => prev.map(w => ({ ...w, is_active: w.id === workspaceId })));
  await fetchData(); // Refetch everything for new workspace
};
```

---

## Migration Strategy (Existing Data)

For users with existing data (accounts, transactions, categories):

1. Create "Personal" workspace (is_active = true)
2. Create "Company" workspace (is_active = false)
3. Backfill all existing accounts → Personal workspace
4. Backfill all existing categories → Personal workspace
5. Backfill all existing transactions → Personal workspace
6. Seed Company workspace with its defaults (Taiwan Bank + company categories)

This is a **non-destructive migration** — all existing data stays in Personal.

---

## 10-Week Implementation Plan

### Week 1 — Database Schema & Migration
**Goal:** New `workspaces` table + migration SQL ready to run

| Task | Details |
|------|---------|
| Design final schema | Write CREATE TABLE for workspaces |
| Write migration SQL | ALTER TABLE for accounts, categories, transactions (add workspace_id) |
| Write backfill SQL | Migrate existing data to "Personal" workspace |
| Write seed SQL for Company defaults | Taiwan Bank account + company categories |
| Test migration on staging | Run SQL in Supabase SQL Editor, verify data integrity |
| Update `supabase/schema.sql` | Full schema reference file |

**Deliverable:** `supabase/migration-workspaces.sql` — tested, ready to apply

**Risks:**
- FK constraints may block ALTER if data is inconsistent
- Must run migration in correct order (create workspaces → backfill → add NOT NULL)

---

### Week 2 — API Infrastructure
**Goal:** `getClient()` returns `workspaceId`, new workspace endpoints work

| Task | Details |
|------|---------|
| Update `api-utils.ts` | `getClient()` returns workspaceId from active workspace |
| Create `GET /api/workspaces` | List user's workspaces |
| Create `PATCH /api/workspaces/:id/activate` | Switch active workspace |
| Add Zod schemas | `createWorkspaceSchema`, `activateWorkspaceSchema` |
| Update types | Add `Workspace` type to `database.ts` |
| Test endpoints | curl/Postman verification |

**Deliverable:** Workspace CRUD API working, `getClient()` returns workspace context

---

### Week 3 — Update All Existing API Routes
**Goal:** Every data endpoint filters by active workspace_id

| Task | Details |
|------|---------|
| Update `GET /api/summary` | Filter accounts by workspace_id, compute per-workspace totals |
| Update `GET /api/accounts` | Add `.eq("workspace_id", workspaceId)` |
| Update `POST /api/accounts` | Include workspace_id in insert |
| Update `GET /api/transactions` | Filter by workspace_id |
| Update `POST /api/transactions` | Include workspace_id, verify account belongs to workspace |
| Update `PATCH /api/transactions/:id` | Verify tx belongs to active workspace |
| Update `DELETE /api/transactions/:id` | Same ownership check |
| Update `GET /api/categories` | Filter by workspace_id |
| Update `POST /api/categories` | Include workspace_id |
| Update `DELETE /api/categories/:id` | Verify ownership |
| Test all routes | Verify Personal returns personal data, Company returns company data |

**Deliverable:** All 7 route files updated, workspace isolation verified

---

### Week 4 — Update Seed Route & Auto-Migration
**Goal:** Seed creates both workspaces with correct defaults

| Task | Details |
|------|---------|
| Rewrite `POST /api/seed` | Create Personal + Company workspaces |
| Seed Personal defaults | Cash, SinoPac ATM, SinoPac Card, Taiwan Bank + Food/Transport/Living/Love |
| Seed Company defaults | Taiwan Bank + Travel/Meals/Office/Transport |
| Handle backfill | If old data exists without workspace_id, auto-migrate to Personal |
| Set Personal as default active | `is_active = true` |
| Idempotency | Don't duplicate if workspaces already exist |
| Test fresh install | Delete all data, verify seed creates both workspaces correctly |
| Test existing user | Verify migration preserves all existing data |

**Deliverable:** Seed route handles both fresh installs and migrations seamlessly

---

### Week 5 — State Management & Context
**Goal:** AppShell manages workspace state, context provides switching

| Task | Details |
|------|---------|
| Update `useAppData.ts` | Add `workspaces`, `currentWorkspace`, `switchWorkspace` to interface |
| Update `AppShell.tsx` fetch flow | Fetch workspaces first → then fetch scoped data |
| Implement `switchWorkspace()` | PATCH activate → refetch all data → update local state |
| Add workspace to context value | Pass new fields to AppDataContext.Provider |
| Loading state | Show skeleton while switching workspaces |
| Persist selection | Active workspace persisted server-side (is_active column) |
| Test context | Verify all child components receive correct workspace-scoped data |

**Deliverable:** `useAppData()` returns workspace-aware data, switching works end-to-end

---

### Week 6 — Settings UI: Workspace Switcher
**Goal:** User can switch workspaces from Settings sheet

| Task | Details |
|------|---------|
| Update `SettingsSheet.tsx` | Add "Workspace" section above Categories |
| Design workspace cards | Two cards side by side: Personal (🏠) and Company (🏢) |
| Active state indicator | Checkmark or ring highlight on active workspace |
| Tap to switch | Calls `switchWorkspace()`, shows loading, closes sheet |
| Categories section | Now shows per-workspace categories (auto-updates on switch) |
| Animation | Smooth transition when switching (fade out old, fade in new) |
| Test UX | Switch back and forth, verify data changes correctly |

**Deliverable:** Working workspace switcher in Settings

---

### Week 7 — Update Overview & Header
**Goal:** OverviewTab renders dynamic accounts, header shows workspace

| Task | Details |
|------|---------|
| Fix OverviewTab | Remove hardcoded Cash/SinoPac/Taiwan Bank rows |
| Dynamic account rendering | Render from `accounts` array, group by `group` field |
| Group logic | Accounts with same `group` value → rendered as expandable card |
| Solo accounts | Accounts with `group=null` → rendered as standalone rows |
| Handle Company mode | Only Taiwan Bank shows (single row, no groups) |
| Header workspace label | Show emoji + name next to avatar (e.g., "🏠 Personal") |
| Tap header label | Quick switch shortcut (opens workspace picker) |
| Test both modes | Verify Overview looks correct for Personal and Company |

**Deliverable:** Dynamic OverviewTab + workspace indicator in header

---

### Week 8 — Update AddTransactionSheet & ExpenseTab
**Goal:** Transaction forms and lists are workspace-scoped

| Task | Details |
|------|---------|
| AddTransactionSheet | Account selector shows only current workspace's accounts |
| Company mode | Only "Taiwan Bank" in account selector (simpler form) |
| Account grouping logic | Dynamic from workspace accounts (not hardcoded sinopac groups) |
| ExpenseTab | Already uses `useAppData()` — should auto-filter. Verify. |
| Trends (InsightTab) | Already uses `useAppData()` — verify account dropdown shows correct accounts |
| Claims tab | Already uses `useAppData()` — verify shows only current workspace's company advances |
| Test add transaction | Add in Personal, switch to Company, verify isolation |
| Test expense list | Verify Personal shows personal txns, Company shows company txns |

**Deliverable:** All tabs fully workspace-scoped

---

### Week 9 — Edge Cases, Polish & Testing
**Goal:** Handle all edge cases, smooth UX

| Task | Details |
|------|---------|
| Empty Company workspace | Nice empty state: "No transactions yet. Add your first company expense." |
| Workspace with no categories | Graceful handling in AddTransactionSheet (skip category selection) |
| In-flight mutations during switch | Cancel or queue mutations if user switches mid-request |
| Search overlay | Filter search results by current workspace |
| Optimistic updates | Verify all optimistic updates include workspace_id |
| Delete transaction | Verify account balance rollback is correct per-workspace |
| SFX | Play a distinct sound on workspace switch |
| Reduced motion | Respect `prefers-reduced-motion` for switch animation |
| localStorage | Clear cached "last used account" when switching workspace |
| Analytics | Track workspace switch events |

**Deliverable:** Rock-solid edge case handling, no data leaks between workspaces

---

### Week 10 — Final QA, Migration Dry Run & Deploy
**Goal:** Production-ready, migration tested on live data

| Task | Details |
|------|---------|
| Full regression test | Every feature in both workspaces |
| Migration dry run | Run migration SQL on a copy of production data |
| Verify data integrity | All existing transactions map to Personal workspace |
| Verify Company seed | Taiwan Bank + company categories created correctly |
| Performance check | Workspace switch should complete in < 500ms |
| Document migration steps | Step-by-step guide for running SQL in Supabase dashboard |
| Update MEMORY.md | Document new architecture, gotchas |
| Deploy | Apply migration SQL → deploy code → verify |
| Monitor | Watch for 500 errors, data inconsistencies |
| Rollback plan | If migration fails: revert code, workspace_id columns are nullable initially |

**Deliverable:** Feature live in production

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration corrupts existing data | High | Run on staging first, keep backups, nullable workspace_id initially |
| Performance: extra DB join on every request | Low | workspace_id indexed, single-user scale is trivial |
| User adds transaction during workspace switch | Medium | Disable mutations while switching (loading state) |
| Seed race condition | Low | Idempotent seed with ON CONFLICT DO NOTHING |
| OverviewTab refactor breaks layout | Medium | Week 7 is dedicated to this; test thoroughly |
| Categories orphaned between workspaces | Low | Categories are per-workspace; no cross-reference |
| Company workspace needs different reimbursement flow | Low | Same flow works; company just has different accounts |

---

## Success Metrics

- [ ] User can switch between Personal and Company in < 2 taps
- [ ] Switching takes < 500ms (including data refetch)
- [ ] Zero data leaks between workspaces
- [ ] Existing data fully preserved in Personal workspace after migration
- [ ] Company workspace starts with Taiwan Bank + company categories
- [ ] All 4 tabs (Overview, Expenses, Trends, Claims) respect active workspace
- [ ] Add Transaction sheet shows only active workspace's accounts
