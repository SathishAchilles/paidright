"use client";

import type { Deal } from "@/lib/types";
import { allInvoiceIds, refreshInvoice, type UpdateDeal } from "./dealOps";
import { DeliverableRow } from "./DeliverableRow";
import { Button, Card, ErrorText } from "./ui";
import { useAction } from "./useAction";

export function DeliverablesTable({ deal, today, update }: { deal: Deal; today: string; update: UpdateDeal }) {
  const refreshAll = useAction();
  const ids = allInvoiceIds(deal);

  const onRefreshAll = () =>
    refreshAll.run(async () => {
      const results = await Promise.allSettled(ids.map((id) => refreshInvoice(id, update)));
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      if (failed.length) {
        throw new Error(`${failed.length} of ${ids.length} refreshes failed: ${String(failed[0].reason?.message ?? failed[0].reason)}`);
      }
    });

  return (
    <Card
      title={
        <span className="flex items-center justify-between">
          <span>Deliverables</span>
          <Button loading={refreshAll.loading} disabled={ids.length === 0} onClick={onRefreshAll}>
            Refresh all invoices
          </Button>
        </span>
      }
    >
      <ErrorText error={refreshAll.error} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wide text-ink-soft uppercase">
              <th className="pb-2 font-semibold">Deliverable</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
              <th className="pb-2 font-semibold">Status</th>
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
