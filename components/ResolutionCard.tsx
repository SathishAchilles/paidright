"use client";

import { useState } from "react";
import type { ExplainRequest, ExplainResponse, RemindRequest, RemindResponse } from "@/lib/api-contract";
import { formatDateTime, money } from "@/lib/format";
import { isInstalmentPaid } from "@/lib/gap";
import type { Deal, Deliverable, Gap } from "@/lib/types";
import { post } from "./api";
import { patchInstalmentInvoice, type UpdateDeal } from "./dealOps";
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
  const explain = useAction();
  const remind = useAction();
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [note, setNote] = useState("");
  const overdue = gap.gapClass === "OVERDUE";
  const count = d.instalments.length;

  const target =
    d.instalments.find((i) => i.id === gap.overdueInstalmentId) ??
    d.instalments.find((i) => i.invoice && !isInstalmentPaid(i));
  const targetIdx = target ? d.instalments.indexOf(target) : -1;
  const invoice = target?.invoice;
  const paidInstalments = d.instalments.filter((i) => i.invoice && isInstalmentPaid(i));

  const amount = overdue ? gap.overdueMinor : gap.dueMinor;
  const word = overdue ? "OVERDUE" : gap.gapClass === "UNDERPAID" ? "still to be paid" : "awaiting payment";
  const days = gap.daysOverdue ?? 0;

  const onExplain = () =>
    explain.run(async () => {
      const res = await post<ExplainRequest, ExplainResponse>("/api/explain", { deal, deliverableId: d.id, gap });
      setResult(res);
      setNote(res.reminderText);
    });

  const onRemind = () =>
    remind.run(async () => {
      if (!target || !invoice) return;
      const res = await post<RemindRequest, RemindResponse>("/api/remind", {
        paypalInvoiceId: invoice.paypalInvoiceId,
        subject: `Reminder: ${invoice.invoiceNumber}`,
        note,
      });
      update((x) =>
        patchInstalmentInvoice(x, d.id, target.id, (inv) => (inv ? { ...inv, lastReminderAt: res.sentAt } : inv)),
      );
    });

  return (
    <article
      className={`rounded-lg border-l-4 bg-paper p-5 ${overdue ? "border-danger" : "border-line"} border-y border-r border-y-line border-r-line`}
    >
      <h3 className="font-serif text-xl">
        <span className={`tabular-nums ${overdue ? "text-danger" : "text-ink"}`}>
          {money(amount, deal.currency)} {word}
        </span>{" "}
        on {d.name}
        {target && (
          <span className="text-ink-soft">
            {" "}
            — {count > 1 ? `Instalment ${targetIdx + 1} of ${count}` : target.label}
            {invoice?.dueDate && `, due ${invoice.dueDate}`}
            {overdue && ` (${days} day${days === 1 ? "" : "s"})`}
          </span>
        )}
      </h3>

      <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
        {d.sourceQuote && <li className="italic">&ldquo;{d.sourceQuote}&rdquo;</li>}
        {target?.sourceQuote && target.sourceQuote !== d.sourceQuote && (
          <li className="italic">&ldquo;{target.sourceQuote}&rdquo;</li>
        )}
        {paidInstalments.map((i) => (
          <li key={i.id} className="text-ok">
            {count > 1 ? `Instalment ${d.instalments.indexOf(i) + 1} of ${count}` : i.label} paid on invoice{" "}
            {i.invoice!.invoiceNumber} ({money(i.amountMinor, deal.currency)})
          </li>
        ))}
        {invoice && (
          <li className="tabular-nums">
            Invoice {invoice.invoiceNumber}: {money(invoice.totalMinor, deal.currency)} billed,{" "}
            {money(invoice.paidMinor, deal.currency)} received from {deal.brand}.
          </li>
        )}
        <li>PayPal fees are not part of this amount: it is what {deal.brand} still owes under the contract.</li>
      </ul>

      {!result && (
        <div className="mt-3">
          <Button variant={overdue ? "primary" : "secondary"} loading={explain.loading} onClick={onExplain}>
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
            <Button variant="primary" loading={remind.loading} disabled={!note.trim() || !invoice} onClick={onRemind}>
              Send PayPal reminder
            </Button>
            {invoice?.lastReminderAt && (
              <span className="text-sm text-ok">Reminder sent {formatDateTime(invoice.lastReminderAt)}</span>
            )}
          </div>
          <ErrorText error={remind.error} />
        </div>
      )}

      {!result && invoice?.lastReminderAt && (
        <p className="mt-2 text-sm text-ok">Reminder sent {formatDateTime(invoice.lastReminderAt)}</p>
      )}
    </article>
  );
}
