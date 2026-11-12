import { buildDemoDeal, DEMO_DEAL_ID, DEMO_INVOICES } from "./demo-seed";
import { saveDeal, setToday } from "./store";

function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Before instalment 2's real due date has passed, the demo opens on a labelled
// simulated date 4 days after it; once the real date is past it, no simulation.
export function demoToday(): string | null {
  const due = DEMO_INVOICES.storiesI2.dueDate;
  return localToday() > due ? null : addDays(due, 4);
}

export function loadDemo(): string {
  saveDeal(buildDemoDeal());
  setToday(demoToday());
  return DEMO_DEAL_ID;
}

export function resetDemo(): string {
  return loadDemo();
}

export function isDemoDeal(id: string): boolean {
  return id === DEMO_DEAL_ID;
}
