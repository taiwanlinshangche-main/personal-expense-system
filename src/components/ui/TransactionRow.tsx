"use client";

import { motion } from "motion/react";
import type { TransactionWithAccount } from "@/types/database";
import { formatCurrency, formatTime24h, REIMBURSEMENT_LABELS } from "@/lib/format";
import { cn } from "@/lib/cn";

interface TransactionRowProps {
  transaction: TransactionWithAccount;
  onTap?: (tx: TransactionWithAccount) => void;
  showAccount?: boolean;
  actionButton?: {
    label: string;
    onClick: (tx: TransactionWithAccount) => void;
  };
}

export default function TransactionRow({
  transaction: tx,
  onTap,
  showAccount = true,
  actionButton,
}: TransactionRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center justify-between rounded-2xl bg-bg-secondary p-4 border border-border",
        onTap && "cursor-pointer active:bg-bg-tertiary transition-colors"
      )}
      onClick={() => onTap?.(tx)}
      role={onTap ? "button" : undefined}
      tabIndex={onTap ? 0 : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium text-text-primary">
            {tx.note || "(No note)"}
          </p>
          {tx.is_company_advance && (
            <span className="shrink-0 text-xs" aria-label="Company advance">
              🏢
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {showAccount && (
            <p className="text-sm text-text-secondary">
              {tx.account_name}
              <span className="text-text-tertiary"> · {formatTime24h(tx.created_at)}</span>
            </p>
          )}
          {tx.is_company_advance && tx.reimbursement_status && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[11px] font-medium",
                tx.reimbursement_status === "pending" &&
                  "bg-warning-soft text-warning",
                tx.reimbursement_status === "claimed" &&
                  "bg-accent-soft text-accent",
                tx.reimbursement_status === "paid" &&
                  "bg-bg-tertiary text-income"
              )}
            >
              {REIMBURSEMENT_LABELS[tx.reimbursement_status]}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        <p
          className={cn(
            "font-semibold tabular-nums",
            tx.amount < 0 ? "text-expense" : "text-income"
          )}
        >
          {formatCurrency(tx.amount)}
        </p>
        {actionButton && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              actionButton.onClick(tx);
            }}
            className="rounded-lg bg-btn-primary-bg px-3 py-1.5 text-xs font-medium text-btn-primary-text active:bg-btn-primary-hover transition-colors"
          >
            {actionButton.label}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
