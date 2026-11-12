"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { resetDemo } from "@/lib/demo";

export function DemoBanner({ onReset }: { onReset?: () => void }) {
  const [restored, setRestored] = useState(false);

  function reset() {
    resetDemo();
    onReset?.();
    setRestored(true);
  }

  return (
    <div className="rounded-lg border border-[#DCE2E9] bg-[#F7F8F5] px-4 py-2.5 text-sm text-[#1B2839]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded-full bg-[#C57630]/15 px-2 py-0.5 text-xs font-semibold tracking-wide text-[#8a4f1c] uppercase">
          PayPal Sandbox
        </span>
        <p className="min-w-0 flex-1">
          <span className="font-semibold text-[#101B2B]">Demo campaign</span>
          <span className="text-[#1B2839]/70"> · Fictional campaign. Real PayPal Sandbox actions only where indicated.</span>
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-[#DCE2E9] bg-white px-3 py-1 text-sm font-medium text-[#101B2B] hover:border-[#101B2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#305CE8]"
          >
            Reset demo
          </button>
          <Link href="/" className="text-sm text-[#305CE8] underline underline-offset-4">
            Back to website
          </Link>
        </div>
      </div>
      <p role="status" aria-live="polite" className={restored ? "mt-2 text-sm text-[#188B77]" : "sr-only"}>
        {restored ? "Your demo view has been restored. Previous PayPal Sandbox actions remain recorded." : ""}
      </p>
    </div>
  );
}

const steps = [
  { title: "Overview", text: "see what's paid and what's overdue" },
  { title: "Check status with PayPal", text: "invoice states come live from the Sandbox" },
  { title: "Review unpaid amount", text: "the agent shows its evidence" },
  { title: "Approve and send reminder", text: "a real PayPal reminder, only after you approve" },
];

export function GuideSteps() {
  const guided = useSearchParams().get("guide") === "1";
  const [dismissed, setDismissed] = useState(false);
  if (!guided || dismissed) return null;

  return (
    <section
      aria-labelledby="demo-guide-title"
      className="rounded-lg border border-[#305CE8]/30 bg-[#305CE8]/5 px-4 py-3 text-sm text-[#1B2839]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="demo-guide-title" className="font-semibold text-[#101B2B]">
          Guided demo
        </h2>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss guide"
          className="-mt-0.5 rounded px-1.5 text-lg leading-none text-[#1B2839]/60 hover:text-[#101B2B] focus-visible:outline-2 focus-visible:outline-[#305CE8]"
        >
          ×
        </button>
      </div>
      <ol className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-2">
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#305CE8] text-xs font-semibold text-white"
            >
              {i + 1}
            </span>
            <span>
              <span className="font-medium text-[#101B2B]">{s.title}:</span> {s.text}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
