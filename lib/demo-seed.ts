// Judge demo campaign: fictional Aanya x US Skincare Brand deal, pre-billed on
// real PayPal sandbox invoices. Statuses come from PayPal on refresh; the
// values below are only the starting snapshot before the first refresh.

import type { Deal, InvoiceRef } from "./types";
import { SEED_CONTRACT } from "./seed-contract";

export const DEMO_DEAL_ID = "demo-aanya";

// Real sandbox invoices created for the demo (see README). Reel and Stories
// instalment 1 were paid by the sandbox buyer; instalment 2 is left unpaid.
export const DEMO_INVOICES = {
  reel: { id: "INV2-8AWB-2X2X-94G5-8G93", number: "0005", dueDate: "2026-11-12" },
  storiesI1: { id: "INV2-2UBU-TJT6-4SEA-69JD", number: "0006", dueDate: "2026-11-12" },
  storiesI2: { id: "INV2-6533-HSNC-3JRY-ZDC4", number: "0007", dueDate: "2026-11-26" },
};

export const DEMO_APPROVED_AT = "2026-11-12";

function snapshot(inv: { id: string; number: string; dueDate: string }, totalMinor: number): InvoiceRef {
  return {
    paypalInvoiceId: inv.id,
    invoiceNumber: inv.number,
    payerViewUrl: null,
    status: "SENT",
    totalMinor,
    paidMinor: 0,
    dueDate: inv.dueDate,
    lastRefreshedAt: "1970-01-01T00:00:00.000Z",
  };
}

export function buildDemoDeal(): Deal {
  return {
    id: DEMO_DEAL_ID,
    brand: "US Skincare Brand, Inc.",
    brandEmail: "brand@example.com",
    creator: "Aanya Rao",
    currency: "USD",
    totalMinor: 120000,
    contractText: SEED_CONTRACT,
    revisionsUsed: 0,
    changeOrders: [],
    flags: [
      {
        issue: "Payment trigger is ambiguous: 'once content goes live or is approved' could mean either date.",
        suggestedClause: "Payment for each deliverable is due on Brand's written approval of that deliverable.",
        sourceQuote: "Payment will be released once content goes live or is approved",
      },
      {
        issue: "The agreement does not say who bears PayPal processing or currency-conversion fees.",
        suggestedClause: "Each party bears its own payment processing and currency-conversion fees.",
        sourceQuote: null,
      },
    ],
    terms: {
      paymentTrigger: "once content goes live or is approved",
      paymentDays: 30,
      revisionsIncluded: 2,
      revisionRateMinor: 7500,
      usageDays: 30,
      usageStart: "2026-11-05",
      usageExtensionRateMinor: 25000,
      usageExtensionDays: 30,
      feesBorneBy: null,
    },
    deliverables: [
      {
        id: "demo-reel",
        name: "Instagram Reel",
        amountMinor: 50000,
        status: "approved",
        approvedAt: DEMO_APPROVED_AT,
        sourceQuote: "One (1) Instagram Reel, 30 to 60 seconds, posted to Creator's main feed: USD 500",
        instalments: [
          {
            id: "demo-reel-1",
            label: "Full payment",
            amountMinor: 50000,
            dueOffsetDays: 0,
            sourceQuote: null,
            invoice: snapshot(DEMO_INVOICES.reel, 50000),
          },
        ],
      },
      {
        id: "demo-stories",
        name: "Three Instagram Stories",
        amountMinor: 30000,
        status: "approved",
        approvedAt: DEMO_APPROVED_AT,
        sourceQuote: "Three (3) Instagram Stories with product link sticker: USD 300 total",
        instalments: [
          {
            id: "demo-stories-1",
            label: "Instalment 1 of 2",
            amountMinor: 15000,
            dueOffsetDays: 0,
            sourceQuote: "the first instalment is due on Brand's approval of the Stories",
            invoice: snapshot(DEMO_INVOICES.storiesI1, 15000),
          },
          {
            id: "demo-stories-2",
            label: "Instalment 2 of 2",
            amountMinor: 15000,
            dueOffsetDays: 14,
            sourceQuote: "the second instalment is due fourteen (14) days after that approval",
            invoice: snapshot(DEMO_INVOICES.storiesI2, 15000),
          },
        ],
      },
      {
        id: "demo-cutdowns",
        name: "Video cutdowns",
        amountMinor: 40000,
        status: "submitted",
        sourceQuote: "Cutdown pack of three (3) 15-second edits of the Reel, delivered as raw files for Brand use: USD 400",
        instalments: [
          {
            id: "demo-cutdowns-1",
            label: "Full payment",
            amountMinor: 40000,
            dueOffsetDays: 30,
            sourceQuote: null,
          },
        ],
      },
    ],
  };
}
