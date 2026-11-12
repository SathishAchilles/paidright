"use client";

import { useState } from "react";
import type { ChangeOrderRequest, ChangeOrderResponse } from "@/lib/api-contract";
import { computeClocks } from "@/lib/clocks";
import { money } from "@/lib/format";
import { newId } from "@/lib/store";
import type { ChangeOrder, ClockEvent, Deal } from "@/lib/types";
import { post } from "./api";
import { createInvoice, refreshInvoice, type UpdateDeal } from "./dealOps";
import { InvoiceCell } from "./InvoiceCell";
import { MoneyInput } from "./MoneyInput";
import { Button, Card, ErrorText, inputClass } from "./ui";
import { useAction } from "./useAction";

export function ClocksPanel({ deal, today, update }: { deal: Deal; today: string; update: UpdateDeal }) {
  const events = computeClocks(deal, today);
  const t = deal.terms;
  const setRevisions = (n: number) => update((d) => ({ ...d, revisionsUsed: Math.max(0, n) }));

  return (
    <Card title="Contract clocks">
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
              {t.revisionsIncluded != null ? `of ${t.revisionsIncluded} included` : "cap not stated"}
              {t.revisionRateMinor != null && `, then ${money(t.revisionRateMinor, deal.currency)} each`}
            </span>
          </div>
        </div>
        <div className="rounded-md bg-muted-bg p-3">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Paid-usage window</p>
          <p className="mt-2">
            {t.usageDays != null && t.usageStart
              ? `${t.usageDays} days from ${t.usageStart}`
              : "Not fully stated in the contract"}
            {t.usageExtensionRateMinor != null &&
              t.usageExtensionDays &&
              `; extensions ${money(t.usageExtensionRateMinor, deal.currency)} per ${t.usageExtensionDays} days`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {events.length === 0 && <p className="text-sm text-ink-soft">No clocks have run out as of {today}.</p>}
        {events.map((e) => (
          <ClockEventRow key={e.kind} deal={deal} event={e} update={update} />
        ))}
      </div>

      {deal.changeOrders.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-ink-soft uppercase">Change orders</h3>
          <ul className="divide-y divide-line">
            {deal.changeOrders.map((co) => (
              <ChangeOrderItem key={co.id} deal={deal} changeOrder={co} update={update} />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function ClockEventRow({ deal, event, update }: { deal: Deal; event: ClockEvent; update: UpdateDeal }) {
  const draftAction = useAction();
  const invoiceAction = useAction();
  const [draft, setDraft] = useState<ChangeOrder | null>(null);

  const onDraft = () =>
    draftAction.run(async () => {
      const { changeOrder } = await post<ChangeOrderRequest, ChangeOrderResponse>("/api/change-order", { deal, event });
      setDraft({ ...changeOrder, id: changeOrder.id || newId(), kind: event.kind });
    });

  const onInvoice = () =>
    invoiceAction.run(async () => {
      if (!draft) return;
      const invoice = await createInvoice(deal, draft.lineItem, draft.amountMinor, draft.note);
      const co: ChangeOrder = { ...draft, invoice };
      update((d) => ({ ...d, changeOrders: [...d.changeOrders, co] }));
    });

  return (
    <div className="rounded-md border border-warn/40 bg-warn-bg/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-warn uppercase">
            {event.kind === "USAGE_EXPIRED" ? "Usage window expired" : "Revision cap exceeded"}
          </p>
          <p className="mt-1 text-sm">{event.description}</p>
        </div>
        <p className="text-right">
          <span className="block text-xs text-ink-soft">Suggested from contract rates</span>
          <span className="text-lg tabular-nums">{money(event.suggestedAmountMinor, deal.currency)}</span>
        </p>
      </div>

      {!draft ? (
        <div className="mt-3">
          <Button variant="primary" loading={draftAction.loading} onClick={onDraft}>
            Draft change order
          </Button>
          <ErrorText error={draftAction.error} />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
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
          <div>
            <Button
              variant="primary"
              loading={invoiceAction.loading}
              disabled={draft.amountMinor <= 0 || !deal.brandEmail}
              onClick={onInvoice}
            >
              Create PayPal invoice
            </Button>
            <ErrorText error={invoiceAction.error} />
          </div>
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
            Refresh
          </Button>
          <ErrorText error={refresh.error} />
        </div>
      )}
    </li>
  );
}
