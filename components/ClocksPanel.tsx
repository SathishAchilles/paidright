"use client";

import { useState } from "react";
import type { ChangeOrderRequest, ChangeOrderResponse } from "@/lib/api-contract";
import {
  computeClocks,
  formatDay,
  shortBrand,
  usageConfirmation,
  usageExtensionEvent,
  usageWindowEnded,
  type UsageWindow,
} from "@/lib/clocks";
import { money, moneyShort } from "@/lib/format";
import { newId } from "@/lib/store";
import type { ChangeOrder, ClockEvent, Deal } from "@/lib/types";
import { post } from "./api";
import { createInvoice, refreshInvoice, type UpdateDeal } from "./dealOps";
import { InvoiceCell } from "./InvoiceCell";
import { MoneyInput } from "./MoneyInput";
import { Button, Card, ErrorText, inputClass } from "./ui";
import { useAction } from "./useAction";

export function ClocksPanel({ deal, today, update }: { deal: Deal; today: string; update: UpdateDeal }) {
  const revisionEvents = computeClocks(deal, today).filter((e) => e.kind === "REVISIONS_EXCEEDED");
  const ended = usageWindowEnded(deal, today);
  const invoiced = deal.changeOrders.filter((co) => co.invoice);
  const t = deal.terms;
  const setRevisions = (n: number) => update((d) => ({ ...d, revisionsUsed: Math.max(0, n) }));

  return (
    <Card title="Usage rights and revisions">
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-md bg-muted-bg p-3">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Revision rounds used</p>
          <div className="mt-2 flex items-center gap-3">
            <Button aria-label="Remove a revision round" onClick={() => setRevisions(deal.revisionsUsed - 1)}>
              −
            </Button>
            <span className="text-2xl tabular-nums">{deal.revisionsUsed}</span>
            <Button aria-label="Add a revision round" onClick={() => setRevisions(deal.revisionsUsed + 1)}>
              +
            </Button>
            <span className="text-ink-soft">
              {t.revisionsIncluded != null ? `of ${t.revisionsIncluded} included` : "Limit not stated"}
              {t.revisionRateMinor != null && `, then ${moneyShort(t.revisionRateMinor, deal.currency)} each`}
            </span>
          </div>
        </div>
        <div className="rounded-md bg-muted-bg p-3">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Paid-usage window</p>
          <p className="mt-2">
            {t.usageDays != null && t.usageStart
              ? `${t.usageDays} days from ${formatDay(t.usageStart)}`
              : "Not fully stated in the agreement"}
            {t.usageExtensionRateMinor != null &&
              t.usageExtensionDays &&
              `. Each additional ${t.usageExtensionDays} days costs ${moneyShort(t.usageExtensionRateMinor, deal.currency)}.`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {!ended && revisionEvents.length === 0 && (
          <p className="text-sm text-ink-soft">Nothing new to bill under these terms as of {formatDay(today)}.</p>
        )}
        {ended && <UsageFinding key={`${deal.id}-${ended.end}`} deal={deal} window={ended} update={update} />}
        {revisionEvents.map((e) => (
          <ClockEventRow
            key={e.kind}
            deal={deal}
            event={e}
            label="Extra revisions"
            finding={e.description}
            update={update}
          />
        ))}
      </div>

      {invoiced.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-ink-soft uppercase">Extra invoices</h3>
          <ul className="divide-y divide-line">
            {invoiced.map((co) => (
              <ChangeOrderItem key={co.id} deal={deal} changeOrder={co} update={update} />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

// Per-browser memory of a "No" answer, scoped to this deal's usage end date so
// it never outlives the window it answered.
function declinedKey(dealId: string, end: string): string {
  return `paidright:usage-declined:${dealId}:${end}`;
}

function readDeclined(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeDeclined(key: string, value: boolean): void {
  try {
    if (value) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable: the answer still holds for this view.
  }
}

function UsageFinding({ deal, window: w, update }: { deal: Deal; window: UsageWindow; update: UpdateDeal }) {
  const key = declinedKey(deal.id, w.end);
  const [declined, setDeclined] = useState(() => readDeclined(key));
  const confirmation = usageConfirmation(deal);
  const brand = shortBrand(deal.brand);
  const event = usageExtensionEvent(deal, 1);

  const answerNo = () => {
    writeDeclined(key, true);
    setDeclined(true);
  };

  const answerYes = () => {
    writeDeclined(key, false);
    setDeclined(false);
    const co: ChangeOrder = {
      id: newId(),
      kind: "USAGE_EXPIRED",
      lineItem: `Paid-usage extension: ${w.extensionDays} days`,
      amountMinor: w.extensionRateMinor,
      note: `Creator confirmed that ${brand} asked for another ${w.extensionDays} days of paid usage after the window ended on ${formatDay(w.end)}.`,
    };
    update((d) => ({ ...d, changeOrders: [...d.changeOrders, co] }));
  };

  const undoYes = () =>
    update((d) => ({ ...d, changeOrders: d.changeOrders.filter((co) => !(co.kind === "USAGE_EXPIRED" && !co.invoice)) }));

  if (confirmation && event) {
    return (
      <ClockEventRow
        deal={deal}
        event={event}
        label="Usage extension"
        finding={`Your agreement includes a ${moneyShort(event.suggestedAmountMinor, deal.currency)} fee for the approved usage extension. I don't see an invoice for it. Would you like to review a PayPal invoice?`}
        confirmedId={confirmation.id}
        onUndo={undoYes}
        update={update}
      />
    );
  }

  if (declined) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-4 text-sm">
        <span className="text-ink-soft">Noted: no extension requested.</span>
        <Button variant="ghost" className="px-0 py-0" onClick={() => setDeclined(false)}>
          Change answer
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Paid usage</p>
      <p className="mt-1 text-sm font-medium">Your paid-usage window ended on {formatDay(w.end)}.</p>
      <p className="mt-1 text-sm text-ink-soft">
        An ended window is not a fee on its own. It only counts if {brand} asked for more time.
      </p>
      <p className="mt-3 text-sm font-medium">
        Did {brand} ask for another {w.extensionDays} days of paid usage?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" onClick={answerYes}>
          Yes, they asked
        </Button>
        <Button onClick={answerNo}>No</Button>
      </div>
    </div>
  );
}

function ClockEventRow({
  deal,
  event,
  label,
  finding,
  confirmedId,
  onUndo,
  update,
}: {
  deal: Deal;
  event: ClockEvent;
  label: string;
  finding: string;
  confirmedId?: string;
  onUndo?: () => void;
  update: UpdateDeal;
}) {
  const draftAction = useAction();
  const invoiceAction = useAction();
  const [draft, setDraft] = useState<ChangeOrder | null>(null);

  const onDraft = () =>
    draftAction.run(async () => {
      const { changeOrder } = await post<ChangeOrderRequest, ChangeOrderResponse>("/api/change-order", { deal, event });
      setDraft({ ...changeOrder, id: confirmedId ?? (changeOrder.id || newId()), kind: event.kind });
    });

  const onInvoice = () =>
    invoiceAction.run(async () => {
      if (!draft) return;
      const invoice = await createInvoice(deal, draft.lineItem, draft.amountMinor, draft.note, deal.terms.paymentDays ?? 30);
      const co: ChangeOrder = { ...draft, invoice };
      update((d) => ({
        ...d,
        changeOrders: confirmedId
          ? d.changeOrders.map((c) => (c.id === confirmedId ? co : c))
          : [...d.changeOrders, co],
      }));
    });

  return (
    <div className="rounded-md border border-amber/40 bg-amber-bg/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-wide text-amber-ink uppercase">{label}</p>
          <p className="mt-1 text-sm">{finding}</p>
        </div>
        <p className="text-right">
          <span className="block text-xs text-ink-soft">From your agreement</span>
          <span className="text-lg tabular-nums">{money(event.suggestedAmountMinor, deal.currency)}</span>
        </p>
      </div>

      {!draft ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" loading={draftAction.loading} onClick={onDraft}>
            Review PayPal invoice
          </Button>
          {onUndo && (
            <Button variant="ghost" className="px-0 py-0" onClick={onUndo}>
              Not right? Undo
            </Button>
          )}
          <ErrorText error={draftAction.error} />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-ink-soft">Nothing is sent until you create the invoice.</p>
          <input
            className={inputClass}
            value={draft.lineItem}
            aria-label="Line item"
            onChange={(e) => setDraft({ ...draft, lineItem: e.target.value })}
          />
          <MoneyInput
            className="w-48"
            prefix={deal.currency}
            value={draft.amountMinor}
            onChange={(v) => setDraft({ ...draft, amountMinor: v ?? 0 })}
          />
          <textarea
            className={`${inputClass} h-24`}
            value={draft.note}
            aria-label="Invoice note"
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              loading={invoiceAction.loading}
              disabled={draft.amountMinor <= 0 || !deal.brandEmail}
              onClick={onInvoice}
            >
              Create PayPal invoice
            </Button>
            <Button variant="ghost" className="px-0 py-0" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
          <ErrorText error={invoiceAction.error} />
        </div>
      )}
    </div>
  );
}

function ChangeOrderItem({ deal, changeOrder: co, update }: { deal: Deal; changeOrder: ChangeOrder; update: UpdateDeal }) {
  const refresh = useAction();
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
      <div>
        <p className="font-medium">{co.lineItem}</p>
        <p className="text-ink-soft tabular-nums">
          {money(co.amountMinor, deal.currency)}
          {co.invoice && ` · paid ${money(co.invoice.paidMinor, deal.currency)}`}
        </p>
      </div>
      <InvoiceCell invoice={co.invoice} />
      {co.invoice && (
        <div className="text-right">
          <Button loading={refresh.loading} onClick={() => refresh.run(() => refreshInvoice(co.invoice!.paypalInvoiceId, update))}>
            Check status with PayPal
          </Button>
          <ErrorText error={refresh.error} />
        </div>
      )}
    </li>
  );
}
