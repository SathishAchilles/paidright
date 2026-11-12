"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Deal } from "@/lib/types";
import { allInvoiceIds, PAYPAL_COPY, refreshAllInvoices, type UpdateDeal } from "./dealOps";
import { DeliverableRow } from "./DeliverableRow";
import { Button, Card } from "./ui";
import { useAction } from "./useAction";

export interface PayPalCheck {
  check: (deal: Deal) => Promise<void>;
  loading: boolean;
  error: string | null;
  updated: boolean;
}

// One "check all statuses with PayPal" action shared by the overview and the table.
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

export function PayPalCheckStatus({ loading, error, updated }: Omit<PayPalCheck, "check">) {
  return (
    <p role="status" aria-live="polite" className="text-sm">
      {loading ? (
        <span className="text-[#1B2839]/70">{PAYPAL_COPY.checking}</span>
      ) : error ? (
        <span className="text-[#C57630]" title={error}>
          {PAYPAL_COPY.failed}
        </span>
      ) : updated ? (
        <span className="text-[#188B77]">{PAYPAL_COPY.updated}</span>
      ) : null}
    </p>
  );
}

export function DeliverablesTable({
  deal,
  today,
  update,
  paypal,
}: {
  deal: Deal;
  today: string;
  update: UpdateDeal;
  paypal: PayPalCheck;
}) {
  const ids = allInvoiceIds(deal);

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span>Milestones</span>
          <Button loading={paypal.loading} disabled={ids.length === 0} onClick={() => paypal.check(deal)}>
            {PAYPAL_COPY.checkAll}
          </Button>
        </span>
      }
    >
      <PayPalCheckStatus loading={paypal.loading} error={paypal.error} updated={paypal.updated} />
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wide text-ink-soft uppercase">
              <th className="pb-2 font-semibold">Deliverable</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
              <th className="pb-2 font-semibold">Status / due</th>
              <th className="pb-2 font-semibold">PayPal invoice</th>
              <th className="pb-2 text-right font-semibold">Paid</th>
              <th className="pb-2 font-semibold">Gap</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {deal.deliverables.map((d) => (
              <DeliverableRow key={d.id} deal={deal} deliverable={d} today={today} update={update} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
