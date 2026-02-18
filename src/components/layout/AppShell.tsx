"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import BottomNavBar from "./BottomNavBar";
import ToastContainer, { showToast } from "@/components/ui/Toast";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import type { AccountWithBalance, TransactionWithAccount, Category, Workspace } from "@/types/database";
import { AppDataContext, type TabKey } from "@/hooks/useAppData";
import {
  trackAddTransactionStart,
  trackAddTransactionSubmit,
  trackAddAccountSubmit,
  trackReimbursementStatusChange,
  trackWorkspaceSwitch,
} from "@/lib/analytics";
import { playClick, playSuccess, playWorkspaceSwitch } from "@/lib/sfx";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showAddForm, setShowAddForm] = useState(true); // Default: show add form on load
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTxId, setNewTxId] = useState<string | null>(null);
  const [txSheetResetKey, setTxSheetResetKey] = useState(0);
  const addTxStartTime = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.is_active) ?? null,
    [workspaces]
  );

  // Fetch data from API on mount
  const fetchData = useCallback(async (attemptSeed = true) => {
    try {
      const [summaryRes, txRes, catRes, wsRes] = await Promise.all([
        fetch("/api/summary"),
        fetch("/api/transactions?limit=500"),
        fetch("/api/categories"),
        fetch("/api/workspaces"),
      ]);

      let accts: AccountWithBalance[] = [];
      let cats: Category[] = [];

      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorkspaces(wsData || []);
      }

      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        accts = summary.accounts || [];
        setAccounts(accts);
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData || []);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        cats = catData || [];
        setCategories(cats);
      }

      // Auto-seed: no accounts loaded (empty or API returned 400 for missing workspace)
      if (attemptSeed && (accts.length === 0 || !summaryRes.ok)) {
        try {
          await fetch("/api/seed", { method: "POST" });
        } catch {
          // Seed request failed, continue
        }
        // Always refetch — seed may have partially succeeded (e.g. accounts created)
        await fetchData(false);
        return;
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

  // Set default account to SinoPac Card as soon as accounts are available
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (hasAutoOpened.current || accounts.length === 0) return;
    hasAutoOpened.current = true;

    // Default to SinoPac Card (prefer "card" over "atm")
    const sinopacCard = accounts.find(
      (a) => /sinopac/i.test(a.name) && /card|信用/i.test(a.name)
    );
    if (sinopacCard) {
      try { localStorage.setItem("last_account_id", sinopacCard.id); } catch { /* */ }
    }

    addTxStartTime.current = Date.now();
    setTxSheetResetKey((k) => k + 1);
  }, [accounts]);

  // Global SFX: play click sound for all interactive elements
  useEffect(() => {
    function handleGlobalClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const interactive = target.closest(
        'button, a, [role="button"], [role="link"]'
      );
      if (!interactive) return;
      if (
        interactive instanceof HTMLButtonElement &&
        interactive.disabled
      )
        return;
      playClick();
    }
    document.addEventListener("click", handleGlobalClick, { capture: true });
    return () =>
      document.removeEventListener("click", handleGlobalClick, {
        capture: true,
      });
  }, []);

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
        playSuccess();

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

        // Navigate to expenses tab to show the new transaction
        setShowAddForm(false);
        setNewTxId(newTx.id);
        setActiveTab("expense");
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

  const handleDeleteTransaction = useCallback(
    async (txId: string) => {
      const tx = transactions.find((t) => t.id === txId);
      if (!tx) return;

      // Optimistic removal
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id !== tx.account_id) return a;
          return {
            ...a,
            current_balance: a.current_balance - tx.amount,
            month_spending:
              tx.amount < 0
                ? a.month_spending - Math.abs(tx.amount)
                : a.month_spending,
          };
        })
      );

      try {
        const res = await fetch(`/api/transactions/${txId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          // Revert on failure
          setTransactions((prev) => [...prev, tx].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
          setAccounts((prev) =>
            prev.map((a) => {
              if (a.id !== tx.account_id) return a;
              return {
                ...a,
                current_balance: a.current_balance + tx.amount,
                month_spending:
                  tx.amount < 0
                    ? a.month_spending + Math.abs(tx.amount)
                    : a.month_spending,
              };
            })
          );
          showToast({ message: "Failed to delete transaction" });
          return;
        }

        showToast({ message: "Transaction deleted" });
      } catch {
        // Revert on error
        setTransactions((prev) => [...prev, tx].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
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

  const handleSwitchWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/activate`, {
          method: "PATCH",
        });

        if (!res.ok) {
          showToast({ message: "Failed to switch workspace" });
          return;
        }

        // Close add form if open (prevents stale data)
        setShowAddForm(false);

        // Clear cached account selection (belongs to previous workspace)
        try { localStorage.removeItem("last_account_id"); } catch { /* SSR guard */ }

        // Optimistically update local workspace state
        setWorkspaces((prev) =>
          prev.map((w) => ({ ...w, is_active: w.id === workspaceId }))
        );

        // SFX + analytics
        playWorkspaceSwitch();
        const wsName = workspaces.find((w) => w.id === workspaceId)?.name ?? "";
        trackWorkspaceSwitch(workspaceId, wsName);

        // Refetch all workspace-scoped data
        setIsLoading(true);
        await fetchData(false);
      } catch {
        showToast({ message: "Failed to switch workspace" });
      }
    },
    [fetchData, workspaces]
  );

  const contextValue = {
    activeTab,
    setActiveTab,
    showAddForm,
    setShowAddForm,
    newTxId,
    isSubmitting,
    workspaces,
    currentWorkspace,
    switchWorkspace: handleSwitchWorkspace,
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
    onDeleteTransaction: handleDeleteTransaction,
    onStatusChange: handleStatusChange,
  };

  return (
    <AppDataContext.Provider value={contextValue}>
      <div className="mx-auto min-h-screen max-w-lg bg-bg-primary">
        <main className="pb-28">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        <BottomNavBar
          activeTab={activeTab}
          showAddForm={showAddForm}
          onTabChange={(tab) => {
            setShowAddForm(false);
            setActiveTab(tab);
          }}
          onFabClick={() => {
            addTxStartTime.current = Date.now();
            trackAddTransactionStart("current");
            setTxSheetResetKey((k) => k + 1);
            setShowAddForm(true);
          }}
          pendingCount={pendingCount}
        />

        <ToastContainer />
      </div>
    </AppDataContext.Provider>
  );
}
