"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ToastData {
  message: string;
  action?: { label: string; onClick: () => void };
}

let toastCallback: ((data: ToastData) => void) | null = null;

export function showToast(data: ToastData) {
  toastCallback?.(data);
}

export default function ToastContainer() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setToast(null), 300);
  }, []);

  useEffect(() => {
    toastCallback = (data) => {
      setToast(data);
      setVisible(true);
    };

    return () => {
      toastCallback = null;
    };
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  return (
    <AnimatePresence>
      {toast && visible && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-lg"
        >
          <div className="flex items-center justify-between rounded-xl bg-text-primary px-4 py-3 shadow-lg">
            <span className="text-sm text-bg-primary">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  dismiss();
                }}
                className="ml-3 shrink-0 text-sm font-semibold text-toast-action"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
