import type { InvoiceRequest, InvoiceResponse, RefreshRequest, RefreshResponse } from "@/lib/api-contract";
import type { Deal, InvoiceRef } from "@/lib/types";
import { post } from "./api";

export type UpdateDeal = (mutator: (d: Deal) => Deal) => void;

function merge(old: InvoiceRef, next: InvoiceRef): InvoiceRef {
  return {
    ...old,
    ...next,
    payerViewUrl: next.payerViewUrl ?? old.payerViewUrl,
    lastReminderAt: next.lastReminderAt ?? old.lastReminderAt,
  };
}

export function applyInvoice(deal: Deal, inv: InvoiceRef): Deal {
  const match = (i?: InvoiceRef) => i?.paypalInvoiceId === inv.paypalInvoiceId;
  return {
    ...deal,
    deliverables: deal.deliverables.map((d) =>
      d.instalments.some((i) => match(i.invoice))
        ? {
            ...d,
            instalments: d.instalments.map((i) => (match(i.invoice) ? { ...i, invoice: merge(i.invoice!, inv) } : i)),
          }
        : d,
    ),
    changeOrders: deal.changeOrders.map((c) => (match(c.invoice) ? { ...c, invoice: merge(c.invoice!, inv) } : c)),
  };
}

export async function refreshInvoice(paypalInvoiceId: string, update: UpdateDeal): Promise<void> {
  const { invoice } = await post<RefreshRequest, RefreshResponse>("/api/refresh", { paypalInvoiceId });
  update((d) => applyInvoice(d, invoice));
}

export async function createInvoice(
  deal: Deal,
  lineItem: string,
  amountMinor: number,
  note: string,
  dueInDays: number,
): Promise<InvoiceRef> {
  const { invoice } = await post<InvoiceRequest, InvoiceResponse>("/api/invoice", {
    currency: deal.currency,
    recipientEmail: deal.brandEmail,
    recipientName: deal.brand,
    lineItem,
    amountMinor,
    note,
    dueInDays,
  });
  return invoice;
}

export function allInvoiceIds(deal: Deal): string[] {
  return [
    ...deal.deliverables.flatMap((d) => d.instalments.flatMap((i) => (i.invoice ? [i.invoice.paypalInvoiceId] : []))),
    ...deal.changeOrders.flatMap((c) => (c.invoice ? [c.invoice.paypalInvoiceId] : [])),
  ];
}

export function patchInstalmentInvoice(
  deal: Deal,
  deliverableId: string,
  instalmentId: string,
  patch: (inv: InvoiceRef | undefined) => InvoiceRef | undefined,
): Deal {
  return {
    ...deal,
    deliverables: deal.deliverables.map((d) =>
      d.id === deliverableId
        ? { ...d, instalments: d.instalments.map((i) => (i.id === instalmentId ? { ...i, invoice: patch(i.invoice) } : i)) }
        : d,
    ),
  };
}

// Refreshes every invoice on the deal from PayPal. Throws if any refresh failed;
// successful refreshes are still applied.
export async function refreshAllInvoices(ids: string[], update: UpdateDeal): Promise<void> {
  const results = await Promise.allSettled(ids.map((id) => refreshInvoice(id, update)));
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length) {
    throw new Error(`${failed.length} of ${ids.length} refreshes failed: ${String(failed[0].reason?.message ?? failed[0].reason)}`);
  }
}

// Seed snapshots carry an epoch timestamp: treat anything that old as never checked.
export function wasChecked(iso: string | undefined): iso is string {
  return !!iso && Date.parse(iso) > Date.UTC(2000, 0, 1);
}

export const PAYPAL_COPY = {
  check: "Check status with PayPal",
  checkAll: "Check all statuses with PayPal",
  checking: "Checking the latest invoice status with PayPal…",
  updated: "Payment status updated from PayPal.",
  failed: "We couldn't confirm the latest status. Your previous verified record is still available. Try again.",
  noInvoice: "No PayPal invoice has been created for this instalment.",
  submitted: "The work has been submitted. We're waiting for the brand's review.",
  sentUnpaid: "The invoice was sent. Payment has not been confirmed yet.",
  overdue: "This payment is past its agreed due date.",
} as const;
