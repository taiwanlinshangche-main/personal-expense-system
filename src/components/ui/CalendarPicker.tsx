"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/cn";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDateStr(s: string): { year: number; month: number; day: number } | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function formatDisplay(dateStr: string): string {
  const p = parseDateStr(dateStr);
  if (!p) return "";
  return `${MONTH_SHORT[p.month]} ${p.day}, ${p.year}`;
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// ── Single date picker ──────────────────────────────────────
interface CalendarPickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  onDone?: () => void;
  onBack?: () => void;
}

export default function CalendarPicker({ value, onChange, onDone, onBack }: CalendarPickerProps) {
  const parsed = parseDateStr(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleSelect = useCallback(
    (day: number) => {
      onChange(toDateStr(viewYear, viewMonth, day));
    },
    [viewYear, viewMonth, onChange]
  );

  return (
    <div className="rounded-2xl bg-bg-secondary p-4">
      {/* Header with centered nav */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-full text-text-secondary active:bg-bg-tertiary transition-colors">
          <ChevronLeft />
        </button>
        <span className="text-[15px] font-semibold text-text-primary min-w-[130px] text-center">
          {viewYear} {MONTH_SHORT[viewMonth]}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-full text-text-secondary active:bg-bg-tertiary transition-colors">
          <ChevronRight />
        </button>
      </div>

      {/* Day grid */}
      <DayGrid
        year={viewYear}
        month={viewMonth}
        selected={value}
        onSelect={handleSelect}
      />

      {/* Display + actions */}
      <div className="mt-4 rounded-xl bg-bg-tertiary px-4 py-3 text-center">
        <p className="text-[17px] font-semibold text-text-primary">
          {value ? formatDisplay(value) : "No date selected"}
        </p>
      </div>

      <div className="mt-3 flex gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-text-secondary"
          >
            Back
          </button>
        )}
        {onDone && (
          <button
            onClick={onDone}
            disabled={!value}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors",
              value
                ? "bg-btn-primary-bg text-btn-primary-text"
                : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
            )}
          >
            Save Date
          </button>
        )}
      </div>
    </div>
  );
}

// ── Range date picker ───────────────────────────────────────
interface CalendarRangePickerProps {
  startDate: string;
  endDate: string;
  onChangeStart: (d: string) => void;
  onChangeEnd: (d: string) => void;
  onClear?: () => void;
}

export function CalendarRangePicker({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  onClear,
}: CalendarRangePickerProps) {
  const today = new Date();
  const parsed = parseDateStr(startDate) || parseDateStr(endDate);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
  const [selectingPhase, setSelectingPhase] = useState<"start" | "end">(
    startDate && !endDate ? "end" : "start"
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleSelect = useCallback(
    (day: number) => {
      const dateStr = toDateStr(viewYear, viewMonth, day);
      if (selectingPhase === "start") {
        onChangeStart(dateStr);
        onChangeEnd("");
        setSelectingPhase("end");
      } else {
        if (startDate && dateStr < startDate) {
          onChangeEnd(startDate);
          onChangeStart(dateStr);
        } else {
          onChangeEnd(dateStr);
        }
        setSelectingPhase("start");
      }
    },
    [viewYear, viewMonth, selectingPhase, startDate, onChangeStart, onChangeEnd]
  );

  return (
    <div className="rounded-2xl bg-bg-secondary p-4">
      {/* Header with centered nav */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-full text-text-secondary active:bg-bg-tertiary transition-colors">
          <ChevronLeft />
        </button>
        <span className="text-[15px] font-semibold text-text-primary min-w-[130px] text-center">
          {viewYear} {MONTH_SHORT[viewMonth]}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-full text-text-secondary active:bg-bg-tertiary transition-colors">
          <ChevronRight />
        </button>
      </div>

      {/* Day grid with range */}
      <DayGrid
        year={viewYear}
        month={viewMonth}
        rangeStart={startDate}
        rangeEnd={endDate}
        onSelect={handleSelect}
      />

      {/* Range display */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setSelectingPhase("start")}
          className={cn(
            "flex-1 rounded-xl px-3 py-2.5 text-center text-[13px] font-medium border transition-colors",
            selectingPhase === "start"
              ? "border-accent bg-accent/10 text-text-primary"
              : "border-border bg-bg-tertiary text-text-secondary"
          )}
        >
          {startDate ? formatDisplay(startDate) : "Start date"}
        </button>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary shrink-0">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
        <button
          onClick={() => setSelectingPhase("end")}
          className={cn(
            "flex-1 rounded-xl px-3 py-2.5 text-center text-[13px] font-medium border transition-colors",
            selectingPhase === "end"
              ? "border-accent bg-accent/10 text-text-primary"
              : "border-border bg-bg-tertiary text-text-secondary"
          )}
        >
          {endDate ? formatDisplay(endDate) : "End date"}
        </button>
      </div>

      {(startDate || endDate) && onClear && (
        <button
          onClick={() => {
            onClear();
            setSelectingPhase("start");
          }}
          className="mt-2 w-full text-center text-xs font-medium text-expense"
        >
          Clear dates
        </button>
      )}
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────

function DayGrid({
  year,
  month,
  selected,
  rangeStart,
  rangeEnd,
  onSelect,
}: {
  year: number;
  month: number;
  selected?: string;
  rangeStart?: string;
  rangeEnd?: string;
  onSelect: (day: number) => void;
}) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const { daysInMonth, startDow } = useMemo(() => {
    const d = new Date(year, month + 1, 0);
    const first = new Date(year, month, 1);
    return { daysInMonth: d.getDate(), startDow: first.getDay() };
  }, [year, month]);

  const cells: (number | null)[] = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [daysInMonth, startDow]);

  return (
    <>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[12px] font-medium text-text-tertiary py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;

          const dateStr = toDateStr(year, month, day);
          const isToday = dateStr === todayStr;
          const isSelected = selected === dateStr;
          const isRangeStart = rangeStart === dateStr;
          const isRangeEnd = rangeEnd === dateStr;
          const isInRange =
            rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd;

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={cn(
                "relative flex items-center justify-center py-2 text-[14px] transition-colors",
                isInRange && "bg-accent/10",
                isRangeStart && rangeEnd && "bg-gradient-to-r from-transparent to-accent/10 rounded-l-full",
                isRangeEnd && rangeStart && "bg-gradient-to-l from-transparent to-accent/10 rounded-r-full",
              )}
            >
              <span
                className={cn(
                  "relative z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  (isSelected || isRangeStart || isRangeEnd) &&
                    "bg-accent text-accent-soft font-semibold",
                  isToday && !isSelected && !isRangeStart && !isRangeEnd &&
                    "ring-2 ring-accent text-accent font-semibold",
                  !isSelected && !isRangeStart && !isRangeEnd && !isToday &&
                    "text-text-primary hover:bg-bg-tertiary",
                )}
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
