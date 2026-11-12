"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExtractRequest, ExtractResponse } from "@/lib/api-contract";
import { money } from "@/lib/format";
import { SEED_CONTRACT } from "@/lib/seed-contract";
import { newId, saveDeal } from "@/lib/store";
import type { Currency, Deal, Minor } from "@/lib/types";
import { post } from "./api";
import { FlagsPanel } from "./FlagsPanel";
import { MoneyInput } from "./MoneyInput";
import { TermsEditor } from "./TermsEditor";
import { Button, Card, ErrorText, Field, inputClass } from "./ui";
import { useAction } from "./useAction";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP"];

type ExtractedDeliverable = ExtractResponse["deliverables"][number];
type DraftInstalment = ExtractedDeliverable["instalments"][number] & { key: string };
type DraftDeliverable = Omit<ExtractedDeliverable, "instalments"> & {
  key: string;
  rev: number;
  instalments: DraftInstalment[];
};
type Draft = Omit<ExtractResponse, "deliverables"> & { deliverables: DraftDeliverable[] };

export function NewDealForm() {
  const router = useRouter();
  const [contractText, setContractText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const extract = useAction();

  const onExtract = () =>
    extract.run(async () => {
      const res = await post<ExtractRequest, ExtractResponse>("/api/extract", { contractText });
      setDraft({
        ...res,
        deliverables: res.deliverables.map((d) => ({
          ...d,
          key: newId(),
          rev: 0,
          instalments: d.instalments.map((i) => ({ ...i, key: newId() })),
        })),
      });
      setDraftVersion((v) => v + 1);
    });

  const onSave = () => {
    if (!draft || !scheduleOk(draft)) return;
    const deal: Deal = {
      id: newId(),
      brand: draft.brand,
      brandEmail: draft.brandEmail,
      creator: draft.creator,
      currency: draft.currency,
      totalMinor: draft.deliverables.reduce((s, d) => s + d.amountMinor, 0),
      deliverables: draft.deliverables.map((d) => ({
        id: newId(),
        name: d.name,
        amountMinor: d.amountMinor,
        status: "pending",
        sourceQuote: d.sourceQuote,
        instalments: d.instalments.map((i) => ({
          id: newId(),
          label: i.label,
          amountMinor: i.amountMinor,
          dueOffsetDays: i.dueOffsetDays,
          sourceQuote: i.sourceQuote,
        })),
      })),
      terms: draft.terms,
      flags: draft.flags,
      revisionsUsed: 0,
      contractText,
      changeOrders: [],
    };
    saveDeal(deal);
    router.push(`/deal?id=${deal.id}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card title="1. Paste the brand-deal contract">
        <textarea
          className={`${inputClass} h-56 w-full font-mono text-[13px] leading-relaxed`}
          placeholder="Paste the contract or brief the brand sent you…"
          value={contractText}
          onChange={(e) => setContractText(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setContractText(SEED_CONTRACT)}>Load sample deal (GlowLab)</Button>
          <Button variant="primary" loading={extract.loading} disabled={!contractText.trim()} onClick={onExtract}>
            {extract.loading ? "Reading contract…" : "Extract with AI"}
          </Button>
        </div>
        <ErrorText error={extract.error} />
      </Card>

      {draft && (
        <DraftReview key={draftVersion} draft={draft} onChange={setDraft} onSave={onSave} />
      )}
    </div>
  );
}

function DraftReview({
  draft,
  onChange,
  onSave,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: () => void;
}) {
  const total = draft.deliverables.reduce((s, d) => s + d.amountMinor, 0);
  const setDeliverable = (key: string, patch: (d: DraftDeliverable) => Partial<DraftDeliverable>) =>
    onChange({
      ...draft,
      deliverables: draft.deliverables.map((d) => (d.key === key ? { ...d, ...patch(d) } : d)),
    });
  const defaultOffset = draft.terms.paymentDays;

  return (
    <>
      <Card title="2. Review what the AI extracted">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Brand">
            <input className={inputClass} value={draft.brand} onChange={(e) => onChange({ ...draft, brand: e.target.value })} />
          </Field>
          <Field label="Brand email" hint="Use your PayPal sandbox buyer email to pay in the demo.">
            <input
              type="email"
              className={inputClass}
              value={draft.brandEmail}
              onChange={(e) => onChange({ ...draft, brandEmail: e.target.value })}
            />
          </Field>
          <Field label="Creator">
            <input className={inputClass} value={draft.creator} onChange={(e) => onChange({ ...draft, creator: e.target.value })} />
          </Field>
          <Field label="Currency">
            <select
              className={inputClass}
              value={draft.currency}
              onChange={(e) => onChange({ ...draft, currency: e.target.value as Currency })}
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-ink-soft uppercase">Deliverables</h3>
        <ul className="flex flex-col gap-3">
          {draft.deliverables.map((d) => (
            <li key={d.key} className="rounded-md border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputClass} min-w-48 flex-1`}
                  value={d.name}
                  onChange={(e) => setDeliverable(d.key, () => ({ name: e.target.value }))}
                />
                <MoneyInput
                  className="w-36"
                  prefix={draft.currency}
                  value={d.amountMinor}
                  onChange={(v) =>
                    setDeliverable(d.key, (x) =>
                      x.instalments.length === 1
                        ? {
                            amountMinor: v ?? 0,
                            rev: x.rev + 1,
                            instalments: [{ ...x.instalments[0], amountMinor: v ?? 0 }],
                          }
                        : { amountMinor: v ?? 0 },
                    )
                  }
                />
                <Button
                  variant="ghost"
                  onClick={() => onChange({ ...draft, deliverables: draft.deliverables.filter((x) => x.key !== d.key) })}
                >
                  Remove
                </Button>
              </div>
              {d.sourceQuote && <p className="mt-2 text-xs text-ink-soft italic">&ldquo;{d.sourceQuote}&rdquo;</p>}
              <InstalmentSchedule
                deliverable={d}
                currency={draft.currency}
                defaultOffset={defaultOffset}
                onChange={(patch) => setDeliverable(d.key, patch)}
              />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() =>
              onChange({
                ...draft,
                deliverables: [
                  ...draft.deliverables,
                  {
                    key: newId(),
                    rev: 0,
                    name: "",
                    amountMinor: 0,
                    sourceQuote: null,
                    instalments: singlePayment(0, defaultOffset),
                  },
                ],
              })
            }
          >
            + Add deliverable
          </Button>
          <span className="text-sm">
            Total <strong className="tabular-nums">{money(total, draft.currency)}</strong>
          </span>
        </div>

        <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-ink-soft uppercase">Terms the agent will watch</h3>
        <TermsEditor terms={draft.terms} currency={draft.currency} onChange={(terms) => onChange({ ...draft, terms })} />
      </Card>

      <FlagsPanel flags={draft.flags} />

      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1">
          <Button variant="primary" disabled={draft.deliverables.length === 0 || !scheduleOk(draft)} onClick={onSave}>
            Save deal
          </Button>
          {!scheduleOk(draft) && (
            <span className="text-xs text-danger">Fix the instalment amounts above before saving.</span>
          )}
        </div>
      </div>
    </>
  );
}

