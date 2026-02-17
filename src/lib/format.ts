/**
 * Format a number as TWD currency string.
 */
export function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString("en-US");
  const sign = amount < 0 ? "-" : "";
  return `${sign}NT$${formatted}`;
}

/**
 * Format a number with explicit sign for display.
 */
export function formatSignedCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString("en-US");
  const sign = amount < 0 ? "-" : "+";
  return `${sign}NT$${formatted}`;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Format a date string to English display.
 * e.g., "2026-02-15" → "Feb 15, 2026 (Sat)"
 */
export function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const dayOfWeek = DAY_NAMES[date.getDay()];
  return `${month} ${day}, ${year} (${dayOfWeek})`;
}

/**
 * Format a date string to short display.
 * e.g., "2026-02-15" → "02/15"
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

/**
 * Format an ISO timestamp to 24h time string.
 * e.g., "2026-02-15T19:30:00Z" → "19:30"
 */
export function formatTime24h(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Reimbursement status label mapping.
 */
export const REIMBURSEMENT_LABELS: Record<string, string> = {
  pending: "Pending",
  claimed: "Claimed",
  paid: "Paid",
};
