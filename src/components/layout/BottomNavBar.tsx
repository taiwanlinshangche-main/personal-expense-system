"use client";

import { motion } from "motion/react";
import type { TabKey } from "@/hooks/useAppData";

interface BottomNavBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onFabClick: () => void;
  pendingCount?: number;
}

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "expense", label: "Expenses" },
  { key: "insight", label: "Trends" },
  { key: "claims", label: "Claims" },
];

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

/* Bar height = 56px, FAB floats 8px above the bar top edge */
const BAR_H = 56;
const FAB_SIZE = 56;
const FAB_GAP = 2; /* small gap between FAB bottom and bar top */

export default function BottomNavBar({ activeTab, onTabChange, onFabClick, pendingCount = 0 }: BottomNavBarProps) {
  const leftTabs = TAB_ITEMS.slice(0, 2);
  const rightTabs = TAB_ITEMS.slice(2);

  /* Total height needed: bar + notch overhang area for FAB */
  const notchOverhang = FAB_SIZE / 2 + FAB_GAP;

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40"
      style={{ height: BAR_H + notchOverhang }}
      role="navigation"
    >
      {/* SVG navbar background with curved notch — sits at the bottom */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        style={{ height: BAR_H }}
        viewBox={`0 0 400 ${BAR_H}`}
        preserveAspectRatio="none"
      >
        <path
          d={`M0,0 L158,0 C164,0 168,0 172,6 C178,14 184,${BAR_H / 2} 200,${BAR_H / 2} C216,${BAR_H / 2} 222,14 228,6 C232,0 236,0 242,0 L400,0 L400,${BAR_H} L0,${BAR_H} Z`}
          fill="var(--nav-bg)"
        />
      </svg>

      {/* Tab icons — centered vertically within the bar */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4"
        style={{ height: BAR_H }}
      >
        {/* Left tabs */}
        <div className="flex flex-1 justify-around">
          {leftTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="flex items-center justify-center w-12 h-12 transition-opacity duration-200 text-text-primary"
              style={{ opacity: activeTab === tab.key ? 1 : 0.3 }}
              aria-label={tab.label}
              aria-current={activeTab === tab.key ? "page" : undefined}
            >
              <TabIcon tabKey={tab.key} />
            </button>
          ))}
        </div>

        {/* Spacer for FAB */}
        <div style={{ width: 80 }} />

        {/* Right tabs */}
        <div className="flex flex-1 justify-around">
          {rightTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="relative flex items-center justify-center w-12 h-12 transition-opacity duration-200 text-text-primary"
              style={{ opacity: activeTab === tab.key ? 1 : 0.3 }}
              aria-label={tab.label}
              aria-current={activeTab === tab.key ? "page" : undefined}
            >
              <TabIcon tabKey={tab.key} />
              {tab.key === "claims" && pendingCount > 0 && (
                <span className="absolute top-0.5 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-expense px-1 text-[9px] font-bold text-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* FAB — absolutely positioned, floating above the bar */}
      <motion.button
        onClick={onFabClick}
        whileTap={{ scale: 0.88, filter: "brightness(1.2)" }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="fab-gradient fab-glow absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full shadow-lg focus:outline-none"
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          bottom: BAR_H + FAB_GAP,
          background: "linear-gradient(135deg, #7dd3fc, #38bdf8, #0ea5e9, #38bdf8, #7dd3fc, #0ea5e9)",
          backgroundSize: "300% 300%",
          animation: "gradient-flow 4s ease infinite",
        }}
        aria-label="Add transaction"
      >
        <div
          className="fab-glow absolute inset-0 rounded-full pointer-events-none"
          style={{ animation: "glow-pulse 4s ease-in-out infinite" }}
        />
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </motion.button>

      {/* Safe area padding for iPhone home indicator */}
      <div className="absolute bottom-0 left-0 right-0 bg-nav-bg pb-safe" style={{ zIndex: -1 }} />
    </div>
  );
}
