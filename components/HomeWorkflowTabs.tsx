"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

const STEPS = [
  {
    title: "Understand the deal",
    body: "Upload the agreement. Paidright finds the deliverables, amounts, and deadlines. You confirm the details.",
  },
  {
    title: "Track the work",
    body: "Submit completed work and keep the brand's approval attached to the right milestone.",
  },
  {
    title: "Verify payments",
    body: "Create invoices using PayPal and track the payment status against what was agreed.",
  },
  {
    title: "Resolve what's missing",
    body: "When a payment is overdue, Paidright explains why and prepares the next step for your approval.",
  },
];

const num = (i: number) => String(i + 1).padStart(2, "0");

export function HomeWorkflowTabs() {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const last = STEPS.length - 1;

  function select(i: number, focus = false) {
    setActive(i);
    if (focus) tabRefs.current[i]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const keys: Record<string, number> = {
      ArrowRight: (active + 1) % STEPS.length,
      ArrowDown: (active + 1) % STEPS.length,
      ArrowLeft: (active - 1 + STEPS.length) % STEPS.length,
      ArrowUp: (active - 1 + STEPS.length) % STEPS.length,
      Home: 0,
      End: last,
    };
    if (e.key in keys) {
      e.preventDefault();
      select(keys[e.key], true);
    }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface">
      <div
        role="tablist"
        aria-label="How Paidright works"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-t-2xl border-b border-hairline bg-hairline sm:grid-cols-4"
      >
        {STEPS.map((step, i) => {
          const selected = i === active;
          return (
            <button
              key={step.title}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`${baseId}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${i}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={onKeyDown}
              className={`flex min-h-16 flex-col items-start gap-1 px-4 py-3 text-left focus-visible:-outline-offset-2 ${
                selected ? "bg-surface text-navy shadow-[inset_0_-2px_0_var(--blue)]" : "bg-canvas text-ink-soft hover:text-navy"
              }`}
            >
              <span className={`tabular text-xs font-semibold ${selected ? "text-blue" : ""}`}>{num(i)}</span>
              <span className="text-sm font-semibold leading-snug">{step.title}</span>
            </button>
          );
        })}
      </div>

      {STEPS.map((step, i) => (
        <div
          key={step.title}
          id={`${baseId}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${i}`}
          hidden={i !== active}
          tabIndex={0}
          className="p-6 sm:p-8"
        >
          <p className="tabular text-sm font-semibold text-blue">Step {num(i)} of {num(last)}</p>
          <h3 className="mt-2 text-2xl font-semibold">{step.title}</h3>
          <p className="mt-3 max-w-2xl text-lg text-ink">{step.body}</p>
        </div>
      ))}

      <div className="flex items-center justify-between gap-4 border-t border-hairline px-6 py-4 sm:px-8">
        <button
          type="button"
          onClick={() => active > 0 && select(active - 1)}
          aria-disabled={active === 0}
          className="inline-flex h-10 items-center rounded-[10px] border border-hairline px-4 text-sm font-semibold text-navy hover:border-navy aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:border-hairline"
        >
          <span aria-hidden="true">←&nbsp;</span>Previous
        </button>
        <p className="tabular text-sm text-ink-soft" aria-live="polite">
          {num(active)} / {num(last)}
        </p>
        <button
          type="button"
          onClick={() => active < last && select(active + 1)}
          aria-disabled={active === last}
          className="inline-flex h-10 items-center rounded-[10px] border border-hairline px-4 text-sm font-semibold text-navy hover:border-navy aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:border-hairline"
        >
          Next<span aria-hidden="true">&nbsp;→</span>
        </button>
      </div>
    </div>
  );
}
