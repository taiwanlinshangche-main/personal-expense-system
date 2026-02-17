"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

interface FABProps {
  onClick: () => void;
  label?: string;
}

export default function FAB({ onClick, label = "Add transaction" }: FABProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-30",
        "flex h-14 w-14 items-center justify-center",
        "rounded-full bg-btn-primary-bg shadow-lg",
        "text-btn-primary-text",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      )}
      aria-label={label}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4.5v15m7.5-7.5h-15"
        />
      </svg>
    </motion.button>
  );
}
