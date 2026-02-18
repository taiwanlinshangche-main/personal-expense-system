"use client";

import type { TabKey } from "@/hooks/useAppData";

interface BottomNavBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onFabClick: () => void;
  pendingCount?: number;
  showAddForm?: boolean;
}

function TabIcon({ tabKey }: { tabKey: TabKey }) {
  switch (tabKey) {
    case "overview":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "expense":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "insight":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "claims":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      );
  }
}

const BAR_H = 56;

export default function BottomNavBar({ activeTab, onTabChange, onFabClick, pendingCount = 0, showAddForm = false }: BottomNavBarProps) {
  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40"
      style={{ height: BAR_H }}
      role="navigation"
    >
      {/* Flat background */}
      <div className="absolute inset-0 bg-nav-bg" />

      {/* 5-icon row */}
      <div className="relative flex items-center justify-around h-full px-2">
        {/* Overview */}
        <button
          onClick={() => onTabChange("overview")}
          className="flex items-center justify-center w-12 h-12 transition-opacity duration-200 text-text-primary"
          style={{ opacity: !showAddForm && activeTab === "overview" ? 1 : 0.3 }}
          aria-label="Overview"
          aria-current={activeTab === "overview" ? "page" : undefined}
        >
          <TabIcon tabKey="overview" />
        </button>

        {/* Expenses */}
        <button
          onClick={() => onTabChange("expense")}
          className="flex items-center justify-center w-12 h-12 transition-opacity duration-200 text-text-primary"
          style={{ opacity: !showAddForm && activeTab === "expense" ? 1 : 0.3 }}
          aria-label="Expenses"
          aria-current={activeTab === "expense" ? "page" : undefined}
        >
          <TabIcon tabKey="expense" />
        </button>

        {/* Center + button */}
        <button
          onClick={onFabClick}
          className="flex items-center justify-center w-12 h-12 transition-opacity duration-200 text-accent"
          style={{ opacity: showAddForm ? 1 : 0.5 }}
          aria-label="Add transaction"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>

        {/* Trends */}
        <button
          onClick={() => onTabChange("insight")}
          className="flex items-center justify-center w-12 h-12 transition-opacity duration-200 text-text-primary"
          style={{ opacity: !showAddForm && activeTab === "insight" ? 1 : 0.3 }}
          aria-label="Trends"
          aria-current={activeTab === "insight" ? "page" : undefined}
        >
          <TabIcon tabKey="insight" />
        </button>

        {/* Claims */}
        <button
          onClick={() => onTabChange("claims")}
          className="relative flex items-center justify-center w-12 h-12 transition-opacity duration-200 text-text-primary"
          style={{ opacity: !showAddForm && activeTab === "claims" ? 1 : 0.3 }}
          aria-label="Claims"
          aria-current={activeTab === "claims" ? "page" : undefined}
        >
          <TabIcon tabKey="claims" />
          {pendingCount > 0 && (
            <span className="absolute top-0.5 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-expense px-1 text-[9px] font-bold text-white">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Safe area padding for iPhone home indicator */}
      <div className="absolute bottom-0 left-0 right-0 bg-nav-bg pb-safe" style={{ zIndex: -1 }} />
    </div>
  );
}
