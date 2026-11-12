# Paidright

A contract-to-cash agent for creators: it reads a brand-deal contract, bills each deliverable through PayPal invoices, and tracks what the brand still owes until the money arrives.

Built for the PayPal AI Hackathon (Devpost).

## The problem

Indian UGC creators and video editors increasingly do paid work for US and UK brands and get paid through PayPal invoices. Money leaks out in three places:

- **Underpayment confusion.** A brand pays $150 on a $300 invoice. Is that a PayPal fee, an FX deduction, or a short payment? Most creators can't tell, so they don't follow up.
- **Unbilled usage-rights extensions.** The brand's paid-usage (whitelisting) window ends, the ad keeps running, and nobody sends an invoice for the extension.
- **Unbilled extra revisions.** The contract includes two revision rounds, the brand asks for a third, and the creator does it for free.

Chasing a brand for money is awkward, and a solo creator has no finance team to do it.

**Who it's for:** independent creators, UGC makers and freelance video editors in India who bill overseas brands in USD, GBP or EUR through PayPal.

## How it works

1. **Paste the contract.** Claude extracts the brand, deliverables, amounts and terms (payment trigger, net days, revision rounds and rate, usage window and extension rate, who bears fees), each with the source quote it came from.
2. **Review the flags.** Ambiguous or missing payment terms (for example "once content goes live or is approved" or no fee clause) are flagged with a suggested replacement clause.
3. **Track deliverables.** The creator marks each deliverable submitted, then approved.
4. **Invoice.** For an approved deliverable, the app creates and sends a real PayPal sandbox invoice (Invoicing v2, partial payments allowed) to the brand's email.
5. **Refresh.** Pulls the invoice status and paid amount from PayPal. Code classifies the gap as `PAID`, `UNDERPAID`, `UNPAID`, `NOT_INVOICED` or `NOT_DUE`.
6. **Explain and remind.** Claude explains the gap in plain language and drafts a reminder. The creator edits and approves it, and the app sends it through PayPal's remind API.
7. **Contract clocks.** When the paid-usage window expires or revisions exceed the included rounds, the agent drafts a change order priced from the contract's own rates. The creator approves it and a new PayPal invoice is sent.

## Architecture

```
  Browser (Next.js UI)
  - deals, deliverables, change orders in localStorage
  - "Simulated date" control
  - gap + clock math (deterministic TypeScript)
        |
        | POST JSON
        v
  Next.js API routes (server; secrets stay here)
  +-------------------------+     +------------------------------+
  | /api/extract            |     | /api/invoice                 |
  | /api/explain            |     | /api/refresh                 |
  | /api/change-order       |     | /api/remind                  |
  +-----------+-------------+     +--------------+---------------+
              |                                  |
              v                                  v
     Anthropic Messages API            PayPal REST (sandbox)
     model: claude-sonnet-5-5          OAuth2 + Invoicing v2
                                       (source of truth for
                                        invoice status/paid)
```

There is no database and no login. The browser holds the deal; PayPal holds the invoice state.

## How PayPal is used

All calls go to `https://api-m.sandbox.paypal.com` (configurable via `PAYPAL_BASE`) from server-side routes.

| Step | Endpoint | Used by |
|---|---|---|
| Get access token (client credentials) | `POST /v1/oauth2/token` | all PayPal routes |
| Reserve the next invoice number | `POST /v2/invoicing/generate-next-invoice-number` | `/api/invoice` |
| Create a draft invoice (partial payments allowed, due date from contract net terms) | `POST /v2/invoicing/invoices` | `/api/invoice` |
| Send the invoice to the brand's email | `POST /v2/invoicing/invoices/{id}/send` | `/api/invoice` |
| Read status and amount paid | `GET /v2/invoicing/invoices/{id}` | `/api/refresh` |
| Send a payment reminder with the creator-approved note | `POST /v2/invoicing/invoices/{id}/remind` | `/api/remind` |

