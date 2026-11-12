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
    deliverables: deal.deliverables.map((d) => (match(d.invoice) ? { ...d, invoice: merge(d.invoice!, inv) } : d)),
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
): Promise<InvoiceRef> {
  const { invoice } = await post<InvoiceRequest, InvoiceResponse>("/api/invoice", {
    currency: deal.currency,
    recipientEmail: deal.brandEmail,
    recipientName: deal.brand,
    lineItem,
    amountMinor,
    note,
    dueInDays: deal.terms.paymentDays ?? 30,
  });
  return invoice;
}

export function allInvoiceIds(deal: Deal): string[] {
  return [
    ...deal.deliverables.flatMap((d) => (d.invoice ? [d.invoice.paypalInvoiceId] : [])),
    ...deal.changeOrders.flatMap((c) => (c.invoice ? [c.invoice.paypalInvoiceId] : [])),
  ];
}
