import { addDays, daysBetween, moneyShort } from "./format";
import type { ChangeOrder, ClockEvent, ClockKind, Deal } from "./types";

// "2026-12-05" -> "5 Dec 2026", read as a calendar day (no timezone shift).
export function formatDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// "GlowLab, Inc." -> "GlowLab" for sentences.
export function shortBrand(brand: string): string {
  return brand.replace(/,?\s+(inc|llc|ltd|limited|corp|co)\.?$/i, "").trim() || brand;
}

function alreadyInvoiced(deal: Deal, kind: ClockKind): boolean {
  return deal.changeOrders.some((co) => co.kind === kind && co.invoice);
}

// The paid-usage window, when the contract states it fully.
export interface UsageWindow {
  start: string;
  end: string; // first day after the window (ISO)
  days: number;
  extensionRateMinor: number;
  extensionDays: number;
}

export function usageWindow(deal: Deal): UsageWindow | null {
  const t = deal.terms;
  if (t.usageDays == null || !t.usageStart || t.usageExtensionRateMinor == null || !t.usageExtensionDays) return null;
  return {
    start: t.usageStart,
    end: addDays(t.usageStart, t.usageDays),
    days: t.usageDays,
    extensionRateMinor: t.usageExtensionRateMinor,
    extensionDays: t.usageExtensionDays,
  };
}

// An expired usage window is a question, not a fee. It only becomes billable
// once the creator confirms the brand asked for an extension.
export function usageWindowEnded(deal: Deal, todayISO: string): UsageWindow | null {
  const w = usageWindow(deal);
  if (!w || alreadyInvoiced(deal, "USAGE_EXPIRED")) return null;
  return daysBetween(w.end, todayISO) > 0 ? w : null;
}

// The creator's "Yes, they asked" is stored as a USAGE_EXPIRED change order
// without an invoice until the PayPal invoice is created.
export function usageConfirmation(deal: Deal): ChangeOrder | null {
  return deal.changeOrders.find((co) => co.kind === "USAGE_EXPIRED" && !co.invoice) ?? null;
}

// One confirmed extension period, priced from the contract rate. Never inferred
// from elapsed time.
export function usageExtensionEvent(deal: Deal, periods = 1): ClockEvent | null {
  const w = usageWindow(deal);
  if (!w || periods < 1) return null;
  return {
    kind: "USAGE_EXPIRED",
    description: `${shortBrand(deal.brand)} asked for ${periods === 1 ? "another" : periods} ${w.extensionDays}-day period${periods === 1 ? "" : "s"} of paid usage after the window ended on ${formatDay(w.end)}. The agreement prices each additional ${w.extensionDays} days at ${moneyShort(w.extensionRateMinor, deal.currency)}.`,
    periodsOrRounds: periods,
    suggestedAmountMinor: periods * w.extensionRateMinor,
  };
}

export function computeClocks(deal: Deal, todayISO: string): ClockEvent[] {
  const events: ClockEvent[] = [];
  const t = deal.terms;

  if (usageWindowEnded(deal, todayISO) && usageConfirmation(deal)) {
    const e = usageExtensionEvent(deal, 1);
    if (e) events.push(e);
  }

  if (
    t.revisionsIncluded != null &&
    t.revisionRateMinor != null &&
    deal.revisionsUsed > t.revisionsIncluded &&
    !alreadyInvoiced(deal, "REVISIONS_EXCEEDED")
  ) {
    const rounds = deal.revisionsUsed - t.revisionsIncluded;
    events.push({
      kind: "REVISIONS_EXCEEDED",
      description: `${rounds} extra revision round${rounds === 1 ? "" : "s"} beyond the ${t.revisionsIncluded} included. The agreement prices each at ${moneyShort(t.revisionRateMinor, deal.currency)}.`,
      periodsOrRounds: rounds,
      suggestedAmountMinor: rounds * t.revisionRateMinor,
    });
  }

  return events;
}
