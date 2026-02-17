"use client";

import ReimbursementContent from "@/components/reimbursement/ReimbursementContent";
import { useAppData } from "@/hooks/useAppData";
export default function ReimbursementPage() {
  const { transactions, accounts, isLoading, onStatusChange } = useAppData();

  // Only company advances
  const companyAdvances = transactions.filter((t) => t.is_company_advance);

  return (
    <ReimbursementContent
      transactions={companyAdvances}
      accounts={accounts}
      isLoading={isLoading}
      onStatusChange={onStatusChange}
    />
  );
}
