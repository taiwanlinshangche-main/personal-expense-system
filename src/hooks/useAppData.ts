"use client";

import { createContext, useContext } from "react";
import type { AccountWithBalance, TransactionWithAccount, Category, Workspace } from "@/types/database";

export type TabKey = "overview" | "expense" | "insight" | "claims";

interface AppDataContextType {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  newTxId: string | null;
  isSubmitting: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  accounts: AccountWithBalance[];
  transactions: TransactionWithAccount[];
  categories: Category[];
  pendingCount: number;
  pendingAmount: number;
  totalBalance: number;
  totalMonthSpending: number;
  isLoading: boolean;
  onAddAccount: (data: {
    name: string;
    initial_balance: number;
  }) => Promise<void>;
  onAddTransaction: (data: {
    account_id: string;
    amount: number;
    note: string;
    date: string;
    is_company_advance: boolean;
    category?: string | null;
  }) => Promise<void>;
  onAddCategory: (data: { name: string; emoji: string }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onDeleteTransaction: (txId: string) => Promise<void>;
  onStatusChange: (txId: string, newStatus: string) => void;
}

export const AppDataContext = createContext<AppDataContextType | null>(null);

export function useAppData(): AppDataContextType {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppShell");
  }
  return context;
}
