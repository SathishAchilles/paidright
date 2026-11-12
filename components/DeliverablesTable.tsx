"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Deal } from "@/lib/types";
import { allInvoiceIds, PAYPAL_COPY, refreshAllInvoices, type UpdateDeal } from "./dealOps";
import { DeliverableRow } from "./DeliverableRow";
import { useAction } from "./useAction";

export interface PayPalCheck {
  check: (deal: Deal) => Promise<void>;
  loading: boolean;
  error: string | null;
  updated: boolean;
}

// One "check all with PayPal" action shared by the workspace tabs.
export function usePayPalCheck(update: UpdateDeal): PayPalCheck {
  const action = useAction();
  const { run } = action;
  const [updated, setUpdated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const check = useCallback(
    (deal: Deal) => {
      const ids = allInvoiceIds(deal);
      if (ids.length === 0) return Promise.resolve();
      setUpdated(false);
      return run(async () => {
        await refreshAllInvoices(ids, update);
        setUpdated(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setUpdated(false), 4000);
      });
    },
    [run, update],
  );

  return { check, loading: action.loading, error: action.error, updated };
}

export function PayPalCheckStatus({
  loading,
  error,
  updated,
  neverChecked = false,
}: Omit<PayPalCheck, "check"> & { neverChecked?: boolean }) {
  return (
    <p role="status" aria-live="polite" className="text-sm">
      {loading ? (
        <span className="text-ink-soft">{PAYPAL_COPY.checking}</span>
      ) : error ? (
        <span className="text-amber-ink">{neverChecked ? PAYPAL_COPY.failedNeverChecked : PAYPAL_COPY.failed}</span>
      ) : updated ? (
        <span className="text-mint">{PAYPAL_COPY.updated}</span>
      ) : null}
    </p>
  );
}

// The agreement as deliverables, each with its instalments, evidence and the
// status actions (mark submitted / approved, create PayPal invoice).
export function DeliverablesTable({
  deal,
  today,
  update,
}: {
  deal: Deal;
  today: string;
  update: UpdateDeal;
  paypal?: PayPalCheck;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {deal.deliverables.map((d) => (
        <DeliverableRow key={d.id} deal={deal} deliverable={d} today={today} update={update} />
      ))}
    </ul>
  );
}
