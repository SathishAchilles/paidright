import { addDays, daysBetween } from "./format";
import type { ClockEvent, ClockKind, Deal } from "./types";

function alreadyInvoiced(deal: Deal, kind: ClockKind): boolean {
  return deal.changeOrders.some((co) => co.kind === kind && co.invoice);
}

export function computeClocks(deal: Deal, todayISO: string): ClockEvent[] {
  const events: ClockEvent[] = [];
  const t = deal.terms;

  if (
    t.usageDays != null &&
    t.usageStart &&
    t.usageExtensionRateMinor != null &&
    t.usageExtensionDays &&
    !alreadyInvoiced(deal, "USAGE_EXPIRED")
  ) {
    const end = addDays(t.usageStart, t.usageDays);
    const daysPast = daysBetween(end, todayISO);
    if (daysPast > 0) {
      const periods = Math.max(1, Math.ceil(daysPast / t.usageExtensionDays));
      events.push({
        kind: "USAGE_EXPIRED",
        description: `Paid usage ended ${end} (${t.usageDays}-day window from ${t.usageStart}); ${daysPast} day${daysPast === 1 ? "" : "s"} past, ${periods} extension period${periods === 1 ? "" : "s"} of ${t.usageExtensionDays} days`,
        periodsOrRounds: periods,
        suggestedAmountMinor: periods * t.usageExtensionRateMinor,
      });
    }
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
      description: `${deal.revisionsUsed} revision rounds used; contract includes ${t.revisionsIncluded}, so ${rounds} extra round${rounds === 1 ? "" : "s"} are billable`,
      periodsOrRounds: rounds,
      suggestedAmountMinor: rounds * t.revisionRateMinor,
    });
  }

  return events;
}
