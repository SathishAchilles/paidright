"use client";

import { formatDateTime } from "@/lib/format";
import type { InvoiceRef } from "@/lib/types";
import { humanStatus, wasChecked } from "./dealOps";

export function InvoiceCell({
  invoice,
  emptyText = "—",
  showPayLink = true,
}: {
  invoice?: InvoiceRef;
  emptyText?: string;
  showPayLink?: boolean;
}) {
  if (!invoice) return <span className="text-ink-soft">{emptyText}</span>;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="font-mono text-xs">Invoice #{invoice.invoiceNumber}</span>
      <span className="text-xs text-ink-soft">PayPal status: {humanStatus(invoice.status)}</span>
      <span className="text-xs text-ink-soft tabular-nums">
        {wasChecked(invoice.lastRefreshedAt)
          ? `Last checked ${formatDateTime(invoice.lastRefreshedAt)}`
          : "Not yet checked with PayPal"}
      </span>
      {showPayLink && invoice.payerViewUrl && (
        <a
          href={invoice.payerViewUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent underline underline-offset-2"
        >
          View invoice in PayPal
        </a>
      )}
    </div>
  );
}
