"use client";

import type { InvoiceRef } from "@/lib/types";

export function InvoiceCell({ invoice }: { invoice?: InvoiceRef }) {
  if (!invoice) return <span className="text-ink-soft">—</span>;
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xs">{invoice.invoiceNumber}</span>
      <span className="text-xs text-ink-soft">{invoice.status.replaceAll("_", " ").toLowerCase()}</span>
      {invoice.payerViewUrl && (
        <a href={invoice.payerViewUrl} target="_blank" rel="noreferrer" className="text-xs text-accent underline underline-offset-2">
          Open payer link
        </a>
      )}
    </div>
  );
}
