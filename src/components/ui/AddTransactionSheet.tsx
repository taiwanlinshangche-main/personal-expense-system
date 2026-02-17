"use client";

import { useState, useMemo } from "react";
import BottomSheet from "./BottomSheet";
import CalendarPicker from "./CalendarPicker";
import { cn } from "@/lib/cn";
import { getTodayString } from "@/lib/format";
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

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    const defaultAcc = accounts.find((a) => a.id === defaultAccountId);
    if (defaultAcc?.group === "sinopac") return "sinopac";
    if (defaultAcc?.name === "Taiwan Bank") return "taiwan";
    return "cash";
  });
  const [sinopacSub, setSinopacSub] = useState<"transfer" | "credit">(() => {
    const defaultAcc = accounts.find((a) => a.id === defaultAccountId);
    if (defaultAcc?.name?.includes("Card")) return "credit";
    return "transfer";
  });
  const [date, setDate] = useState(getTodayString());
  const [showCalendar, setShowCalendar] = useState(false);
  const [note, setNote] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCompanyAdvance, setIsCompanyAdvance] = useState(false);

  // Build account groups
  const groups = useMemo((): AccountGroup[] => {
    const cash = accounts.filter((a) => a.name === "Cash");
    const sinopac = accounts.filter((a) => a.group === "sinopac");
    const taiwan = accounts.filter((a) => a.name === "Taiwan Bank");
    return [
      { label: "Cash", accounts: cash },
      { label: "SinoPac", accounts: sinopac },
      { label: "Taiwan Bank", accounts: taiwan },
    ].filter((g) => g.accounts.length > 0);
  }, [accounts]);

  // Resolve final account_id
  const resolvedAccountId = useMemo(() => {
    if (selectedGroup === "sinopac") {
      const sinopacAccounts = accounts.filter((a) => a.group === "sinopac");
      if (sinopacSub === "credit") {
        return sinopacAccounts.find((a) => a.name.includes("Card"))?.id || sinopacAccounts[0]?.id || "";
      }
      return sinopacAccounts.find((a) => a.name.includes("ATM"))?.id || sinopacAccounts[0]?.id || "";
    }
    if (selectedGroup === "taiwan") {
      return accounts.find((a) => a.name === "Taiwan Bank")?.id || "";
    }
    return accounts.find((a) => a.name === "Cash")?.id || "";
  }, [accounts, selectedGroup, sinopacSub]);

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
      <div className="mt-4">
        <label className="text-sm font-medium text-text-secondary">Account</label>
        <div className="mt-2 flex gap-2">
          {groups.map((group) => {
            const groupKey =
              group.label === "Cash"
                ? "cash"
                : group.label === "SinoPac"
                ? "sinopac"
                : "taiwan";
            return (
              <button
                key={groupKey}
                onClick={() => setSelectedGroup(groupKey)}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all duration-150 border",
                  selectedGroup === groupKey
                    ? "border-accent bg-accent/10 text-text-primary"
                    : "border-border bg-bg-secondary text-text-secondary"
                )}
              >
                {group.label}
              </button>
            );
          })}
        </div>

        {/* SinoPac sub-account toggle */}
        {selectedGroup === "sinopac" && (
          <div className="mt-2 flex rounded-xl bg-bg-tertiary p-1">
            <button
              onClick={() => setSinopacSub("transfer")}
              className={cn(
                "flex-1 rounded-lg py-2 text-[13px] font-medium transition-all duration-150",
                sinopacSub === "transfer"
                  ? "bg-bg-primary text-text-primary shadow-sm"
                  : "text-text-secondary"
              )}
            >
              ATM
            </button>
            <button
              onClick={() => setSinopacSub("credit")}
              className={cn(
                "flex-1 rounded-lg py-2 text-[13px] font-medium transition-all duration-150",
                sinopacSub === "credit"
                  ? "bg-bg-primary text-text-primary shadow-sm"
                  : "text-text-secondary"
              )}
            >
              Card
            </button>
          </div>
        )}
      </div>

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
              onChange={(e) => setIsCompanyAdvance(e.target.checked)}
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