The brand pays on PayPal's hosted payer page (the invoice's payer-view link). Paidright never handles card or account details.

## How AI is used

Three Claude calls (`claude-sonnet-5-5` via the Anthropic SDK), all server-side:

| Route | Input | Output |
|---|---|---|
| `/api/extract` | Contract text | Brand, deliverables, amounts and terms as structured JSON, with source quotes; flags for ambiguous or missing terms with suggested clauses |
| `/api/explain` | The deal, one deliverable and its computed gap | A plain-language explanation of the gap and a draft reminder |
| `/api/change-order` | The deal and a clock event (usage expired or extra revisions) | A change-order line item description and a note for the brand |

**Deterministic (code, not the model):**

- Gap classification and the amount due, from PayPal's reported total and paid amounts. PayPal fees are the creator's cost and are never added to what the brand owes.
- Clock detection (usage window end date, revision count against rounds included).
- Change-order amounts, computed from the contract's extracted rates (extension periods x extension rate, extra rounds x revision rate). The model writes the wording; it never sets the price.
- All money is integer minor units (cents).

**Model-written:** extracted fields and quotes (the creator reviews them before anything is billed), flags and suggested clauses, gap explanations, reminder text and change-order wording. Nothing is sent to PayPal until the creator approves it.

## Setup

**Prerequisites:** Node.js 20+, pnpm, a PayPal developer account, an Anthropic API key.

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | [developer.paypal.com](https://developer.paypal.com) > Apps & Credentials > **Sandbox** > Create App (Merchant) |
| `PAYPAL_BASE` | Leave as `https://api-m.sandbox.paypal.com` |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |

```bash
pnpm dev
```

Open http://localhost:3000.

## Testing the full flow in sandbox

PayPal creates two sandbox accounts for you under developer.paypal.com > Testing Tools > Sandbox Accounts: a **Business** account (the invoicer, tied to your REST app) and a **Personal** account (the buyer). Note the Personal account's email and password.

1. Load the sample **GlowLab** deal (fictional brand, $1,200 total) and run extraction. Review the flags.
2. Set the deal's brand email to your sandbox **Personal** account email.
3. Mark the Stories deliverable ($300) submitted, then approved. Click **Create PayPal invoice**. A real sandbox invoice id and payer link appear.
4. Open the payer link, log in as the sandbox buyer, and pay a **partial amount: $150** of $300.
5. Back in Paidright, click **Refresh**. The deliverable shows `UNDERPAID` with $150 due.
6. Click **Explain & draft reminder**. Read the explanation and the draft reminder, edit if needed, and **Send PayPal reminder**.
7. Set the **Simulated date** past **2026-12-05** (the end of the sample's paid-usage window). A usage-extension change order is drafted, priced from the contract's extension rate. Click **Draft change order**, then **Create PayPal invoice** to send a new PayPal invoice.
8. Optional: log a revision beyond the included rounds to trigger a revision add-on change order.

## What's real vs simulated

| Real | Simulated or fictional |
|---|---|
| Every PayPal call is a real call to the PayPal sandbox; invoice ids, payer pages, statuses and paid amounts come from PayPal | "Today" can be overridden by the labelled **Simulated date** control so clock events can be shown without waiting 30 days |
| Every Claude call is a live model call | The sample contract, the GlowLab brand and the creator are fictional |
| Gap and change-order math runs in code on PayPal's numbers | No real money moves: sandbox only |

## Limitations and not built

- No authentication; data lives in one browser's localStorage. Clearing it clears your deals (invoices remain in PayPal).
- No webhooks. Invoice status updates only when you click **Refresh**.
- No FIRA/eFIRA, bank settlement or INR reconciliation; amounts are tracked in the invoice currency.
- No tax or legal advice. Suggested clauses are drafts for the creator to negotiate, not legal review.
- PayPal merchant onboarding for Indian accounts (and live-mode invoicing from India) has not been verified; the build has only been run against the sandbox.

## License

MIT. See [LICENSE](LICENSE).
