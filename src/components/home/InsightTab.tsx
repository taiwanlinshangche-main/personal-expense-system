"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useAppData } from "@/hooks/useAppData";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";

type ViewMode = "week" | "month" | "year";

const VIEW_LABELS: { key: ViewMode; label: string }[] = [
  { key: "week", label: "1W" },
  { key: "month", label: "1M" },
  { key: "year", label: "1Y" },
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const COMPARISON_LABELS: Record<ViewMode, string> = {
  week: "vs last week",
  month: "vs last month",
  year: "vs last year",
};

// Chart layout
const SVG_W = 380;
const SVG_H = 200;
const CHART_L = 24;
const CHART_R = SVG_W - 16;
const CHART_T = 24;
const CHART_B = SVG_H - 24;

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

interface InsightTabProps {
  initialAccountId?: string | null;
  onConsumeAccountId?: () => void;
}

export default function InsightTab({ initialAccountId, onConsumeAccountId }: InsightTabProps = {}) {
  const { accounts, transactions, categories } = useAppData();
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [selectedCategoryName, setSelectedCategoryName] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const svgRef = useRef<SVGSVGElement>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedMonthYear, setSelectedMonthYear] = useState(now.getFullYear());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Apply initial account from navigation
  useEffect(() => {
    if (initialAccountId) {
      setSelectedAccountId(initialAccountId);
      setSelectedCategoryName("all");
      onConsumeAccountId?.();
    }
  }, [initialAccountId, onConsumeAccountId]);

  // Navigation
  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedMonthYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedMonthYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const prevYear = () => {
    setSelectedYear((y) => y - 1);
  };

  const nextYear = () => {
    setSelectedYear((y) => y + 1);
  };

  const canNextMonth =
    selectedMonthYear < now.getFullYear() ||
    (selectedMonthYear === now.getFullYear() && selectedMonth < now.getMonth());
  const canNextYear = selectedYear < now.getFullYear();

  // Get relevant transactions (sorted by date)
  const relevantTxs = useMemo(() => {
    let txs =
      selectedAccountId === "all"
        ? [...transactions]
        : transactions.filter((tx) => tx.account_id === selectedAccountId);

    if (selectedCategoryName !== "all") {
      txs = txs.filter((tx) => tx.category === selectedCategoryName);
    }

    return txs.sort(
      (a, b) =>
        new Date(a.date + "T00:00:00").getTime() -
        new Date(b.date + "T00:00:00").getTime()
    );
  }, [transactions, selectedAccountId, selectedCategoryName]);

  // Initial balance for selected account(s)
  const initialBalance = useMemo(() => {
    if (selectedAccountId === "all") {
      return accounts.reduce((sum, a) => sum + (a.initial_balance ?? 0), 0);
    }
    return (
      accounts.find((a) => a.id === selectedAccountId)?.initial_balance ?? 0
    );
  }, [accounts, selectedAccountId]);

  // Chart data points
  const chartData = useMemo(() => {
    if (viewMode === "week") {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 6
      );
      let running = initialBalance;
      for (const tx of relevantTxs) {
        if (new Date(tx.date + "T00:00:00") < startDate) running += tx.amount;
      }
      const dailyAmounts = new Map<string, number>();
      for (const tx of relevantTxs) {
        const d = new Date(tx.date + "T00:00:00");
        if (d < startDate || d > today) continue;
        dailyAmounts.set(
          tx.date,
          (dailyAmounts.get(tx.date) || 0) + tx.amount
        );
      }
      const points: { label: string; balance: number; fullLabel: string }[] =
        [];
      const current = new Date(startDate);
      for (let i = 0; i < 7; i++) {
        const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        if (dailyAmounts.has(key)) running += dailyAmounts.get(key)!;
        points.push({
          label: `${current.getMonth() + 1}/${current.getDate()}`,
          balance: running,
          fullLabel: `${MONTH_NAMES[current.getMonth()]} ${current.getDate()}`,
        });
        current.setDate(current.getDate() + 1);
      }
      return points;
    }

    if (viewMode === "month") {
      const year = selectedMonthYear;
      const month = selectedMonth;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDate = new Date(year, month, 1);
      let running = initialBalance;
      for (const tx of relevantTxs) {
        if (new Date(tx.date + "T00:00:00") < startDate) running += tx.amount;
      }
      const dailyAmounts = new Map<string, number>();
      for (const tx of relevantTxs) {
        const d = new Date(tx.date + "T00:00:00");
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        dailyAmounts.set(
          tx.date,
          (dailyAmounts.get(tx.date) || 0) + tx.amount
        );
      }
      const points: { label: string; balance: number; fullLabel: string }[] =
        [];
      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (dailyAmounts.has(key)) running += dailyAmounts.get(key)!;
        points.push({
          label: `${day}`,
          balance: running,
          fullLabel: `${MONTH_NAMES[month]} ${day}`,
        });
      }
      return points;
    }

    // Year view
    const year = selectedYear;
    const startOfYear = new Date(year, 0, 1);
    let running = initialBalance;
    for (const tx of relevantTxs) {
      if (new Date(tx.date + "T00:00:00") < startOfYear) running += tx.amount;
    }
    const monthlyAmounts = new Map<number, number>();
    for (const tx of relevantTxs) {
      const d = new Date(tx.date + "T00:00:00");
      if (d.getFullYear() !== year) continue;
      monthlyAmounts.set(
        d.getMonth(),
        (monthlyAmounts.get(d.getMonth()) || 0) + tx.amount
      );
    }
    const points: { label: string; balance: number; fullLabel: string }[] = [];
    for (let m = 0; m < 12; m++) {
      if (monthlyAmounts.has(m)) running += monthlyAmounts.get(m)!;
      points.push({
        label: MONTH_NAMES[m],
        balance: running,
        fullLabel: `${MONTH_NAMES[m]} ${year}`,
      });
    }
    return points;
  }, [
    relevantTxs,
    initialBalance,
    viewMode,
    selectedMonth,
    selectedMonthYear,
    selectedYear,
  ]);

  // Default selected point: today's index in chartData
  const todayIndex = useMemo(() => {
    if (chartData.length === 0) return 0;
    const today = new Date();
    if (viewMode === "week") {
      // Last point = today (week ends on today)
      return chartData.length - 1;
    }
    if (viewMode === "month") {
      // Index = day - 1, clamped to array bounds
      if (today.getFullYear() === selectedMonthYear && today.getMonth() === selectedMonth) {
        return Math.min(today.getDate() - 1, chartData.length - 1);
      }
      return chartData.length - 1;
    }
    // Year view: index = month number
    if (today.getFullYear() === selectedYear) {
      return Math.min(today.getMonth(), chartData.length - 1);
    }
    return chartData.length - 1;
  }, [chartData, viewMode, selectedMonth, selectedMonthYear, selectedYear]);

  const [selectedPointIdx, setSelectedPointIdx] = useState(todayIndex);

  // Keep selectedPointIdx in sync when chartData/filters change
  useEffect(() => {
    setSelectedPointIdx(todayIndex);
  }, [todayIndex]);

  // Comparison: current balance vs balance one period ago
  const comparison = useMemo(() => {
    const currentBalance =
      chartData.length > 0
        ? chartData[chartData.length - 1].balance
        : initialBalance;

    let previousDate: Date;

    if (viewMode === "week") {
      const today = new Date();
      previousDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 7
      );
    } else if (viewMode === "month") {
      // Last day of previous month
      previousDate = new Date(selectedMonthYear, selectedMonth, 0);
    } else {
      // Last day of previous year
      previousDate = new Date(selectedYear - 1, 11, 31);
    }

    let previousBalance = initialBalance;
    for (const tx of relevantTxs) {
      const d = new Date(tx.date + "T00:00:00");
      if (d <= previousDate) previousBalance += tx.amount;
    }

    const change = currentBalance - previousBalance;
    const percentChange =
      previousBalance !== 0
        ? (change / Math.abs(previousBalance)) * 100
        : change !== 0
          ? 100
          : 0;

    return {
      currentBalance,
      change,
      percentChange,
      label: COMPARISON_LABELS[viewMode],
    };
  }, [
    chartData,
    relevantTxs,
    initialBalance,
    viewMode,
    selectedMonth,
    selectedMonthYear,
    selectedYear,
  ]);

  // Period income and spending
  const periodStats = useMemo(() => {
    let startDate: Date;
    let endDate: Date;

    if (viewMode === "week") {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (viewMode === "month") {
      startDate = new Date(selectedMonthYear, selectedMonth, 1);
      endDate = new Date(selectedMonthYear, selectedMonth + 1, 0, 23, 59, 59);
    } else {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
    }

    const periodTxs = relevantTxs.filter((tx) => {
      const d = new Date(tx.date + "T00:00:00");
      return d >= startDate && d <= endDate;
    });

    const income = periodTxs
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const spending = periodTxs
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return { income, spending, periodTxs };
  }, [
    relevantTxs,
    viewMode,
    selectedMonth,
    selectedMonthYear,
    selectedYear,
  ]);

  // Category spending breakdown for the current period
  const categoryBreakdown = useMemo(() => {
    const expenseTxs = periodStats.periodTxs.filter((tx) => tx.amount < 0);
    const catMap = new Map<string, number>();

    for (const tx of expenseTxs) {
      const cat = tx.category || "Other";
      catMap.set(cat, (catMap.get(cat) || 0) + Math.abs(tx.amount));
    }

    // Build array with emoji from categories list
    const catEmojiMap = new Map(categories.map((c) => [c.name, c.emoji]));

    return Array.from(catMap.entries())
      .map(([name, amount]) => ({
        name,
        emoji: catEmojiMap.get(name) || "",
        amount,
        percent: periodStats.spending > 0 ? (amount / periodStats.spending) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodStats, categories]);

  // SVG geometry
  const { linePath, areaPath, coords, xLabels } = useMemo(() => {
    if (chartData.length < 2)
      return {
        linePath: "",
        areaPath: "",
        coords: [] as { x: number; y: number }[],
        xLabels: [] as { x: number; text: string }[],
      };

    const values = chartData.map((p) => p.balance);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const range = dataMax - dataMin || 1;
    const padding = range * 0.2;
    const min = dataMin - padding;
    const max = dataMax + padding;
    const chartRange = max - min;

    const chartW = CHART_R - CHART_L;
    const chartH = CHART_B - CHART_T;
    const xStep = chartW / Math.max(chartData.length - 1, 1);

    const pts = chartData.map((p, i) => ({
      x: CHART_L + i * xStep,
      y: CHART_T + chartH - ((p.balance - min) / chartRange) * chartH,
    }));

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const area =
      d +
      ` L ${pts[pts.length - 1].x} ${CHART_B} L ${pts[0].x} ${CHART_B} Z`;

    // X-axis labels (sparse)
    const maxLabels = viewMode === "week" ? 7 : viewMode === "year" ? 6 : 5;
    const step = Math.max(
      1,
      Math.floor((chartData.length - 1) / (maxLabels - 1))
    );
    const labels: { x: number; text: string }[] = [];
    for (let i = 0; i < chartData.length; i += step) {
      labels.push({ x: pts[i].x, text: chartData[i].label });
    }
    const lastIdx = chartData.length - 1;
    if (
      labels.length === 0 ||
      Math.abs(labels[labels.length - 1].x - pts[lastIdx].x) > xStep * 0.8
    ) {
      labels.push({ x: pts[lastIdx].x, text: chartData[lastIdx].label });
    }

    return { linePath: d, areaPath: area, coords: pts, xLabels: labels };
  }, [chartData, viewMode]);

  const isPositive = comparison.currentBalance >= 0;
  const lineColor = isPositive
    ? "var(--color-income)"
    : "var(--color-expense)";

  // Spring-animated cursor
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness: 300, damping: 28 });
  const springY = useSpring(cursorY, { stiffness: 300, damping: 28 });

  // Update spring targets when selectedPointIdx changes
  useEffect(() => {
    if (coords[selectedPointIdx]) {
      cursorX.set(coords[selectedPointIdx].x);
      cursorY.set(coords[selectedPointIdx].y);
    }
  }, [selectedPointIdx, coords, cursorX, cursorY]);

  const periodLabel = useMemo(() => {
    if (viewMode === "week") {
      const today = new Date();
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 6
      );
      return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${MONTH_NAMES[today.getMonth()]} ${today.getDate()}`;
    }
    if (viewMode === "month")
      return `${MONTH_NAMES[selectedMonth]} ${selectedMonthYear}`;
    return `${selectedYear}`;
  }, [viewMode, selectedMonth, selectedMonthYear, selectedYear]);

  const [openDropdown, setOpenDropdown] = useState<"account" | "category" | null>(null);

  const changeView = (v: ViewMode) => {
    setViewMode(v);
  };
  const changeAccount = (id: string) => {
    setSelectedAccountId(id);
    setOpenDropdown(null);
  };
  const changeCategory = (name: string) => {
    setSelectedCategoryName(name);
    setOpenDropdown(null);
  };

  const toggleDropdown = (type: "account" | "category") => {
    setOpenDropdown((prev) => (prev === type ? null : type));
  };

  // Close dropdown on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  // Labels for the dropdown pills
  const accountLabel = selectedAccountId === "all"
    ? "All"
    : accounts.find((a) => a.id === selectedAccountId)?.name ?? "All";

  const categoryLabel = selectedCategoryName === "all"
    ? "All Categories"
    : (() => {
        const cat = categories.find((c) => c.name === selectedCategoryName);
        return cat ? `${cat.emoji ? cat.emoji + " " : ""}${cat.name}` : selectedCategoryName;
      })();

  // Tooltip — always show selected point (defaults to today)
  const tooltipPoint =
    chartData[selectedPointIdx]
      ? { ...chartData[selectedPointIdx], coord: coords[selectedPointIdx] }
      : null;

  const displayBalance = tooltipPoint
    ? tooltipPoint.balance
    : comparison.currentBalance;
  const isChangePositive = comparison.change >= 0;

  return (
    <div className="px-5 pb-8">
      {/* Filter row: Account dropdown, Category dropdown, Time range */}
      <div ref={dropdownRef} className="flex items-center gap-2">
        {/* Account dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("account")}
            className={cn(
              "flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all",
              selectedAccountId !== "all"
                ? "bg-text-primary text-bg-primary"
                : "bg-bg-secondary text-text-secondary"
            )}
          >
            {accountLabel}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", openDropdown === "account" && "rotate-180")}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {openDropdown === "account" && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1.5 z-50 min-w-[160px] rounded-xl bg-bg-secondary border border-border shadow-lg overflow-hidden"
            >
              <button
                onClick={() => changeAccount("all")}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors",
                  selectedAccountId === "all"
                    ? "bg-bg-tertiary text-text-primary"
                    : "text-text-secondary hover:bg-bg-tertiary"
                )}
              >
                All
              </button>
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => changeAccount(account.id)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors",
                    selectedAccountId === account.id
                      ? "bg-bg-tertiary text-text-primary"
                      : "text-text-secondary hover:bg-bg-tertiary"
                  )}
                >
                  {account.name}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Category dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("category")}
            className={cn(
              "flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all",
              selectedCategoryName !== "all"
                ? "bg-text-primary text-bg-primary"
                : "bg-bg-secondary text-text-secondary"
            )}
          >
            {categoryLabel}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", openDropdown === "category" && "rotate-180")}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {openDropdown === "category" && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1.5 z-50 min-w-[170px] rounded-xl bg-bg-secondary border border-border shadow-lg overflow-hidden"
            >
              <button
                onClick={() => changeCategory("all")}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors",
                  selectedCategoryName === "all"
                    ? "bg-bg-tertiary text-text-primary"
                    : "text-text-secondary hover:bg-bg-tertiary"
                )}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => changeCategory(cat.name)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors",
                    selectedCategoryName === cat.name
                      ? "bg-bg-tertiary text-text-primary"
                      : "text-text-secondary hover:bg-bg-tertiary"
                  )}
                >
                  {cat.emoji && `${cat.emoji} `}{cat.name}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Time range pills — pushed to the right */}
        <div className="flex ml-auto shrink-0 rounded-full bg-bg-secondary p-0.5">
          {VIEW_LABELS.map((v) => (
            <button
              key={v.key}
              onClick={() => changeView(v.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all",
                viewMode === v.key
                  ? "bg-text-primary text-bg-primary"
                  : "text-text-secondary"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Balance + Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-5"
      >
        <p className="text-[32px] font-bold tabular-nums text-text-primary leading-none tracking-tight">
          {formatCurrency(displayBalance)}
        </p>

        {/* Selected point date label — always visible */}
        {tooltipPoint && (
          <p className="mt-1 text-sm text-text-secondary">
            {tooltipPoint.fullLabel}
          </p>
        )}

        {/* Comparison line — always visible */}
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "text-sm font-medium",
              isChangePositive ? "text-income" : "text-expense"
            )}
          >
            {isChangePositive ? "↑" : "↓"}{" "}
            {Math.abs(comparison.percentChange).toFixed(1)}% (
            {formatSignedCurrency(comparison.change)})
          </span>
          <span className="text-sm text-text-tertiary">
            {comparison.label}
          </span>
        </div>

        {/* Period income / spending — always visible */}
        <div className="mt-3 flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-income/10 flex items-center justify-center">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--income)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </div>
            <span className="text-sm font-medium tabular-nums text-text-primary">
              {formatCurrency(periodStats.income)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-expense/10 flex items-center justify-center">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--expense)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="m19 12-7 7-7-7" />
              </svg>
            </div>
            <span className="text-sm font-medium tabular-nums text-text-primary">
              {formatCurrency(periodStats.spending)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Chart — Floating Glass Container */}
      <div className="relative mt-4 rounded-2xl overflow-hidden">
        {/* Layer 6: Glassmorphism background */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        />

        <motion.div
          key={`${viewMode}-${selectedMonth}-${selectedMonthYear}-${selectedYear}-${selectedAccountId}-${selectedCategoryName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full"
            preserveAspectRatio="xMidYMid meet"
            style={{ cursor: "default" }}
          >
            <defs>
              {/* Layer 1: Multi-layer glow filter */}
              <filter id="lineGlow" x="-25%" y="-25%" width="150%" height="150%">
                {/* Wide ambient glow */}
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur3">
                  {/* Layer 4: Breathing glow pulse */}
                  <animate
                    attributeName="stdDeviation"
                    values="6;10;6"
                    dur="4s"
                    repeatCount="indefinite"
                  />
                </feGaussianBlur>
                <feColorMatrix in="blur3" result="color3" type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.25 0" />
                {/* Medium glow */}
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
                <feColorMatrix in="blur2" result="color2" type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0" />
                {/* Tight inner glow */}
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1" />
                <feMerge>
                  <feMergeNode in="color3" />
                  <feMergeNode in="color2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Layer 3: Breathing area gradient */}
              <linearGradient id="insightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor}>
                  <animate
                    attributeName="stop-opacity"
                    values="0.20;0.08;0.20"
                    dur="4s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Subtle grid line at midpoint */}
            <line
              x1={CHART_L}
              y1={(CHART_T + CHART_B) / 2}
              x2={CHART_R}
              y2={(CHART_T + CHART_B) / 2}
              stroke="var(--color-border)"
              strokeWidth="0.5"
              strokeDasharray="4 4"
              opacity="0.2"
            />

            {/* Layer 3: Breathing area fill (fades in after line draws) */}
            {areaPath && (
              <motion.path
                d={areaPath}
                fill="url(#insightAreaGrad)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.8, ease: "easeOut" }}
              />
            )}

            {/* Layer 1+2: Glowing line with draw-on animation */}
            {linePath && (
              <motion.path
                d={linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lineGlow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 1.5, ease: [0.33, 1, 0.68, 1] },
                  opacity: { duration: 0.3 },
                }}
              />
            )}

            {/* Layer 7: Pulsing ambient dots (week/year view or sparse data) */}
            {coords.length <= 12 && coords.map((pt, i) => (
              <circle
                key={`dot-${i}`}
                cx={pt.x}
                cy={pt.y}
                r="1.5"
                fill={lineColor}
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  values="0;0.5;0"
                  dur={`${3 + (i % 3)}s`}
                  begin={`${1.5 + (i * 0.3) % 2}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="1;2.5;1"
                  dur={`${3 + (i % 3)}s`}
                  begin={`${1.5 + (i * 0.3) % 2}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}

            {/* Layer 5: Spring-animated cursor — always visible at selected point */}
            {coords.length > 0 && (
              <>
                {/* Vertical guide line */}
                <motion.line
                  x1={springX}
                  y1={CHART_T}
                  x2={springX}
                  y2={CHART_B}
                  stroke="var(--color-text-tertiary)"
                  strokeWidth="0.5"
                  strokeDasharray="3 3"
                  opacity="0.3"
                />
                {/* Outer glow ring */}
                <motion.circle
                  cx={springX}
                  cy={springY}
                  r="14"
                  fill={lineColor}
                  opacity="0.06"
                />
                {/* Mid ring */}
                <motion.circle
                  cx={springX}
                  cy={springY}
                  r="9"
                  fill={lineColor}
                  opacity="0.1"
                />
                {/* Data point dot */}
                <motion.circle
                  cx={springX}
                  cy={springY}
                  r="5"
                  fill={lineColor}
                  stroke="var(--color-bg-primary)"
                  strokeWidth="2.5"
                />
              </>
            )}

            {/* X-axis labels */}
            {xLabels.map((label, i) => (
              <text
                key={i}
                x={label.x}
                y={CHART_B + 14}
                textAnchor="middle"
                fill="var(--color-text-tertiary)"
                fontSize="9"
                fontFamily="inherit"
                opacity="0.6"
              >
                {label.text}
              </text>
            ))}
          </svg>
        </motion.div>
      </div>

      {/* Period navigation */}
      <div className="mt-1 flex items-center justify-center gap-3">
        {viewMode !== "week" && (
          <button
            onClick={viewMode === "month" ? prevMonth : prevYear}
            className="p-1.5 rounded-full text-text-secondary active:bg-bg-tertiary transition-colors"
          >
            <ChevronLeft />
          </button>
        )}
        <span className="text-[13px] font-medium text-text-secondary min-w-[120px] text-center">
          {periodLabel}
        </span>
        {viewMode !== "week" && (
          <button
            onClick={viewMode === "month" ? nextMonth : nextYear}
            disabled={viewMode === "month" ? !canNextMonth : !canNextYear}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              (viewMode === "month" ? canNextMonth : canNextYear)
                ? "text-text-secondary active:bg-bg-tertiary"
                : "text-text-tertiary/30 cursor-not-allowed"
            )}
          >
            <ChevronRight />
          </button>
        )}
      </div>

      {/* Category Spending Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            Spending by Category
          </h3>
          <div className="space-y-2">
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} className="rounded-xl bg-bg-secondary px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {cat.emoji && <span className="text-base">{cat.emoji}</span>}
                    <span className="text-sm font-medium text-text-primary">
                      {cat.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold tabular-nums text-text-primary">
                      {formatCurrency(cat.amount)}
                    </span>
                    <span className="ml-2 text-xs tabular-nums text-text-tertiary">
                      {cat.percent.toFixed(0)}%
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-expense/60 transition-all duration-300"
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
