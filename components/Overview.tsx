"use client";

import { useEffect, useState } from "react";
import { moneyShort } from "@/lib/format";
import { computeGap, instalmentPaid, isInstalmentOverdue } from "@/lib/gap";
import type { Deal, InvoiceRef, Minor } from "@/lib/types";
import { brandShort, PAYPAL_COPY, shortDeliverableName, wasChecked } from "./dealOps";

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
    const name = shortDeliverableName(d.name);
    let unapproved = 0;
    for (const i of d.instalments) {
      const paid = instalmentPaid(i);
      const rest = i.amountMinor - paid;
      if (paid > 0) paidParts.push(`${moneyShort(paid, cur)} ${name}${multi ? ` ${i.label.toLowerCase()}` : ""}`);
      if (rest <= 0) continue;
      if (isInstalmentOverdue(i, today)) {
        overdueParts.push(`${name}${multi ? ` · ${i.label}` : ""} after due date`);
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

function allInvoices(deal: Deal): InvoiceRef[] {
  return [
    ...deal.deliverables.flatMap((d) => d.instalments.flatMap((i) => (i.invoice ? [i.invoice] : []))),
    ...deal.changeOrders.flatMap((c) => (c.invoice ? [c.invoice] : [])),
  ];
}

// Oldest verification time across every invoice, or null if any was never checked.
function oldestCheck(deal: Deal): string | null {
  const stamps = allInvoices(deal).map((i) => i.lastRefreshedAt);
  if (stamps.length === 0 || !stamps.every((s) => wasChecked(s))) return null;
  return stamps.reduce((a, b) => (Date.parse(a) <= Date.parse(b) ? a : b));
}

// True when at least one invoice on the deal has never been confirmed by PayPal.
export function hasUnverifiedInvoices(deal: Deal): boolean {
  return allInvoices(deal).some((i) => !wasChecked(i.lastRefreshedAt));
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

interface OverdueItem {
  deliverableId: string;
  sentence: string;
  count: number;
  amountMinor: Minor;
}

// Overdue instalments PayPal has confirmed (checked at least once). Seeded,
// never-checked invoices are "pending verification", never "overdue".
export function verifiedOverdueItems(deal: Deal, today: string): OverdueItem[] {
  const cur = deal.currency;
  const brand = brandShort(deal.brand);
  return deal.deliverables.flatMap((d) => {
    const late = d.instalments.filter((i) => isInstalmentOverdue(i, today) && wasChecked(i.invoice?.lastRefreshedAt));
    if (late.length === 0) return [];
    const amountMinor = late.reduce((s, i) => s + i.amountMinor - instalmentPaid(i), 0);
    const what =
      late.length === 1
        ? `one ${moneyShort(amountMinor, cur)} payment is overdue`
        : `${countWord(late.length)} payments totalling ${moneyShort(amountMinor, cur)} are overdue`;
    const name = shortDeliverableName(d.name);
    const sentence =
      d.status === "approved" ? `${brand} approved the ${name}, but ${what}.` : `For the ${name}, ${what}.`;
    return [{ deliverableId: d.id, sentence, count: late.length, amountMinor }];
  });
}

type Source = "paypal" | "unverified" | "agreement" | "none";

const sourceCopy: Record<Source, string> = {
  paypal: "Verified by PayPal",
  unverified: "Not yet verified",
  agreement: "From agreement",
  none: "No invoices yet",
};

const sourceClass: Record<Source, string> = {
  paypal: "bg-mint-bg text-mint",
  unverified: "bg-amber-bg text-amber-ink",
  agreement: "bg-muted-bg text-ink-soft",
  none: "bg-muted-bg text-ink-soft",
};

function Metric({
  label,
  amount,
  deal,
  detail,
  source,
  emphasis,
  pending = false,
}: {
  label: string;
  amount: Minor;
  deal: Deal;
  detail: string;
  source: Source;
  emphasis?: "mint" | "amber";
  pending?: boolean;
}) {
  const amountClass = emphasis === "mint" ? "text-mint" : emphasis === "amber" ? "text-amber-ink" : "text-navy";
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-card border border-line bg-paper p-4">
      <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{label}</span>
      {pending ? (
        <span className="text-base font-medium text-ink-soft">Checking with PayPal…</span>
      ) : (
        <>
          <span className={`text-2xl font-semibold tabular-nums ${amountClass}`}>{moneyShort(amount, deal.currency)}</span>
          <span className="text-xs leading-snug text-ink-soft">{detail}</span>
          <span className={`mt-1 w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${sourceClass[source]}`}>
            {sourceCopy[source]}
          </span>
        </>
      )}
    </div>
  );
}

function sourceFor(invoices: InvoiceRef[]): Source {
  if (invoices.length === 0) return "none";
  return invoices.every((i) => wasChecked(i.lastRefreshedAt)) ? "paypal" : "unverified";
}

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border border-blue bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-60";

export function Overview({
  deal,
  today,
  checking,
  checkError = null,
  onInvestigate,
  onCheckAll,
}: {
  deal: Deal;
  today: string;
  checking: boolean;
  checkError?: string | null;
  onInvestigate?: () => void;
  onCheckAll?: () => void;
}) {
  const now = useNow();
  const cur = deal.currency;
  const b = computeBuckets(deal, today);
  const items = verifiedOverdueItems(deal, today);
  const lateCount = items.reduce((s, i) => s + i.count, 0);
  const overdueVerified = items.reduce((s, i) => s + i.amountMinor, 0);
  const pendingCheck = b.overdueMinor - overdueVerified;
  const unverified = hasUnverifiedInvoices(deal);
  const lastCheck = oldestCheck(deal);

  const approved = deal.deliverables.filter((d) => d.status === "approved");
  const approvedMinor = approved.reduce((s, d) => s + d.amountMinor, 0);
  const instalments = deal.deliverables.flatMap((d) => d.instalments);
  const invoiced = instalments.flatMap((i) => (i.invoice ? [i.invoice] : []));
  const contributing = instalments.flatMap((i) => (i.invoice && instalmentPaid(i) > 0 ? [i.invoice] : []));
  const paidSource = sourceFor(contributing.length > 0 ? contributing : invoiced);
  const overdueSource: Source = pendingCheck > 0 ? "unverified" : sourceFor(allInvoices(deal));

  const terms = [
    `Paid ${moneyShort(b.paidMinor, cur)}`,
    overdueVerified > 0 && `Overdue ${moneyShort(overdueVerified, cur)}`,
    pendingCheck > 0 && `Awaiting PayPal check ${moneyShort(pendingCheck, cur)}`,
    b.awaitingMinor > 0 && `Not yet due ${moneyShort(b.awaitingMinor, cur)}`,
    b.readyToInvoiceMinor > 0 && `Not invoiced ${moneyShort(b.readyToInvoiceMinor, cur)}`,
  ].filter((t): t is string => typeof t === "string");
  const reconciles =
    approvedMinor > 0 && approvedMinor === b.paidMinor + b.overdueMinor + b.awaitingMinor + b.readyToInvoiceMinor;

  // While the first PayPal check is running, seeded statuses are not shown as money.
  const verifying = checking && unverified;
  let card: React.ReactNode;
  if (verifying) {
    card = (
      <div role="status" className="rounded-panel border border-line bg-paper p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {PAYPAL_COPY.checking}
        </p>
      </div>
    );
  } else if (items.length > 0) {
    card = (
      <div className="rounded-panel border border-amber/50 bg-paper p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-amber-ink uppercase">Needs attention</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-navy sm:text-2xl">
          {lateCount === 1 ? "One payment needs your attention." : `${countWord(lateCount)} payments need your attention.`}
        </h2>
        {items.map((i) => (
          <p key={i.deliverableId} className="mt-1 text-ink">
            {i.sentence}
          </p>
        ))}
        {onInvestigate && (
          <button type="button" onClick={onInvestigate} className={`${btnPrimary} mt-4`}>
            Investigate {moneyShort(overdueVerified, cur)}
          </button>
        )}
      </div>
    );
  } else if (unverified) {
    card = (
      <div className="rounded-panel border border-line bg-paper p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Payment status not verified yet.</h2>
        <p className="mt-1 text-ink">PayPal hasn&apos;t confirmed these invoices yet, so nothing is marked overdue.</p>
        {checkError && (
          <p role="alert" className="mt-2 text-sm text-amber-ink">
            {lastCheck ? PAYPAL_COPY.failed : PAYPAL_COPY.failedNeverChecked}
          </p>
        )}
        {onCheckAll && (
          <button type="button" onClick={onCheckAll} className={`${btnPrimary} mt-4`}>
            {PAYPAL_COPY.checkAll}
          </button>
        )}
      </div>
    );
  } else {
    card = (
      <div className="rounded-panel border border-mint/30 bg-mint-bg p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Nothing is overdue right now.</h2>
        {(b.awaitingMinor > 0 || b.readyToInvoiceMinor > 0) && (
          <p className="mt-1 text-ink">
            {[
              b.awaitingMinor > 0 && `${moneyShort(b.awaitingMinor, cur)} is invoiced and not yet due.`,
              b.readyToInvoiceMinor > 0 && `${moneyShort(b.readyToInvoiceMinor, cur)} is approved but not invoiced yet.`,
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Overview" className="flex flex-col gap-4">
      {card}

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Work approved"
          amount={approvedMinor}
          deal={deal}
          detail={approved.length ? approved.map((d) => shortDeliverableName(d.name)).join(" + ") : "No work approved yet"}
          source="agreement"
        />
        <Metric
          label="Paid"
          amount={b.paidMinor}
          deal={deal}
          detail={b.paidParts.length ? b.paidParts.join(" + ") : "No payment confirmed yet"}
          source={paidSource}
          emphasis="mint"
          pending={verifying}
        />
        <Metric
          label="Overdue"
          amount={overdueVerified}
          deal={deal}
          detail={
            pendingCheck > 0
              ? `${moneyShort(pendingCheck, cur)} past due date, waiting for a PayPal check`
              : b.overdueParts.length
                ? b.overdueParts.join("; ")
                : "Nothing past its due date"
          }
          source={overdueSource}
          emphasis={overdueVerified > 0 ? "amber" : undefined}
          pending={verifying}
        />
        <Metric
          label="Not yet billable"
          amount={b.notBillableMinor}
          deal={deal}
          detail={
            b.notBillableNames.length
              ? `Awaiting brand approval: ${b.notBillableNames.map(shortDeliverableName).join(", ")}`
              : "Awaiting brand approval"
          }
          source="agreement"
        />
      </div>

      {reconciles && !verifying && (
        <p className="text-sm text-ink tabular-nums">
          Approved work {moneyShort(approvedMinor, cur)} = {terms.join(" + ")}
        </p>
      )}

      <p className="text-xs text-ink-soft">
        {checking
          ? PAYPAL_COPY.checking
          : lastCheck
            ? `Last checked with PayPal ${relativeTime(lastCheck, now)}`
            : "Not yet checked with PayPal"}
      </p>
    </section>
  );
}
