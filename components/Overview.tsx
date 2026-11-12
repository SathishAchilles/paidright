"use client";

import { useEffect, useState } from "react";
import { moneyShort } from "@/lib/format";
import { computeGap, instalmentPaid, isInstalmentOverdue } from "@/lib/gap";
import type { Currency, Deal, Minor } from "@/lib/types";
import { wasChecked } from "./dealOps";

// Every unpaid cent lands in exactly one bucket, so the tiles always add up to
// the deal total: paid + overdue + awaiting + readyToInvoice + notBillable.
// Amounts are gross client payments from PayPal; fees are never included.
export interface Buckets {
  totalMinor: Minor;
  paidMinor: Minor;
  overdueMinor: Minor;
  awaitingMinor: Minor; // invoiced, unpaid, not yet past its due date
  readyToInvoiceMinor: Minor; // approved, unpaid, no invoice yet
  notBillableMinor: Minor; // work not yet approved (plus any total not split into deliverables)
  paidParts: string[];
  overdueParts: string[];
  notBillableNames: string[];
}

export function computeBuckets(deal: Deal, today: string): Buckets {
  const cur = deal.currency;
  let paidMinor = 0;
  let overdueMinor = 0;
  let awaitingMinor = 0;
  let readyToInvoiceMinor = 0;
  const paidParts: string[] = [];
  const overdueParts: string[] = [];
  const notBillableNames: string[] = [];

  for (const d of deal.deliverables) {
    const gap = computeGap(d, today);
    paidMinor += gap.paidMinor;
    overdueMinor += gap.overdueMinor;
    const multi = d.instalments.length > 1;
    let unapproved = 0;
    for (const i of d.instalments) {
      const paid = instalmentPaid(i);
      const rest = i.amountMinor - paid;
      if (paid > 0) paidParts.push(`${moneyShort(paid, cur)} ${d.name}${multi ? ` ${i.label.toLowerCase()}` : ""}`);
      if (rest <= 0) continue;
      if (isInstalmentOverdue(i, today)) {
        overdueParts.push(`${d.name}${multi ? ` · ${i.label}` : ""} after due date`);
      } else if (i.invoice) {
        awaitingMinor += rest;
      } else if (d.status === "approved") {
        readyToInvoiceMinor += rest;
      } else {
        unapproved += rest;
      }
    }
    if (unapproved > 0) notBillableNames.push(d.name);
  }

  const totalMinor = deal.totalMinor;
  const notBillableMinor = totalMinor - paidMinor - overdueMinor - awaitingMinor - readyToInvoiceMinor;
  return {
    totalMinor,
    paidMinor,
    overdueMinor,
    awaitingMinor,
    readyToInvoiceMinor,
    notBillableMinor,
    paidParts,
    overdueParts,
    notBillableNames,
  };
}

