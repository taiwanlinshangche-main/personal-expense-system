/**
 * Lightweight analytics tracking utility.
 * MVP: logs to console in development.
 * Future: send to PostHog, Mixpanel, or custom Supabase events table.
 */

interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Track an analytics event.
 * Fire-and-forget — never blocks the UI.
 */
export function track(eventName: string, properties?: EventProperties): void {
  try {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      ...properties,
    };

    if (IS_DEV) {
      console.log("[analytics]", eventName, properties || "");
    }

    // Future: send to analytics service
    // fetch('/api/events', { method: 'POST', body: JSON.stringify(event) }).catch(() => {});
    void event;
  } catch {
    // Analytics should never crash the app
  }
}

// ===== Pre-defined event helpers =====

export function trackPageView(tabName: string) {
  track("page_view", { tab_name: tabName });
}

export function trackAddTransactionStart(sourceTab: string) {
  track("add_transaction_start", { source_tab: sourceTab });
}

export function trackAddTransactionSubmit(
  amount: number,
  isCompanyAdvance: boolean,
  accountId: string,
  timeToSubmitMs: number
) {
  track("add_transaction_submit", {
    amount,
    is_company_advance: isCompanyAdvance,
    account_id: accountId,
    time_to_submit_ms: timeToSubmitMs,
  });
}

export function trackAddTransactionCancel(filledFieldsCount: number) {
  track("add_transaction_cancel", { fields_filled_count: filledFieldsCount });
}

export function trackAddAccountSubmit(initialBalance: number) {
  track("add_account_submit", { initial_balance: initialBalance });
}

export function trackFilterAccount(accountId: string, tabName: string) {
  track("filter_account", { account_id: accountId, tab_name: tabName });
}

export function trackReimbursementStatusChange(
  fromStatus: string,
  toStatus: string,
  transactionId: string
) {
  track("reimbursement_status_change", {
    from_status: fromStatus,
    to_status: toStatus,
    transaction_id: transactionId,
  });
}

export function trackReimbursementUndo(revertedStatus: string) {
  track("reimbursement_undo", { reverted_status: revertedStatus });
}

export function trackReimbursementSegmentSwitch(segmentName: string) {
  track("reimbursement_segment_switch", { segment_name: segmentName });
}

export function trackSearchOpen(tabName: string) {
  track("search_open", { tab_name: tabName });
}

export function trackSearchQuery(queryLength: number) {
  track("search_query", { query_length: queryLength });
}

export function trackTransactionDetailView(transactionId: string) {
  track("transaction_detail_view", { transaction_id: transactionId });
}

export function trackTransactionDelete(transactionId: string) {
  track("transaction_delete", { transaction_id: transactionId });
}
