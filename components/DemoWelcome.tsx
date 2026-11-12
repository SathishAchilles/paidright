"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadDemo } from "@/lib/demo";
import { buildDemoDeal } from "@/lib/demo-seed";
import { moneyShort } from "@/lib/format";
import { brandShort } from "./dealOps";

// The seed is an unverified snapshot (every invoice "SENT"), so the overdue
// figure is the story's, not computed here; PayPal confirms it in the workspace.
const STORY_OVERDUE = "$150 overdue";

export function DemoWelcome() {
  const router = useRouter();
  const [starting, setStarting] = useState<"guided" | "free" | null>(null);
  const [seed] = useState(buildDemoDeal);
  const creatorFirst = seed.creator.trim().split(/\s+/)[0];

  function start(mode: "guided" | "free") {
    setStarting(mode);
    const id = loadDemo();
    router.push(mode === "guided" ? `/deal?id=${id}&guide=1` : `/deal?id=${id}`);
  }

  const facts = [
    { label: "Creator", value: seed.creator, note: "Bengaluru, India" },
    { label: "Brand", value: brandShort(seed.brand), note: "US skincare brand" },
    { label: "Campaign", value: moneyShort(seed.totalMinor, seed.currency), note: `${seed.deliverables.length} deliverables` },
    { label: "Status", value: STORY_OVERDUE, note: "Work approved, payment late", alert: true },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-6 sm:py-10">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-blue uppercase">PaidRight live demo</p>
        <h1 className="mt-3 font-display text-3xl leading-tight font-semibold text-navy sm:text-4xl">
          {creatorFirst} completed the work. Her brand hasn&apos;t fully paid.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink">
          Follow one international creator deal and see how PaidRight finds the missing payment.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map((f) => (
          <div
            key={f.label}
            className={`min-w-0 rounded-card border p-4 ${f.alert ? "border-amber/50 bg-amber-bg" : "border-line bg-paper"}`}
          >
            <dt className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{f.label}</dt>
            <dd className={`mt-1 text-lg font-semibold tabular-nums ${f.alert ? "text-amber-ink" : "text-navy"}`}>
              {f.value}
            </dd>
            <dd className="text-xs text-ink-soft">{f.note}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => start("guided")}
          disabled={starting !== null}
          className="inline-flex items-center justify-center rounded-[10px] bg-blue px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-60"
        >
          {starting === "guided" ? "Loading demo…" : "Find the missing payment"}
        </button>
        <button
          type="button"
          onClick={() => start("free")}
          disabled={starting !== null}
          className="inline-flex items-center justify-center rounded-[10px] border border-line bg-paper px-5 py-3 text-base font-medium text-navy transition-colors hover:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-60"
        >
          {starting === "free" ? "Loading demo…" : "Explore all features"}
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4 text-sm text-ink-soft">
        <p>Fictional campaign · PayPal Sandbox · No real money.</p>
        <p>
          <Link href="/new" className="font-medium text-blue underline underline-offset-4">
            Create a deal from your own contract
          </Link>
        </p>
      </div>
    </div>
  );
}
