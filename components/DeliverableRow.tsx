"use client";

import { addDays, money, moneyShort } from "@/lib/format";
import { computeGap, instalmentPaid, isInstalmentOverdue, isInstalmentPaid } from "@/lib/gap";
import type { Deal, Deliverable, Gap, Instalment } from "@/lib/types";
import {
  canShowPayLink,
  createInvoice,
  PAYPAL_COPY,
  patchInstalmentInvoice,
  wasChecked,
  type UpdateDeal,
} from "./dealOps";
import { InvoiceCell } from "./InvoiceCell";
import { Button, ErrorText } from "./ui";
import { useAction } from "./useAction";

export function gapBadgeLabel(gap: Gap, currency: Deal["currency"]): string | undefined {
  if (gap.gapClass !== "OVERDUE") return undefined;
  const days = gap.daysOverdue ?? 0;
  return `${moneyShort(gap.overdueMinor, currency)} overdue · ${days} day${days === 1 ? "" : "s"}`;
}

export type StatusTone = "paid" | "overdue" | "open" | "waiting";

export const statusToneClass: Record<StatusTone, string> = {
  paid: "bg-mint-bg text-mint",
  overdue: "bg-amber-bg text-amber-ink",
  open: "bg-blue-bg text-blue-strong",
  waiting: "bg-muted-bg text-ink-soft",
};

// One plain-language status per deliverable. "Overdue" is only claimed once
// PayPal has confirmed the overdue invoice; until then it is "pending verification".
export function deliverableStatus(d: Deliverable, gap: Gap, deal: Deal): { label: string; tone: StatusTone } {
  const cur = deal.currency;
  const approved = d.status === "approved";
  switch (gap.gapClass) {
    case "PAID":
      return { label: "Paid", tone: "paid" };
    case "OVERDUE": {
      const late = d.instalments.find((i) => i.id === gap.overdueInstalmentId);
      if (!wasChecked(late?.invoice?.lastRefreshedAt)) return { label: "Pending PayPal verification", tone: "waiting" };
      return { label: `${approved ? "Approved, " : ""}${moneyShort(gap.overdueMinor, cur)} overdue`, tone: "overdue" };
    }
    case "NOT_INVOICED":
      return { label: "Approved, not invoiced", tone: "open" };
    case "UNDERPAID":
      return { label: `${approved ? "Approved, " : ""}${moneyShort(gap.dueMinor, cur)} not yet due`, tone: "open" };
    case "UNPAID":
      return { label: `${approved ? "Approved, " : ""}awaiting payment`, tone: "open" };
    case "NOT_DUE":
      return d.status === "submitted"
        ? { label: "Awaiting approval", tone: "waiting" }
        : { label: "Not delivered yet", tone: "waiting" };
  }
}

