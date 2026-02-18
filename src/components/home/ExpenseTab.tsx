"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { useAppData } from "@/hooks/useAppData";
import { formatDateHeader, formatCurrency } from "@/lib/format";
import { CalendarRangePicker } from "@/components/ui/CalendarPicker";
import ChipFilter from "@/components/ui/ChipFilter";
import TransactionRow from "@/components/ui/TransactionRow";
import { cn } from "@/lib/cn";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export default function ExpenseTab() {
  const { transactions, accounts, onDeleteTransaction, newTxId } = useAppData();
  const [activeAccount, setActiveAccount] = useState("all");
  const monthRange = useMemo(getMonthRange, []);
  const [startDate, setStartDate] = useState(monthRange.start);
  const [endDate, setEndDate] = useState(monthRange.end);
  const [showCalendar, setShowCalendar] = useState(false);

  const accountOptions = [
    { value: "all", label: "All" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  // Compute per-account spending in the date range
  const accountSpending = useMemo(() => {
    const spending: Record<string, number> = {};
    for (const a of accounts) spending[a.id] = 0;
    for (const tx of transactions) {
      if (tx.amount >= 0) continue;
      if (startDate && tx.date < startDate) continue;
      if (endDate && tx.date > endDate) continue;
      spending[tx.account_id] = (spending[tx.account_id] || 0) + Math.abs(tx.amount);
    }
    return spending;
  }, [transactions, accounts, startDate, endDate]);

  const totalSpending = useMemo(() => {
    return Object.values(accountSpending).reduce((sum, v) => sum + v, 0);
  }, [accountSpending]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (activeAccount !== "all" && tx.account_id !== activeAccount) return false;
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    });
  }, [transactions, activeAccount, startDate, endDate]);

  const groupedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const groups: { date: string; label: string; items: typeof sorted }[] = [];
    let currentDate = "";
    sorted.forEach((tx) => {
      if (tx.date !== currentDate) {
        currentDate = tx.date;
        groups.push({ date: tx.date, label: formatDateHeader(tx.date), items: [] });
      }
      groups[groups.length - 1].items.push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  // Date range display label
  const rangeLabel = useMemo(() => {
    if (!startDate && !endDate) return "All time";
    const sd = startDate ? new Date(startDate + "T00:00:00") : null;
    const ed = endDate ? new Date(endDate + "T00:00:00") : null;
    if (sd && ed) return `${MONTH_SHORT[sd.getMonth()]} ${sd.getDate()} - ${MONTH_SHORT[ed.getMonth()]} ${ed.getDate()}, ${ed.getFullYear()}`;
    if (sd) return `From ${MONTH_SHORT[sd.getMonth()]} ${sd.getDate()}`;
    if (ed) return `Until ${MONTH_SHORT[ed.getMonth()]} ${ed.getDate()}`;
    return "";
  }, [startDate, endDate]);

  return (
    <div className="px-5 pb-8">
      {/* Spending summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-bg-secondary p-4 border border-border"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">Total Spending</p>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={cn(
              "text-[13px] font-medium px-3 py-1 rounded-full transition-colors",
              showCalendar ? "bg-text-primary text-bg-primary" : "bg-bg-tertiary text-text-secondary"
            )}
          >
            {rangeLabel}
          </button>
        </div>
        <p className="mt-1 text-[28px] font-bold tabular-nums text-expense leading-none">
          {formatCurrency(-totalSpending)}
        </p>

        {/* Per-account breakdown */}
        <div className="mt-3 space-y-1.5">
          {accounts.map((a) => {
            const spent = accountSpending[a.id] || 0;
            if (spent === 0) return null;
            return (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-[13px] text-text-secondary">{a.name}</span>
                <span className="text-[13px] font-medium tabular-nums text-text-primary">
                  {formatCurrency(-spent)}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Calendar range picker */}
      {showCalendar && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="mt-3 overflow-hidden"
        >
          <CalendarRangePicker
            startDate={startDate}
            endDate={endDate}
            onChangeStart={setStartDate}
            onChangeEnd={setEndDate}
            onClear={() => {
              setStartDate("");
              setEndDate("");
            }}
          />
        </motion.div>
      )}

      {/* Account filter chips */}
      <div className="mt-4">
        <ChipFilter
          options={accountOptions}
          value={activeAccount}
          onChange={setActiveAccount}
        />
      </div>

      {/* Transaction list */}
      <div className="mt-5">
        {filteredTransactions.length === 0 ? (
          <div className="mt-8 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-tertiary">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m3 0h3M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <p className="mt-3 text-text-secondary">No transactions in this period</p>
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
                    <TransactionRow key={tx.id} transaction={tx} onDelete={onDeleteTransaction} isNew={tx.id === newTxId} />
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
