"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExplainRequest, ExplainResponse } from "@/lib/api-contract";
import { formatDay, shortBrand } from "@/lib/clocks";
import { formatDateTime, money, moneyShort } from "@/lib/format";
import { instalmentPaid, isInstalmentPaid } from "@/lib/gap";
import type { Deal, Deliverable, Gap, InvoiceRef } from "@/lib/types";
import { post } from "./api";
import { patchInstalmentInvoice, wasChecked, type UpdateDeal } from "./dealOps";
import { EvidenceTimeline, instalmentOrdinal, instalmentWords } from "./EvidenceTimeline";
import { fallbackReminder, ReminderReview } from "./ReminderReview";

const btnBase =
  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} border-blue bg-blue text-white hover:bg-blue-strong`;
const btnSecondary = `${btnBase} border-hairline bg-surface text-ink hover:border-ink`;

const REVEAL_MS = 300;
const REVEAL_KEYFRAMES = "@keyframes pr-reveal{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "Three Instagram Stories are", "Instagram Reel is".
function isPlural(name: string): boolean {
  return /s$/i.test(name.trim());
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function Spinner() {
  return <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

function Mark({ tone }: { tone: "verified" | "overdue" | "unknown" }) {
  if (tone === "unknown") {
    return <span aria-hidden className="mt-1 size-3 shrink-0 rounded-full border-2 border-ink-soft" />;
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`mt-0.5 size-4 shrink-0 ${tone === "overdue" ? "text-amber" : "text-mint"}`}>
      <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface EvidenceItem {
  key: string;
  label: string;
  text: string;
  detail?: string | null;
  quote?: string | null;
  tone: "verified" | "overdue" | "unknown";
}

export function ResolutionCard({
  deal,
  deliverable: d,
  gap,
  update,
}: {
  deal: Deal;
  deliverable: Deliverable;
  gap: Gap;
  update: UpdateDeal;
}) {
  const [explained, setExplained] = useState<ExplainResponse | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [draft, setDraft] = useState<{ note: string; failed: boolean } | null>(null);
  const inflight = useRef<Promise<ExplainResponse | null> | null>(null);

  const overdue = gap.gapClass === "OVERDUE";
  const disputed = !!d.disputed;
  const cur = deal.currency;
  const brand = shortBrand(deal.brand);

  const target =
    d.instalments.find((i) => i.id === gap.overdueInstalmentId) ??
    d.instalments.find((i) => i.invoice && !isInstalmentPaid(i));
  const invoice = target?.invoice;
  const paid = d.instalments.filter((i) => i.invoice && isInstalmentPaid(i));
  const amount = overdue ? gap.overdueMinor : gap.dueMinor;
  const remaining = target ? target.amountMinor - instalmentPaid(target) : amount;

  // Headline: amount -> status -> why.
  const headline = overdue
    ? `${moneyShort(amount, cur)} is overdue. Here is how we know.`
    : `${moneyShort(amount, cur)} is awaiting payment.`;
  const subline = `Payment review: ${d.name}${target ? ` / ${instalmentWords(d, target)}` : ""}`;
  const bigAmount = `${money(amount, cur)} ${overdue ? "overdue" : "awaiting payment"}`;

  const targetOrd = target ? instalmentOrdinal(d, target) : "";
  const oneLiner =
    [
      d.approvedAt ? "Brand approved work" : "Brand approval not recorded",
      ...paid.map((i) => (d.instalments.length > 1 ? `${instalmentOrdinal(d, i)} instalment paid` : "payment received")),
      invoice &&
        (overdue
          ? `${targetOrd ? `${targetOrd} ` : ""}PayPal invoice past due`
          : `${targetOrd ? `${targetOrd} ` : ""}PayPal invoice ${invoice.dueDate ? `due ${formatDay(invoice.dueDate)}` : "unpaid"}`),
    ]
      .filter(Boolean)
      .join("; ") + ".";

  // Evidence checklist, in reading order.
  const count = d.instalments.length;
  const equalSplit = count > 1 && d.instalments.every((i) => i.amountMinor === d.instalments[0].amountMinor);
  const scheduleText =
    count === 1
      ? "paid in one payment"
      : equalSplit
        ? `paid in ${count === 2 ? "two" : count} ${moneyShort(d.instalments[0].amountMinor, cur)} instalments`
        : `paid in ${count} instalments`;

  const paidText = paid.map((i) => {
    const ord = instalmentOrdinal(d, i);
    return `the ${ord ? `${ord} ` : ""}${moneyShort(i.amountMinor, cur)} invoice is paid`;
  });
  const targetText = target
    ? `the ${targetOrd ? `${targetOrd} ` : `${moneyShort(target.amountMinor, cur)} invoice `}${
        overdue ? "remains unpaid after its due date" : invoice?.dueDate ? `is unpaid and due on ${formatDay(invoice.dueDate)}` : "is unpaid"
      }`
    : null;
  const paypalText = capitalize([...paidText, targetText].filter(Boolean).join("; ")) + ".";

  const invoiceList = d.instalments
    .filter((i) => i.invoice)
    .map((i) => `${i.invoice!.invoiceNumber} (${isInstalmentPaid(i) ? "paid" : i.invoice!.status.replace(/_/g, " ").toLowerCase()})`)
    .join(", ");
  const checkedTimes = d.instalments
    .map((i) => i.invoice?.lastRefreshedAt)
    .filter((t): t is string => wasChecked(t))
    .sort();
  const lastChecked = checkedTimes.length ? checkedTimes[checkedTimes.length - 1] : null;

  const evidence: EvidenceItem[] = [
    {
      key: "agreement",
      label: "Agreement",
      text: `The agreement says the ${d.name} ${isPlural(d.name) ? "are" : "is"} worth ${moneyShort(d.amountMinor, cur)}, ${scheduleText}.`,
      quote: d.sourceQuote ?? target?.sourceQuote,
      tone: "verified",
    },
    d.approvedAt
      ? {
          key: "approval",
          label: "Brand approval",
          text: `${brand} approved the ${d.name} on ${formatDay(d.approvedAt)}.`,
          tone: "verified",
        }
      : {
          key: "approval",
          label: "Brand approval",
          text: `No approval from ${brand} is recorded yet.`,
          tone: "unknown",
        },
    {
      key: "paypal",
      label: "PayPal record",
      text: paypalText,
      detail: invoiceList
        ? `Invoice${d.instalments.filter((i) => i.invoice).length === 1 ? "" : "s"} ${invoiceList} · ${
            lastChecked ? `last checked ${formatDateTime(lastChecked)}` : "not checked with PayPal yet"
          }`
        : null,
      tone: !lastChecked ? "unknown" : overdue ? "overdue" : "verified",
    },
    {
      key: "rule",
      label: "Financial rule",
      text: `The ${moneyShort(amount, cur)} gap is an unpaid obligation, not processing fees.`,
      tone: "verified",
    },
    {
      key: "recommendation",
      label: "Agent recommendation",
      text: disputed
        ? "Hold reminders while this payment is under review."
        : overdue
          ? `Send ${brand} a reminder with the invoice and approval record attached.`
          : `The invoice is not past due yet. You can wait, or send ${brand} a friendly reminder now.`,
      tone: disputed ? "unknown" : "verified",
    },
  ];

  // Sequential reveal; instant when the user prefers reduced motion.
  const [revealed, setRevealed] = useState(() => (prefersReducedMotion() ? evidence.length : 1));
  const allShown = revealed >= evidence.length;
  useEffect(() => {
    if (allShown) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), REVEAL_MS);
    return () => clearTimeout(t);
  }, [revealed, allShown]);

  const setDisputed = (value: boolean) =>
    update((x) => ({
      ...x,
      deliverables: x.deliverables.map((dd) => (dd.id === d.id ? { ...dd, disputed: value } : dd)),
    }));

  const targetId = target?.id;
  const replaceInvoice = useCallback(
    (next: InvoiceRef) => {
      if (!targetId) return;
      update((x) =>
        patchInstalmentInvoice(x, d.id, targetId, (old) => ({
          ...next,
          payerViewUrl: next.payerViewUrl ?? old?.payerViewUrl ?? null,
          lastReminderAt: next.lastReminderAt ?? old?.lastReminderAt,
        })),
      );
    },
    [update, d.id, targetId],
  );

  // One /api/explain call feeds both "View sources" and the reminder draft.
  const ensureExplained = (): Promise<ExplainResponse | null> => {
    if (explained) return Promise.resolve(explained);
    if (inflight.current) return inflight.current;
    setExplaining(true);
    setExplainError(null);
    const p = post<ExplainRequest, ExplainResponse>("/api/explain", { deal, deliverableId: d.id, gap })
      .then((res) => {
        setExplained(res);
        return res;
      })
      .catch((e: unknown) => {
        setExplainError(e instanceof Error ? e.message : String(e));
        return null;
      })
      .finally(() => {
        inflight.current = null;
        setExplaining(false);
      });
    inflight.current = p;
    return p;
  };

  const onReview = async () => {
    if (!invoice) return;
    setRevealed(evidence.length);
    setReviewOpen(true);
    const res = await ensureExplained();
    setDraft({
      note: res?.reminderText?.trim() || fallbackReminder(deal, d, remaining, invoice, overdue),
      failed: !res,
    });
  };

  const onSources = () => {
    setSourcesOpen((o) => !o);
    if (!explained && !explaining) void ensureExplained();
  };

  const quotes = [
    d.sourceQuote && { key: d.id, label: d.name, text: d.sourceQuote },
    ...d.instalments.map(
      (i) => i.sourceQuote && { key: i.id, label: capitalize(instalmentWords(d, i)), text: i.sourceQuote },
    ),
  ].filter((q): q is { key: string; label: string; text: string } => !!q);

  return (
    <article
      id={`resolution-${d.id}`}
      tabIndex={-1}
      className="scroll-mt-6 rounded-2xl border border-hairline bg-surface p-6 text-ink outline-none focus-visible:ring-2 focus-visible:ring-blue"
    >
      <style href="paidright-reveal" precedence="default">
        {REVEAL_KEYFRAMES}
      </style>

      <h3 className="font-display text-xl font-semibold text-ink">{headline}</h3>
      <p className="mt-1 text-sm text-ink-soft">{subline}</p>
      <p className={`mt-4 text-4xl font-semibold tabular-nums ${overdue ? "text-amber" : "text-ink"}`}>{bigAmount}</p>
      <p className="mt-2 text-sm text-ink">{oneLiner}</p>

      {disputed && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber/40 bg-amber-bg px-4 py-3 text-sm text-amber-ink"
        >
          <span>This payment is under review. Automated reminders are paused.</span>
          <button type="button" className={btnSecondary} onClick={() => setDisputed(false)}>
            Remove dispute
          </button>
        </div>
      )}

      <div className="mt-5 border-t border-hairline pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-xs font-semibold tracking-wider text-ink-soft uppercase">Evidence checked</h4>
          {!allShown && (
            <button
              type="button"
              className="text-xs font-medium text-blue underline underline-offset-4"
              onClick={() => setRevealed(evidence.length)}
            >
              Show all
            </button>
          )}
        </div>
        <ol className="flex flex-col gap-3 text-sm">
          {evidence.slice(0, revealed).map((e) => (
            <li key={e.key} className="flex gap-3 motion-safe:animate-[pr-reveal_250ms_ease-out_both]">
              <Mark tone={e.tone} />
              <div>
                <p className="text-xs font-semibold text-ink-soft">{e.label}</p>
                <p>{e.text}</p>
                {e.quote && <p className="mt-0.5 text-ink-soft italic">&ldquo;{e.quote}&rdquo;</p>}
                {e.detail && <p className="mt-0.5 text-xs text-ink-soft tabular-nums">{e.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
        {allShown && (
          <p className="mt-4 text-xs text-ink-soft">
            AI connects evidence; code calculates the money; PayPal verifies the payment status.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!reviewOpen && (
          <button type="button" className={btnPrimary} disabled={disputed || !invoice} onClick={() => void onReview()}>
            Review reminder
          </button>
        )}
        <button type="button" className={btnSecondary} aria-expanded={sourcesOpen} onClick={onSources}>
          {sourcesOpen ? "Hide sources" : "View sources"}
        </button>
        {!disputed && (
          <button type="button" className={btnSecondary} onClick={() => setDisputed(true)}>
            Mark disputed
          </button>
        )}
      </div>

      {sourcesOpen && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-canvas p-4 text-sm">
          <div>
            <p className="text-xs font-semibold tracking-wider text-ink-soft uppercase">From the agreement</p>
            {quotes.length ? (
              <ul className="mt-1 flex flex-col gap-1">
                {quotes.map((q) => (
                  <li key={q.key}>
                    <span className="text-ink-soft">{q.label}: </span>
                    <span className="italic">&ldquo;{q.text}&rdquo;</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-ink-soft">No clause was quoted for this deliverable.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-ink-soft uppercase">Agent explanation</p>
            {explaining && (
              <p className="mt-1 flex items-center gap-2 text-ink-soft">
                <Spinner /> Reading the agreement and PayPal records…
              </p>
            )}
            {explained && <p className="mt-1 leading-relaxed">{explained.explanation}</p>}
            {explainError && !explaining && (
              <p className="mt-1 text-ink-soft">
                The explanation isn&apos;t available right now. The evidence above comes straight from your agreement and PayPal.
              </p>
            )}
          </div>
        </div>
      )}

      {reviewOpen && invoice && !draft && (
        <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
          <Spinner /> Preparing your reminder…
        </p>
      )}
      {reviewOpen && invoice && draft && (
        <ReminderReview
          deal={deal}
          invoice={invoice}
          amountMinor={remaining}
          overdue={overdue}
          initialNote={draft.note}
          draftFailed={draft.failed}
          disputed={disputed}
          onDispute={() => setDisputed(true)}
          onInvoice={replaceInvoice}
        />
      )}

      <details className="group mt-6 border-t border-hairline pt-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">See how PaidRight reached this conclusion.</summary>
        <div className="mt-4">
          <EvidenceTimeline deal={deal} deliverable={d} />
        </div>
      </details>
    </article>
  );
}
