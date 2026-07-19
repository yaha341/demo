import crypto from "crypto";

export type FreeKassaConfig = {
  merchantId: string;
  secret1: string;
  secret2: string;
  currency?: string;
};

export function formatFkAmount(amount: number): string {
  // FreeKassa accepts amounts with up to 2 decimals; avoid trailing junk.
  const n = Math.round(Number(amount) * 100) / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function buildFreeKassaPaymentUrl(
  cfg: FreeKassaConfig,
  opts: { amount: number; orderId: number | string; currency?: string },
): string {
  const currency = (opts.currency || cfg.currency || "KZT").toUpperCase();
  const amount = formatFkAmount(opts.amount);
  const orderId = String(opts.orderId);
  const sign = crypto
    .createHash("md5")
    .update(`${cfg.merchantId}:${amount}:${cfg.secret1}:${currency}:${orderId}`)
    .digest("hex");

  const params = new URLSearchParams({
    m: cfg.merchantId,
    oa: amount,
    o: orderId,
    currency,
    s: sign,
  });

  return `https://pay.fk.money/?${params.toString()}`;
}

export function verifyFreeKassaNotification(
  cfg: Pick<FreeKassaConfig, "merchantId" | "secret2">,
  data: { MERCHANT_ID?: string; AMOUNT?: string; MERCHANT_ORDER_ID?: string; SIGN?: string },
): boolean {
  const merchantId = data.MERCHANT_ID;
  const amount = data.AMOUNT;
  const orderId = data.MERCHANT_ORDER_ID;
  const sign = data.SIGN;
  if (!merchantId || !amount || !orderId || !sign) return false;
  if (String(merchantId) !== String(cfg.merchantId)) return false;

  const expected = crypto
    .createHash("md5")
    .update(`${merchantId}:${amount}:${cfg.secret2}:${orderId}`)
    .digest("hex");

  return expected.toLowerCase() === String(sign).toLowerCase();
}
