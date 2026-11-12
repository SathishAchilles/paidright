// Request/response shapes for every API route. UI calls these; routes implement them.
// All routes are POST with JSON bodies and return JSON. Errors return
// { error: string } with a non-2xx status.

import type {
  ChangeOrder,
  ClockEvent,
  Currency,
  Deal,
  Flag,
  Gap,
  InvoiceRef,
  Minor,
  Terms,
} from "./types";

// POST /api/extract  (LLM)
export interface ExtractRequest {
  contractText: string;
}
export interface ExtractResponse {
  brand: string;
  brandEmail: string;
  creator: string;
  currency: Currency;
  deliverables: {
    name: string;
    amountMinor: Minor;
    sourceQuote: string | null;
    // Always at least one; amounts sum to amountMinor (code enforces, else one
    // "Full payment" instalment due terms.paymentDays after approval).
    instalments: {
      label: string;
      amountMinor: Minor;
      dueOffsetDays: number | null;
      sourceQuote: string | null;
    }[];
  }[];
  terms: Terms;
  flags: Flag[];
}

// POST /api/invoice  (PayPal: create draft with partial payments allowed, then send)
export interface InvoiceRequest {
  currency: Currency;
  recipientEmail: string;
  recipientName: string;
  lineItem: string;
  amountMinor: Minor;
  note: string; // shown on the invoice
  dueInDays: number;
}
export interface InvoiceResponse {
  invoice: InvoiceRef;
}

// POST /api/refresh  (PayPal: get invoice)
export interface RefreshRequest {
  paypalInvoiceId: string;
}
export interface RefreshResponse {
  invoice: InvoiceRef;
}

// POST /api/explain  (LLM: explain a gap and draft a reminder; no money logic)
export interface ExplainRequest {
  deal: Deal;
  deliverableId: string;
  gap: Gap;
}
export interface ExplainResponse {
  explanation: string;
  reminderText: string;
}

// POST /api/remind  (PayPal: send reminder on an existing invoice)
export interface RemindRequest {
  paypalInvoiceId: string;
  subject: string;
  note: string;
}
export interface RemindResponse {
  ok: true;
  sentAt: string;
}

// POST /api/change-order  (LLM: draft a change-order line from a clock event)
export interface ChangeOrderRequest {
  deal: Deal;
  event: ClockEvent;
}
export interface ChangeOrderResponse {
  changeOrder: ChangeOrder;
}
