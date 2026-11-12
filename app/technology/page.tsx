import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Technology · PaidRight",
  description: "How PaidRight uses the PayPal Invoicing API and Claude, and where code, AI and the creator each decide.",
};

const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em]";
const h2 = "text-2xl font-semibold leading-tight sm:text-3xl";
const card = "rounded-xl border border-hairline bg-surface";
const code = "font-mono text-[0.85em] [overflow-wrap:anywhere] text-navy";

const PAYPAL_OPS: { op: string; call: string; note: string }[] = [
  { op: "Create invoice", call: "POST /v2/invoicing/invoices", note: "Stores the real Sandbox invoice ID." },
  { op: "Send invoice", call: "POST /v2/invoicing/invoices/{id}/send", note: "Records the hosted invoice link." },
  { op: "Read invoice", call: "GET /v2/invoicing/invoices/{id}", note: "Authoritative status, fetched on the server." },
  {
    op: "Send reminder",
    call: "POST /v2/invoicing/invoices/{id}/remind",
    note: "Only after the creator approves and a server-side re-fetch confirms it is still unpaid.",
  },
];

const DECIDERS: { who: string; tone: string; does: string[] }[] = [
  {
    who: "AI (Claude)",
    tone: "border-t-blue",
    does: [
      "Reads the agreement into structured terms, each with a source quote.",
      "Explains findings and drafts follow-up messages.",
    ],
  },
  {
    who: "Code",
    tone: "border-t-navy",
    does: [
      "Does all money arithmetic in integer cents.",
      "Sorts amounts into paid, overdue and not-yet-billable buckets.",
    ],
  },
  {
    who: "PayPal",
    tone: "border-t-mint",
    does: ["Is the authoritative source of invoice status."],
  },
  {
    who: "Creator",
    tone: "border-t-amber",
    does: ["Approves every send. Nothing goes to the brand without a click."],
  },
];

const DISTINCTIONS: [string, string][] = [
  ["Verified Sandbox payment", "a production payment, or INR in the creator's bank"],
  ["A processor fee", "a brand underpayment"],
  ["An AI recommendation", "authorization to charge anyone"],
];

const LIMITATIONS = [
  "No webhooks yet. Invoice status is read from PayPal on demand.",
  "No brand review link yet.",
  "No automated tests yet.",
  "Demo state is per browser, while the PayPal Sandbox invoices are shared.",
];

function External({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-hairline pt-10">
      <h2 id={id} className={h2}>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function TechnologyPage() {
  return (
    <article className="mx-auto flex max-w-[880px] flex-col gap-12">
      <header>
        <p className={`${eyebrow} text-ink-soft`}>Technology</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">How PaidRight works under the hood.</h1>
        <p className="mt-4 max-w-2xl text-lg">
          AI interprets the evidence. Code handles the money. PayPal holds the payment truth. The creator approves
          every action.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Model: Claude (<code className={code}>claude-sonnet-5-5</code>) via the Anthropic API. Payments: PayPal
          Invoicing REST API, Sandbox.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={SITE.demoPath}
            className="inline-flex h-12 items-center justify-center rounded-[10px] bg-blue px-6 text-base font-semibold text-white hover:bg-blue-strong"
          >
            Try live demo
          </Link>
          <External
            href={SITE.githubUrl}
            className="inline-flex h-12 items-center justify-center rounded-[10px] border border-hairline bg-surface px-6 text-base font-semibold text-navy hover:border-navy"
          >
            View source on GitHub
          </External>
        </div>
      </header>

      <Section id="paypal-ops" title="PayPal operations">
        <p className="mb-4 text-ink-soft">
          Every call runs on the server. The OAuth token is fetched server-side and never reaches the browser.
        </p>
        <div className={`${card} overflow-hidden`}>
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <caption className="sr-only">PayPal Invoicing API calls made by PaidRight</caption>
            <thead>
              <tr className="border-b border-hairline bg-muted-bg">
                <th scope="col" className={`${eyebrow} w-[34%] px-3 py-3 text-ink-soft sm:w-1/4 sm:px-4`}>
                  Operation
                </th>
                <th scope="col" className={`${eyebrow} px-3 py-3 text-ink-soft sm:px-4`}>
                  API call
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline align-top">
              {PAYPAL_OPS.map((r) => (
                <tr key={r.op}>
                  <th scope="row" className="px-3 py-4 font-semibold text-navy sm:px-4">
                    {r.op}
                  </th>
                  <td className="px-3 py-4 sm:px-4">
                    <code className={code}>{r.call}</code>
                    <p className="mt-1 text-ink-soft">{r.note}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="who-decides" title="Who decides what">
        <ul className="grid gap-4 sm:grid-cols-2">
          {DECIDERS.map((d) => (
            <li key={d.who} className={`${card} border-t-4 p-5 ${d.tone}`}>
              <h3 className="text-lg font-semibold">{d.who}</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {d.does.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="trust" title="Trust distinctions">
        <ul className="space-y-3">
          {DISTINCTIONS.map(([a, b]) => (
            <li key={a} className={`${card} p-4`}>
              <span className="font-semibold text-navy">{a}</span>{" "}
              <span className="text-ink-soft">is not</span> <span className="text-navy">{b}</span>.
            </li>
          ))}
        </ul>
      </Section>

      <Section id="instalments" title="Why instalments">
        <p className="max-w-2xl">
          PayPal India merchants can&apos;t accept partial payments on an invoice. So the agreed{" "}
          <span className="tabular">$150</span> Stories instalments are two separate invoices. One is paid; one is
          overdue.
        </p>
      </Section>

      <Section id="real-vs-simulated" title="Real vs simulated">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`${card} border-t-4 border-t-mint p-5`}>
            <h3 className="text-lg font-semibold">Real</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>PayPal Sandbox invoices, statuses and reminders are real API calls.</li>
            </ul>
          </div>
          <div className={`${card} border-t-4 border-t-amber p-5`}>
            <h3 className="text-lg font-semibold">Simulated</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>GlowLab and Aanya are fictional.</li>
              <li>The demo may open on a labelled simulated date before the real due date.</li>
              <li>No real money is involved.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="limitations" title="Limitations">
        <ul className="list-disc space-y-2 pl-5">
          {LIMITATIONS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Section>

      <footer className="flex flex-col gap-3 border-t border-hairline pt-8 sm:flex-row">
        <Link
          href={SITE.demoPath}
          className="inline-flex h-12 items-center justify-center rounded-[10px] bg-blue px-6 text-base font-semibold text-white hover:bg-blue-strong"
        >
          Try live demo
        </Link>
        <External
          href={SITE.githubUrl}
          className="inline-flex h-12 items-center justify-center rounded-[10px] border border-hairline bg-surface px-6 text-base font-semibold text-navy hover:border-navy"
        >
          GitHub repository
        </External>
      </footer>
    </article>
  );
}
