"use client";

import { useState, useMemo } from "react";
import { AnimatePresence } from "motion/react";
import type { TransactionWithAccount, AccountWithBalance, ReimbursementStatus } from "@/types/database";
import { formatCurrency } from "@/lib/format";
import SegmentedControl from "@/components/ui/SegmentedControl";
import ChipFilter from "@/components/ui/ChipFilter";
import TransactionRow from "@/components/ui/TransactionRow";
import { TransactionListSkeleton } from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";

interface ReimbursementContentProps {
  transactions: TransactionWithAccount[];
  accounts: AccountWithBalance[];
  isLoading?: boolean;
  onStatusChange: (
    txId: string,
    newStatus: ReimbursementStatus
  ) => void;
}

const SEGMENTS = [
  { value: "pending", label: "Pending" },
  { value: "claimed", label: "Claimed" },
  { value: "paid", label: "Paid" },
];

export default function ReimbursementContent({
  transactions,
  accounts,
  isLoading,
  onStatusChange,
}: ReimbursementContentProps) {
  const [activeSegment, setActiveSegment] = useState("pending");
  const [activeAccount, setActiveAccount] = useState("all");

  // Count items per segment
  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, claimed: 0, paid: 0 };
    transactions.forEach((tx) => {
      if (tx.reimbursement_status) {
        counts[tx.reimbursement_status] =
          (counts[tx.reimbursement_status] || 0) + 1;
      }
    });
    return counts;
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.reimbursement_status !== activeSegment) return false;
      if (activeAccount !== "all" && tx.account_id !== activeAccount)
        return false;
      return true;
    });
  }, [transactions, activeSegment, activeAccount]);

  // Total for active segment
  const segmentTotal = useMemo(() => {
    return filteredTransactions.reduce(
      (sum, tx) => sum + Math.abs(tx.amount),
      0
    );
  }, [filteredTransactions]);

  // Account filter options
  const accountOptions = [
    { value: "all", label: "All" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  // Segment labels for summary
  const summaryLabels: Record<string, string> = {
    pending: "Pending Total",
    claimed: "Claimed Total",
    paid: "Paid Total",
  };

  // Next status action
  const getActionButton = (tx: TransactionWithAccount) => {
    if (tx.reimbursement_status === "pending") {
      return {
        label: "Claimed",
        onClick: (t: TransactionWithAccount) => {
          onStatusChange(t.id, "claimed");
          showToast({
            message: "Marked as claimed",
            action: {
              label: "Undo",
              onClick: () => onStatusChange(t.id, "pending"),
            },
          });
        },
      };
    }
    if (tx.reimbursement_status === "claimed") {
      return {
        label: "Paid",
        onClick: (t: TransactionWithAccount) => {
          onStatusChange(t.id, "paid");
          showToast({
            message: "Marked as paid",
            action: {
              label: "Undo",
              onClick: () => onStatusChange(t.id, "claimed"),
            },
          });
        },
      };
    }
    return undefined;
  };

  // Empty state messages
  const emptyMessages: Record<string, string> = {
    pending: "No pending items",
    claimed: "No claimed items yet",
    paid: "No paid records yet",
  };

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <header>
        <h1 className="text-[22px] font-semibold text-text-primary">
          Reimbursement
        </h1>
      </header>

      {/* Summary Card */}
      <section className="mt-5 rounded-2xl bg-accent-soft p-5 border border-border">
        <p className="text-sm text-text-secondary">
          {summaryLabels[activeSegment]}
        </p>
        <p className="mt-1 text-[28px] font-bold tabular-nums text-text-primary">
          {formatCurrency(segmentTotal)}
        </p>
      </section>

      {/* Segmented Control */}
      <div className="mt-4">
        <SegmentedControl
          segments={SEGMENTS.map((s) => ({
            ...s,
            count: segmentCounts[s.value],
          }))}
          value={activeSegment}
          onChange={setActiveSegment}
        />
      </div>

      {/* Account Filter */}
      {accounts.length > 1 && (
        <div className="mt-3">
          <ChipFilter
            options={accountOptions}
            value={activeAccount}
            onChange={setActiveAccount}
          />
        </div>
      )}

      {/* Transaction List */}
      <div className="mt-4">
        {isLoading ? (
          <TransactionListSkeleton />
        ) : filteredTransactions.length === 0 ? (
          <div className="mt-8 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-tertiary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-text-tertiary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <p className="mt-3 text-text-secondary">
              {emptyMessages[activeSegment]}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  showAccount={true}
                  actionButton={getActionButton(tx)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
