import { localISODate } from "./format";
import type { Deal } from "./types";

const DEALS_KEY = "paidright.deals";
const TODAY_KEY = "paidright.today";
export const DEALS_EVENT = "paidright:deals";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function newId(): string {
  return crypto.randomUUID();
}

export function readDealsRaw(): string | null {
  return hasStorage() ? window.localStorage.getItem(DEALS_KEY) : null;
}

export function parseDeals(raw: string | null): Deal[] {
  try {
    return raw ? (JSON.parse(raw) as Deal[]) : [];
  } catch {
    return [];
  }
}

export function listDeals(): Deal[] {
  return parseDeals(readDealsRaw());
}

export function subscribeDeals(onChange: () => void): () => void {
  window.addEventListener(DEALS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DEALS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function writeDeals(deals: Deal[]): void {
  window.localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
  window.dispatchEvent(new Event(DEALS_EVENT));
}

export function getDeal(id: string): Deal | null {
  return listDeals().find((d) => d.id === id) ?? null;
}

export function saveDeal(deal: Deal): void {
  if (!hasStorage()) return;
  const others = listDeals().filter((d) => d.id !== deal.id);
  writeDeals([deal, ...others]);
}

export function deleteDeal(id: string): void {
  if (!hasStorage()) return;
  const rest = listDeals().filter((d) => d.id !== id);
  writeDeals(rest);
}

export function realToday(): string {
  return localISODate(new Date());
}

export function getToday(): string {
  if (!hasStorage()) return realToday();
  return window.localStorage.getItem(TODAY_KEY) || realToday();
}

export function setToday(iso: string | null): void {
  if (!hasStorage()) return;
  if (iso && iso !== realToday()) window.localStorage.setItem(TODAY_KEY, iso);
  else window.localStorage.removeItem(TODAY_KEY);
}
