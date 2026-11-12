"use client";

import { useEffect, useRef, useState } from "react";
import type { RemindRequest, RemindResponse } from "@/lib/api-contract";
import { formatDay } from "@/lib/clocks";
import { formatDateTime, money, moneyShort } from "@/lib/format";
import type { Deal, Deliverable, InvoiceRef } from "@/lib/types";
import { post } from "./api";

type Result =
  | { kind: "SENT" }
  | { kind: "ALREADY_PAID" }
  | { kind: "FAILED"; detail: string; rateLimited: boolean };

const COPY = {
  sent: "Reminder sent through PayPal. Your action has been recorded.",
  alreadyPaid: "PayPal now shows this invoice as paid. No reminder was sent.",
  failed: "The reminder wasn't sent. Your invoice is unchanged. Try again or open it in PayPal.",
  rateLimited:
    "PayPal limits how often one invoice can be reminded; this shared demo invoice may already have been reminded today.",
} as const;

const RATE_LIMIT = /\(429\)|rate.?limit|too many/i;

const btnBase =
  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} border-blue bg-blue text-white hover:bg-blue-strong`;
const btnSecondary = `${btnBase} border-hairline bg-surface text-ink hover:border-ink`;

export function fallbackReminder(deal: Deal, d: Deliverable, amountMinor: number, invoice: InvoiceRef, overdue: boolean): string {
  const work = d.status === "approved" ? `the approved ${d.name}` : `the ${d.name}`;
  const due = invoice.dueDate
    ? `Payment ${overdue ? "was" : "is"} due on ${formatDay(invoice.dueDate)}.`
    : "Payment is due under our agreement.";
  const link = invoice.payerViewUrl ? `Here is the invoice link: ${invoice.payerViewUrl}` : "Here is the invoice link.";
  return `Hi, following up on the remaining ${moneyShort(amountMinor, deal.currency)} for ${work}. ${due} ${link} Please let us know if anything needs clarification.`;
}

export function ReminderReview({
  deal,
  invoice,
  amountMinor,
  overdue,
  initialNote,
  draftFailed,
  disputed,
  onDispute,
  onInvoice,
}: {
  deal: Deal;
  invoice: InvoiceRef;
  amountMinor: number;
  overdue: boolean;
  initialNote: string;
  draftFailed: boolean;
  disputed: boolean;
  onDispute: () => void;
  onInvoice: (next: InvoiceRef) => void;
}) {
  const [note, setNote] = useState(initialNote);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [paidInvoice, setPaidInvoice] = useState<InvoiceRef | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onInvoiceRef = useRef(onInvoice);
  useEffect(() => {
    onInvoiceRef.current = onInvoice;
  });

  // PayPal says paid: keep the message on screen briefly before the deal
  // updates (the card disappears once nothing is owed).
  useEffect(() => {
    if (!paidInvoice) return;
    const t = setTimeout(() => {
      onInvoiceRef.current(paidInvoice);
      setPaidInvoice(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [paidInvoice]);

  const applyPaid = () => {
    if (!paidInvoice) return;
    onInvoice(paidInvoice);
    setPaidInvoice(null);
  };

  const onSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await post<RemindRequest, RemindResponse>("/api/remind", {
        paypalInvoiceId: invoice.paypalInvoiceId,
        subject: `Reminder: invoice ${invoice.invoiceNumber}`,
        note: note.trim(),
      });
      if (res.ok === true) {
        onInvoice({ ...res.invoice, lastReminderAt: res.sentAt });
        setResult({ kind: "SENT" });
      } else if (res.reason === "ALREADY_PAID") {
        setPaidInvoice(res.invoice);
        setResult({ kind: "ALREADY_PAID" });
      } else {
        onInvoice(res.invoice);
        setResult({
          kind: "FAILED",
          detail: `PayPal shows this invoice as ${res.invoice.status.replace(/_/g, " ").toLowerCase()}, so it can't be reminded.`,
          rateLimited: false,
        });
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      setResult({ kind: "FAILED", detail, rateLimited: RATE_LIMIT.test(detail) });
    } finally {
      setSending(false);
    }
  };

  const brand = deal.brand;
  const sent = result?.kind === "SENT";

  return (
    <div className="mt-4 rounded-xl border border-hairline bg-canvas p-5">
      <h4 className="font-display text-lg font-semibold text-ink">Everything&apos;s ready. You&apos;re in control.</h4>
      <p className="mt-1 text-sm text-ink-soft">
        We&apos;ve prepared a reminder using your agreement, approved work, and {overdue ? "overdue" : "unpaid"} PayPal invoice.
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="text-ink-soft">To</dt>
        <dd className="break-words">
          {brand} &lt;{deal.brandEmail}&gt;
        </dd>
        <dt className="text-ink-soft">Invoice</dt>
        <dd className="break-all tabular-nums">
          {invoice.invoiceNumber} · PayPal ID {invoice.paypalInvoiceId}
          {invoice.payerViewUrl && (
            <>
              {" · "}
              <a href={invoice.payerViewUrl} target="_blank" rel="noreferrer" className="text-blue underline underline-offset-4">
                Open in PayPal
              </a>
            </>
          )}
        </dd>
        <dt className="text-ink-soft">Amount</dt>
        <dd className="font-medium tabular-nums">{money(amountMinor, deal.currency)}</dd>
      </dl>

      <label className="mt-4 flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Message</span>
        <textarea
          ref={textareaRef}
          className="h-32 w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:border-blue focus:outline-none"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {draftFailed && (
        <p className="mt-1 text-xs text-ink-soft">We couldn&apos;t prepare a custom draft, so this is a standard message. Edit it as you like.</p>
      )}

      <p className="mt-3 rounded-lg bg-blue-bg px-3 py-2 text-sm text-ink">
        <span className="font-medium">What will happen:</span> PayPal re-checks this invoice, then sends a reminder from your
        PayPal account to {deal.brandEmail}. Nothing is charged.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={sending || disputed || sent || !note.trim() || paidInvoice !== null}
          onClick={onSend}
        >
          {sending && <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {sending ? "Checking with PayPal…" : "Approve and send via PayPal"}
        </button>
        <button type="button" className={btnSecondary} disabled={sending} onClick={() => textareaRef.current?.focus()}>
          Edit message
        </button>
        {!disputed && (
          <button type="button" className={btnSecondary} disabled={sending} onClick={onDispute}>
            Mark as disputed
          </button>
        )}
      </div>

      <div aria-live="polite">
        {result?.kind === "SENT" && (
          <p role="status" className="mt-3 rounded-lg bg-mint-bg px-3 py-2 text-sm text-mint">
            {COPY.sent}
            {invoice.lastReminderAt && <span className="block text-xs">Sent {formatDateTime(invoice.lastReminderAt)}</span>}
          </p>
        )}
        {result?.kind === "ALREADY_PAID" && (
          <p role="status" className="mt-3 rounded-lg bg-mint-bg px-3 py-2 text-sm text-mint">
            {COPY.alreadyPaid}
            {paidInvoice && (
              <button type="button" className="ml-2 font-medium underline underline-offset-4" onClick={applyPaid}>
                Update deal
              </button>
            )}
          </p>
        )}
        {result?.kind === "FAILED" && (
          <div role="alert" className="mt-3 rounded-lg bg-amber-bg px-3 py-2 text-sm text-amber-ink">
            <p>{COPY.failed}</p>
            {result.rateLimited && <p className="mt-1">{COPY.rateLimited}</p>}
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer">Technical detail</summary>
              <p className="mt-1 break-words">{result.detail}</p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
