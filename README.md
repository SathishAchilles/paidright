# Paidright

A contract-to-cash agent for creators: it reads a brand-deal contract, bills each deliverable through PayPal invoices, and tracks what the brand still owes until the money arrives.

Built for the PayPal AI Hackathon (Devpost).

## The problem

Indian UGC creators and video editors increasingly do paid work for US and UK brands and get paid through PayPal invoices. Money leaks out in three places:

- **Missed instalments.** The contract splits a deliverable into two payments. The first arrives, the second quietly doesn't. Was it a PayPal fee, an FX deduction, or a missed payment? Most creators can't tell what is still owed, so they don't follow up.
- **Unbilled usage-rights extensions.** The brand's paid-usage (whitelisting) window ends, the ad keeps running, and nobody sends an invoice for the extension.
- **Unbilled extra revisions.** The contract includes two revision rounds, the brand asks for a third, and the creator does it for free.

Chasing a brand for money is awkward, and a solo creator has no finance team to do it.

**Who it's for:** independent creators, UGC makers and freelance video editors in India who bill overseas brands in USD, GBP or EUR through PayPal.

## How it works

1. **Paste the contract.** Claude extracts the brand, deliverables, amounts, each deliverable's agreed instalment schedule (amount and days after approval for each payment) and terms (payment trigger, net days, revision rounds and rate, usage window and extension rate, who bears fees), each with the source quote it came from.
2. **Review the flags.** Ambiguous or missing payment terms (for example "once content goes live or is approved" or no fee clause) are flagged with a suggested replacement clause.
3. **Track deliverables.** The creator marks each deliverable submitted, then approved.
4. **Invoice each instalment.** For an approved deliverable, the app creates and sends one real PayPal sandbox invoice (Invoicing v2) per agreed instalment, each with its own due date from the contract schedule. A deliverable paid in one go has a single instalment and a single invoice.
5. **Refresh.** Pulls each invoice's status, paid amount and due date from PayPal. Code compares the due date with today and classifies each deliverable (see below). The deal page sums it up, for example `$1,200 deal · $650 paid · $150 overdue · $400 not yet due`.
6. **Explain and remind.** For an overdue instalment, Claude explains why the money is owed: it cites the contract's instalment clause, shows the earlier instalment paid on its own invoice, and notes that PayPal fees are not part of the amount. It drafts a reminder; the creator edits and approves it, and the app sends it through PayPal's remind API on the overdue instalment's invoice.
7. **Contract clocks.** When the paid-usage window expires or revisions exceed the included rounds, the agent drafts a change order priced from the contract's own rates. The creator approves it and a new PayPal invoice is sent.

### Gap classes

Computed per deliverable in code, from PayPal's invoice data. The first match wins:

| Class | UI label | Meaning |
|---|---|---|
| `PAID` | Paid | Every instalment paid |
| `OVERDUE` | Overdue | An invoiced instalment is unpaid past its PayPal due date |
| `NOT_INVOICED` | Not invoiced | Approved, but an instalment has no invoice yet |
| `UNDERPAID` | Partly paid | Some instalments paid; the rest invoiced and not yet due |
| `UNPAID` | Unpaid | Invoiced, nothing paid, nothing overdue yet |
| `NOT_DUE` | Not yet due | Not yet approved |

"Today" is the real date unless the labelled **Simulated date (for demo)** control moves it forward.

## Architecture

