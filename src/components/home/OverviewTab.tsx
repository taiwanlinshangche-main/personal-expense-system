"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useAppData } from "@/hooks/useAppData";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";

function AccountRow({
  icon,
  name,
  balance,
  balanceColor,
  delay,
}: {
  icon: React.ReactNode;
  name: string;
  balance: string;
  balanceColor?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between rounded-2xl bg-bg-secondary p-4"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-bg-tertiary flex items-center justify-center">
          {icon}
        </div>
        <p className="font-medium text-text-primary text-[15px]">{name}</p>
      </div>
      <p
        className={cn(
          "text-[15px] font-semibold tabular-nums",
          balanceColor || "text-text-primary"
        )}
      >
        {balance}
      </p>
    </motion.div>
  );
}

function SubAccountRow({
  icon,
  name,
  balance,
  balanceColor,
}: {
  icon: React.ReactNode;
  name: string;
  balance: string;
  balanceColor?: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="h-6 w-6 rounded-md bg-bg-tertiary flex items-center justify-center">
          {icon}
        </div>
        <p className="text-[13px] text-text-secondary">{name}</p>
      </div>
      <p
        className={cn(
          "text-[13px] font-medium tabular-nums",
          balanceColor || "text-text-primary"
        )}
      >
        {balance}
      </p>
    </div>
  );
}

// SVG Icons
function BanknoteIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-secondary"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function BankIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-secondary"
    >
      <path d="m3 21 18 0" />
      <path d="m3 10 18 0" />
      <path d="M12 3 3 10h18Z" />
      <path d="M6 10v11M10 10v11M14 10v11M18 10v11" />
    </svg>
  );
}

function CardIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-secondary"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-secondary"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

export default function OverviewTab() {
  const { accounts, transactions } = useAppData();

  const monthlyIncome = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => {
        const d = new Date(t.date + "T00:00:00");
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear() &&
          t.amount > 0
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const monthlySpending = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => {
        const d = new Date(t.date + "T00:00:00");
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear() &&
          t.amount < 0
        );
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [transactions]);

  const cashAccount = accounts.find((a) => a.name === "Cash");
  const sinopacAccounts = accounts.filter((a) => a.group === "sinopac");
  const taiwanAccount = accounts.find((a) => a.name === "Taiwan Bank");
  const atmAccount = sinopacAccounts.find((a) => a.name.includes("ATM"));
  const cardAccount = sinopacAccounts.find((a) => a.name.includes("Card"));

  const knownIds = new Set(
    [cashAccount?.id, atmAccount?.id, cardAccount?.id, taiwanAccount?.id].filter(
      Boolean
    )
  );
  const otherAccounts = accounts.filter((a) => !knownIds.has(a.id));

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);

  const cashBal = cashAccount?.current_balance ?? 0;
  const atmBal = atmAccount?.current_balance ?? 0;
  const cardBal = cardAccount?.current_balance ?? 0;
  const taiwanBal = taiwanAccount?.current_balance ?? 0;
  const sinopacGroupBalance = atmBal + cardBal;

  return (
    <div className="px-5 pb-8">
      {/* Total Balance */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="text-sm text-text-secondary font-medium">Total balance</p>
        <p className="mt-2 text-[42px] font-bold tabular-nums text-text-primary leading-none tracking-tight">
          {formatCurrency(totalBalance)}
        </p>
      </motion.div>

      {/* Income / Spending Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="mt-5 flex gap-3"
      >
        {/* Income */}
        <div className="flex-1 flex items-center gap-3 rounded-2xl bg-bg-secondary p-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-income/10 flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--income)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="m5 12 7-7 7 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Income</p>
            <p className="text-[15px] font-semibold tabular-nums text-text-primary truncate">
              {formatCurrency(monthlyIncome)}
            </p>
          </div>
        </div>

        {/* Spending */}
        <div className="flex-1 flex items-center gap-3 rounded-2xl bg-bg-secondary p-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-expense/10 flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--expense)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="m19 12-7 7-7-7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Spending</p>
            <p className="text-[15px] font-semibold tabular-nums text-text-primary truncate">
              {formatCurrency(monthlySpending)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Accounts */}
      <section className="mt-7">
        <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider">
          Accounts
        </h3>
        <div className="mt-3 space-y-2">
          {/* Cash — always visible */}
          <AccountRow
            icon={<BanknoteIcon />}
            name="Cash"
            balance={formatCurrency(Math.abs(cashBal))}
            delay={0.1}
          />

          {/* SinoPac Group — always visible */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="rounded-2xl bg-bg-secondary overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-bg-tertiary flex items-center justify-center">
                  <BankIcon />
                </div>
                <p className="font-medium text-text-primary text-[15px]">
                  SinoPac
                </p>
              </div>
              <p
                className={cn(
                  "text-[15px] font-semibold tabular-nums",
                  sinopacGroupBalance < 0
                    ? "text-expense"
                    : "text-text-primary"
                )}
              >
                {formatCurrency(sinopacGroupBalance)}
              </p>
            </div>
            <div className="mx-4 mb-3 rounded-xl bg-bg-tertiary/40 divide-y divide-border/30">
              <SubAccountRow
                icon={<BankIcon size={14} />}
                name="ATM"
                balance={formatCurrency(Math.abs(atmBal))}
              />
              <SubAccountRow
                icon={<CardIcon size={14} />}
                name="Card"
                balance={formatCurrency(cardBal)}
                balanceColor={cardBal < 0 ? "text-expense" : undefined}
              />
            </div>
          </motion.div>

          {/* Taiwan Bank — always visible */}
          <AccountRow
            icon={<BankIcon />}
            name="Taiwan Bank"
            balance={formatCurrency(Math.abs(taiwanBal))}
            delay={0.18}
          />

          {/* Other accounts (dynamic) */}
          {otherAccounts.map((account, i) => (
            <AccountRow
              key={account.id}
              icon={<WalletIcon />}
              name={account.name}
              balance={formatCurrency(account.current_balance)}
              delay={0.22 + i * 0.04}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
