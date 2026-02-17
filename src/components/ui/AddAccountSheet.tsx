"use client";

import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { cn } from "@/lib/cn";

interface AddAccountSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; initial_balance: number }) => void;
  isSubmitting?: boolean;
  error?: string | null;
  /** Increment this value each time the sheet opens to reset the form */
  resetKey?: number;
}

export default function AddAccountSheet({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  error,
  resetKey = 0,
}: AddAccountSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Add Account">
      <AddAccountForm
        key={resetKey}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        error={error}
      />
    </BottomSheet>
  );
}

function AddAccountForm({
  onSubmit,
  isSubmitting,
  error,
}: {
  onSubmit: (data: { name: string; initial_balance: number }) => void;
  isSubmitting: boolean;
  error?: string | null;
}) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("0");

  const canSubmit = name.trim().length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      initial_balance: Math.round(parseFloat(balance) || 0),
    });
  };

  return (
    <>
      <div>
        <label className="text-sm font-medium text-text-secondary">
          Account Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Savings Account"
          maxLength={50}
          autoFocus
          className="mt-1 w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent transition-colors"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        {error && <p className="mt-1 text-sm text-expense">{error}</p>}
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-text-secondary">
          Initial Balance
        </label>
        <div className="mt-1 flex items-center rounded-xl border border-border bg-bg-secondary px-4 py-3 focus-within:border-accent transition-colors">
          <span className="text-text-secondary mr-1">NT$</span>
          <input
            type="number"
            inputMode="numeric"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="flex-1 bg-transparent text-text-primary outline-none tabular-nums"
          />
        </div>
      </div>

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
        {isSubmitting ? "Adding..." : "Add Account"}
      </button>
    </>
  );
}