function instalmentSum(d: DraftDeliverable): Minor {
  return d.instalments.reduce((s, i) => s + i.amountMinor, 0);
}

function scheduleOk(draft: Draft): boolean {
  return draft.deliverables.every((d) => d.instalments.length > 0 && instalmentSum(d) === d.amountMinor);
}

function singlePayment(amountMinor: Minor, offset: number | null): DraftInstalment[] {
  return [{ key: newId(), label: "Full payment", amountMinor, dueOffsetDays: offset, sourceQuote: null }];
}

function twoEqual(amountMinor: Minor, offset: number | null): DraftInstalment[] {
  const first = Math.floor(amountMinor / 2);
  return [
    { key: newId(), label: "Instalment 1 of 2", amountMinor: first, dueOffsetDays: 0, sourceQuote: null },
    {
      key: newId(),
      label: "Instalment 2 of 2",
      amountMinor: amountMinor - first,
      dueOffsetDays: offset ?? 30,
      sourceQuote: null,
    },
  ];
}

function offsetLabel(days: number | null, fallback: number | null): string {
  const n = days ?? fallback;
  if (n == null) return "due date not stated";
  if (n === 0) return "on approval";
  return `${n} day${n === 1 ? "" : "s"} after approval`;
}

function InstalmentSchedule({
  deliverable: d,
  currency,
  defaultOffset,
  onChange,
}: {
  deliverable: DraftDeliverable;
  currency: Currency;
  defaultOffset: number | null;
  onChange: (patch: (d: DraftDeliverable) => Partial<DraftDeliverable>) => void;
}) {
  const sum = instalmentSum(d);
  const mismatch = d.instalments.length === 0 || sum !== d.amountMinor;
  const setAmount = (key: string, v: Minor) =>
    onChange((x) => ({ instalments: x.instalments.map((i) => (i.key === key ? { ...i, amountMinor: v } : i)) }));
  const replace = (instalments: DraftInstalment[]) => onChange((x) => ({ instalments, rev: x.rev + 1 }));

  return (
    <div className="mt-3 rounded-md bg-muted-bg p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Payment schedule</span>
        <span className="flex gap-2">
          <Button variant="ghost" className="px-0 py-0" onClick={() => replace(twoEqual(d.amountMinor, defaultOffset))}>
            Split into 2 equal instalments
          </Button>
          <Button variant="ghost" className="px-0 py-0" onClick={() => replace(singlePayment(d.amountMinor, defaultOffset))}>
            Single payment
          </Button>
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {d.instalments.map((i) => (
          <li key={i.key} className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-36 font-medium">{i.label}</span>
              <MoneyInput
                key={`${i.key}-${d.rev}`}
                className="w-36"
                prefix={currency}
                value={i.amountMinor}
                onChange={(v) => setAmount(i.key, v ?? 0)}
              />
              <span className="text-ink-soft">{offsetLabel(i.dueOffsetDays, defaultOffset)}</span>
            </div>
            {i.sourceQuote && <p className="mt-1 text-xs text-ink-soft italic">&ldquo;{i.sourceQuote}&rdquo;</p>}
          </li>
        ))}
      </ul>
      {mismatch && (
        <p role="alert" className="mt-2 text-xs text-danger tabular-nums">
          Instalments add up to {money(sum, currency)}, but the deliverable is {money(d.amountMinor, currency)}.
        </p>
      )}
    </div>
  );
}
