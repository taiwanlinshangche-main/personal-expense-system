-- =============================================
-- Seed Data (run after creating a user via Supabase Auth)
-- Replace 'YOUR_USER_ID' with actual auth.users UUID
-- =============================================

-- Example: Insert accounts
-- INSERT INTO accounts (user_id, name, initial_balance, sort_order) VALUES
--   ('YOUR_USER_ID', '現金', 50000, 0),
--   ('YOUR_USER_ID', '玉山信用卡', 0, 1),
--   ('YOUR_USER_ID', 'Line Pay', 10000, 2);

-- Example: Insert transactions (references account IDs from above)
-- INSERT INTO transactions (user_id, account_id, amount, note, date, is_company_advance, reimbursement_status) VALUES
--   ('YOUR_USER_ID', '<cash_account_id>', -80, '飲料', '2026-02-14', false, NULL),
--   ('YOUR_USER_ID', '<credit_account_id>', -350, '午餐', '2026-02-15', false, NULL),
--   ('YOUR_USER_ID', '<credit_account_id>', -1200, '客戶晚餐', '2026-02-14', true, 'pending'),
--   ('YOUR_USER_ID', '<credit_account_id>', -3500, '辦公用品', '2026-02-10', true, 'claimed'),
--   ('YOUR_USER_ID', '<cash_account_id>', 30000, '薪水', '2026-02-01', false, NULL);
