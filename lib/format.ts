import type { Currency, Minor } from "./types";

export function money(minor: Minor, currency: Currency): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}

export function toMinor(major: string): Minor {
  const n = parseFloat(major);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function toMajor(minor: Minor | null): string {
  return minor == null ? "" : (minor / 100).toFixed(2);
}

export function localISODate(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isoToUTCDay(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function utcDayToISO(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return utcDayToISO(isoToUTCDay(iso) + days);
}

export function daysBetween(fromISO: string, toISO: string): number {
  return isoToUTCDay(toISO) - isoToUTCDay(fromISO);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
