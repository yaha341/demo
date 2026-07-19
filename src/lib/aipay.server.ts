type AiPayConfig = {
  apiKey: string;
  companyId: string;
  baseUrl: string;
  posId?: string;
};

export type AiPayInvoice = {
  id: string;
  internal_id?: number;
  ref?: number;
  status?: string;
  status_code?: number;
  amount?: number;
  account?: string;
  message?: string;
  paid_at?: string | null;
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  if (phone.startsWith("+")) return phone;
  return phone;
}

export function proofPathForInvoice(invoiceId: string) {
  return `aipay:${invoiceId}`;
}

export function invoiceIdFromProof(path: string | null | undefined): string | null {
  if (!path?.startsWith("aipay:")) return null;
  return path.slice(6) || null;
}

export async function createAiPayInvoice(
  cfg: AiPayConfig,
  opts: { phone: string; amount: number; message: string },
): Promise<AiPayInvoice> {
  const amount = Math.max(1, Math.round(opts.amount));
  const body: Record<string, unknown> = {
    account: normalizePhone(opts.phone),
    amount,
    message: opts.message.slice(0, 80),
  };
  if (cfg.companyId) body.company_id = cfg.companyId;
  if (cfg.posId) body.pos_id = cfg.posId;

  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": cfg.apiKey,
      "X-Company-Id": cfg.companyId,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || json?.entity?.message || `AiPay HTTP ${res.status}`;
    const code = json?.error?.code ? ` [${json.error.code}]` : "";
    throw new Error(`${msg}${code}`);
  }

  const invoice = (json?.data ?? json) as AiPayInvoice;
  if (!invoice?.id) throw new Error("AiPay: пустой ответ без id счёта");
  return invoice;
}

export async function getAiPayInvoice(cfg: AiPayConfig, invoiceId: string): Promise<AiPayInvoice> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/invoices/${invoiceId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-API-Key": cfg.apiKey,
      "X-Company-Id": cfg.companyId,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `AiPay HTTP ${res.status}`;
    throw new Error(msg);
  }
  return (json?.data ?? json) as AiPayInvoice;
}

export function isAiPayPaid(invoice: AiPayInvoice): boolean {
  return invoice.status === "paid" || invoice.status_code === 9;
}

/** Extract invoice-like object from webhook body (shape may vary). */
export function parseAiPayWebhookPayload(body: unknown): AiPayInvoice | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const candidate =
    (root.data as Record<string, unknown> | undefined) ??
    (root.invoice as Record<string, unknown> | undefined) ??
    root;
  if (!candidate || typeof candidate !== "object") return null;
  const id = candidate.id;
  if (typeof id !== "string" || !id) return null;
  return candidate as unknown as AiPayInvoice;
}
