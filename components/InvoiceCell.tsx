"use client";

import { formatDateTime } from "@/lib/format";
import type { InvoiceRef } from "@/lib/types";
import { wasChecked } from "./dealOps";

export function InvoiceCell({ invoice, emptyText = "—" }: { invoice?: InvoiceRef; emptyText?: string }) {
  if (!invoice) return <span className="text-ink-soft">{emptyText}</span>;
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xs">{invoice.invoiceNumber}</span>
      <span className="text-xs text-ink-soft">{invoice.status.replaceAll("_", " ").toLowerCase()}</span>
      <span className="text-xs text-ink-soft tabular-nums">
        {wasChecked(invoice.lastRefreshedAt)
          ? `Last checked ${formatDateTime(invoice.lastRefreshedAt)}`
          : "Not yet checked with PayPal"}
      </span>
      {invoice.payerViewUrl && (
        <a href={invoice.payerViewUrl} target="_blank" rel="noreferrer" className="text-xs text-accent underline underline-offset-2">
          Open payer link
        </a>
      )}
    </div>
  );
}
