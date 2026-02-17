"use client";

import { useState, useMemo } from "react";
import type { TransactionWithAccount, AccountWithBalance } from "@/types/database";
import { formatDateHeader } from "@/lib/format";
import ChipFilter from "@/components/ui/ChipFilter";
import TransactionRow from "@/components/ui/TransactionRow";
import { TransactionListSkeleton } from "@/components/ui/Skeleton";

interface TransactionsContentProps {
  transactions: TransactionWithAccount[];
  accounts: AccountWithBalance[];
  initialAccountFilter?: string;
  isLoading?: boolean;
  onTransactionTap?: (tx: TransactionWithAccount) => void;
}

export default function TransactionsContent({
  transactions,
  accounts,
  initialAccountFilter = "all",
  isLoading,
  onTransactionTap,
}: TransactionsContentProps) {
  const [activeAccount, setActiveAccount] = useState(initialAccountFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Account filter options
  const accountOptions = [
    { value: "all", label: "All" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (activeAccount !== "all" && tx.account_id !== activeAccount)
        return false;
      if (
        searchQuery &&
        !tx.note.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [transactions, activeAccount, searchQuery]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: { date: string; label: string; items: TransactionWithAccount[] }[] =
      [];
    let currentDate = "";

    filteredTransactions.forEach((tx) => {
      if (tx.date !== currentDate) {
        currentDate = tx.date;
        groups.push({
          date: tx.date,
          label: formatDateHeader(tx.date),
          items: [],
        });
      }
      groups[groups.length - 1].items.push(tx);
    });

    return groups;
  }, [filteredTransactions]);

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-text-primary">
          Transactions
        </h1>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="rounded-lg p-2 text-text-secondary active:bg-bg-tertiary transition-colors"
          aria-label="Search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </header>

      {/* Search bar */}
      {showSearch && (
        <div className="mt-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            autoFocus
            className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent transition-colors"
          />
        </div>
      )}

      {/* Account Filter Chips */}
      <div className="mt-4">
        <ChipFilter
          options={accountOptions}
          value={activeAccount}
          onChange={setActiveAccount}
        />
      </div>

      {/* Transaction List */}
      <div className="mt-5">
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
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m3 0h3M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <p className="mt-3 text-text-secondary">
              {searchQuery ? "No matching transactions" : "No transactions yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedTransactions.map((group) => (
              <div key={group.date}>
                <p className="sticky top-0 z-10 bg-bg-primary py-1 text-sm font-medium text-text-secondary">
                  {group.label}
                </p>
                <div className="mt-2 space-y-2">
                  {group.items.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      onTap={onTransactionTap}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
