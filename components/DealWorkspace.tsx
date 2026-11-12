"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { computeClocks } from "@/lib/clocks";
import { isDemoDeal, resetDemo } from "@/lib/demo";
import { moneyShort } from "@/lib/format";
import { computeGap } from "@/lib/gap";
import { getDeal, getToday, saveDeal, setToday } from "@/lib/store";
import type { Deal, Gap, GapClass } from "@/lib/types";
import { AgreementPanel } from "./AgreementPanel";
import { dealTitle, PAYPAL_COPY, wasChecked, type UpdateDeal } from "./dealOps";
import { usePayPalCheck } from "./DeliverablesTable";
import { DemoBanner, GuideProgress, guideStep } from "./DemoBanner";
import { hasUnverifiedInvoices, Overview, verifiedOverdueItems } from "./Overview";
import { PaymentsPanel } from "./PaymentsPanel";
import { ResolutionCard } from "./ResolutionCard";
import { inputClass } from "./ui";
import { panelId, tabId, TABS, useWorkspaceTab, WorkspaceTabs, type TabId } from "./WorkspaceTabs";

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

const OPEN_CLASSES: GapClass[] = ["OVERDUE", "UNDERPAID", "UNPAID"];

function scrollToTabs() {
  document.getElementById("workspace-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Workspace({ id }: { id: string }) {
  const [deal, setDeal] = useState<Deal | null>(() => getDeal(id));
  const [today, setTodayState] = useState(getToday);
  const [tab, setTab] = useWorkspaceTab();
  const [acting, setActing] = useState(false);
  // Panels mount on first visit, then stay mounted (hidden) so card state and
  // one-off reveal animations survive tab switches.
  const [visited, setVisited] = useState<ReadonlySet<TabId>>(() => new Set([tab]));
  const guided = useSearchParams().get("guide") === "1";
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
  const [firstCheckDone, setFirstCheckDone] = useState(!demo);
  useEffect(() => {
    if (!demo || autoChecked.current) return;
    autoChecked.current = true;
    const initial = getDeal(id);
    if (!initial) return;
    void check(initial).finally(() => setFirstCheckDone(true));
  }, [demo, id, check]);

  // Cross-tab jumps (e.g. AI Agent -> "rights & revisions") scroll once the
  // target panel is visible, which is only after the URL change re-renders.
  const pendingScroll = useRef<string | null>(null);
  useEffect(() => {
    const target = pendingScroll.current;
    if (!target) return;
    pendingScroll.current = null;
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tab]);

  const onReset = () => {
    const fresh = getDeal(id);
    setDeal(fresh);
    setTodayState(getToday());
    if (fresh) void check(fresh).finally(() => setFirstCheckDone(true));
  };

  if (!deal) {
    if (!demo) return <NotFound message="This deal isn't saved in this browser." />;
    return (
      <div className="py-16 text-center">
        <p className="text-ink-soft">The demo campaign isn&apos;t loaded in this browser yet.</p>
        <button
          type="button"
          onClick={() => {
            resetDemo();
            onReset();
          }}
          className="mt-4 rounded-[10px] bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          Open the demo campaign
        </button>
      </div>
    );
  }

  const selectTab = (next: TabId, scroll = false) => {
    setActing(false);
    setVisited((v) => (v.has(next) ? v : new Set(v).add(next)));
    setTab(next);
    if (scroll) scrollToTabs();
  };

  const gaps = deal.deliverables.map((d) => ({ d, gap: computeGap(d, today) }));
  const rank = (g: Gap) => (g.gapClass === "OVERDUE" ? 0 : 1);
  const open = gaps
    .filter(({ gap }) => OPEN_CLASSES.includes(gap.gapClass))
    .sort((a, b) => rank(a.gap) - rank(b.gap));
  // Only findings PayPal has confirmed reach the agent; seeded snapshots wait for a check.
  const verifiedOpen = open.filter(({ d }) => d.instalments.every((i) => !i.invoice || wasChecked(i.invoice.lastRefreshedAt)));
  const awaitingCheck = open.length - verifiedOpen.length;
  const unverified = hasUnverifiedInvoices(deal);
  // A demo deal's first PayPal check starts right after mount; treat the
  // never-checked seed as "checking" until that check settles, so no frame
  // shows seeded statuses as findings.
  const checking = paypal.loading || (!firstCheckDone && unverified);
  const overdueVerified = verifiedOverdueItems(deal, today).reduce((s, i) => s + i.amountMinor, 0);
  const clockCount = computeClocks(deal, today).length;

  const step = guideStep(tab, acting);
  const firstFinding = verifiedOpen[0]?.d.id;

  const onSkipGuide = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("guide");
    window.history.replaceState(null, "", `?${params.toString()}`);
    setActing(false);
  };

  const onGuideNext = () => {
    if (step === 0) selectTab("deals", true);
    else if (step === 1) selectTab("payments", true);
    else if (step === 2) selectTab("agent", true);
    else if (step === 3) {
      setActing(true);
      const el = firstFinding ? document.getElementById(`finding-${firstFinding}`) : null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.focus({ preventScroll: true });
      }
    } else onSkipGuide();
  };

  const dateControl = (
    <label className="flex flex-wrap items-center gap-2 text-sm">
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
  );

  const subtitle = [
    deal.currency === "USD" ? "US brand / Indian creator" : null,
    `${moneyShort(deal.totalMinor, deal.currency)} campaign`,
  ]
    .filter(Boolean)
    .join(" · ");

  const panels: Record<TabId, React.ReactNode> = {
    overview: (
      <Overview
        deal={deal}
        today={today}
        checking={checking}
        checkError={paypal.error}
        onInvestigate={() => selectTab("agent", true)}
        onCheckAll={() => void check(deal)}
      />
    ),
    deals: <AgreementPanel deal={deal} today={today} update={update} />,
    payments: <PaymentsPanel deal={deal} today={today} update={update} paypal={paypal} />,
    agent: (
      <section aria-labelledby="agent-title" className="flex flex-col gap-4">
        <div>
          <h2 id="agent-title" className="font-display text-2xl font-semibold text-navy">
            Find and follow up on unpaid work
          </h2>
          <p className="mt-1 text-ink-soft">
            The agent checks the agreement, the brand&apos;s approval and PayPal before it suggests anything.
          </p>
        </div>

        {checking && unverified ? (
          <p role="status" className="rounded-card border border-line bg-paper p-4 text-ink">
            {PAYPAL_COPY.checking}
          </p>
        ) : (
          awaitingCheck > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-paper p-4">
              <p className="min-w-0 flex-1 basis-60 text-ink">
                PayPal hasn&apos;t confirmed {awaitingCheck === 1 ? "one invoice" : "some invoices"} yet, so the agent is
                waiting before it reports a gap.
              </p>
              <button
                type="button"
                onClick={() => void check(deal)}
                className="rounded-md border border-line bg-paper px-3 py-1.5 text-sm font-medium text-navy hover:border-navy"
              >
                {PAYPAL_COPY.checkAll}
              </button>
            </div>
          )
        )}

        {verifiedOpen.length === 0 && awaitingCheck === 0 && !(checking && unverified) && (
          <p className="rounded-card border border-mint/30 bg-mint-bg p-4 font-medium text-navy">
            No missing payments right now.
          </p>
        )}

        {!(checking && unverified) &&
          verifiedOpen.map(({ d, gap }) => (
            <div key={d.id} id={`finding-${d.id}`} tabIndex={-1} className="scroll-mt-24 rounded-2xl outline-none">
              <ResolutionCard deal={deal} deliverable={d} gap={gap} update={update} />
            </div>
          ))}

        <button
          type="button"
          onClick={() => {
            pendingScroll.current = "rights";
            selectTab("deals");
          }}
          className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-paper p-4 text-left hover:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          <span className="min-w-0">
            <span className="block font-semibold text-navy">Also check: rights &amp; revisions</span>
            <span className="block text-sm text-ink-soft">
              {clockCount > 0
                ? `${clockCount} possible extra fee${clockCount === 1 ? "" : "s"} found in usage and revision terms.`
                : "Usage windows and extra revision rounds can add fees."}
            </span>
          </span>
          <span aria-hidden="true" className="text-blue">
            →
          </span>
        </button>
      </section>
    ),
  };

  return (
    <div className="flex flex-col gap-4">
      {demo && <DemoBanner onReset={onReset}>{dateControl}</DemoBanner>}

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {!demo && (
            <Link href="/new" className="text-sm text-ink-soft hover:text-ink">
              ← All deals
            </Link>
          )}
          <h1 className="font-display text-2xl font-semibold text-navy sm:text-3xl">{dealTitle(deal)}</h1>
          <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>
        </div>
        {!demo && dateControl}
      </header>

      {guided && <GuideProgress step={step} onNext={onGuideNext} onSkip={onSkipGuide} />}

      <WorkspaceTabs
        active={tab}
        onSelect={(t) => selectTab(t)}
        badges={overdueVerified > 0 ? { agent: moneyShort(overdueVerified, deal.currency) } : {}}
      />

      {TABS.map((t) => (
        <div
          key={t.id}
          id={panelId(t.id)}
          role="tabpanel"
          aria-labelledby={tabId(t.id)}
          hidden={t.id !== tab}
          tabIndex={0}
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
        >
          {(t.id === tab || visited.has(t.id)) && panels[t.id]}
        </div>
      ))}
    </div>
  );
}
