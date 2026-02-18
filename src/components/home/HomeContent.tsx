"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import OverviewTab from "./OverviewTab";
import ExpenseTab from "./ExpenseTab";
import InsightTab from "./InsightTab";
import ReimbursementContent from "@/components/reimbursement/ReimbursementContent";
import SearchOverlay from "./SearchOverlay";
import SettingsSheet from "@/components/ui/SettingsSheet";
import { AddTransactionForm } from "@/components/ui/AddTransactionSheet";
import { useAppData } from "@/hooks/useAppData";

export default function HomeContent() {
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [trendsAccountId, setTrendsAccountId] = useState<string | null>(null);
  const { activeTab, setActiveTab, showAddForm, setShowAddForm, categories, onAddCategory, onDeleteCategory, onAddTransaction, isSubmitting, transactions, accounts, isLoading, onStatusChange, onDeleteTransaction, currentWorkspace } = useAppData();

  const navigateToTrends = useCallback((accountId: string) => {
    setTrendsAccountId(accountId);
    setActiveTab("insight");
  }, [setActiveTab]);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pb-1" style={{ paddingTop: "max(16px, env(safe-area-inset-top, 16px))" }}>
        <div className="flex items-center gap-3">
          {/* Avatar — opens Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="h-11 w-11 rounded-full overflow-hidden flex items-center justify-center active:opacity-70 transition-opacity"
            style={{ background: "linear-gradient(135deg, var(--avatar-gradient-start) 0%, var(--avatar-gradient-end) 100%)" }}
            aria-label="Settings"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--avatar-icon-color)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>

          {/* Workspace indicator */}
          {currentWorkspace && (
            <button
              onClick={() => setShowSettings(true)}
              className="active:opacity-70 transition-opacity"
            >
              <span className="text-sm font-medium text-text-primary">{currentWorkspace.name}</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2.5 rounded-full active:bg-bg-tertiary transition-colors"
            aria-label="Search"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>
      </header>

      {/* Tab Content */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {showAddForm ? (
            <motion.div key="add-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="px-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-text-primary">Add Transaction</h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="p-2 rounded-full text-text-secondary active:bg-bg-tertiary transition-colors"
                    aria-label="Close"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                {accounts.length > 0 ? (
                  <AddTransactionForm
                    accounts={accounts}
                    categories={categories}
                    onSubmit={onAddTransaction}
                    isSubmitting={isSubmitting}
                  />
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <>
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <OverviewTab onNavigateToTrends={navigateToTrends} />
                </motion.div>
              )}
              {activeTab === "expense" && (
                <motion.div key="expense" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <ExpenseTab />
                </motion.div>
              )}
              {activeTab === "insight" && (
                <motion.div key="insight" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <InsightTab initialAccountId={trendsAccountId} onConsumeAccountId={() => setTrendsAccountId(null)} />
                </motion.div>
              )}
              {activeTab === "claims" && (
                <motion.div key="claims" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <ReimbursementContent
                    transactions={transactions.filter((t) => t.is_company_advance)}
                    accounts={accounts}
                    isLoading={isLoading}
                    onStatusChange={onStatusChange}
                    onDelete={onDeleteTransaction}
                  />
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      </AnimatePresence>

      <SettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        categories={categories}
        onAddCategory={onAddCategory}
        onDeleteCategory={onDeleteCategory}
      />
    </div>
  );
}
