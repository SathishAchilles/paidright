// Shared domain types. Every module codes against these; do not change shapes
// without updating lib/api-contract.ts and all callers.

// Money is always integer minor units (cents) to avoid float drift.
export type Minor = number;

export type Currency = "USD" | "EUR" | "GBP";

export type DeliverableStatus =
  | "pending" // agreed, not delivered
  | "submitted" // creator delivered, awaiting brand approval
  | "approved"; // brand approved, billable

export interface Deliverable {
  id: string;
  name: string;
  amountMinor: Minor;
  status: DeliverableStatus;
  approvedAt?: string; // ISO date
  invoice?: InvoiceRef;
}

// Contract clauses the agent tracks over time ("clocks").
export interface Terms {
  paymentTrigger: string | null; // e.g. "on approval"; null when not stated
  paymentDays: number | null; // net terms, e.g. 30
  revisionsIncluded: number | null;
  revisionRateMinor: Minor | null; // price per extra revision round
  usageDays: number | null; // paid-usage (whitelisting) window
  usageStart: string | null; // ISO date the usage window starts
  usageExtensionRateMinor: Minor | null; // price per extra usage period
  usageExtensionDays: number | null; // length of one extension period
  feesBorneBy: "creator" | "brand" | null;
}

// A term the AI found ambiguous or missing, with a suggested fix.
export interface Flag {
  issue: string;
  suggestedClause: string;
  sourceQuote: string | null;
}

export interface Deal {
  id: string;
  brand: string;
  brandEmail: string;
  creator: string;
  currency: Currency;
  totalMinor: Minor;
  deliverables: Deliverable[];
  terms: Terms;
  flags: Flag[];
  revisionsUsed: number;
  contractText: string;
  changeOrders: ChangeOrder[];
}

export type PayPalInvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "SCHEDULED"
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "MARKED_AS_PAID"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "MARKED_AS_REFUNDED"
  | "PAYMENT_PENDING";

export interface InvoiceRef {
  paypalInvoiceId: string;
  invoiceNumber: string;
  payerViewUrl: string | null; // hosted PayPal page the brand pays on
  status: PayPalInvoiceStatus;
  totalMinor: Minor;
  paidMinor: Minor; // gross paid by the client, from PayPal
  lastRefreshedAt: string; // ISO
  lastReminderAt?: string; // ISO
}

export type GapClass =
  | "PAID" // fully paid
  | "UNDERPAID" // partially paid; the remainder is a client receivable
  | "UNPAID" // invoiced, nothing paid yet
  | "NOT_INVOICED" // approved/billable but no invoice: money left on the table
  | "NOT_DUE"; // not yet approved

export interface Gap {
  deliverableId: string;
  gapClass: GapClass;
  dueMinor: Minor; // what the client still owes (never includes PayPal fees)
}

export type ClockKind = "USAGE_EXPIRED" | "REVISIONS_EXCEEDED";

export interface ClockEvent {
  kind: ClockKind;
  description: string; // human readable, e.g. "Paid usage ended 2026-12-05"
  periodsOrRounds: number; // extension periods owed, or extra revision rounds
  suggestedAmountMinor: Minor; // computed from contract rates
}

export interface ChangeOrder {
  id: string;
  kind: ClockKind;
  lineItem: string;
  amountMinor: Minor;
  note: string;
  invoice?: InvoiceRef;
}
