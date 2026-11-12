"use client";

import type { Currency, Terms } from "@/lib/types";
import { MoneyInput } from "./MoneyInput";
import { Field, inputClass } from "./ui";

type IntKey = "paymentDays" | "revisionsIncluded" | "usageDays" | "usageExtensionDays";
type MoneyKey = "revisionRateMinor" | "usageExtensionRateMinor";

const intFields: { key: IntKey; label: string }[] = [
  { key: "paymentDays", label: "Payment due (days)" },
  { key: "revisionsIncluded", label: "Revisions included" },
  { key: "usageDays", label: "Paid-usage window (days)" },
  { key: "usageExtensionDays", label: "Usage extension period (days)" },
];

const moneyFields: { key: MoneyKey; label: string }[] = [
  { key: "revisionRateMinor", label: "Rate per extra revision" },
  { key: "usageExtensionRateMinor", label: "Rate per usage extension" },
];

export function TermsEditor({
  terms,
  currency,
  onChange,
}: {
  terms: Terms;
  currency: Currency;
  onChange: (t: Terms) => void;
}) {
  const set = <K extends keyof Terms>(key: K, value: Terms[K]) => onChange({ ...terms, [key]: value });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Payment trigger">
        <input
          className={inputClass}
          value={terms.paymentTrigger ?? ""}
          placeholder="not stated"
          onChange={(e) => set("paymentTrigger", e.target.value || null)}
        />
      </Field>
      {intFields.map(({ key, label }) => (
        <Field key={key} label={label}>
          <input
            type="number"
            min={0}
            className={`${inputClass} tabular-nums`}
            value={terms[key] ?? ""}
            placeholder="not stated"
            onChange={(e) => set(key, e.target.value === "" ? null : parseInt(e.target.value, 10))}
          />
        </Field>
      ))}
      {moneyFields.map(({ key, label }) => (
        <Field key={key} label={`${label} (${currency})`}>
          <MoneyInput value={terms[key]} onChange={(v) => set(key, v)} />
        </Field>
      ))}
      <Field label="Usage window starts">
        <input
          type="date"
          className={inputClass}
          value={terms.usageStart ?? ""}
          onChange={(e) => set("usageStart", e.target.value || null)}
        />
      </Field>
      <Field label="PayPal fees borne by">
        <select
          className={inputClass}
          value={terms.feesBorneBy ?? ""}
          onChange={(e) => set("feesBorneBy", (e.target.value || null) as Terms["feesBorneBy"])}
        >
          <option value="">not stated</option>
          <option value="creator">creator</option>
          <option value="brand">brand</option>
        </select>
      </Field>
    </div>
  );
}
