"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

interface ChipFilterProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export default function ChipFilter({
  options,
  value,
  onChange,
}: ChipFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              isActive ? "text-btn-primary-text" : "bg-bg-tertiary text-text-secondary active:bg-border"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="chip-active"
                className="absolute inset-0 rounded-full bg-btn-primary-bg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
