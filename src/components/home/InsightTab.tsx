"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion } from "motion/react";
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
const CHART_L = 16;
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

export default function InsightTab() {
  const { accounts, transactions } = useAppData();
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedMonthYear, setSelectedMonthYear] = useState(now.getFullYear());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Navigation
  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedMonthYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setSelectedPointIdx(null);
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedMonthYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setSelectedPointIdx(null);
  };

  const prevYear = () => {
    setSelectedYear((y) => y - 1);
    setSelectedPointIdx(null);
  };

  const nextYear = () => {
    setSelectedYear((y) => y + 1);
    setSelectedPointIdx(null);
  };

  const canNextMonth =
    selectedMonthYear < now.getFullYear() ||
    (selectedMonthYear === now.getFullYear() && selectedMonth < now.getMonth());
  const canNextYear = selectedYear < now.getFullYear();

  // Get relevant transactions (sorted by date)
  const relevantTxs = useMemo(() => {
    const txs =
      selectedAccountId === "all"
        ? [...transactions]
        : transactions.filter((tx) => tx.account_id === selectedAccountId);
    return txs.sort(
      (a, b) =>
        new Date(a.date + "T00:00:00").getTime() -
        new Date(b.date + "T00:00:00").getTime()
    );
  }, [transactions, selectedAccountId]);

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

    return { income, spending };
  }, [
    relevantTxs,
    viewMode,
    selectedMonth,
    selectedMonthYear,
    selectedYear,
  ]);

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

  // Chart tap handler
  const handleChartTap = useCallback(
    (clientX: number) => {
      if (!svgRef.current || coords.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / rect.width) * SVG_W;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < coords.length; i++) {
        const dist = Math.abs(coords[i].x - svgX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      setSelectedPointIdx((prev) => (prev === closest ? null : closest));
    },
    [coords]
  );

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

  const changeView = (v: ViewMode) => {
    setViewMode(v);
    setSelectedPointIdx(null);
  };
  const changeAccount = (id: string) => {
    setSelectedAccountId(id);
    setSelectedPointIdx(null);
  };

  // Tooltip
  const tooltipPoint =
    selectedPointIdx !== null && chartData[selectedPointIdx]
      ? { ...chartData[selectedPointIdx], coord: coords[selectedPointIdx] }
      : null;

  const displayBalance = tooltipPoint
    ? tooltipPoint.balance
    : comparison.currentBalance;
  const isChangePositive = comparison.change >= 0;

  return (
    <div className="px-5 pb-8">
      {/* Account chips + Time range */}
      <div className="flex items-start gap-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 pb-1">
          <button
            onClick={() => changeAccount("all")}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-all",
              selectedAccountId === "all"
                ? "bg-text-primary text-bg-primary"
                : "bg-bg-secondary text-text-secondary"
            )}
          >
            All
          </button>
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => changeAccount(account.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-all",
                selectedAccountId === account.id
                  ? "bg-text-primary text-bg-primary"
                  : "bg-bg-secondary text-text-secondary"
              )}
            >
              {account.name}
            </button>
          ))}
        </div>

        {/* Time range pills */}
        <div className="flex shrink-0 rounded-full bg-bg-secondary p-0.5">
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

        {tooltipPoint ? (
          <p className="mt-2 text-sm text-text-secondary">
            {tooltipPoint.fullLabel}
          </p>
        ) : (
          <>
            {/* Comparison line */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
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

            {/* Period income / spending */}
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
          </>
        )}
      </motion.div>

      {/* Chart */}
      <motion.div
        key={`${viewMode}-${selectedMonth}-${selectedMonthYear}-${selectedYear}-${selectedAccountId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mt-4"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          onClick={(e) => handleChartTap(e.clientX)}
          onTouchEnd={(e) => {
            if (e.changedTouches[0])
              handleChartTap(e.changedTouches[0].clientX);
          }}
          style={{ cursor: "pointer" }}
        >
          <defs>
            <linearGradient id="insightAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
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
            opacity="0.3"
          />

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#insightAreaGrad)" />}

          {/* Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Selected point */}
          {tooltipPoint && tooltipPoint.coord && (
            <>
              <line
                x1={tooltipPoint.coord.x}
                y1={CHART_T}
                x2={tooltipPoint.coord.x}
                y2={CHART_B}
                stroke="var(--color-text-tertiary)"
                strokeWidth="0.5"
                opacity="0.4"
              />
              <circle
                cx={tooltipPoint.coord.x}
                cy={tooltipPoint.coord.y}
                r="5"
                fill={lineColor}
                stroke="var(--color-bg-primary)"
                strokeWidth="2.5"
              />
              <text
                x={tooltipPoint.coord.x}
                y={Math.max(tooltipPoint.coord.y - 14, CHART_T + 6)}
                textAnchor="middle"
                fill="var(--color-text-secondary)"
                fontSize="10"
                fontWeight="600"
                fontFamily="inherit"
              >
                {tooltipPoint.fullLabel.toUpperCase()}
              </text>
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
    </div>
  );
}
