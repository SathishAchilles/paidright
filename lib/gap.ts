import { daysBetween } from "./format";
import type { Deliverable, Gap, Instalment } from "./types";

export function instalmentPaid(i: Instalment): number {
  const inv = i.invoice;
  if (!inv) return 0;
  if (inv.status === "PAID" || inv.status === "MARKED_AS_PAID") return i.amountMinor;
  return Math.min(inv.paidMinor, i.amountMinor);
}

export function isInstalmentPaid(i: Instalment): boolean {
  return instalmentPaid(i) >= i.amountMinor;
}

export function isInstalmentOverdue(i: Instalment, todayISO: string): boolean {
  const due = i.invoice?.dueDate;
  return !!due && !isInstalmentPaid(i) && daysBetween(due, todayISO) > 0;
}

export function computeGap(d: Deliverable, todayISO: string): Gap {
  const totalMinor = d.amountMinor;
  const paidMinor = d.instalments.reduce((s, i) => s + instalmentPaid(i), 0);
  const base = {
    deliverableId: d.id,
    totalMinor,
    paidMinor,
    dueMinor: Math.max(0, totalMinor - paidMinor),
    overdueMinor: 0,
    overdueInstalmentId: null,
    daysOverdue: null,
  };
  const anyInvoiced = d.instalments.some((i) => i.invoice);

  if (d.status !== "approved" && !anyInvoiced) return { ...base, gapClass: "NOT_DUE" };
  if (paidMinor >= totalMinor) return { ...base, gapClass: "PAID" };

  const overdue = d.instalments
    .filter((i) => isInstalmentOverdue(i, todayISO))
    .sort((a, b) => daysBetween(b.invoice!.dueDate!, a.invoice!.dueDate!));
  if (overdue.length > 0) {
    const first = overdue[0];
    return {
      ...base,
      gapClass: "OVERDUE",
      overdueMinor: overdue.reduce((s, i) => s + i.amountMinor - instalmentPaid(i), 0),
      overdueInstalmentId: first.id,
      daysOverdue: daysBetween(first.invoice!.dueDate!, todayISO),
    };
  }

  if (d.status === "approved" && d.instalments.some((i) => !i.invoice)) return { ...base, gapClass: "NOT_INVOICED" };
  if (paidMinor > 0) return { ...base, gapClass: "UNDERPAID" };
  return { ...base, gapClass: "UNPAID" };
}
