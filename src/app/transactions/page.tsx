"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import TransactionsContent from "@/components/transactions/TransactionsContent";
import { useAppData } from "@/hooks/useAppData";
import { TransactionListSkeleton } from "@/components/ui/Skeleton";

function TransactionsInner() {
  const searchParams = useSearchParams();
  const accountFilter = searchParams.get("account") || "all";
  const { transactions, accounts, isLoading } = useAppData();

  return (
    <TransactionsContent
      transactions={transactions}
      accounts={accounts}
      initialAccountFilter={accountFilter}
      isLoading={isLoading}
    />
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pt-4">
          <TransactionListSkeleton />
        </div>
      }
    >
      <TransactionsInner />
    </Suspense>
  );
}
