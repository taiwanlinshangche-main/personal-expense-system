"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/cn";
import OverviewTab from "./OverviewTab";
import ExpenseTab from "./ExpenseTab";
import InsightTab from "./InsightTab";
import SearchOverlay from "./SearchOverlay";
import SettingsSheet from "@/components/ui/SettingsSheet";
import { useAppData } from "@/hooks/useAppData";

type TabKey = "overview" | "expense" | "insight";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "expense", label: "Expense" },
  { key: "insight", label: "Trends" },
];

export default function HomeContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { categories, onAddCategory, onDeleteCategory } = useAppData();

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-1">
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

      {/* Tab Bar */}
      <div className="flex items-center gap-1.5 px-5 mt-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "relative px-5 py-2 rounded-full text-[14px] font-medium transition-all duration-200",
              activeTab === tab.key
                ? "bg-text-primary text-bg-primary"
                : "text-text-secondary active:bg-bg-tertiary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-5">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <OverviewTab />
            </motion.div>
          )}
          {activeTab === "expense" && (
            <motion.div key="expense" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <ExpenseTab />
            </motion.div>
          )}
          {activeTab === "insight" && (
            <motion.div key="insight" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <InsightTab />
            </motion.div>
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
