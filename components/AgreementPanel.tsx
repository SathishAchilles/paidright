"use client";

import Link from "next/link";
import type { Deal } from "@/lib/types";
import { ClocksPanel } from "./ClocksPanel";
import { brandShort, type UpdateDeal } from "./dealOps";
import { DeliverablesTable } from "./DeliverablesTable";
import { FlagsPanel } from "./FlagsPanel";

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24 font-display text-lg font-semibold text-navy">
      {children}
    </h3>
  );
}

export function AgreementPanel({ deal, today, update }: { deal: Deal; today: string; update: UpdateDeal }) {
  return (
    <section aria-labelledby="agreement-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="agreement-title" className="font-display text-2xl font-semibold text-navy">
            Here&apos;s what {brandShort(deal.brand)} agreed to pay.
          </h2>
          <p className="mt-1 text-ink-soft">We&apos;ve organised the agreement into deliverables and payment dates.</p>
        </div>
        <Link href="/new" className="text-sm font-medium text-accent underline underline-offset-4">
          Add new deal
        </Link>
      </div>

      <DeliverablesTable deal={deal} today={today} update={update} />

      {deal.contractText.trim() && (
        <details className="rounded-card border border-line bg-paper p-4">
          <summary className="cursor-pointer text-sm font-medium text-accent">Read the full agreement</summary>
          <pre className="mt-3 max-h-96 overflow-y-auto font-sans text-sm leading-relaxed whitespace-pre-wrap text-ink">
            {deal.contractText}
          </pre>
        </details>
      )}

      {deal.flags.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubHeading id="terms-to-clarify">Terms to clarify</SubHeading>
          <FlagsPanel flags={deal.flags} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <SubHeading id="rights">Rights &amp; revisions</SubHeading>
        <ClocksPanel deal={deal} today={today} update={update} />
      </div>
    </section>
  );
}
