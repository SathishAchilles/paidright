# Paidright demo script (2:50)

Target length 2:50, under the 3:00 limit. One take per row is fine; cut between rows.

## Pre-recording checklist

- [ ] `.env.local` has sandbox `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` and `ANTHROPIC_API_KEY`; `pnpm dev` is running.
- [ ] Sandbox accounts ready (developer.paypal.com > Testing Tools > Sandbox Accounts): the Business account tied to the REST app, and a Personal (buyer) account. Buyer email and password copied somewhere off-screen.
- [ ] Sandbox buyer has enough balance or a test card to pay $500 (Reel) and $150 (Stories instalment 1).
- [ ] Clear localStorage for localhost:3000 (DevTools > Application > Local Storage > Clear) so the app starts empty, then do one dry run end to end.
- [ ] If live payment is slow, pre-create and pay the Reel invoice and the Stories instalment 1 invoice as the sandbox buyer before recording (create the instalment 2 invoice too). On camera, show the existing invoice ids and hit Refresh all invoices live, and say "I paid these earlier as the sandbox buyer"; the invoices and payments are still real sandbox objects.
- [ ] Note instalment 2's due date (14 days after its invoice was created) so you know which simulated date to pick.
- [ ] Simulated date (for demo) reset to today before the take.
- [ ] Browser zoom 125% (or 110% on a small screen), bookmarks bar hidden, notifications off, one window, no other tabs with personal data.
- [ ] Sample GlowLab contract text in the clipboard or the sample loader ready.
- [ ] PayPal payer page open in a second tab, logged out, so the login is quick.
- [ ] Screen recorder at 1080p, mic level checked.

**On camera, say the simulated date out loud** every time you change it (rows 1:05 and 1:50): "I'm setting the simulated date to day 15" / "to day 31." Judges must not think the clock moved on its own.

## Script

| Time | On screen | Voiceover |
|---|---|---|
| 0:00 | Title card: "Paidright". Then a mock inbox: GlowLab deal, $1,200, "Payment status?" thread. | "This is Priya. She makes UGC videos in Mumbai for US brands. GlowLab signed her for a $1,200 deal. Six weeks later she's still chasing part of it, and she's not sure what she's actually owed." |
| 0:15 | Click Load sample deal (GlowLab), then Extract with AI. Deliverables appear with amounts and source quotes. | "She pastes the contract. Claude pulls out every deliverable, amount and term, and shows the exact line in the contract it came from." |
| 0:30 | Scroll to the Flags panel: ambiguous payment trigger, missing fee clause, each with a suggested clause. | "It also flags what's risky. 'Once content goes live or is approved' could mean either date. And nothing says who pays PayPal's fees. Each flag comes with a clause she can send back to the brand." |
| 0:45 | Reel: Mark submitted, Mark approved, Create PayPal invoice. Real sandbox invoice id appears; buyer tab pays $500. Refresh: Reel "Paid". | "GlowLab approves the Reel. One click sends a real PayPal sandbox invoice: real invoice id, real payer page. The brand pays, Refresh pulls the status from PayPal, and it's Paid." |
| 1:05 | Stories: approved, two invoices, "Instalment 1 of 2" Paid, "Instalment 2 of 2" Unpaid. Open Simulated date (for demo), set day 15. Badge: "$150 overdue · 4 days" (resolution card: "Instalment 2 of 2"). Summary: "$1,200 deal · $650 paid · $150 overdue · $400 not yet due". | "The contract splits the Stories into two $150 payments, so each one gets its own PayPal invoice. Instalment 1 is paid. I'm setting the simulated date to day 15, past instalment 2's due date. Code, not AI, compares PayPal's due date with today: $150 overdue." |
| 1:25 | Click Explain & draft reminder. Explanation shows the instalment clause quote, instalment 1 paid on its own invoice, "PayPal fees are not part of this amount". Edit one word, click Send PayPal reminder. "Reminder sent" timestamp. | "Claude explains why it's owed: here's the contract clause, here's instalment 1 paid on its own invoice, and fees aren't part of it. It drafts a polite reminder. Priya approves it, and it goes out through PayPal's own reminder API on that invoice." |
| 1:50 | Open Simulated date (for demo) again. Set it to day 31 (past 2026-12-05). Usage clock turns red: "Paid usage ended". Click Draft change order: $250 line appears. Click Create PayPal invoice: new invoice id. | "Now the contract clocks. I'm setting the simulated date to day 31. GlowLab's 30-day paid-usage window has ended, but the ad is still running. The agent drafts a change order. The $250 comes from the contract's own extension rate, computed in code. She approves, and a new PayPal invoice goes out." |
| 2:15 | Click + on revisions to log #3 (contract includes two). Draft change order: $75 add-on. Create PayPal invoice. | "The brand asks for a third revision. The contract includes two, at $75 per extra round. That's a $75 add-on, drafted and billed instead of done for free." |
| 2:30 | Recap slide: three columns. PayPal: invoices per instalment, payments, status, reminders. Claude: extraction, flags, explanations, drafts. Code: all money maths. | "So: PayPal is the money rail and the source of truth, with an invoice per instalment, payments, status and reminders. Claude reads the contract and writes the words. Every number is computed in code. It's built for India's creators and editors billing overseas brands." |
| 2:45 | Closing card: "Paidright" + repo URL. | "Creators shouldn't have to be their own collections department." |
| 2:50 | End. | |

## Notes

- Keep amounts consistent with the sample contract: $1,200 total; Reel $500 (paid); Stories $300 as two $150 instalments (instalment 1 paid, instalment 2 overdue); Video cutdowns $400 (not yet due); usage extension $250 per period; extra revision $75.
- Never say the brand paid part of an invoice. Each instalment is its own invoice; PayPal partial payments are not available to India-based merchants.
- If an API call is slow on camera, cut the wait in editing; do not fake the result.
- Do not show `.env.local`, the PayPal developer dashboard credentials page, or the buyer's password.
