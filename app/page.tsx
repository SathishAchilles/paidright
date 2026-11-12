import Link from "next/link";
import { HomeVideo } from "@/components/HomeVideo";
import { SITE } from "@/lib/site";

const container = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";
const section = "py-16 sm:py-24";
const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em]";
const h2 = "text-3xl font-semibold leading-tight sm:text-4xl";
const card = "rounded-xl border border-hairline bg-surface";
const btnPrimary =
  "inline-flex h-12 items-center justify-center rounded-[10px] bg-blue px-6 text-base font-semibold text-white hover:bg-blue-strong";
const btnSecondaryDark =
  "inline-flex h-12 items-center justify-center rounded-[10px] border border-white/30 px-6 text-base font-semibold text-white hover:border-white";

type Tone = "paid" | "overdue" | "pending" | "approved";

const TONE: Record<Tone, { pill: string; dot: string; label: string }> = {
  paid: { pill: "bg-mint-bg text-mint", dot: "bg-mint", label: "Paid" },
  overdue: { pill: "bg-amber-bg text-amber-ink", dot: "bg-amber", label: "Overdue" },
  pending: { pill: "bg-muted-bg text-ink-soft", dot: "bg-ink-soft", label: "Awaiting approval" },
  approved: { pill: "bg-blue-bg text-blue", dot: "bg-blue", label: "Approved" },
};

