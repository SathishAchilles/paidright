"use client";

import { useState } from "react";
import { isDemoDeal } from "@/lib/demo";
import { formatDateTime, moneyShort } from "@/lib/format";
import { instalmentPaid, isInstalmentOverdue } from "@/lib/gap";
import type { Deal, InvoiceRef, Minor } from "@/lib/types";
import {
  canShowPayLink,
  humanStatus,
  isPaidStatus,
  PAYPAL_COPY,
  refreshInvoice,
  wasChecked,
  type UpdateDeal,
} from "./dealOps";
import { PayPalCheckStatus, type PayPalCheck } from "./DeliverablesTable";
import { StatusPill, type StatusTone } from "./DeliverableRow";
import { Button } from "./ui";
import { useAction } from "./useAction";

interface PaymentRow {
  key: string;
  lineItem: string;
  invoice: InvoiceRef;
  amountMinor: Minor;
  paidMinor: Minor;
  overdue: boolean;
}

interface Unbilled {
  key: string;
  lineItem: string;
  amountMinor: Minor;
  reason: string;
}

function lineItem(name: string, label: string, count: number): string {
  return count > 1 ? `${name} — ${label}` : name;
}

function collect(deal: Deal, today: string): { records: PaymentRow[]; unbilled: Unbilled[] } {
  const records: PaymentRow[] = [];
  const unbilled: Unbilled[] = [];
  for (const d of deal.deliverables) {
    for (const i of d.instalments) {
      const item = lineItem(d.name, i.label, d.instalments.length);
      if (i.invoice) {
        records.push({
          key: i.id,
          lineItem: item,
          invoice: i.invoice,
          amountMinor: i.amountMinor,
          paidMinor: instalmentPaid(i),
          overdue: isInstalmentOverdue(i, today),
        });
      } else {
        unbilled.push({
          key: i.id,
          lineItem: item,
          amountMinor: i.amountMinor,
          reason:
            d.status === "approved"
              ? "Not invoiced · Approved, create the PayPal invoice in My Deals"
              : "Not yet billable · Awaiting brand approval",
        });
      }
    }
  }
  for (const c of deal.changeOrders) {
    if (c.invoice) {
      const inv = c.invoice;
      const paid = isPaidStatus(inv.status) ? c.amountMinor : Math.min(inv.paidMinor, c.amountMinor);
      const overdue = !!inv.dueDate && paid < c.amountMinor && inv.dueDate < today;
      records.push({ key: c.id, lineItem: c.lineItem, invoice: inv, amountMinor: c.amountMinor, paidMinor: paid, overdue });
    } else {
      unbilled.push({ key: c.id, lineItem: c.lineItem, amountMinor: c.amountMinor, reason: "Not invoiced" });
    }
  }
  return { records, unbilled };
}

