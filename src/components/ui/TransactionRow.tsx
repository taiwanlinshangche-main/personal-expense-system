"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { TransactionWithAccount } from "@/types/database";
import { formatCurrency, formatTime24h, REIMBURSEMENT_LABELS } from "@/lib/format";
import { cn } from "@/lib/cn";

interface TransactionRowProps {
  transaction: TransactionWithAccount;
  onTap?: (tx: TransactionWithAccount) => void;
  onDelete?: (txId: string) => void;
  showAccount?: boolean;
  actionButton?: {
    label: string;
    onClick: (tx: TransactionWithAccount) => void;
  };
}

export default function TransactionRow({
  transaction: tx,
  onTap,
  onDelete,
  showAccount = true,
  actionButton,
}: TransactionRowProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    if (showConfirm) return;
    if (onTap) {
      onTap(tx);
    } else if (onDelete) {
      setShowConfirm(true);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-2xl bg-bg-secondary border border-border overflow-hidden",
        (onTap || onDelete) && "cursor-pointer active:bg-bg-tertiary transition-colors"
      )}
      onClick={handleClick}
      role={(onTap || onDelete) ? "button" : undefined}
      tabIndex={(onTap || onDelete) ? 0 : undefined}
    >
      <div className="flex items-center justify-between p-4">
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
      </div>

      {/* Delete confirmation bar */}
      <AnimatePresence>
        {showConfirm && onDelete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-border"
          >
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm text-text-secondary">Delete this transaction?</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirm(false);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary active:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(tx.id);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-expense active:opacity-80 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
