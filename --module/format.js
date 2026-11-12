export function money(minor, currency) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}
export function moneyShort(minor, currency) {
    const whole = minor % 100 === 0;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: whole ? 0 : 2,
    }).format(minor / 100);
}
export function toMinor(major) {
    const n = parseFloat(major);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
export function toMajor(minor) {
    return minor == null ? "" : (minor / 100).toFixed(2);
}
export function localISODate(d = new Date()) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}
export function isoToUTCDay(iso) {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
}
export function utcDayToISO(day) {
    return new Date(day * 86_400_000).toISOString().slice(0, 10);
}
export function addDays(iso, days) {
    return utcDayToISO(isoToUTCDay(iso) + days);
}
export function daysBetween(fromISO, toISO) {
    return isoToUTCDay(toISO) - isoToUTCDay(fromISO);
}
export function formatDateTime(iso) {
    return new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}
