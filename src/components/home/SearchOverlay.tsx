"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { useAppData } from "@/hooks/useAppData";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { CATEGORY_EMOJI } from "@/lib/constants";
import { CalendarRangePicker } from "@/components/ui/CalendarPicker";
import { cn } from "@/lib/cn";

interface SearchOverlayProps {
  onClose: () => void;
}

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const { transactions } = useAppData();
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filter transactions
  const results = useMemo(() => {
    let filtered = [...transactions];

    // Name filter
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.note.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          t.account_name.toLowerCase().includes(q)
      );
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter((t) => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((t) => t.date <= endDate);
    }

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactions, query, startDate, endDate]);

  const hasFilters = query.trim() || startDate || endDate;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-bg-primary"
    >
      <div className="mx-auto max-w-lg h-full flex flex-col">
        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-text-secondary active:text-text-primary"
              aria-label="Close search"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </button>

            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search transactions, categories..."
                className="w-full rounded-xl bg-bg-tertiary pl-10 pr-4 py-2.5 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-text-primary/10"
              />
            </div>

            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showDateFilter || startDate || endDate
                  ? "bg-text-primary text-bg-primary"
                  : "text-text-secondary"
              )}
              aria-label="Date filter"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M16 2v4" />
                <path d="M8 2v4" />
                <path d="M3 10h18" />
              </svg>
            </button>
          </div>

          {/* Calendar Range Picker */}
          {showDateFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
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
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {hasFilters && (
            <p className="text-xs text-text-tertiary py-2">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </p>
          )}

          {hasFilters && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20">
              <div className="h-16 w-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-3">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-text-tertiary"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm">No matching transactions</p>
              <p className="text-text-tertiary text-xs mt-1">
                Try different keywords or date range
              </p>
            </div>
          ) : !hasFilters ? (
            <div className="flex flex-col items-center justify-center pt-20">
              <p className="text-text-tertiary text-sm">
                Enter keywords or select a date range
              </p>
            </div>
          ) : (
            <div>
              {results.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between py-3.5 border-b border-border/60 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-bg-secondary flex items-center justify-center text-base">
                      {CATEGORY_EMOJI[tx.category || ""] || "📝"}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-text-primary">
                        {tx.note || "(No note)"}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {formatDateShort(tx.date)} · {tx.account_name}
                        {tx.category ? ` · ${tx.category}` : ""}
                      </p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "text-[14px] font-semibold tabular-nums shrink-0 ml-3",
                      tx.amount < 0 ? "text-expense" : "text-income"
                    )}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {formatCurrency(tx.amount)}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