function External({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function SectionNumber({ n }: { n: string }) {
  return <p className={`${eyebrow} tabular text-ink-soft`}>{n}</p>;
}

function Pill({ tone, children }: { tone: Tone; children?: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[tone].pill}`}>
      {children ?? TONE[tone].label}
    </span>
  );
}

/* Hero product preview: the creator's money position for the canonical deal. */
function HeroSummaryCard() {
  const rows = [
    { label: "Approved work", amount: "$800", note: "Reel + Three Stories", tone: "text-navy" },
    { label: "Paid", amount: "$650", note: "Verified in PayPal Sandbox", tone: "text-mint" },
    { label: "Still owed", amount: "$150", note: "Stories instalment 2, overdue", tone: "text-amber-ink" },
  ];
  return (
    <figure
      aria-label="Example: GlowLab and Aanya payment summary"
      className="w-full min-w-0 rounded-2xl border border-hairline bg-surface p-5 text-ink shadow-[0_24px_48px_-24px_rgba(0,0,0,0.5)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-navy">GlowLab × Aanya</p>
          <p className="tabular text-sm text-ink-soft">$1,200 campaign</p>
        </div>
        <Pill tone="overdue">$150 overdue</Pill>
      </div>

      <dl className="mt-5 divide-y divide-hairline rounded-xl border border-hairline">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="min-w-0">
              <span className="block text-sm font-semibold text-navy">{r.label}</span>
              <span className="block text-xs text-ink-soft">{r.note}</span>
            </dt>
            <dd className={`tabular font-display text-2xl font-semibold ${r.tone}`}>{r.amount}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 flex items-baseline justify-between gap-3 px-1 text-sm text-ink-soft">
        <span>
          Not yet billable <span className="text-xs">(video edits awaiting approval)</span>
        </span>
        <span className="tabular font-semibold">$400</span>
      </p>

      <div className="mt-4 rounded-xl bg-blue-bg p-4">
        <p className={`${eyebrow} text-blue`}>Agent finding</p>
        <p className="mt-1 text-sm text-navy">GlowLab approved the Stories. The second $150 instalment is past due.</p>
      </div>
    </figure>
  );
}

function Hero() {
  return (
    <section className="on-dark bg-navy text-white" aria-labelledby="hero-title">
      {/*
        Mobile order: headline, CTAs + trust line, summary card, then body copy.
        From lg up, every item is placed explicitly in a two-column grid.
      */}
      <div
        className={`${container} grid gap-8 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:grid-rows-[auto_auto_1fr] lg:gap-x-12 lg:gap-y-6`}
      >
        <div className="order-1 lg:col-start-1 lg:row-start-1">
          <p className={`${eyebrow} text-white/70`}>AI payment agent for global creator deals</p>
          <h1 id="hero-title" className="mt-4 text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
            You delivered the work. Did you get paid in full?
          </h1>
        </div>

        <p className="order-4 max-w-xl text-lg text-white/80 lg:col-start-1 lg:row-start-2">
          PaidRight checks your agreement, approved work, and PayPal payments to find money you&apos;re still owed —
          and helps you follow up.
        </p>

        <div className="order-2 lg:col-start-1 lg:row-start-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={SITE.demoPath} className={btnPrimary}>
              Find the missing $150
            </Link>
            <a href="#watch" className={btnSecondaryDark}>
              Watch 3-minute demo
            </a>
          </div>
          <p className="mt-4 text-sm text-white/70">See a PayPal Sandbox workflow. No real money is involved.</p>
        </div>

        <div className="order-3 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-center">
          <HeroSummaryCard />
        </div>
      </div>
    </section>
  );
}

/* 01 ─ Three sources, one timeline. */
function ThreePlaces() {
  const steps = [
    {
      source: "Contract",
      title: "What you should earn",
      lines: [
        ["Reel", "$500"],
        ["Three Stories (2 × $150)", "$300"],
        ["Video edits", "$400"],
      ],
      total: ["Agreed", "$1,200"],
    },
    {
      source: "Brand approval",
      title: "What you delivered",
      lines: [
        ["Reel", "Approved"],
        ["Three Stories", "Approved"],
        ["Video edits", "Awaiting approval"],
      ],
      total: ["Approved work", "$800"],
    },
    {
      source: "PayPal invoices",
      title: "What was paid",
      lines: [
        ["Reel", "Paid $500"],
        ["Stories instalment 1", "Paid $150"],
        ["Stories instalment 2", "Overdue $150"],
      ],
      total: ["Verified paid", "$650"],
    },
  ];
  return (
    <section className={`${section} bg-canvas`} aria-labelledby="three-title">
      <div className={container}>
        <SectionNumber n="01" />
        <h2 id="three-title" className={`${h2} mt-3 max-w-3xl`}>
          One brand deal. Three places to check.
        </h2>
        <p className="mt-4 max-w-2xl text-lg">
          Your contract says what you should earn. Your brand confirms what you delivered. PayPal shows what was paid.
          PaidRight connects all three.
        </p>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.source} className={`${card} flex flex-col p-5`}>
              <p className={`${eyebrow} tabular text-blue`}>
                {String(i + 1).padStart(2, "0")} · {s.source}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                {s.lines.map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span className="min-w-0 text-ink-soft">{k}</span>
                    <span className="tabular shrink-0 text-right font-medium text-navy">{v}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex justify-between gap-3 border-t border-hairline pt-3 text-sm font-semibold text-navy">
                <span>{s.total[0]}</span>
                <span className="tabular">{s.total[1]}</span>
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-hairline border-l-4 border-l-amber bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-lg font-semibold text-navy">
            PaidRight: <span className="tabular">$800</span> approved − <span className="tabular">$650</span> paid ={" "}
            <span className="tabular text-amber-ink">$150 still owed</span>
          </p>
          <p className="text-sm text-ink-soft">
            The <span className="tabular">$400</span> for edits is not yet billable.
          </p>
        </div>
      </div>
    </section>
  );
}

/* 02 ─ Three panels that mirror the product UI. */
function HowItWorks() {
  return (
    <section id="how" className={`${section} border-y border-hairline bg-surface`} aria-labelledby="how-title">
      <div className={container}>
        <SectionNumber n="02" />
        <h2 id="how-title" className={`${h2} mt-3 max-w-3xl`}>
          From completed work to payment clarity.
        </h2>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Understand the deal */}
          <article className="flex flex-col">
            <h3 className="text-xl font-semibold">Understand the deal</h3>
            <p className="mt-1 text-ink-soft">AI reads the agreement into terms you confirm.</p>
            <div className={`${card} mt-4 flex-1 bg-canvas p-4`} role="group" aria-label="Example: agreement terms">
              <p className={`${eyebrow} text-ink-soft`}>Read from agreement</p>
              <ul className="mt-3 divide-y divide-hairline text-sm">
                {[
                  ["Reel", "$500", "On approval"],
                  ["Three Stories", "$300", "2 × $150 instalments"],
                  ["Video edits", "$400", "On approval"],
                  ["Usage rights extension", "$200", "Per extra 30 days"],
                ].map(([item, amt, note]) => (
                  <li key={item} className="flex items-start justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block font-medium text-navy">{item}</span>
                      <span className="block text-xs text-ink-soft">{note}</span>
                    </span>
                    <span className="tabular shrink-0 font-semibold text-navy">{amt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          {/* Check the money */}
          <article className="flex flex-col">
            <h3 className="text-xl font-semibold">Check the money</h3>
            <p className="mt-1 text-ink-soft">PayPal confirms what each invoice shows.</p>
            <div className={`${card} mt-4 flex-1 bg-canvas p-4`} role="group" aria-label="Example: PayPal invoice statuses">
              <p className={`${eyebrow} text-ink-soft`}>PayPal Sandbox invoices</p>
              <ul className="mt-3 divide-y divide-hairline text-sm">
                {(
                  [
                    ["Reel", "$500", "paid"],
                    ["Stories · instalment 1", "$150", "paid"],
                    ["Stories · instalment 2", "$150", "overdue"],
                  ] as const
                ).map(([item, amt, tone]) => (
                  <li key={item} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block font-medium text-navy">{item}</span>
                      <span className="tabular block text-xs text-ink-soft">{amt} USD</span>
                    </span>
                    <Pill tone={tone} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-soft">Status read from PayPal on request.</p>
            </div>
          </article>

          {/* Fix the gap */}
          <article className="flex flex-col">
            <h3 className="text-xl font-semibold">Fix the gap</h3>
            <p className="mt-1 text-ink-soft">You review and approve every reminder.</p>
            <div
              className={`${card} mt-4 flex flex-1 flex-col border-l-4 border-l-amber bg-canvas p-4`}
              role="group"
              aria-label="Example: agent finding"
            >
              <p className={`${eyebrow} text-amber-ink`}>Finding</p>
              <p className="tabular mt-1 font-display text-2xl font-semibold text-navy">$150 overdue</p>
              <p className="text-sm text-ink-soft">Stories, instalment 2</p>
              <p className="mt-3 flex-1 text-sm">
                GlowLab approved the Stories. PayPal shows this invoice unpaid past its due date.
              </p>
              <Link
                href={SITE.demoPath}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-[10px] bg-blue px-4 text-sm font-semibold text-white hover:bg-blue-strong"
              >
                Review reminder
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* 03 ─ The investigation, in amount → status → reason → action order. */
function Investigation() {
  const rows: { label: string; amount: string; tone: Tone; reason: string }[] = [
    { label: "Three Stories", amount: "$300", tone: "approved", reason: "GlowLab approved all three Stories." },
    { label: "Instalment 1", amount: "$150", tone: "paid", reason: "Separate PayPal invoice, verified paid." },
    { label: "Instalment 2", amount: "$150", tone: "overdue", reason: "Separate PayPal invoice, unpaid past due." },
  ];
  return (
    <section className={`${section} bg-canvas`} aria-labelledby="why-title">
      <div className={`${container} grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center`}>
        <div>
          <SectionNumber n="03" />
          <h2 id="why-title" className={`${h2} mt-3`}>
            The invoice says unpaid. PaidRight explains why.
          </h2>
          <p className="mt-4 text-lg">
            The work was approved. Half the Stories fee arrived. The second instalment did not.
          </p>
          <Link href={SITE.demoPath} className={`${btnPrimary} mt-8`}>
            Try this investigation
          </Link>
        </div>

        <article
          aria-label="Example investigation"
          className="min-w-0 rounded-2xl border border-hairline bg-surface p-5 shadow-[0_16px_40px_-28px_rgba(16,27,43,0.45)] sm:p-6"
        >
          <p className={`${eyebrow} text-amber-ink`}>Investigation</p>
          <p className="tabular mt-2 font-display text-3xl font-semibold text-navy">$150 still owed</p>
          <p className="text-ink-soft">Three Stories, second instalment</p>

          <ol className="mt-6 space-y-3">
            {rows.map((r) => (
              <li key={r.label} className="rounded-xl border border-hairline p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-navy">
                    <span className="tabular font-display text-lg font-semibold">{r.amount}</span>{" "}
                    <span className="text-ink-soft">· {r.label}</span>
                  </p>
                  <Pill tone={r.tone} />
                </div>
                <p className="mt-1 text-sm text-ink-soft">{r.reason}</p>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-xl bg-blue-bg p-4">
            <p className={`${eyebrow} text-blue`}>Recommended action</p>
            <p className="mt-1 text-navy">Send a PayPal reminder for instalment 2. You approve it first.</p>
          </div>
        </article>
      </div>
    </section>
  );
}

/* 04 ─ Division of labour between PayPal and PaidRight. */
function PayPalAndAi() {
  const cols = [
    {
      title: "PayPal",
      tone: "text-ink-soft",
      items: ["Invoice creation and sending", "Payment status", "Reminders"],
    },
    {
      title: "PaidRight",
      tone: "text-blue",
      items: ["Contract interpretation", "Milestone matching", "Evidence-backed recommendations"],
    },
  ];
  return (
    <section className={`${section} border-y border-hairline bg-surface`} aria-labelledby="paypal-title">
      <div className={container}>
        <SectionNumber n="04" />
        <h2 id="paypal-title" className={`${h2} mt-3 max-w-3xl`}>
          PayPal confirms the payment. AI understands what it was for.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {cols.map((c) => (
            <div key={c.title} className={`${card} bg-canvas p-6`}>
              <h3 className={`${eyebrow} font-sans ${c.tone}`}>{c.title}</h3>
              <ul className="mt-4 space-y-3">
                {c.items.map((it) => (
                  <li key={it} className="flex items-start gap-3 text-lg font-medium text-navy">
                    <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          Money arithmetic runs in code, not in the model. The demo uses PayPal Sandbox; no real money moves.
        </p>
      </div>
    </section>
  );
}

/* 05 ─ Video, source and technology. */
function WatchAndTest() {
  return (
    <section id="watch" className={`${section} bg-canvas`} aria-labelledby="watch-title">
      <div className={container}>
        <SectionNumber n="05" />
        <h2 id="watch-title" className={`${h2} mt-3 max-w-3xl`}>
          See the whole product. Test the real build.
        </h2>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <HomeVideo />
          <ul className="grid gap-4">
            <li>
              <External href={SITE.githubUrl} className={`${card} block p-5 hover:border-navy`}>
                <span className="block font-display text-lg font-semibold text-navy">GitHub repository</span>
                <span className="mt-1 block text-sm text-ink-soft">Source code, README and setup steps.</span>
              </External>
            </li>
            <li>
              <Link href={SITE.technologyPath} className={`${card} block p-5 hover:border-navy`}>
                <span className="block font-display text-lg font-semibold text-navy">Technology</span>
                <span className="mt-1 block text-sm text-ink-soft">
                  PayPal API calls, money rules, and known limitations.
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="on-dark bg-navy text-white" aria-labelledby="final-title">
      <div className={`${container} flex flex-col gap-6 py-16 sm:py-20 md:flex-row md:items-center md:justify-between`}>
        <h2 id="final-title" className={`${h2} text-white`}>
          Stop guessing what&apos;s owed.
        </h2>
        <Link href={SITE.demoPath} className={btnPrimary}>
          Try live demo
        </Link>
      </div>
      <div className="border-t border-white/15">
        <div className={`${container} flex flex-col gap-4 py-8 text-sm text-white/70 md:flex-row md:items-center md:justify-between`}>
          <p>GlowLab and Aanya are fictional. PayPal Sandbox only.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href={SITE.technologyPath} className="text-white underline-offset-4 hover:underline">
                Technology
              </Link>
            </li>
            <li>
              <External href={SITE.githubUrl} className="text-white underline-offset-4 hover:underline">
                GitHub
              </External>
            </li>
            <li>
              <Link href="/new" className="text-white underline-offset-4 hover:underline">
                Add your own deal
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div data-full-bleed className="flex flex-col">
      <Hero />
      <ThreePlaces />
      <HowItWorks />
      <Investigation />
      <PayPalAndAi />
      <WatchAndTest />
      <FinalCta />
    </div>
  );
}
