"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/cn";
import { playClick } from "@/lib/sfx";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function BottomSheet({
  open,
  onClose,
  children,
  title,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-overlay"
            onClick={() => {
              playClick();
              onClose();
            }}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
            }}
            className={cn(
              "relative w-full max-w-lg rounded-t-2xl bg-bg-primary shadow-xl",
              "max-h-[90vh] overflow-y-auto"
            )}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Drag handle */}
            <div className="sticky top-0 z-10 flex justify-center bg-bg-primary pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-bg-tertiary" />
            </div>

            {/* Title */}
            {title && (
              <h2 className="px-5 pb-3 text-lg font-semibold text-text-primary">
                {title}
              </h2>
            )}

            {/* Content */}
            <div className="px-5 pb-8">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
