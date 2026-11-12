# Paidright demo script (2:50)

Target length 2:50, under the 3:00 limit. One take per row is fine; cut between rows.

## Pre-recording checklist

- [ ] `.env.local` has sandbox `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` and `ANTHROPIC_API_KEY`; `pnpm dev` is running.
- [ ] Sandbox accounts ready (developer.paypal.com > Testing Tools > Sandbox Accounts): the Business account tied to the REST app, and a Personal (buyer) account. Buyer email and password copied somewhere off-screen.
- [ ] Sandbox buyer has enough balance or a test card to pay $150.
- [ ] Clear localStorage for localhost:3000 (DevTools > Application > Local Storage > Clear) so the app starts empty, then do one dry run end to end.
- [ ] If the payment step is slow, pre-create the Stories invoice and pay $150 as the buyer before recording; on camera, show the existing invoice id and hit Refresh live. Say "I paid this earlier as the sandbox buyer" on camera; the invoice and payment are still real sandbox objects.
- [ ] Simulated date reset to today before the take.
- [ ] Browser zoom 125% (or 110% on a small screen), bookmarks bar hidden, notifications off, one window, no other tabs with personal data.
- [ ] Sample GlowLab contract text in the clipboard or the sample loader ready.
- [ ] PayPal payer page open in a second tab, logged out, so the login is quick.
- [ ] Screen recorder at 1080p, mic level checked.

**On camera, say the simulated date out loud** when you change it (row 1:50): "I'm setting the simulated date to day 31." Judges must not think the clock moved on its own.

## Script

| Time | On screen | Voiceover |
|---|---|---|
| 0:00 | Title card: "Paidright". Then a mock inbox: GlowLab deal, $1,200, "Payment status?" thread. | "This is Priya. She makes UGC videos in Mumbai for US brands. GlowLab signed her for a $1,200 deal. Six weeks later she's still chasing part of it, and she's not sure what she's actually owed." |
| 0:15 | Paste the GlowLab contract, click Extract. Deliverables appear with amounts and source quotes. | "She pastes the contract. Claude pulls out every deliverable, amount and term, and shows the exact line in the contract it came from." |
| 0:30 | Scroll to the Flags panel: ambiguous payment trigger, missing fee clause, each with a suggested clause. | "It also flags what's risky. 'Once content goes live or is approved' could mean either date. And nothing says who pays PayPal's fees. Each flag comes with a clause she can send back to the brand." |
| 0:45 | Mark the Reel submitted, then approved. Click Create PayPal invoice. Real PayPal sandbox invoice id appears; open the payer page. | "The brand approves the Reel. One click creates and sends a real PayPal invoice. This is the PayPal sandbox: real invoice id, real payer page, partial payments allowed." |
| 1:05 | Stories invoice ($300) already sent. Switch to the buyer tab: pay $150. Back in Paidright, click Refresh. Badge: "$150 UNDERPAID". | "On the $300 Stories invoice, the brand pays $150. Refresh pulls the status straight from PayPal. Code, not AI, does the maths: $150 underpaid. That isn't fees. PayPal fees are Priya's cost and are never charged to the brand." |
| 1:30 | Click Explain & draft reminder. Explanation and draft reminder appear. Edit one word, click Send PayPal reminder. "Reminder sent" timestamp. | "Claude explains the gap in plain English and drafts a polite reminder. Priya reviews it, approves it, and it goes out through PayPal's own reminder API. Nothing is sent without her approval." |
| 1:50 | Open the Simulated date control. Set it to day 31 (past 2026-12-05). Usage clock turns red: "Paid usage ended". Click Draft change order: $250 line appears. Click Create PayPal invoice: new invoice id. | "Now the contract clocks. I'm setting the simulated date to day 31. GlowLab's 30-day paid-usage window has ended, but the ad is still running. The agent drafts a change order. The $250 comes from the contract's own extension rate, computed in code. She approves, and a new PayPal invoice goes out." |
| 2:15 | Click + on revisions to log #3 (contract includes two). Draft change order: $75 add-on. Create PayPal invoice. | "The brand asks for a third revision. The contract includes two, at $75 per extra round. That's a $75 add-on, drafted and billed instead of done for free." |
| 2:30 | Recap slide: two columns. PayPal: invoices, partial payments, status, reminders. Claude: extraction, flags, explanations, drafts. Code: all money maths. | "So: PayPal is the money rail and the source of truth, with invoices, partial payments, status and reminders. Claude reads the contract and writes the words. Every number is computed in code. It's built for India's creators and editors billing overseas brands." |
| 2:45 | Closing card: "Paidright" + repo URL. | "Creators shouldn't have to be their own collections department." |
| 2:50 | End. | |

## Notes

- Keep amounts consistent with the sample contract: $1,200 total, Stories $300, usage extension $250 per period, extra revision $75.
- If an API call is slow on camera, cut the wait in editing; do not fake the result.
- Do not show `.env.local`, the PayPal developer dashboard credentials page, or the buyer's password.
