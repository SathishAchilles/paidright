"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadDemo } from "@/lib/demo";

const previews = [
  { label: "Agreement", text: "Review a $1,200 campaign" },
  { label: "Payment", text: "Inspect PayPal invoice payments" },
  { label: "AI resolution", text: "Watch the agent investigate $150 overdue" },
];

export function DemoWelcome() {
  const router = useRouter();
  const [starting, setStarting] = useState<"guided" | "free" | null>(null);

  function start(mode: "guided" | "free") {
    setStarting(mode);
    const id = loadDemo();
    router.push(mode === "guided" ? `/deal?id=${id}&guide=1` : `/deal?id=${id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-6 sm:py-10">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-[#305CE8]">WELCOME TO PAIDRIGHT</p>
        <h1 className="mt-3 text-3xl leading-tight font-semibold text-[#101B2B] sm:text-4xl">
          See how Paidright handles a missing international payment.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[#1B2839]/80">
          Follow Aanya, an Indian creator working with a US brand. You&apos;ll see how Paidright connects an agreement,
          completed work, and PayPal payments to find an overdue amount.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {previews.map((p, i) => (
          <li key={p.label} className="rounded-lg border border-[#DCE2E9] bg-[#F7F8F5] p-4">
            <p className="text-xs font-semibold tracking-wide text-[#1B2839]/60 uppercase">
              {i + 1} · {p.label}
            </p>
            <p className="mt-2 text-sm font-medium text-[#1B2839]">{p.text}</p>
          </li>
        ))}
      </ol>

      <p className="rounded-md border border-[#C57630]/30 bg-[#C57630]/10 px-4 py-3 text-sm text-[#1B2839]">
        This campaign and its participants are fictional. Verified PayPal transactions in this demo run in Sandbox. No
        real money moves.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => start("guided")}
          disabled={starting !== null}
          className="inline-flex items-center justify-center rounded-md bg-[#305CE8] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244bc4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#305CE8] disabled:opacity-60"
        >
          {starting === "guided" ? "Loading demo…" : "Start guided demo"}
        </button>
        <button
          type="button"
          onClick={() => start("free")}
          disabled={starting !== null}
          className="inline-flex items-center justify-center rounded-md border border-[#DCE2E9] bg-white px-5 py-2.5 text-sm font-medium text-[#101B2B] transition-colors hover:border-[#101B2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#305CE8] disabled:opacity-60"
        >
          {starting === "free" ? "Loading demo…" : "Explore the application freely"}
        </button>
      </div>

      <p className="text-sm text-[#1B2839]/70">
        Want to start from your own contract?{" "}
        <Link href="/new" className="font-medium text-[#305CE8] underline underline-offset-4">
          Create a new deal
        </Link>
      </p>
    </div>
  );
}
