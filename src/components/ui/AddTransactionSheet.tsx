"use client";

import { useState, useMemo } from "react";
import BottomSheet from "./BottomSheet";
import CalendarPicker from "./CalendarPicker";
import { cn } from "@/lib/cn";
import { getTodayString } from "@/lib/format";
import { playClick } from "@/lib/sfx";
import type { AccountWithBalance, Category } from "@/types/database";

interface AddTransactionSheetProps {
  open: boolean;
  onClose: () => void;
  accounts: AccountWithBalance[];
  categories?: Category[];
  onSubmit: (data: {
    account_id: string;
    amount: number;
    note: string;
    date: string;
    is_company_advance: boolean;
    category?: string | null;
  }) => void;
  isSubmitting?: boolean;
  /** Increment this value each time the sheet opens to reset the form */
  resetKey?: number;
}

export default function AddTransactionSheet({
  open,
  onClose,
  accounts,
  categories = [],
  onSubmit,
  isSubmitting = false,
  resetKey = 0,
}: AddTransactionSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Add Transaction">
      <AddTransactionForm
        key={resetKey}
        accounts={accounts}
        categories={categories}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
      />
    </BottomSheet>
  );
}

// Account groups for selector
interface AccountGroup {
  key: string;
  label: string;
  accounts: AccountWithBalance[];
}

