"use client";

import Link from "next/link";
import { useState } from "react";
import { resetDemo } from "@/lib/demo";
import type { TabId } from "./WorkspaceTabs";

// Persistent demo strip: what is real (PayPal Sandbox), what is staged (demo
// campaign), how to start over and how to leave. `children` holds the
// simulated-date control so it sits with the other demo-only settings.
export function DemoBanner({ onReset, children }: { onReset?: () => void; children?: React.ReactNode }) {
  const [restored, setRestored] = useState(false);

  function reset() {
    resetDemo();
    onReset?.();
    setRestored(true);
  }

  return (
    <div className="rounded-card border border-line bg-canvas px-3 py-2 text-sm text-ink sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">{children}</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-bg px-2.5 py-0.5 text-xs font-semibold text-blue-strong">PayPal Sandbox</span>
          <span className="rounded-full bg-amber-bg px-2.5 py-0.5 text-xs font-semibold text-amber-ink">Demo campaign</span>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-line bg-paper px-3 py-1 text-sm font-medium text-navy hover:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            Reset demo
          </button>
          <Link href="/" className="px-1 text-sm font-medium text-blue underline underline-offset-4">
            Back to website
          </Link>
        </div>
      </div>
      <p role="status" aria-live="polite" className={restored ? "mt-2 text-sm text-mint" : "sr-only"}>
        {restored ? "Demo restored. Previous PayPal Sandbox actions remain recorded." : ""}
      </p>
    </div>
  );
}

const STEPS = ["The deal", "The payment", "AI finding", "Take action"] as const;

// 0 = not started (Overview), 1-4 = the four guided steps.
export function guideStep(tab: TabId, acting: boolean): number {
  if (tab === "deals") return 1;
  if (tab === "payments") return 2;
  if (tab === "agent") return acting ? 4 : 3;
  return 0;
}

const NEXT: Record<number, string> = {
  0: "Start: see the deal",
  1: "Next: check the payment",
  2: "Next: see the AI finding",
  3: "Next: take action",
  4: "Finish tour",
};

const HINT: Record<number, string> = {
  0: "Follow one deal from agreement to payment in four steps.",
  1: "This is what the brand agreed to pay, with the contract as evidence.",
  2: "PayPal is the source of truth for what was actually paid.",
  3: "The agent links the agreement, the approval and PayPal to explain the gap.",
  4: "Review the reminder and approve it. It is sent through PayPal Sandbox only after you approve.",
};

export function GuideProgress({ step, onNext, onSkip }: { step: number; onNext: () => void; onSkip: () => void }) {
  return (
    <section
      aria-label="Guided demo"
      className="rounded-card border border-blue/30 bg-blue-bg px-3 py-3 text-sm text-ink sm:px-4"
    >
      <ol className="grid grid-cols-4 gap-1.5">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const current = n === step;
          const done = n < step;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className="flex min-w-0 flex-col gap-1">
              <span className={`h-1.5 rounded-full ${done || current ? "bg-blue" : "bg-blue/20"}`} aria-hidden="true" />
              <span
                className={`text-[11px] leading-tight sm:text-xs ${current ? "font-semibold text-navy" : done ? "text-ink" : "text-ink-soft"}`}
              >
                {n} {label}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 flex-1 basis-60">{HINT[step]}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onNext}
            className="rounded-[10px] border border-blue bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            {NEXT[step]}
          </button>
          <button type="button" onClick={onSkip} className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
            Skip tour / Explore freely
          </button>
        </div>
      </div>
    </section>
  );
}