export function PaymentsPanel({
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
  const { records, unbilled } = collect(deal, today);
  const neverChecked = records.every((r) => !wasChecked(r.invoice.lastRefreshedAt));

  return (
    <section aria-labelledby="payments-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="payments-title" className="font-display text-2xl font-semibold text-navy">
            What has the brand actually paid?
          </h2>
          <p className="mt-1 text-ink-soft">Payment information is checked against PayPal, not entered by guesswork.</p>
        </div>
        <Button variant="primary" loading={paypal.loading} disabled={records.length === 0} onClick={() => paypal.check(deal)}>
          {PAYPAL_COPY.checkAll}
        </Button>
      </div>
      <PayPalCheckStatus
        loading={paypal.loading}
        error={paypal.error}
        updated={paypal.updated}
        neverChecked={neverChecked}
      />

      {records.length === 0 ? (
        <p className="rounded-card border border-line bg-paper p-4 text-ink-soft">No PayPal invoices on this deal yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {records.map((r) => (
            <PaymentRecord key={r.key} deal={deal} record={r} update={update} globalLoading={paypal.loading} />
          ))}
        </ul>
      )}

      {unbilled.length > 0 && (
        <div className="rounded-card border border-line bg-paper p-4">
          <h3 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">No PayPal invoice yet</h3>
          <ul className="mt-2 flex flex-col divide-y divide-line">
            {unbilled.map((u) => (
              <li key={u.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-ink">{u.lineItem}</span>
                  <span className="block text-xs text-ink-soft">{u.reason}</span>
                </span>
                <span className="font-semibold text-navy tabular-nums">{moneyShort(u.amountMinor, deal.currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PaymentRecord({
  deal,
  record: r,
  update,
  globalLoading,
}: {
  deal: Deal;
  record: PaymentRow;
  update: UpdateDeal;
  globalLoading: boolean;
}) {
  const action = useAction();
  const [updated, setUpdated] = useState(false);
  const inv = r.invoice;
  const cur = deal.currency;
  const checked = wasChecked(inv.lastRefreshedAt);
  const paid = r.paidMinor >= r.amountMinor;
  const loading = action.loading || globalLoading;

  let state: { label: string; tone: StatusTone };
  if (!checked) state = { label: "Not yet verified", tone: "waiting" };
  else if (paid) state = { label: "Paid", tone: "paid" };
  else if (r.overdue) state = { label: `${moneyShort(r.amountMinor - r.paidMinor, cur)} overdue`, tone: "overdue" };
  else if (r.paidMinor > 0) state = { label: "Partly paid", tone: "open" };
  else state = { label: "Not paid yet", tone: "open" };

  const onCheck = () => {
    setUpdated(false);
    return action.run(async () => {
      await refreshInvoice(inv.paypalInvoiceId, update);
      setUpdated(true);
    });
  };

  const showLink = canShowPayLink(deal, inv);
  const hiddenInDemo = isDemoDeal(deal.id) && !isPaidStatus(inv.status);

  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">PayPal payment record</p>
          <h3 className="mt-0.5 font-semibold text-ink">{r.lineItem}</h3>
        </div>
        <StatusPill {...state} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-ink-soft">Amount</dt>
          <dd className="font-semibold text-navy tabular-nums">
            {moneyShort(r.amountMinor, cur)} {cur}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-soft">Paid</dt>
          <dd className="font-semibold tabular-nums">{checked ? moneyShort(r.paidMinor, cur) : "Not verified"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-soft">Due date</dt>
          <dd className="tabular-nums">{inv.dueDate ?? "Not set"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-soft">PayPal status</dt>
          <dd>{checked ? humanStatus(inv.status) : "Not yet checked"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-soft">Invoice number</dt>
          <dd className="font-mono text-xs">#{inv.invoiceNumber}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-soft">PayPal invoice ID</dt>
          <dd className="font-mono text-xs break-all">{inv.paypalInvoiceId}</dd>
        </div>
      </dl>

      <p className="text-xs text-ink-soft tabular-nums">
        {checked ? `Last verified ${formatDateTime(inv.lastRefreshedAt)}` : "Not yet verified with PayPal"}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button loading={loading} onClick={onCheck}>
          {PAYPAL_COPY.check}
        </Button>
        {showLink && (
          <a
            href={inv.payerViewUrl!}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-accent underline underline-offset-4"
          >
            View invoice in PayPal
          </a>
        )}
      </div>
      {hiddenInDemo && <p className="text-xs text-ink-soft">{PAYPAL_COPY.payLinkHidden}</p>}

      <p role="status" aria-live="polite" className="text-xs">
        {action.loading ? (
          <span className="text-ink-soft">{PAYPAL_COPY.checking}</span>
        ) : action.error ? (
          <span className="text-amber-ink">{checked ? PAYPAL_COPY.failed : PAYPAL_COPY.failedNeverChecked}</span>
        ) : updated ? (
          <span className="text-mint">{PAYPAL_COPY.updated}</span>
        ) : null}
      </p>
    </li>
  );
}
