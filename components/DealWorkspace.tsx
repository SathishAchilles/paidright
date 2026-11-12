"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isDemoDeal } from "@/lib/demo";
import { computeGap } from "@/lib/gap";
import { getDeal, getToday, saveDeal, setToday } from "@/lib/store";
import type { Deal, Gap } from "@/lib/types";
import { ClocksPanel } from "./ClocksPanel";
import type { UpdateDeal } from "./dealOps";
import { DeliverablesTable, usePayPalCheck } from "./DeliverablesTable";
import { DemoBanner, GuideSteps } from "./DemoBanner";
import { FlagsPanel } from "./FlagsPanel";
import { Overview } from "./Overview";
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
      <Link href="/new" className="mt-3 inline-block text-accent underline underline-offset-4">
        Start a new deal
      </Link>
    </div>
  );
}

function Workspace({ id }: { id: string }) {
  const [deal, setDeal] = useState<Deal | null>(() => getDeal(id));
  const [today, setTodayState] = useState(getToday);
  const demo = isDemoDeal(id);

  const update: UpdateDeal = useCallback((mutator) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const next = mutator(prev);
      saveDeal(next);
      return next;
    });
  }, []);

  const paypal = usePayPalCheck(update);
  const { check } = paypal;

  // Demo deals pull live statuses from PayPal once on first mount. The ref
  // survives StrictMode's simulated unmount/remount, so this runs once.
  const autoChecked = useRef(false);
  useEffect(() => {
    if (!demo || autoChecked.current) return;
    autoChecked.current = true;
    const initial = getDeal(id);
    if (initial) void check(initial);
  }, [demo, id, check]);

  const onReset = () => {
    const fresh = getDeal(id);
    setDeal(fresh);
    setTodayState(getToday());
    if (fresh) void check(fresh);
  };

  if (!deal) return <NotFound message="This deal isn't saved in this browser." />;

  const gaps = deal.deliverables.map((d) => ({ d, gap: computeGap(d, today) }));
  const rank = (g: Gap) => (g.gapClass === "OVERDUE" ? 0 : 1);
  const open = gaps
    .filter(({ gap }) => ["OVERDUE", "UNDERPAID", "UNPAID"].includes(gap.gapClass))
    .sort((a, b) => rank(a.gap) - rank(b.gap));

  return (
    <div className="flex flex-col gap-6">
      {demo && <DemoBanner onReset={onReset} />}
      <GuideSteps />

      <div>
        <Link href="/new" className="text-sm text-ink-soft hover:text-ink">
          ← All deals
        </Link>
        <div className="mt-2">
          <Overview deal={deal} today={today} checking={paypal.loading} />
        </div>
      </div>

      <label className="flex w-fit flex-col gap-1 text-sm">
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

      <FlagsPanel flags={deal.flags} />

      <div id="milestones" className="scroll-mt-6 rounded-lg focus:outline-none">
        <DeliverablesTable deal={deal} today={today} update={update} paypal={paypal} />
      </div>

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
