"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-tertiary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-expense"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>
      <p className="mt-3 text-lg font-semibold text-text-primary">
        Something went wrong
      </p>
      <p className="mt-1 text-sm text-text-secondary">
        Please try again
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-xl bg-btn-primary-bg px-6 py-2.5 text-sm font-medium text-btn-primary-text"
      >
        Retry
      </button>
    </div>
  );
}
