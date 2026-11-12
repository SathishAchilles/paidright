"use client";

import { addDays, money, moneyShort } from "@/lib/format";
import { computeGap, instalmentPaid, isInstalmentOverdue, isInstalmentPaid } from "@/lib/gap";
import type { Deal, Deliverable, Gap, Instalment } from "@/lib/types";
import { createInvoice, patchInstalmentInvoice, refreshInvoice, type UpdateDeal } from "./dealOps";
import { InvoiceCell } from "./InvoiceCell";
import { Button, ErrorText, GapBadge } from "./ui";
import { useAction } from "./useAction";

export function gapBadgeLabel(gap: Gap, currency: Deal["currency"]): string | undefined {
  if (gap.gapClass !== "OVERDUE") return undefined;
  const days = gap.daysOverdue ?? 0;
  return `${moneyShort(gap.overdueMinor, currency)} overdue · ${days} day${days === 1 ? "" : "s"}`;
}

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
  const gap = computeGap(d, today);
  const pct = d.amountMinor > 0 ? Math.round((gap.paidMinor / d.amountMinor) * 100) : 0;
  const patch = (p: Partial<Deliverable>) =>
    update((deal) => ({ ...deal, deliverables: deal.deliverables.map((x) => (x.id === d.id ? { ...x, ...p } : x)) }));

  let control: React.ReactNode = null;
  if (d.status === "pending") {
    control = <Button onClick={() => patch({ status: "submitted" })}>Mark submitted</Button>;
  } else if (d.status === "submitted") {
    control = <Button onClick={() => patch({ status: "approved", approvedAt: today })}>Mark approved</Button>;
  }

  return (
    <>
      <tr className="border-t border-line align-top">
        <td className="pt-3 pb-2 pr-3 font-medium">{d.name}</td>
        <td className="pt-3 pb-2 pr-3 text-right tabular-nums">{money(d.amountMinor, deal.currency)}</td>
        <td className="pt-3 pb-2 pr-3">
          <span className="capitalize">{d.status}</span>
          {d.approvedAt && <span className="block text-xs text-ink-soft">on {d.approvedAt}</span>}
        </td>
        <td className="pt-3 pb-2 pr-3" />
        <td className="pt-3 pb-2 pr-3 text-right">
          <span className="font-medium tabular-nums">{pct}% paid</span>
          <span className="block text-xs text-ink-soft tabular-nums">
            {moneyShort(gap.paidMinor, deal.currency)} of {moneyShort(d.amountMinor, deal.currency)}
          </span>
        </td>
        <td className="pt-3 pb-2 pr-3">
          <GapBadge gapClass={gap.gapClass} label={gapBadgeLabel(gap, deal.currency)} />
        </td>
        <td className="pt-3 pb-2 text-right">{control}</td>
      </tr>
      {d.instalments.map((inst, idx) => (
        <InstalmentRow
          key={inst.id}
          deal={deal}
          deliverable={d}
          instalment={inst}
          index={idx}
          today={today}
          update={update}
        />
      ))}
    </>
  );
}

function InstalmentRow({
  deal,
  deliverable: d,
  instalment: inst,
  index,
  today,
  update,
}: {
  deal: Deal;
  deliverable: Deliverable;
  instalment: Instalment;
  index: number;
  today: string;
  update: UpdateDeal;
}) {
  const action = useAction();
  const inv = inst.invoice;
  const offset = inst.dueOffsetDays ?? deal.terms.paymentDays ?? 30;
  const paid = instalmentPaid(inst);
  const overdue = isInstalmentOverdue(inst, today);
  const last = index === d.instalments.length - 1;

  let due: React.ReactNode;
  if (inv?.dueDate) due = <>due {inv.dueDate}</>;
  else if (d.approvedAt) due = <>due ~{addDays(d.approvedAt, offset)}</>;
  else due = offset === 0 ? "on approval" : `${offset} days after approval`;

  const onInvoice = () =>
    action.run(async () => {
      const note = `${inst.label} for ${d.name} (${money(inst.amountMinor, deal.currency)} of ${money(d.amountMinor, deal.currency)}), under the ${deal.brand} x ${deal.creator} brand-deal agreement. Delivered and approved on ${d.approvedAt ?? today}.`;
      const invoice = await createInvoice(deal, `${d.name} — ${inst.label}`, inst.amountMinor, note, offset);
      update((x) => patchInstalmentInvoice(x, d.id, inst.id, () => invoice));
    });

  const onRefresh = () => action.run(() => refreshInvoice(inv!.paypalInvoiceId, update));

  let control: React.ReactNode = null;
  if (inv) {
    control = (
      <Button loading={action.loading} onClick={onRefresh}>
        Refresh
      </Button>
    );
  } else if (d.status === "approved") {
    control = (
      <Button variant="primary" loading={action.loading} disabled={!deal.brandEmail} onClick={onInvoice}>
        Create PayPal invoice
      </Button>
    );
  }

  const cell = `py-2 pr-3 ${last ? "pb-3" : ""}`;
  return (
    <tr className="align-top text-xs">
      <td className={`${cell} pl-4`}>
        <span className="border-l-2 border-line pl-2 text-ink">{inst.label}</span>
        {inst.sourceQuote && <span className="mt-1 block pl-3 text-ink-soft italic">&ldquo;{inst.sourceQuote}&rdquo;</span>}
      </td>
      <td className={`${cell} text-right tabular-nums`}>{money(inst.amountMinor, deal.currency)}</td>
      <td className={`${cell} tabular-nums ${overdue ? "font-semibold text-danger" : "text-ink-soft"}`}>{due}</td>
      <td className={cell}>
        <InvoiceCell invoice={inv} />
      </td>
      <td className={`${cell} text-right tabular-nums`}>{inv ? money(paid, deal.currency) : "—"}</td>
      <td className={cell}>
        {isInstalmentPaid(inst) ? (
          <span className="text-ok">Paid</span>
        ) : overdue ? (
          <span className="font-semibold text-danger">Overdue</span>
        ) : inv ? (
          <span className="text-ink-soft">Awaiting payment</span>
        ) : null}
      </td>
      <td className={`${cell} text-right`}>
        {control}
        <ErrorText error={action.error} />
      </td>
    </tr>
  );
}
