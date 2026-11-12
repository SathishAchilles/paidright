"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { moneyShort } from "@/lib/format";
import { computeGap } from "@/lib/gap";
import { getDeal, getToday, saveDeal, setToday } from "@/lib/store";
import type { Deal, Gap } from "@/lib/types";
import { ClocksPanel } from "./ClocksPanel";
import type { UpdateDeal } from "./dealOps";
import { DeliverablesTable } from "./DeliverablesTable";
import { FlagsPanel } from "./FlagsPanel";
import { ResolutionCard } from "./ResolutionCard";
import { inputClass } from "./ui";

export function DealWorkspace() {
  const id = useSearchParams().get("id");
  if (!id) return <NotFound message="No deal selected." />;
  return <Workspace key={id} id={id} />;
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-ink-soft">{message}</p>
      <Link href="/" className="mt-3 inline-block text-accent underline underline-offset-4">
        Start a new deal
      </Link>
    </div>
  );
}

function Workspace({ id }: { id: string }) {
  const [deal, setDeal] = useState<Deal | null>(() => getDeal(id));
  const [today, setTodayState] = useState(getToday);

  const update: UpdateDeal = useCallback((mutator) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const next = mutator(prev);
      saveDeal(next);
      return next;
    });
  }, []);

  if (!deal) return <NotFound message="This deal isn't saved in this browser." />;

  const gaps = deal.deliverables.map((d) => ({ d, gap: computeGap(d, today) }));
  const sum = (f: (g: Gap) => number) => gaps.reduce((s, { gap }) => s + f(gap), 0);
  const paid = sum((g) => g.paidMinor);
  const overdue = sum((g) => g.overdueMinor);
  const notYetDue = sum((g) => (g.gapClass === "NOT_DUE" ? g.totalMinor : g.dueMinor - g.overdueMinor));
  const rank = (g: Gap) => (g.gapClass === "OVERDUE" ? 0 : 1);
  const open = gaps
    .filter(({ gap }) => ["OVERDUE", "UNDERPAID", "UNPAID"].includes(gap.gapClass))
    .sort((a, b) => rank(a.gap) - rank(b.gap));
  const cur = deal.currency;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <Link href="/" className="text-sm text-ink-soft hover:text-ink">
            ← All deals
          </Link>
          <h1 className="mt-1 font-serif text-3xl">{deal.brand}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {deal.creator} · {deal.brandEmail || "no brand email"}
          </p>
          <p className="mt-2 text-base tabular-nums">
            <span className="font-semibold">{moneyShort(deal.totalMinor, cur)} deal</span>
            <span className="text-ink-soft"> · </span>
            <span className="text-ok">{moneyShort(paid, cur)} paid</span>
            <span className="text-ink-soft"> · </span>
            <span className={overdue > 0 ? "font-semibold text-danger" : "text-ink-soft"}>
              {moneyShort(overdue, cur)} overdue
            </span>
            <span className="text-ink-soft"> · {moneyShort(notYetDue, cur)} not yet due</span>
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-soft">Simulated date (for demo)</span>
          <input
            type="date"
            className={inputClass}
            value={today}
            onChange={(e) => {
              setToday(e.target.value || null);
              setTodayState(getToday());
            }}
          />
        </label>
      </header>

      <FlagsPanel flags={deal.flags} />

      <DeliverablesTable deal={deal} today={today} update={update} />

      {open.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-lg">What the brand still owes</h2>
          {open.map(({ d, gap }) => (
            <ResolutionCard key={d.id} deal={deal} deliverable={d} gap={gap} update={update} />
          ))}
        </section>
      )}

      <ClocksPanel deal={deal} today={today} update={update} />
    </div>
  );
}
