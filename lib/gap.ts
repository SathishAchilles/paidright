import type { Deliverable, Gap } from "./types";

export function computeGap(d: Deliverable): Gap {
  const base = { deliverableId: d.id };
  const inv = d.invoice;
  if (!inv) {
    if (d.status !== "approved") return { ...base, gapClass: "NOT_DUE", dueMinor: 0 };
    return { ...base, gapClass: "NOT_INVOICED", dueMinor: d.amountMinor };
  }
  if (inv.paidMinor >= inv.totalMinor || inv.status === "PAID" || inv.status === "MARKED_AS_PAID") {
    return { ...base, gapClass: "PAID", dueMinor: 0 };
  }
  if (inv.paidMinor > 0) {
    return { ...base, gapClass: "UNDERPAID", dueMinor: inv.totalMinor - inv.paidMinor };
  }
  return { ...base, gapClass: "UNPAID", dueMinor: inv.totalMinor };
}