function AddTransactionForm({
  accounts,
  categories,
  onSubmit,
  isSubmitting,
}: {
  accounts: AccountWithBalance[];
  categories: Category[];
  onSubmit: AddTransactionSheetProps["onSubmit"];
  isSubmitting: boolean;
}) {
  const defaultAccountId = (() => {
    if (typeof window === "undefined") return accounts[0]?.id || "";
    const last = localStorage.getItem("last_account_id");
    if (last && accounts.some((a) => a.id === last)) return last;
    return accounts[0]?.id || "";
  })();

  // Build dynamic account groups from the `group` field
  const groups = useMemo((): AccountGroup[] => {
    const groupMap = new Map<string, AccountWithBalance[]>();
    const soloAccounts: AccountWithBalance[] = [];

    for (const acc of accounts) {
      if (acc.group) {
        const existing = groupMap.get(acc.group) || [];
        existing.push(acc);
        groupMap.set(acc.group, existing);
      } else {
        soloAccounts.push(acc);
      }
    }

    const result: AccountGroup[] = [];

    // Solo accounts each get their own group
    for (const acc of soloAccounts) {
      result.push({
        key: acc.id,
        label: acc.name,
        accounts: [acc],
      });
    }

    // Grouped accounts share a group button
    for (const [groupName, accs] of groupMap) {
      // Use first account's name prefix as label (e.g., "SinoPac ATM" → "SinoPac")
      const label =
        accs[0].name.split(" ")[0] ||
        groupName.charAt(0).toUpperCase() + groupName.slice(1);
      result.push({ key: groupName, label, accounts: accs });
    }

    // Sort by sort_order of the first account in each group
    result.sort(
      (a, b) => (a.accounts[0]?.sort_order ?? 0) - (b.accounts[0]?.sort_order ?? 0)
    );

    return result;
  }, [accounts]);

  // Find which group the default account belongs to
  const defaultGroup = useMemo(() => {
    for (const g of groups) {
      if (g.accounts.some((a) => a.id === defaultAccountId)) return g.key;
    }
    return groups[0]?.key || "";
  }, [groups, defaultAccountId]);

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [selectedGroupKey, setSelectedGroupKey] = useState(defaultGroup);
  const [selectedSubIdx, setSelectedSubIdx] = useState(() => {
    const group = groups.find((g) => g.key === defaultGroup);
    if (!group) return 0;
    const idx = group.accounts.findIndex((a) => a.id === defaultAccountId);
    return idx >= 0 ? idx : 0;
  });
  const [date, setDate] = useState(getTodayString());
  const [showCalendar, setShowCalendar] = useState(false);
  const [note, setNote] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCompanyAdvance, setIsCompanyAdvance] = useState(false);

  // Resolve final account_id from group + sub-selection
  const activeGroup = groups.find((g) => g.key === selectedGroupKey);
  const resolvedAccountId = activeGroup?.accounts[selectedSubIdx]?.id || activeGroup?.accounts[0]?.id || accounts[0]?.id || "";

  const canSubmit = amount && parseFloat(amount) > 0 && resolvedAccountId && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;

    const numAmount =
      type === "expense"
        ? -Math.abs(Math.round(parseFloat(amount)))
        : Math.abs(Math.round(parseFloat(amount)));

    if (typeof window !== "undefined") {
      localStorage.setItem("last_account_id", resolvedAccountId);
    }

    onSubmit({
      account_id: resolvedAccountId,
      amount: numAmount,
      note,
      date,
      is_company_advance: isCompanyAdvance,
      category: selectedCategory,
    });
  };

  return (
    <>
      {/* Type toggle */}
      <div className="flex rounded-xl bg-bg-tertiary p-1">
        <button
          onClick={() => {
            setType("expense");
            setIsCompanyAdvance(false);
          }}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150",
            type === "expense"
              ? "bg-bg-primary text-expense shadow-sm"
              : "text-text-secondary"
          )}
        >
          Expense
        </button>
        <button
          onClick={() => {
            setType("income");
            setIsCompanyAdvance(false);
          }}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150",
            type === "income"
              ? "bg-bg-primary text-income shadow-sm"
              : "text-text-secondary"
          )}
        >
          Income
        </button>
      </div>

      {/* Amount */}
      <div className="mt-4">
        <label className="text-sm font-medium text-text-secondary">Amount</label>
        <div className="mt-1 flex items-center rounded-xl border border-border bg-bg-secondary px-4 py-3 focus-within:border-accent transition-colors">
          <span className="text-text-secondary mr-1">NT$</span>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
            className="flex-1 bg-transparent text-lg font-semibold tabular-nums text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {/* Account Group Selector */}
      {groups.length > 0 && (
        <div className="mt-4">
          <label className="text-sm font-medium text-text-secondary">Account</label>
          <div className="mt-2 flex gap-2">
            {groups.map((group) => (
              <button
                key={group.key}
                onClick={() => {
                  setSelectedGroupKey(group.key);
                  setSelectedSubIdx(0);
                }}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all duration-150 border",
                  selectedGroupKey === group.key
                    ? "border-accent bg-accent/10 text-text-primary"
                    : "border-border bg-bg-secondary text-text-secondary"
                )}
              >
                {group.label}
              </button>
            ))}
          </div>

          {/* Sub-account toggle (for groups with multiple accounts) */}
          {activeGroup && activeGroup.accounts.length > 1 && (
            <div className="mt-2 flex rounded-xl bg-bg-tertiary p-1">
              {activeGroup.accounts.map((acc, idx) => {
                // Show short name: strip group prefix if present
                const shortName =
                  acc.name.replace(activeGroup.label, "").trim() || acc.name;
                return (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedSubIdx(idx)}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-[13px] font-medium transition-all duration-150",
                      selectedSubIdx === idx
                        ? "bg-bg-primary text-text-primary shadow-sm"
                        : "text-text-secondary"
                    )}
                  >
                    {shortName}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Category */}
      {categories.length > 0 && (
        <div className="mt-4">
          <label className="text-sm font-medium text-text-secondary">Category</label>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === cat.name ? null : cat.name
                  )
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-150 border shrink-0",
                  selectedCategory === cat.name
                    ? "border-accent bg-accent/10 text-text-primary"
                    : "border-border bg-bg-secondary text-text-secondary"
                )}
              >
                {cat.emoji && <span>{cat.emoji}</span>}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date */}
      <div className="mt-4">
        <label className="text-sm font-medium text-text-secondary">Date</label>
        <button
          type="button"
          onClick={() => setShowCalendar(!showCalendar)}
          className={cn(
            "mt-1 w-full rounded-xl border px-4 py-3 text-left text-text-primary transition-colors flex items-center justify-between",
            showCalendar ? "border-accent bg-bg-secondary" : "border-border bg-bg-secondary"
          )}
        >
          <span>{date ? new Date(date + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Select date"}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
          </svg>
        </button>
        {showCalendar && (
          <div className="mt-2">
            <CalendarPicker
              value={date}
              onChange={(d) => {
                setDate(d);
                setShowCalendar(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Note */}
      <div className="mt-4">
        <label className="text-sm font-medium text-text-secondary">Note</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Lunch, Taxi"
          maxLength={200}
          className="mt-1 w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent transition-colors"
        />
      </div>

      {/* Company advance toggle */}
      {type === "expense" && (
        <label className="mt-4 flex items-center justify-between rounded-xl border border-border bg-bg-secondary px-4 py-3 cursor-pointer">
          <span className="text-sm font-medium text-text-primary">
            Company Advance
          </span>
          <div className="relative">
            <input
              type="checkbox"
              checked={isCompanyAdvance}
              onChange={(e) => {
                playClick();
                setIsCompanyAdvance(e.target.checked);
              }}
              className="sr-only"
            />
            <div
              className={cn(
                "h-6 w-11 rounded-full transition-colors duration-200",
                isCompanyAdvance ? "bg-btn-primary-bg" : "bg-bg-tertiary"
              )}
            />
            <div
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-bg-primary shadow transition-transform duration-200",
                isCompanyAdvance && "translate-x-5"
              )}
            />
          </div>
        </label>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={cn(
          "mt-6 w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-150",
          canSubmit
            ? "bg-btn-primary-bg text-btn-primary-text active:bg-btn-primary-hover"
            : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
        )}
      >
        {isSubmitting ? "Saving..." : "Save Transaction"}
      </button>
    </>
  );
}
