"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import FAB from "./FAB";
import AddTransactionSheet from "@/components/ui/AddTransactionSheet";
import ToastContainer, { showToast } from "@/components/ui/Toast";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import type { AccountWithBalance, TransactionWithAccount, Category } from "@/types/database";
import { AppDataContext } from "@/hooks/useAppData";
import {
  trackAddTransactionStart,
  trackAddTransactionSubmit,
  trackAddAccountSubmit,
  trackReimbursementStatusChange,
} from "@/lib/analytics";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSheetResetKey, setTxSheetResetKey] = useState(0);
  const addTxStartTime = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch data from API on mount
  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, txRes, catRes] = await Promise.all([
        fetch("/api/summary"),
        fetch("/api/transactions?limit=500"),
        fetch("/api/categories"),
      ]);

      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        setAccounts(summary.accounts || []);
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData || []);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingCount = transactions.filter(
    (t) => t.is_company_advance && t.reimbursement_status === "pending"
  ).length;

  const pendingAmount = transactions
    .filter(
      (t) => t.is_company_advance && t.reimbursement_status === "pending"
    )
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);
  const totalMonthSpending = accounts.reduce(
    (sum, a) => sum + a.month_spending,
    0
  );

  const handleAddTransaction = useCallback(
    async (data: {
      account_id: string;
      amount: number;
      note: string;
      date: string;
      is_company_advance: boolean;
      category?: string | null;
    }) => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to add transaction");
        }

        const newTx: TransactionWithAccount = await res.json();

        trackAddTransactionSubmit(
          data.amount,
          data.is_company_advance,
          data.account_id,
          Date.now() - addTxStartTime.current
        );

        setTransactions((prev) => [newTx, ...prev]);

        // Update account balances optimistically
        setAccounts((prev) =>
          prev.map((a) => {
            if (a.id !== data.account_id) return a;
            return {
              ...a,
              current_balance: a.current_balance + data.amount,
              month_spending:
                data.amount < 0
                  ? a.month_spending + Math.abs(data.amount)
                  : a.month_spending,
            };
          })
        );

        setShowAddTransaction(false);
        showToast({ message: "Transaction added" });
      } catch (err) {
        showToast({ message: err instanceof Error ? err.message : "Failed to add transaction" });
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const handleAddAccount = useCallback(
    async (data: { name: string; initial_balance: number }) => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add account");
      }

      const newAccount = await res.json();
      const accountWithBalance: AccountWithBalance = {
        ...newAccount,
        current_balance: newAccount.initial_balance,
        month_spending: 0,
      };

      setAccounts((prev) => [...prev, accountWithBalance]);
      trackAddAccountSubmit(data.initial_balance);
      showToast({ message: "Account added" });
    },
    []
  );

  const handleStatusChange = useCallback(
    async (txId: string, newStatus: string) => {
      const tx = transactions.find((t) => t.id === txId);
      const oldStatus = tx?.reimbursement_status || "pending";

      // Optimistic update
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txId
            ? {
                ...t,
                reimbursement_status: newStatus as TransactionWithAccount["reimbursement_status"],
              }
            : t
        )
      );

      try {
        const res = await fetch(`/api/transactions/${txId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reimbursement_status: newStatus }),
        });

        if (!res.ok) {
          // Revert on failure
          setTransactions((prev) =>
            prev.map((t) =>
              t.id === txId
                ? { ...t, reimbursement_status: oldStatus as TransactionWithAccount["reimbursement_status"] }
                : t
            )
          );
          showToast({ message: "Failed to update status" });
          return;
        }

        trackReimbursementStatusChange(oldStatus, newStatus, txId);
      } catch {
        // Revert on error
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === txId
              ? { ...t, reimbursement_status: oldStatus as TransactionWithAccount["reimbursement_status"] }
              : t
          )
        );
      }
    },
    [transactions]
  );

  const handleAddCategory = useCallback(
    async (data: { name: string; emoji: string }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add category");
      }

      const newCat: Category = await res.json();
      setCategories((prev) => [...prev, newCat]);
      showToast({ message: "Category added" });
    },
    []
  );

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        showToast({ message: "Failed to delete category" });
        return;
      }

      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast({ message: "Category deleted" });
    },
    []
  );

  const contextValue = {
    accounts,
    transactions,
    categories,
    pendingCount,
    pendingAmount,
    totalBalance,
    totalMonthSpending,
    isLoading,
    onAddAccount: handleAddAccount,
    onAddTransaction: handleAddTransaction,
    onAddCategory: handleAddCategory,
    onDeleteCategory: handleDeleteCategory,
    onStatusChange: handleStatusChange,
  };

  return (
    <AppDataContext.Provider value={contextValue}>
      <div className="mx-auto min-h-screen max-w-lg bg-bg-primary">
        <main className="pb-24">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        <FAB
          onClick={() => {
            addTxStartTime.current = Date.now();
            trackAddTransactionStart("current");
            setTxSheetResetKey((k) => k + 1);
            setShowAddTransaction(true);
          }}
        />

        <AddTransactionSheet
          open={showAddTransaction}
          onClose={() => setShowAddTransaction(false)}
          accounts={accounts}
          categories={categories}
          onSubmit={handleAddTransaction}
          isSubmitting={isSubmitting}
          resetKey={txSheetResetKey}
        />

        <ToastContainer />
      </div>
    </AppDataContext.Provider>
  );
}
