"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

interface Segment {
  value: string;
  label: string;
  count?: number;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
}

export default function SegmentedControl({
  segments,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div className="relative flex rounded-xl bg-bg-tertiary p-1">
      {segments.map((segment) => {
        const isActive = value === segment.value;
        return (
          <button
            key={segment.value}
            onClick={() => onChange(segment.value)}
            className={cn(
              "relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-colors duration-150",
              isActive ? "text-text-primary" : "text-text-secondary"
            )}
          >
            {/* Animated background pill */}
            {isActive && (
              <motion.div
                layoutId="segment-active"
                className="absolute inset-0 rounded-lg bg-bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              {segment.label}
              {segment.count !== undefined && (
                <span
                  className={cn(
                    "ml-1 text-xs",
                    isActive ? "text-text-secondary" : "text-text-tertiary"
                  )}
                >
                  ({segment.count})
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