export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusToneClass[tone]}`}>
      {label}
    </span>
  );
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
  const status = deliverableStatus(d, gap, deal);
  const patch = (p: Partial<Deliverable>) =>
    update((deal) => ({ ...deal, deliverables: deal.deliverables.map((x) => (x.id === d.id ? { ...x, ...p } : x)) }));

  let control: React.ReactNode = null;
  if (d.status === "pending") {
    control = <Button onClick={() => patch({ status: "submitted" })}>Mark submitted</Button>;
  } else if (d.status === "submitted") {
    control = <Button onClick={() => patch({ status: "approved", approvedAt: today })}>Mark approved</Button>;
  }

  const quotes = [
    d.sourceQuote ? { label: "Deliverable and fee", text: d.sourceQuote } : null,
    ...d.instalments.map((i) => (i.sourceQuote ? { label: i.label, text: i.sourceQuote } : null)),
  ].filter((q): q is { label: string; text: string } => q !== null);

  return (
    <li className="rounded-card border border-line bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink">{d.name}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            {d.status === "approved" && d.approvedAt
              ? `Approved by the brand on ${d.approvedAt}`
              : d.status === "submitted"
                ? PAYPAL_COPY.submitted
                : "Not delivered yet."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xl font-semibold text-navy tabular-nums">{moneyShort(d.amountMinor, deal.currency)}</span>
          <StatusPill {...status} />
        </div>
      </div>

      <ul className="mt-3 flex flex-col divide-y divide-line border-t border-line">
        {d.instalments.map((inst) => (
          <InstalmentRow key={inst.id} deal={deal} deliverable={d} instalment={inst} today={today} update={update} />
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <details className="group min-w-0 flex-1 text-sm">
          <summary className="cursor-pointer font-medium text-accent underline-offset-4 hover:underline">
            View evidence
          </summary>
          <div className="mt-2 flex flex-col gap-2 rounded-md bg-muted-bg p-3">
            {quotes.length === 0 ? (
              <p className="text-ink-soft">No exact clause was linked. Check the full agreement below.</p>
            ) : (
              quotes.map((q) => (
                <figure key={q.label}>
                  <figcaption className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{q.label}</figcaption>
                  <blockquote className="mt-0.5 border-l-2 border-accent pl-2 text-ink italic">&ldquo;{q.text}&rdquo;</blockquote>
                </figure>
              ))
            )}
            {d.approvedAt && <p className="text-xs text-ink-soft">Brand approval recorded on {d.approvedAt}.</p>}
          </div>
        </details>
        {control}
      </div>
    </li>
  );
}

function InstalmentRow({
  deal,
  deliverable: d,
  instalment: inst,
  today,
  update,
}: {
  deal: Deal;
  deliverable: Deliverable;
  instalment: Instalment;
  today: string;
  update: UpdateDeal;
}) {
  const action = useAction();
  const inv = inst.invoice;
  const unclearDue = inst.dueOffsetDays == null && deal.terms.paymentDays == null;
  const offset = inst.dueOffsetDays ?? deal.terms.paymentDays ?? 30;
  const paid = isInstalmentPaid(inst);
  const overdue = isInstalmentOverdue(inst, today) && wasChecked(inv?.lastRefreshedAt);

  let due: string;
  if (inv?.dueDate) due = `Due ${inv.dueDate}`;
  else if (unclearDue) due = PAYPAL_COPY.noDueDate;
  else if (d.approvedAt) due = `Due about ${addDays(d.approvedAt, offset)}`;
  else due = offset === 0 ? "Due on approval" : `Due ${offset} days after approval`;

  let state: string;
  if (paid) state = "Paid";
  else if (overdue) state = `${moneyShort(inst.amountMinor - instalmentPaid(inst), deal.currency)} overdue`;
  else if (inv) state = "Invoiced, not paid yet";
  else if (d.status === "approved") state = "Not invoiced";
  else state = "Not yet billable";

  const onInvoice = () =>
    action.run(async () => {
      const note = `${inst.label} for ${d.name} (${money(inst.amountMinor, deal.currency)} of ${money(d.amountMinor, deal.currency)}), under the ${deal.brand} x ${deal.creator} brand-deal agreement. Delivered and approved on ${d.approvedAt ?? today}.`;
      const invoice = await createInvoice(deal, `${d.name} — ${inst.label}`, inst.amountMinor, note, offset);
      update((x) => patchInstalmentInvoice(x, d.id, inst.id, () => invoice));
    });

  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-ink">
          {inst.label} · <span className="tabular-nums">{moneyShort(inst.amountMinor, deal.currency)}</span>
        </p>
        <p className={`text-xs tabular-nums ${overdue ? "font-semibold text-amber-ink" : "text-ink-soft"}`}>
          {due} · {state}
        </p>
        {inv && (
          <div className="mt-1">
            <InvoiceCell invoice={inv} showPayLink={canShowPayLink(deal, inv)} />
          </div>
        )}
      </div>
      {!inv && d.status === "approved" && (
        <div className="flex flex-col items-end">
          <Button variant="primary" loading={action.loading} disabled={!deal.brandEmail} onClick={onInvoice}>
            Create PayPal invoice
          </Button>
          <ErrorText error={action.error} />
        </div>
      )}
    </li>
  );
}
