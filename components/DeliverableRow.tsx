"use client";

import { computeGap } from "@/lib/gap";
import { money } from "@/lib/format";
import type { Deal, Deliverable } from "@/lib/types";
import { createInvoice, refreshInvoice, type UpdateDeal } from "./dealOps";
import { InvoiceCell } from "./InvoiceCell";
import { Button, ErrorText, GapBadge } from "./ui";
import { useAction } from "./useAction";

export function DeliverableRow({
  deal,
  deliverable: d,
  today,
  update,
}: {
  deal: Deal;
  deliverable: Deliverable;
  today: string;
  update: UpdateDeal;
}) {
  const action = useAction();
  const gap = computeGap(d);
  const patch = (p: Partial<Deliverable>) =>
    update((deal) => ({ ...deal, deliverables: deal.deliverables.map((x) => (x.id === d.id ? { ...x, ...p } : x)) }));

  const onInvoice = () =>
    action.run(async () => {
      const note = `${d.name} for ${deal.brand}, delivered by ${deal.creator} and approved on ${d.approvedAt ?? today} under the signed brand-deal agreement.`;
      const invoice = await createInvoice(deal, d.name, d.amountMinor, note);
      patch({ invoice });
    });

  const onRefresh = () => action.run(() => refreshInvoice(d.invoice!.paypalInvoiceId, update));

  let control: React.ReactNode;
  if (d.invoice) {
    control = <Button loading={action.loading} onClick={onRefresh}>Refresh</Button>;
  } else if (d.status === "pending") {
    control = <Button onClick={() => patch({ status: "submitted" })}>Mark submitted</Button>;
  } else if (d.status === "submitted") {
    control = <Button onClick={() => patch({ status: "approved", approvedAt: today })}>Mark approved</Button>;
  } else {
    control = (
      <Button variant="primary" loading={action.loading} disabled={!deal.brandEmail} onClick={onInvoice}>
        Create PayPal invoice
      </Button>
    );
  }

  return (
    <tr className="border-t border-line align-top">
      <td className="py-3 pr-3 font-medium">{d.name}</td>
      <td className="py-3 pr-3 text-right tabular-nums">{money(d.amountMinor, deal.currency)}</td>
      <td className="py-3 pr-3">
        <span className="capitalize">{d.status}</span>
        {d.approvedAt && <span className="block text-xs text-ink-soft">on {d.approvedAt}</span>}
      </td>
      <td className="py-3 pr-3">
        <InvoiceCell invoice={d.invoice} />
      </td>
      <td className="py-3 pr-3 text-right tabular-nums">
        {d.invoice ? money(d.invoice.paidMinor, deal.currency) : "—"}
      </td>
      <td className="py-3 pr-3">
        <GapBadge gapClass={gap.gapClass} />
        {gap.dueMinor > 0 && (
          <span className="block text-xs text-ink-soft tabular-nums">{money(gap.dueMinor, deal.currency)} owed</span>
        )}
      </td>
      <td className="py-3 text-right">
        {control}
        <ErrorText error={action.error} />
      </td>
    </tr>
  );
}
