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
