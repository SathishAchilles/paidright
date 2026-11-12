import Link from "next/link";
import { HomeVideo } from "@/components/HomeVideo";
import { HomeWorkflowTabs } from "@/components/HomeWorkflowTabs";
import { SITE } from "@/lib/site";

const container = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";
const section = "py-16 sm:py-24";
const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em]";
const h2 = "text-3xl font-semibold leading-tight sm:text-4xl";
const btnPrimary =
  "inline-flex h-12 items-center justify-center rounded-[10px] bg-blue px-6 text-base font-semibold text-white hover:bg-blue-strong";
const btnSecondaryDark =
  "inline-flex h-12 items-center justify-center rounded-[10px] border border-white/30 px-6 text-base font-semibold text-white hover:border-white";

function External({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function SectionNumber({ n, dark = false }: { n: string; dark?: boolean }) {
  return <p className={`${eyebrow} tabular ${dark ? "text-white/60" : "text-ink-soft"}`}>{n}</p>;
}

/* 01 ─ Hero visual: a static, product-like card (no images). */
function HeroCard() {
  const rows = [
    { label: "Agreed", amount: "$300", tone: "text-navy", dot: "bg-ink-soft" },
    { label: "Paid", amount: "$150", tone: "text-mint", dot: "bg-mint" },
    { label: "Overdue", amount: "$150", tone: "text-amber-ink", dot: "bg-amber" },
  ];
  return (
    <figure
      aria-label="Example: Aanya's campaign with a US skincare brand"
      className="w-full rounded-2xl border border-hairline bg-surface p-5 text-ink shadow-[0_24px_48px_-24px_rgba(0,0,0,0.5)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold text-navy">Aanya × US Skincare Brand</p>
          <p className="tabular text-sm text-ink-soft">$1,200 campaign</p>
        </div>
        <span className="rounded-full bg-amber-bg px-3 py-1 text-xs font-semibold text-amber-ink">Needs attention</span>
      </div>

      <div className="mt-5 rounded-xl border border-hairline">
        <p className="border-b border-hairline px-4 py-2 text-sm font-semibold text-navy">Three Stories</p>
        <dl className="divide-y divide-hairline">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-3">
              <dt className={`${eyebrow} flex items-center gap-2 text-ink-soft`}>
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${r.dot}`} />
                {r.label}
              </dt>
              <dd className={`tabular font-display text-lg font-semibold ${r.tone}`}>{r.amount}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 rounded-xl bg-blue-bg p-4">
        <p className={`${eyebrow} text-blue`}>Agent finding</p>
        <p className="mt-1 text-sm text-navy">Brand approved the work. Second instalment is overdue.</p>
      </div>
    </figure>
  );
}

export default function Home() {
  return (
    <div data-full-bleed className="flex flex-col">
      {/* 01 Hero */}
      <section className="on-dark bg-navy text-white" aria-labelledby="hero-title">
        <div className={`${container} grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr]`}>
          <div>
            <p className={`${eyebrow} text-white/70`}>For Indian creators working with global brands</p>
            <h1 id="hero-title" className="mt-4 text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              You did the work. Now get clarity on the money.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/80">
              Your contract says one thing. Your payment records tell another. Paidright connects both—so you know what
              you&apos;ve earned, what&apos;s still unpaid, and what to do next.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={SITE.demoPath} className={btnPrimary}>
                Try live demo
              </Link>
              <a href="#watch" className={btnSecondaryDark}>
                Watch 3-minute demo
              </a>
            </div>
            <p className="mt-6 max-w-xl text-sm text-white/70">
              AI understands the agreement. PayPal verifies the payment. You stay in control.
            </p>
          </div>
          <HeroCard />
        </div>
      </section>

      {/* 02 Problem */}
      <section className={`${section} bg-canvas`} aria-labelledby="problem-title">
        <div className={container}>
          <SectionNumber n="02" />
          <h2 id="problem-title" className={`${h2} mt-3 max-w-3xl`}>
            The work is done. So why is getting paid still complicated?
          </h2>
          <p className="mt-4 max-w-2xl text-lg">
            For an international brand collaboration, the contract might be in a PDF, the approval in an email, and the
            payment in PayPal. When something is missing, the creator has to piece it all together.
          </p>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { t: "Agreement", d: "Deliverables, amounts and due dates — in a PDF." },
              { t: "Brand approval", d: "A sign-off on the work — in an email thread." },
              { t: "PayPal payment", d: "Invoices and transactions — in PayPal." },
            ].map((c, i, all) => (
              <li key={c.t} className="relative rounded-xl border border-hairline bg-surface p-6">
                <p className="tabular text-sm font-semibold text-blue">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 text-xl font-semibold">{c.t}</h3>
                <p className="mt-2 text-ink-soft">{c.d}</p>
                {i < all.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-4 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-hairline bg-canvas text-ink-soft md:-right-4 md:bottom-auto md:left-auto md:top-1/2 md:translate-x-0 md:-translate-y-1/2"
                  >
                    <span className="rotate-90 md:rotate-0">→</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-10 font-display text-xl font-semibold text-navy">Paidright brings the whole story together.</p>
        </div>
      </section>

      {/* 03 Story */}
      <section className={`${section} border-y border-hairline bg-surface`} aria-labelledby="story-title">
        <div className={container}>
          <SectionNumber n="03" />
          <h2 id="story-title" className={`${h2} mt-3 max-w-3xl`}>
            Meet Aanya. She&apos;s delivered. But hasn&apos;t been fully paid.
          </h2>
          <p className="mt-4 max-w-2xl text-lg">
            Aanya is a Bengaluru-based creator working with a US skincare brand. Her campaign is worth $1,200. She has
            delivered the approved Stories, but only one of two agreed $150 instalments has been paid.
          </p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "$1,200 campaign agreed", d: null, tone: "border-t-ink-soft" },
              { n: "02", t: "Stories approved", d: null, tone: "border-t-blue" },
              { n: "03", t: "$150 paid", d: "First instalment verified via PayPal", tone: "border-t-mint" },
              { n: "04", t: "$150 overdue", d: "Second invoice past its due date", tone: "border-t-amber" },
            ].map((b) => (
              <li key={b.n} className={`rounded-xl border border-hairline border-t-4 bg-canvas p-5 ${b.tone}`}>
                <p className="tabular text-sm font-semibold text-ink-soft">{b.n}</p>
                <p className="tabular mt-2 font-display text-xl font-semibold text-navy">{b.t}</p>
                {b.d && <p className="mt-1 text-sm text-ink-soft">{b.d}</p>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 04 How it works */}
      <section id="how" className={`${section} bg-canvas`} aria-labelledby="how-title">
        <div className={container}>
          <SectionNumber n="04" />
          <h2 id="how-title" className={`${h2} mt-3 max-w-3xl`}>
            From agreement to payment. One clear workflow.
          </h2>
          <div className="mt-10">
            <HomeWorkflowTabs />
          </div>
        </div>
      </section>

      {/* 05 Aha */}
      <section className={`${section} border-y border-hairline bg-surface`} aria-labelledby="aha-title">
        <div className={`${container} grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center`}>
          <div>
            <SectionNumber n="05" />
            <h2 id="aha-title" className={`${h2} mt-3`}>
              Not just an alert. An answer you can act on.
            </h2>
            <p className="mt-4 text-lg">
              Paidright doesn&apos;t simply flag a late invoice. It connects the evidence and explains what&apos;s
              missing.
            </p>
            <p className="mt-6 font-display text-lg font-semibold text-navy">
              Every recommendation comes with a reason. Every payment action stays under your control.
            </p>
          </div>

          <article aria-label="Example investigation" className="rounded-2xl border border-hairline border-l-4 border-l-amber bg-surface p-6 shadow-[0_16px_40px_-28px_rgba(16,27,43,0.45)]">
            <p className={`${eyebrow} text-amber-ink`}>Investigation</p>
            <p className="tabular mt-2 font-display text-2xl font-semibold text-navy">$150 overdue</p>
            <p className="text-ink-soft">Three Stories, second instalment</p>

            <h3 className={`${eyebrow} mt-6 font-sans text-ink-soft`}>Evidence checked</h3>
            <ul className="mt-3 space-y-2">
              {[
                ["Agreement confirms payment terms", "ok"],
                ["Brand approved the Stories", "ok"],
                ["First $150 payment verified", "ok"],
                ["Second invoice remains unpaid past its due date", "warn"],
              ].map(([text, tone]) => (
                <li key={text} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${tone === "ok" ? "bg-mint" : "bg-amber"}`}
                  >
                    {tone === "ok" ? "✓" : "!"}
                  </span>
                  <span>
                    <span className="sr-only">{tone === "ok" ? "Confirmed: " : "Issue: "}</span>
                    {text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl bg-blue-bg p-4">
              <p className={`${eyebrow} text-blue`}>Agent recommendation</p>
              <p className="mt-1 text-navy">
                Send a payment reminder with the invoice and approval evidence attached.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* 06 Why PayPal */}
      <section className={`${section} bg-canvas`} aria-labelledby="paypal-title">
        <div className={container}>
          <SectionNumber n="06" />
          <h2 id="paypal-title" className={`${h2} mt-3 max-w-3xl`}>
            Built around PayPal. Not just connected to it.
          </h2>
          <p className="mt-4 max-w-2xl text-lg">
            PayPal handles the payment. Paidright connects that payment to the agreement and work behind it.
          </p>
          <div className="mt-10 overflow-hidden rounded-xl border border-hairline bg-surface">
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline bg-muted-bg">
                  <th scope="col" className={`${eyebrow} w-1/2 px-4 py-3 text-ink-soft sm:px-6`}>
                    PayPal provides
                  </th>
                  <th scope="col" className={`${eyebrow} w-1/2 border-l border-hairline px-4 py-3 text-blue sm:px-6`}>
                    Paidright adds
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline align-top">
                {[
                  ["Invoice creation and sending", "Which approved milestone the invoice represents"],
                  ["Payment status and transaction records", "Whether the paid amount matches the agreed schedule"],
                  ["Invoice reminders", "A recommended, evidence-backed reason to follow up"],
                  ["International payment infrastructure", "A clear creator view of outstanding receivables"],
                ].map(([pp, pr]) => (
                  <tr key={pp}>
                    <td className="break-words px-4 py-4 text-sm sm:px-6 sm:text-base">{pp}</td>
                    <td className="break-words border-l border-hairline px-4 py-4 text-sm font-medium text-navy sm:px-6 sm:text-base">
                      {pr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-ink-soft">The demo uses PayPal Sandbox. No real money is transferred.</p>
        </div>
      </section>

      {/* 07 Watch */}
      <section id="watch" className={`${section} border-y border-hairline bg-surface`} aria-labelledby="watch-title">
        <div className={container}>
          <SectionNumber n="07" />
          <h2 id="watch-title" className={`${h2} mt-3 max-w-3xl`}>
            Three minutes. One real payment problem.
          </h2>
          <p className="mt-4 max-w-2xl text-lg">
            Watch Paidright turn a creator&apos;s agreement into a payment plan, verify a PayPal sandbox transaction,
            and investigate an overdue amount.
          </p>
          <div className="mx-auto mt-10 max-w-4xl">
            <HomeVideo />
          </div>
        </div>
      </section>

      {/* 08 Final CTA + footer */}
      <section className="on-dark bg-navy text-white" aria-labelledby="final-title">
        <div className={`${container} py-16 sm:py-24`}>
          <SectionNumber n="08" dark />
          <h2 id="final-title" className={`${h2} mt-3 max-w-3xl text-white`}>
            Creativity crosses borders. Payment clarity should too.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Paidright gives independent creators a clearer view of what they&apos;ve earned, what&apos;s been paid, and
            what needs attention.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={SITE.demoPath} className={btnPrimary}>
              Experience Paidright
            </Link>
            <External href={SITE.githubUrl} className={btnSecondaryDark}>
              Explore how we built it
            </External>
          </div>
        </div>
      </section>

      <footer className="on-dark border-t border-white/15 bg-navy">
        <div className={`${container} flex flex-col gap-4 py-8 text-sm text-white/70 md:flex-row md:items-center md:justify-between`}>
          <p>Built with PayPal&apos;s developer platform and AI. Fictional demo data; PayPal Sandbox only.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <External href={SITE.githubUrl} className="text-white underline-offset-4 hover:underline">
                GitHub
              </External>
            </li>
            <li>
              <Link href="/new" className="text-white underline-offset-4 hover:underline">
                Create a deal from your own contract
              </Link>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
