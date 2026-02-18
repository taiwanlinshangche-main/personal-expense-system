-- =============================================
-- Migration 001: Add Workspaces
-- Run this in Supabase SQL Editor
-- =============================================

BEGIN;

-- -----------------------------------------------
-- 1. Create workspaces table
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'company')),
  emoji TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);

-- -----------------------------------------------
-- 2. RLS policies for workspaces
-- -----------------------------------------------
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------
-- 3. Updated_at trigger for workspaces
-- -----------------------------------------------
CREATE OR REPLACE TRIGGER set_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------
-- 4. Insert default workspaces for existing user
-- -----------------------------------------------
INSERT INTO workspaces (user_id, name, type, emoji, sort_order, is_active)
SELECT
  '00000000-0000-0000-0000-000000000000',
  ws.name,
  ws.type,
  ws.emoji,
  ws.sort_order,
  ws.is_active
FROM (VALUES
  ('Personal', 'personal', '🏠', 0, true),
  ('Company',  'company',  '🏢', 1, false)
) AS ws(name, type, emoji, sort_order, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
    AND workspaces.name = ws.name
);

-- -----------------------------------------------
-- 5. Add workspace_id to accounts
-- -----------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'workspace_id'
  ) THEN
    -- Add nullable column
    ALTER TABLE accounts ADD COLUMN workspace_id UUID;

    -- Backfill: assign all existing accounts to the Personal workspace
    UPDATE accounts
    SET workspace_id = (
      SELECT id FROM workspaces
      WHERE user_id = '00000000-0000-0000-0000-000000000000'
        AND type = 'personal'
      LIMIT 1
    )
    WHERE workspace_id IS NULL;

    -- Set NOT NULL
    ALTER TABLE accounts ALTER COLUMN workspace_id SET NOT NULL;

    -- Add FK constraint
    ALTER TABLE accounts
      ADD CONSTRAINT accounts_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

    -- Add index
    CREATE INDEX idx_accounts_workspace_id ON accounts(workspace_id);
  END IF;
END$$;

-- -----------------------------------------------
-- 6. Add workspace_id to categories
-- -----------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN workspace_id UUID;

    UPDATE categories
    SET workspace_id = (
      SELECT id FROM workspaces
      WHERE user_id = '00000000-0000-0000-0000-000000000000'
        AND type = 'personal'
      LIMIT 1
    )
    WHERE workspace_id IS NULL;

    ALTER TABLE categories ALTER COLUMN workspace_id SET NOT NULL;

    ALTER TABLE categories
      ADD CONSTRAINT categories_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

    CREATE INDEX idx_categories_workspace_id ON categories(workspace_id);
  END IF;
END$$;

-- -----------------------------------------------
-- 7. Add workspace_id to transactions
-- -----------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN workspace_id UUID;

    UPDATE transactions
    SET workspace_id = (
      SELECT id FROM workspaces
      WHERE user_id = '00000000-0000-0000-0000-000000000000'
        AND type = 'personal'
      LIMIT 1
    )
    WHERE workspace_id IS NULL;

    ALTER TABLE transactions ALTER COLUMN workspace_id SET NOT NULL;

    ALTER TABLE transactions
      ADD CONSTRAINT transactions_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

    CREATE INDEX idx_transactions_workspace_id ON transactions(workspace_id);
  END IF;
END$$;

-- -----------------------------------------------
-- 8. Update unique constraints to scope by workspace
-- -----------------------------------------------

-- accounts: (user_id, name) → (workspace_id, name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounts_user_id_name_key'
  ) THEN
    ALTER TABLE accounts DROP CONSTRAINT accounts_user_id_name_key;
    ALTER TABLE accounts ADD CONSTRAINT accounts_workspace_id_name_key UNIQUE (workspace_id, name);
  END IF;
END$$;

-- categories: (user_id, name) → (workspace_id, name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_user_id_name_key'
  ) THEN
    ALTER TABLE categories DROP CONSTRAINT categories_user_id_name_key;
    ALTER TABLE categories ADD CONSTRAINT categories_workspace_id_name_key UNIQUE (workspace_id, name);
  END IF;
END$$;

-- -----------------------------------------------
-- 9. Seed Company workspace with default data
-- -----------------------------------------------
DO $$
DECLARE
  company_ws_id UUID;
  anon_user_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  SELECT id INTO company_ws_id
  FROM workspaces
  WHERE user_id = anon_user_id AND type = 'company'
  LIMIT 1;

  IF company_ws_id IS NOT NULL THEN
    -- Seed 1 account: Taiwan Bank
    INSERT INTO accounts (user_id, workspace_id, name, "group", initial_balance, sort_order)
    SELECT anon_user_id, company_ws_id, 'Taiwan Bank', NULL, 0, 0
    WHERE NOT EXISTS (
      SELECT 1 FROM accounts
      WHERE workspace_id = company_ws_id AND name = 'Taiwan Bank'
    );

    -- Seed 4 categories
    INSERT INTO categories (user_id, workspace_id, name, emoji, sort_order, is_default)
    SELECT anon_user_id, company_ws_id, c.name, c.emoji, c.sort_order, true
    FROM (VALUES
      ('Travel',    '✈️', 0),
      ('Meals',     '🍱', 1),
      ('Office',    '🏢', 2),
      ('Transport', '🚕', 3)
    ) AS c(name, emoji, sort_order)
    WHERE NOT EXISTS (
      SELECT 1 FROM categories
      WHERE workspace_id = company_ws_id AND categories.name = c.name
    );
  END IF;
END$$;

COMMIT;
