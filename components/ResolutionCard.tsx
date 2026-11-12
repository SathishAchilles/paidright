"use client";

import { useState } from "react";
import type { ExplainRequest, ExplainResponse, RemindRequest, RemindResponse } from "@/lib/api-contract";
import { formatDateTime, money } from "@/lib/format";
import type { Deal, Deliverable, Gap } from "@/lib/types";
import { post } from "./api";
import type { UpdateDeal } from "./dealOps";
import { Button, ErrorText, inputClass } from "./ui";
import { useAction } from "./useAction";

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
  const invoice = d.invoice!;
  const explain = useAction();
  const remind = useAction();
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [note, setNote] = useState("");
  const underpaid = gap.gapClass === "UNDERPAID";

  const onExplain = () =>
    explain.run(async () => {
      const res = await post<ExplainRequest, ExplainResponse>("/api/explain", { deal, deliverableId: d.id, gap });
      setResult(res);
      setNote(res.reminderText);
    });

  const onRemind = () =>
    remind.run(async () => {
      const res = await post<RemindRequest, RemindResponse>("/api/remind", {
        paypalInvoiceId: invoice.paypalInvoiceId,
        subject: `Reminder: ${invoice.invoiceNumber}`,
        note,
      });
      update((deal) => ({
        ...deal,
        deliverables: deal.deliverables.map((x) =>
          x.id === d.id && x.invoice ? { ...x, invoice: { ...x.invoice, lastReminderAt: res.sentAt } } : x,
        ),
      }));
    });

  return (
    <article className={`rounded-lg border-l-4 bg-paper p-5 ${underpaid ? "border-danger" : "border-warn"} border-y border-r border-y-line border-r-line`}>
      <h3 className="font-serif text-xl">
        <span className={`tabular-nums ${underpaid ? "text-danger" : "text-warn"}`}>
          {money(gap.dueMinor, deal.currency)} {underpaid ? "UNDERPAID" : "UNPAID"}
        </span>{" "}
        on {d.name}
      </h3>
      <p className="mt-1 text-sm text-ink-soft tabular-nums">
        Invoice {invoice.invoiceNumber}: {money(invoice.totalMinor, deal.currency)} billed,{" "}
        {money(invoice.paidMinor, deal.currency)} received from {deal.brand}.
        {underpaid && " PayPal fees are not part of this gap: this is what the brand still owes."}
      </p>

      {!result && (
        <div className="mt-3">
          <Button variant="primary" loading={explain.loading} onClick={onExplain}>
            Explain &amp; draft reminder
          </Button>
          <ErrorText error={explain.error} />
        </div>
      )}

      {result && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-ink">{result.explanation}</p>
          <textarea
            className={`${inputClass} h-32 w-full`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Reminder note"
          />
          <div className="flex items-center gap-3">
            <Button variant="primary" loading={remind.loading} disabled={!note.trim()} onClick={onRemind}>
              Send PayPal reminder
            </Button>
            {invoice.lastReminderAt && (
              <span className="text-sm text-ok">Reminder sent {formatDateTime(invoice.lastReminderAt)}</span>
            )}
          </div>
          <ErrorText error={remind.error} />
        </div>
      )}

      {!result && invoice.lastReminderAt && (
        <p className="mt-2 text-sm text-ok">Reminder sent {formatDateTime(invoice.lastReminderAt)}</p>
      )}
    </article>
  );
}
