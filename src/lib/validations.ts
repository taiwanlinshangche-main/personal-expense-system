import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(50),
  initial_balance: z.number().int().default(0),
});

export const createTransactionSchema = z.object({
  account_id: z.string().uuid("Please select an account"),
  amount: z.number().int().refine((v) => v !== 0, "Amount cannot be zero"),
  note: z.string().max(200).default(""),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  is_company_advance: z.boolean().default(false),
  category: z.string().max(50).nullable().default(null),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50),
  emoji: z.string().max(10).default(""),
});

export const updateTransactionSchema = z.object({
  reimbursement_status: z
    .enum(["pending", "claimed", "paid"])
    .optional(),
  amount: z.number().int().optional(),
  note: z.string().max(200).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  account_id: z.string().uuid().optional(),
  is_company_advance: z.boolean().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