```
  Browser (Next.js UI)
  - deals, deliverables, change orders in localStorage
  - "Simulated date (for demo)" control
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
| Create a draft invoice for one instalment (due date from the contract's instalment schedule) | `POST /v2/invoicing/invoices` | `/api/invoice` |
| Send the invoice to the brand's email | `POST /v2/invoicing/invoices/{id}/send` | `/api/invoice` |
| Read status and amount paid | `GET /v2/invoicing/invoices/{id}` | `/api/refresh` |
| Send a payment reminder with the creator-approved note | `POST /v2/invoicing/invoices/{id}/remind` | `/api/remind` |

The brand pays on PayPal's hosted payer page (the invoice's payer-view link). Paidright never handles card or account details.

## How AI is used

Three Claude calls (`claude-sonnet-5-5` via the Anthropic SDK), all server-side:

| Route | Input | Output |
|---|---|---|
| `/api/extract` | Contract text | Brand, deliverables, amounts, instalment schedules and terms as structured JSON, with source quotes; flags for ambiguous or missing terms with suggested clauses |
| `/api/explain` | The deal, one deliverable, its instalments and its computed gap | A plain-language explanation citing the instalment clause and the paid instalments, and a draft reminder |
| `/api/change-order` | The deal and a clock event (usage expired or extra revisions) | A change-order line item description and a note for the brand |

**Deterministic (code, not the model):**

- Gap classification, amount due and amount overdue, from PayPal's reported total, paid amount and due date for each instalment invoice. PayPal fees are the creator's cost and are never added to what the brand owes.
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

Sample deal: GlowLab Skincare Inc. (US) x Priya Nair (Mumbai), $1,200.

| Deliverable | Amount | Schedule | End state |
|---|---|---|---|
| Reel | $500 | One payment on approval | Paid |
| 3 Stories | $300 | $150 on approval + $150 due 14 days after approval | Partly paid, then Overdue $150 |
| Video cutdowns | $400 | Not yet approved | Not yet due |

1. Click **Load sample deal (GlowLab)**, then **Extract with AI**. Review the instalment schedules and flags, then **Save deal**.
2. Set the deal's brand email to your sandbox **Personal** account email.
3. **Reel.** **Mark submitted**, **Mark approved**, **Create PayPal invoice**. A real sandbox invoice id and payer link appear. Open the payer link, log in as the sandbox buyer, pay $500. Back in Paidright, **Refresh**: Reel shows **Paid**.
4. **Stories.** **Mark submitted**, **Mark approved**. Click **Create PayPal invoice** on instalment 1 and on instalment 2 (two separate invoices, $150 each). Pay instalment 1's invoice as the buyer. **Refresh all invoices**: Stories shows **Partly paid**.
5. Set **Simulated date (for demo)** past instalment 2's due date (14 days after you created it). Stories turns **Overdue**: $150, Instalment 2 of 2. The summary reads `$1,200 deal · $650 paid · $150 overdue · $400 not yet due`.
6. Click **Explain & draft reminder**. The explanation cites the contract's instalment clause, shows instalment 1 paid on its own invoice, and states PayPal fees are not part of the $150. Edit the draft if needed, then **Send PayPal reminder** (sent on instalment 2's invoice).
7. **Video cutdowns** stay **Not yet due** throughout; they are never approved.
8. **Change orders.** Set the simulated date past **2026-12-05** (end of the sample's paid-usage window). Click **Draft change order** for the $250 usage extension, priced from the contract's extension rate, then **Create PayPal invoice**.
9. Optional: log a revision beyond the included rounds to draft a $75 revision add-on change order.

## What's real vs simulated

| Real | Simulated or fictional |
|---|---|
| Every invoice, payment and reminder is a real PayPal sandbox call; invoice ids, payer pages, statuses, paid amounts and due dates come from PayPal | Only the date: "today" can be moved forward by the labelled **Simulated date (for demo)** control, so an overdue instalment or expired usage window can be shown without waiting 14 or 30 days |
| Every Claude call is a live model call | The sample contract, the GlowLab brand and the creator are fictional |
| Gap and change-order math runs in code on PayPal's numbers | No real money moves: sandbox only |

## Limitations and not built

- No authentication; data lives in one browser's localStorage. Clearing it clears your deals (invoices remain in PayPal).
- No webhooks. Invoice status updates only when you click **Refresh** or **Refresh all invoices**.
- Instalments, not partial payments. PayPal does not allow partial payments for India-based merchant accounts (the sandbox returns "Partial payments are not available in your country"). Paidright bills each agreed instalment on its own invoice instead, which is how the contract splits payment anyway.
- No FIRA/eFIRA, bank settlement or INR reconciliation; amounts are tracked in the invoice currency.
- No tax or legal advice. Suggested clauses are drafts for the creator to negotiate, not legal review.
- PayPal merchant onboarding for Indian accounts (and live-mode invoicing from India) has not been verified; the build has only been run against the sandbox.

## License

MIT. See [LICENSE](LICENSE).