export function relativeTime(iso: string, nowMs: number): string {
  const mins = Math.round((nowMs - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function oldestCheck(deal: Deal): string | null {
  const stamps = [
    ...deal.deliverables.flatMap((d) => d.instalments.map((i) => i.invoice?.lastRefreshedAt)),
    ...deal.changeOrders.map((c) => c.invoice?.lastRefreshedAt),
  ];
  const all = stamps.filter((s): s is string => s !== undefined);
  if (all.length === 0 || !all.every((s) => wasChecked(s))) return null;
  return all.reduce((a, b) => (Date.parse(a) <= Date.parse(b) ? a : b));
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

interface OverdueItem {
  deliverableId: string;
  sentence: string;
  count: number;
}

function overdueItems(deal: Deal, today: string): OverdueItem[] {
  const cur = deal.currency;
  return deal.deliverables.flatMap((d) => {
    const gap = computeGap(d, today);
    if (gap.gapClass !== "OVERDUE") return [];
    const late = d.instalments.filter((i) => isInstalmentOverdue(i, today));
    const what = late
      .map((i) => `${i.label.toLowerCase()} of ${moneyShort(i.amountMinor - instalmentPaid(i), cur)}`)
      .join(" and ");
    const verb = late.length === 1 ? "is" : "are";
    const lead = d.status === "approved" ? `The brand approved your ${d.name}, but ` : `For your ${d.name}, `;
    return [
      {
        deliverableId: d.id,
        sentence: `${lead}${what} ${verb} overdue. Paidright has prepared a review.`,
        count: late.length,
      },
    ];
  });
}

function scrollToAndFocus(id: string, fallbackId?: string) {
  const el = document.getElementById(id) ?? (fallbackId ? document.getElementById(fallbackId) : null);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

function brandShort(brand: string): string {
  return brand.replace(/,?\s+(Inc|LLC|Ltd|Corp|Co)\.?$/i, "").trim();
}

type Tone = "navy" | "mint" | "amber" | "slate";

const toneClass: Record<Tone, string> = {
  navy: "border-[#DCE2E9] bg-white text-[#101B2B]",
  mint: "border-[#188B77]/30 bg-[#188B77]/5 text-[#188B77]",
  amber: "border-[#C57630]/40 bg-[#C57630]/5 text-[#C57630]",
  slate: "border-[#DCE2E9] bg-[#F7F8F5] text-[#1B2839]",
};

function Tile({
  label,
  amount,
  currency,
  detail,
  tone,
}: {
  label: string;
  amount: Minor;
  currency: Currency;
  detail: string;
  tone: Tone;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-4 ${toneClass[tone]}`}>
      <span className="text-xs font-semibold tracking-wide text-[#1B2839]/70 uppercase">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{moneyShort(amount, currency)}</span>
      <span className="text-xs leading-snug text-[#1B2839]/75">{detail}</span>
    </div>
  );
}

export function Overview({ deal, today, checking }: { deal: Deal; today: string; checking: boolean }) {
  const now = useNow();
  const cur = deal.currency;
  const b = computeBuckets(deal, today);
  const items = overdueItems(deal, today);
  const lateCount = items.reduce((s, i) => s + i.count, 0);
  const lastCheck = oldestCheck(deal);
  const firstName = deal.creator.trim().split(/\s+/)[0] || deal.creator;

  return (
    <section aria-labelledby="overview-title" className="flex flex-col gap-4 text-[#1B2839]">
      <div>
        <h1 id="overview-title" className="font-serif text-3xl text-[#101B2B]">
          {firstName} × {brandShort(deal.brand)}
        </h1>
        <p className="mt-1 text-sm text-[#1B2839]/70">
          Campaign overview · Currency: {cur} · Status: Active
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Total agreed" amount={b.totalMinor} currency={cur} detail="Entire signed campaign amount" tone="navy" />
        <Tile
          label="Verified paid"
          amount={b.paidMinor}
          currency={cur}
          detail={b.paidParts.length ? b.paidParts.join(" + ") : "No payment confirmed by PayPal yet"}
          tone="mint"
        />
        <Tile
          label="Overdue"
          amount={b.overdueMinor}
          currency={cur}
          detail={b.overdueParts.length ? b.overdueParts.join("; ") : "Nothing past its due date"}
          tone={b.overdueMinor > 0 ? "amber" : "slate"}
        />
        <Tile
          label="Not yet billable"
          amount={b.notBillableMinor}
          currency={cur}
          detail={
            b.notBillableNames.length
              ? `Work not yet approved: ${b.notBillableNames.join(", ")}`
              : "Work not yet approved"
          }
          tone="slate"
        />
      </div>

      {(b.awaitingMinor > 0 || b.readyToInvoiceMinor > 0) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums">
          {b.awaitingMinor > 0 && (
            <span>
              Awaiting payment (not yet due):{" "}
              <span className="font-semibold text-[#101B2B]">{moneyShort(b.awaitingMinor, cur)}</span>
            </span>
          )}
          {b.readyToInvoiceMinor > 0 && (
            <span>
              Approved, not yet invoiced:{" "}
              <span className="font-semibold text-[#101B2B]">{moneyShort(b.readyToInvoiceMinor, cur)}</span>
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-[#1B2839]/70">
        {checking
          ? "Checking the latest invoice status with PayPal…"
          : `PayPal statuses last checked ${lastCheck ? relativeTime(lastCheck, now) : "not yet checked"}`}
      </p>

      {checking && !lastCheck ? null : items.length > 0 ? (
        <div className="rounded-xl border border-[#C57630]/40 bg-white p-5">
          <h2 className="text-lg font-semibold text-[#101B2B]">
            {lateCount === 1 ? "One payment needs your attention" : `${lateCount} payments need your attention`}
          </h2>
          {items.map((i) => (
            <p key={i.deliverableId} className="mt-1 text-sm text-[#1B2839]">
              {i.sentence}
            </p>
          ))}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => scrollToAndFocus(`resolution-${items[0].deliverableId}`, "milestones")}
              className="rounded-[10px] border border-[#305CE8] bg-[#305CE8] px-4 py-2 text-sm font-medium text-white hover:bg-[#2449c4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#305CE8]"
            >
              Review unpaid amount
            </button>
            <button
              type="button"
              onClick={() => scrollToAndFocus("milestones")}
              className="rounded-[10px] border border-[#DCE2E9] bg-white px-4 py-2 text-sm font-medium text-[#101B2B] hover:border-[#101B2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#305CE8]"
            >
              See all milestones
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#188B77]/30 bg-[#188B77]/5 p-5">
          <p className="text-sm font-medium text-[#188B77]">Nothing needs your attention right now.</p>
        </div>
      )}
    </section>
  );
}
