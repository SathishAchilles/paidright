// Server-only PayPal Invoicing v2 client. Plain fetch, sandbox by default.
// Never import this from a Client Component: it reads secret env vars.

import type { InvoiceRequest } from "./api-contract";
import type { InvoiceRef, Minor, PayPalInvoiceStatus } from "./types";

const DEFAULT_BASE = "https://api-m.sandbox.paypal.com";

function config() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PayPal sandbox credentials missing: set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.local",
    );
  }
  const base = (process.env.PAYPAL_BASE || DEFAULT_BASE).replace(/\/+$/, "");
  return { clientId, clientSecret, base };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const { clientId, clientSecret, base } = config();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw await paypalError("POST /v1/oauth2/token", res);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh ~60s before PayPal's expiry.
  const ttlMs = Math.max(0, (data.expires_in - 60) * 1000);
  cachedToken = { value: data.access_token, expiresAt: Date.now() + ttlMs };
  return data.access_token;
}

// Money: integer minor units <-> PayPal decimal strings ("300.00").
export function minorToValue(minor: Minor): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minor));
  const units = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, "0");
  return `${sign}${units}.${cents}`;
}

export function valueToMinor(value: string | number | undefined | null): Minor {
  if (value === undefined || value === null || value === "") return 0;
  const str = String(value).trim();
  const negative = str.startsWith("-");
  const [units, fraction = ""] = str.replace(/^[-+]/, "").split(".");
  const cents = (fraction + "00").slice(0, 2);
  const minor = Number(units || "0") * 100 + Number(cents);
  if (!Number.isFinite(minor)) throw new Error(`Invalid PayPal amount: ${str}`);
  return negative ? -minor : minor;
}

async function paypalError(label: string, res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  let detail = text;
  try {
    const body = JSON.parse(text) as {
      name?: string;
      message?: string;
      error?: string;
      error_description?: string;
      details?: { field?: string; issue?: string; description?: string }[];
    };
    const parts = [body.name ?? body.error, body.message ?? body.error_description].filter(Boolean);
    const details = (body.details ?? [])
      .map((d) => [d.field, d.issue, d.description].filter(Boolean).join(": "))
      .filter(Boolean);
    if (details.length) parts.push(`details: ${details.join("; ")}`);
    if (parts.length) detail = parts.join(" - ");
  } catch {
    // Non-JSON body; keep raw text.
  }
  return new Error(`PayPal ${label} failed (${res.status})${detail ? `: ${detail}` : ""}`);
}

async function paypal<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; data: T | null; text: string }> {
  const { base } = config();
  const token = await getToken();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw await paypalError(`${method} ${path}`, res);

  const text = await res.text();
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }
  return { status: res.status, data, text };
}

function dueDate(dueInDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.floor(dueInDays)));
  return d.toISOString().slice(0, 10);
}

function idFromHref(href: string | undefined): string | null {
  if (!href) return null;
  const segment = href.split("?")[0].replace(/\/+$/, "").split("/").pop();
  return segment || null;
}

interface PayPalLink {
  href?: string;
  rel?: string;
  method?: string;
}

interface PayPalInvoice {
  id?: string;
  status?: PayPalInvoiceStatus;
  detail?: {
    invoice_number?: string;
    metadata?: { recipient_view_url?: string };
  };
  amount?: { value?: string };
  payments?: { paid_amount?: { value?: string } };
  href?: string;
  links?: PayPalLink[];
}

export async function createAndSendInvoice(req: InvoiceRequest): Promise<InvoiceRef> {
  const { data: next } = await paypal<{ invoice_number?: string }>(
    "POST",
    "/v2/invoicing/generate-next-invoice-number",
  );
  if (!next?.invoice_number) throw new Error("PayPal did not return a next invoice number");

  const draftBody = {
    detail: {
      invoice_number: next.invoice_number,
      currency_code: req.currency,
      note: req.note,
      payment_term: { due_date: dueDate(req.dueInDays) },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { given_name: req.recipientName },
          email_address: req.recipientEmail,
        },
      },
    ],
    items: [
      {
        name: req.lineItem,
        quantity: "1",
        unit_amount: { currency_code: req.currency, value: minorToValue(req.amountMinor) },
      },
    ],
    configuration: {
      partial_payment: {
        allow_partial_payment: true,
        minimum_amount_due: { currency_code: req.currency, value: "1.00" },
      },
      allow_tip: false,
    },
  };

  const { data: draft } = await paypal<PayPalInvoice>("POST", "/v2/invoicing/invoices", draftBody, {
    Prefer: "return=representation",
  });
  const selfLink = draft?.links?.find((l) => l.rel === "self")?.href;
  const id = draft?.id ?? idFromHref(selfLink) ?? idFromHref(draft?.href);
  if (!id) throw new Error("PayPal created an invoice but returned no id");

  await paypal("POST", `/v2/invoicing/invoices/${encodeURIComponent(id)}/send`, {
    send_to_invoicer: false,
    send_to_recipient: true,
  });

  return getInvoice(id);
}

export async function getInvoice(id: string): Promise<InvoiceRef> {
  const { data } = await paypal<PayPalInvoice>(
    "GET",
    `/v2/invoicing/invoices/${encodeURIComponent(id)}`,
  );
  if (!data) throw new Error(`PayPal returned an empty invoice for ${id}`);

  return {
    paypalInvoiceId: data.id ?? id,
    invoiceNumber: data.detail?.invoice_number ?? "",
    payerViewUrl: data.detail?.metadata?.recipient_view_url ?? null,
    status: data.status ?? "DRAFT",
    totalMinor: valueToMinor(data.amount?.value),
    paidMinor: valueToMinor(data.payments?.paid_amount?.value),
    lastRefreshedAt: new Date().toISOString(),
  };
}

export async function remindInvoice(id: string, subject: string, note: string): Promise<void> {
  await paypal("POST", `/v2/invoicing/invoices/${encodeURIComponent(id)}/remind`, {
    subject,
    note,
    send_to_invoicer: false,
    send_to_recipient: true,
  });
}
