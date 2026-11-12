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
  sourceQuote: string | null; // contract text that defines this deliverable
  disputed?: boolean; // creator marked the payment as disputed: follow-ups paused
  // Agreed payment schedule; always at least one. Amounts sum to amountMinor.
  // A deliverable paid in one go has a single "Full payment" instalment.
  instalments: Instalment[];
}

// One agreed payment for a deliverable, billed on its own PayPal invoice.
export interface Instalment {
  id: string;
  label: string; // e.g. "Instalment 1 of 2"
  amountMinor: Minor;
  dueOffsetDays: number | null; // days after approval this payment is due
  sourceQuote: string | null; // contract text that sets this payment
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
  dueDate: string | null; // YYYY-MM-DD from PayPal payment_term.due_date
  lastRefreshedAt: string; // ISO
  lastReminderAt?: string; // ISO
}

// Deliverable-level classification, in priority order.
export type GapClass =
  | "PAID" // every instalment paid
  | "OVERDUE" // an invoiced instalment is unpaid past its due date
  | "NOT_INVOICED" // approved but an instalment has no invoice: money left on the table
  | "UNDERPAID" // some instalments paid, the rest invoiced and not yet due
  | "UNPAID" // invoiced, nothing paid, nothing overdue yet
  | "NOT_DUE"; // not yet approved

export interface Gap {
  deliverableId: string;
  gapClass: GapClass;
  totalMinor: Minor; // deliverable amount
  paidMinor: Minor; // gross paid across all instalments (from PayPal)
  dueMinor: Minor; // total - paid: what the client still owes (never PayPal fees)
  overdueMinor: Minor; // part of dueMinor that is past its due date
  overdueInstalmentId: string | null; // first overdue instalment, if any
  daysOverdue: number | null;
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
