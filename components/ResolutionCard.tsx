"use client";

import { useEffect, useState } from "react";
import type { ExplainRequest, ExplainResponse, RemindRequest, RemindResponse } from "@/lib/api-contract";
import { formatDateTime, moneyShort as money } from "@/lib/format";
import { isInstalmentPaid } from "@/lib/gap";
import type { Deal, Deliverable, Gap, Instalment, InvoiceRef } from "@/lib/types";
import { post } from "./api";
import { patchInstalmentInvoice, type UpdateDeal } from "./dealOps";
import { useAction } from "./useAction";

type Outcome = "SENT" | "ALREADY_PAID" | "NOT_REMINDABLE";

const OUTCOME_COPY: Record<Outcome, string> = {
  SENT: "Reminder sent through PayPal. Your action has been recorded.",
  ALREADY_PAID: "This invoice is now marked paid in PayPal. No reminder was sent.",
  NOT_REMINDABLE: "This action can't be sent right now. Check the invoice status and reminder limits.",
};

const btnBase =
  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} border-[#305CE8] bg-[#305CE8] text-white hover:bg-[#2549BF]`;
const btnSecondary = `${btnBase} border-[#DCE2E9] bg-white text-[#1B2839] hover:border-[#1B2839]`;

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function humanStatus(s: string): string {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function instalmentName(i: Instalment, index: number, count: number): string {
  return count > 1 && !/\d/.test(i.label) ? `Instalment ${index + 1} of ${count}` : i.label;
}

function Spinner() {
  return <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="mt-0.5 size-4 shrink-0 text-[#188B77]">
      <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#DCE2E9] pt-4">
      <h4 className="mb-2 text-xs font-semibold tracking-wider text-[#5B6878] uppercase">{title}</h4>
      {children}
    </div>
  );
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
  const explain = useAction();
  const remind = useAction();
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [paidInvoice, setPaidInvoice] = useState<InvoiceRef | null>(null);

  const overdue = gap.gapClass === "OVERDUE";
  const disputed = !!d.disputed;
  const count = d.instalments.length;
  const cur = deal.currency;

  const target =
    d.instalments.find((i) => i.id === gap.overdueInstalmentId) ??
    d.instalments.find((i) => i.invoice && !isInstalmentPaid(i));
  const targetLabel = target ? instalmentName(target, d.instalments.indexOf(target), count) : null;
  const invoice = target?.invoice;
  const paidInstalments = d.instalments.filter((i) => i.invoice && isInstalmentPaid(i));

  const amount = overdue ? gap.overdueMinor : gap.dueMinor;
  const days = gap.daysOverdue ?? 0;
  const headline = overdue ? `${money(amount, cur)} is overdue` : `${money(amount, cur)} awaiting payment`;
  const refreshed = invoice && new Date(invoice.lastRefreshedAt).getFullYear() > 2000;

  const context = [
    d.name,
    targetLabel,
    invoice?.dueDate && `Due ${formatDate(invoice.dueDate)}`,
    overdue && `${days} day${days === 1 ? "" : "s"} overdue`,
  ]
    .filter(Boolean)
    .join(" · ");

  const finding = [
    d.approvedAt
      ? `The brand approved this deliverable on ${formatDate(d.approvedAt)} and agreed to pay ${money(target?.amountMinor ?? amount, cur)}${targetLabel ? ` in ${targetLabel.toLowerCase()}` : ""}.`
      : `The brand agreed to pay ${money(target?.amountMinor ?? amount, cur)}${targetLabel ? ` in ${targetLabel.toLowerCase()}` : ""}.`,
    overdue && invoice?.dueDate
      ? `The invoice is past its due date (${formatDate(invoice.dueDate)}), and PayPal has not confirmed payment.`
      : invoice?.dueDate
        ? `The invoice is due on ${formatDate(invoice.dueDate)}, and PayPal has not confirmed payment yet.`
        : "PayPal has not confirmed payment yet.",
  ].join(" ");

  const quote = target?.sourceQuote ?? d.sourceQuote;

  const setDisputed = (value: boolean) =>
    update((x) => ({
      ...x,
      deliverables: x.deliverables.map((dd) => (dd.id === d.id ? { ...dd, disputed: value } : dd)),
    }));

  const replaceInvoice = (next: InvoiceRef) => {
    if (!target) return;
    update((x) =>
      patchInstalmentInvoice(x, d.id, target.id, (old) => ({
        ...next,
        payerViewUrl: next.payerViewUrl ?? old?.payerViewUrl ?? null,
        lastReminderAt: next.lastReminderAt ?? old?.lastReminderAt,
      })),
    );
  };

  const applyPaid = () => {
    if (!paidInvoice) return;
    replaceInvoice(paidInvoice);
    setPaidInvoice(null);
  };

  useEffect(() => {
    if (!paidInvoice) return;
    const t = setTimeout(applyPaid, 6000);
    return () => clearTimeout(t);
  });

  const onExplain = () =>
    explain.run(async () => {
      const res = await post<ExplainRequest, ExplainResponse>("/api/explain", { deal, deliverableId: d.id, gap });
      setResult(res);
      setNote(res.reminderText);
      setOutcome(null);
    });

  const onRemind = () =>
    remind.run(async () => {
      if (!target || !invoice) return;
      setOutcome(null);
      const res = await post<RemindRequest, RemindResponse>("/api/remind", {
        paypalInvoiceId: invoice.paypalInvoiceId,
        subject: `Reminder: ${invoice.invoiceNumber}`,
        note,
      });
      if (res.ok) {
        replaceInvoice({ ...res.invoice, lastReminderAt: res.sentAt });
        setOutcome("SENT");
      } else if (res.reason === "ALREADY_PAID") {
        setPaidInvoice(res.invoice);
        setOutcome("ALREADY_PAID");
      } else {
        replaceInvoice(res.invoice);
        setOutcome("NOT_REMINDABLE");
      }
    });

  return (
    <article
      id={`resolution-${d.id}`}
      tabIndex={-1}
      className="scroll-mt-6 rounded-2xl border border-[#DCE2E9] bg-white p-6 text-[#1B2839] outline-none focus-visible:ring-2 focus-visible:ring-[#305CE8]"
    >
      <p className="text-xs font-semibold tracking-wider text-[#5B6878] uppercase">Payment review</p>
      <h3 className={`mt-1 text-3xl font-semibold tabular-nums ${overdue ? "text-[#C57630]" : "text-[#1B2839]"}`}>
        {headline}
      </h3>
      <p className="mt-1 text-sm text-[#5B6878]">{context}</p>

      {disputed && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C57630]/40 bg-[#C57630]/10 px-4 py-3 text-sm"
        >
          <span>This payment is under review. Automated follow-ups are paused.</span>
          <button type="button" className={btnSecondary} onClick={() => setDisputed(false)}>
            Remove dispute
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4">
        <Section title="What Paidright found">
          <p className="text-sm leading-relaxed">{finding}</p>
        </Section>

        <Section title="Evidence checked">
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex gap-2">
              <Check />
              <span>
                Agreement confirms payment terms
                {quote && <span className="block text-[#5B6878] italic">&ldquo;{quote}&rdquo;</span>}
              </span>
            </li>
            {d.approvedAt && (
              <li className="flex gap-2">
                <Check />
                <span>Brand approval recorded {formatDate(d.approvedAt)}</span>
              </li>
            )}
            {paidInstalments.map((i) => (
              <li key={i.id} className="flex gap-2">
                <Check />
                <span className="tabular-nums">
                  PayPal verified {instalmentName(i, d.instalments.indexOf(i), count)} paid on invoice{" "}
                  {i.invoice!.invoiceNumber} ({money(i.amountMinor, cur)})
                </span>
              </li>
            ))}
            {invoice && (
              <li className="flex gap-2">
                <Check />
                <span>
                  PayPal invoice {invoice.invoiceNumber} status{" "}
                  {refreshed ? `checked ${formatDateTime(invoice.lastRefreshedAt)}` : "(not refreshed yet)"}:{" "}
                  {humanStatus(invoice.status)} — {targetLabel} remains unpaid
                </span>
              </li>
            )}
            <li className="flex gap-2">
              <Check />
              <span>PayPal fees are not part of this amount</span>
            </li>
          </ul>
        </Section>

        <Section title="Recommended action">
          <p className="text-sm">Send a reminder with the invoice and approval evidence.</p>

          {result && (
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#5B6878] uppercase">Agent explanation</p>
                <p className="mt-1 text-sm leading-relaxed">{result.explanation}</p>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Reminder preview</span>
                <textarea
                  className="h-32 w-full rounded-lg border border-[#DCE2E9] bg-white px-3 py-2 text-sm text-[#1B2839] focus:border-[#305CE8] focus:outline-none"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              {invoice && (
                <p className="text-xs text-[#5B6878]">
                  To: {deal.brand} &lt;{deal.brandEmail}&gt; via PayPal invoice {invoice.invoiceNumber}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!result && (
              <button
                type="button"
                className={btnSecondary}
                disabled={explain.loading || disputed}
                onClick={onExplain}
              >
                {explain.loading && <Spinner />}
                Prepare reminder
              </button>
            )}
            <button
              type="button"
              className={btnPrimary}
              disabled={!result || !note.trim() || !invoice || disputed || remind.loading}
              onClick={onRemind}
            >
              {remind.loading && <Spinner />}
              Approve and send reminder
            </button>
            {!disputed && (
              <button type="button" className={btnSecondary} onClick={() => setDisputed(true)}>
                Mark as disputed
              </button>
            )}
          </div>

          {explain.error && (
            <p role="alert" className="mt-3 text-sm text-[#B3261E]">
              {explain.error}
            </p>
          )}
          {remind.error && (
            <p role="alert" className="mt-3 text-sm text-[#B3261E]">
              {remind.error}
            </p>
          )}
          {outcome && (
            <p role="status" className={`mt-3 text-sm ${outcome === "NOT_REMINDABLE" ? "text-[#C57630]" : "text-[#188B77]"}`}>
              {OUTCOME_COPY[outcome]}
              {paidInvoice && (
                <button type="button" className="ml-2 font-medium underline underline-offset-4" onClick={applyPaid}>
                  Update deal
                </button>
              )}
            </p>
          )}
          {!outcome && invoice?.lastReminderAt && (
            <p className="mt-3 text-sm text-[#5B6878]">Last reminder sent {formatDateTime(invoice.lastReminderAt)}</p>
          )}
        </Section>
      </div>
    </article>
  );
}
