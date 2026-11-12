"use client";

import { formatDay, shortBrand } from "@/lib/clocks";
import { formatDateTime, moneyShort } from "@/lib/format";
import { isInstalmentOverdue, isInstalmentPaid } from "@/lib/gap";
import { getToday } from "@/lib/store";
import type { Deal, Deliverable, Instalment } from "@/lib/types";
import { wasChecked } from "./dealOps";

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

// "second instalment", or "full payment" for a single-payment deliverable.
export function instalmentWords(d: Deliverable, i: Instalment): string {
  if (d.instalments.length === 1) return "full payment";
  const index = d.instalments.indexOf(i);
  return `${ORDINALS[index] ?? `number ${index + 1}`} instalment`;
}

// Ordinal only ("second"), or "" for a single-payment deliverable.
export function instalmentOrdinal(d: Deliverable, i: Instalment): string {
  if (d.instalments.length === 1) return "";
  const index = d.instalments.indexOf(i);
  return ORDINALS[index] ?? `number ${index + 1}`;
}

type Tone = "neutral" | "verified" | "overdue";

interface TimelineEvent {
  key: string;
  title: string;
  when: string | null; // already formatted for display
  source: string;
  link?: string | null;
  tone: Tone;
}

const DOT: Record<Tone, string> = {
  neutral: "bg-ink-soft",
  verified: "bg-mint",
  overdue: "bg-amber",
};

function buildEvents(deal: Deal, d: Deliverable, todayISO: string): TimelineEvent[] {
  const cur = deal.currency;
  const brand = shortBrand(deal.brand);
  const events: TimelineEvent[] = [];
  const count = d.instalments.length;

  events.push({
    key: "agreement",
    title:
      count > 1
        ? `Agreement confirmed: ${d.name} for ${moneyShort(d.amountMinor, cur)}, paid in ${count} instalments.`
        : `Agreement confirmed: ${d.name} for ${moneyShort(d.amountMinor, cur)}.`,
    when: null,
    source: "Agreement",
    tone: "neutral",
  });

  if (d.approvedAt) {
    events.push({
      key: "approved",
      title: `${brand} approved the ${d.name}.`,
      when: formatDay(d.approvedAt),
      source: "Creator action",
      tone: "verified",
    });
  }

  for (const i of d.instalments) {
    const inv = i.invoice;
    if (!inv) continue;
    const words = instalmentWords(d, i);
    events.push({
      key: `sent-${i.id}`,
      title: `PayPal invoice ${inv.invoiceNumber} sent for the ${words} (${moneyShort(i.amountMinor, cur)})${inv.dueDate ? `, due ${formatDay(inv.dueDate)}` : ""}.`,
      when: null,
      source: `PayPal invoice ${inv.invoiceNumber}`,
      link: inv.payerViewUrl,
      tone: "neutral",
    });
  }

  for (const i of d.instalments) {
    const inv = i.invoice;
    if (!inv || !isInstalmentPaid(i)) continue;
    const checked = wasChecked(inv.lastRefreshedAt);
    events.push({
      key: `paid-${i.id}`,
      title: checked
        ? `PayPal verified the ${instalmentWords(d, i)} as paid.`
        : `The ${instalmentWords(d, i)} is recorded as paid. Not yet re-checked with PayPal.`,
      when: checked ? `Checked ${formatDateTime(inv.lastRefreshedAt)}` : null,
      source: `PayPal invoice ${inv.invoiceNumber}`,
      link: inv.payerViewUrl,
      tone: checked ? "verified" : "neutral",
    });
  }

  const overdue = d.instalments.filter((i) => isInstalmentOverdue(i, todayISO));
  for (const i of overdue) {
    const inv = i.invoice!;
    events.push({
      key: `overdue-${i.id}`,
      title: `The ${instalmentWords(d, i)} passed its due date unpaid.`,
      when: formatDay(inv.dueDate!),
      source: `PayPal invoice ${inv.invoiceNumber}`,
      link: inv.payerViewUrl,
      tone: "overdue",
    });
  }

  if (overdue.length > 0) {
    events.push({
      key: "recommendation",
      title: d.disputed
        ? "PaidRight recommended pausing reminders while the payment is under review."
        : `PaidRight recommended a reminder to ${brand} with the invoice and approval record attached.`,
      when: null,
      source: "PaidRight analysis of the agreement and PayPal records",
      tone: "neutral",
    });
  }

  if (d.disputed) {
    events.push({
      key: "disputed",
      title: "You marked this payment as disputed. Automated reminders are paused.",
      when: null,
      source: "Creator action",
      tone: "overdue",
    });
  }

  for (const i of d.instalments) {
    const inv = i.invoice;
    if (!inv?.lastReminderAt) continue;
    events.push({
      key: `reminder-${i.id}`,
      title: `You approved a reminder. PayPal sent it for the ${instalmentWords(d, i)}.`,
      when: formatDateTime(inv.lastReminderAt),
      source: `PayPal invoice ${inv.invoiceNumber}`,
      link: inv.payerViewUrl,
      tone: "verified",
    });
  }

  return events;
}

export function EvidenceTimeline({ deal, deliverable }: { deal: Deal; deliverable: Deliverable }) {
  const events = buildEvents(deal, deliverable, getToday());

  return (
    <ol className="relative flex flex-col gap-4 border-l border-hairline pl-5">
      {events.map((e) => (
        <li key={e.key} className="relative text-sm">
          <span aria-hidden className={`absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-surface ${DOT[e.tone]}`} />
          <p className="text-ink">{e.title}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {e.when && <span className="tabular-nums">{e.when} · </span>}
            Source: {e.source}
            {e.link && (
              <>
                {" · "}
                <a href={e.link} target="_blank" rel="noreferrer" className="text-blue underline underline-offset-4">
                  View in PayPal
                </a>
              </>
            )}
          </p>
        </li>
      ))}
    </ol>
  );
}
