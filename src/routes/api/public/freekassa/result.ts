import { createFileRoute } from "@tanstack/react-router";
import { deliverOrder } from "@/lib/orders.functions";
import { verifyFreeKassaNotification } from "@/lib/freekassa.server";

export const Route = createFileRoute("/api/public/freekassa/result")({
  server: {
    handlers: {
      POST: async ({ request }) => handleFreeKassaResult(request),
      GET: async ({ request }) => handleFreeKassaResult(request),
    },
  },
});

async function db() {
  const { supabaseAdmin } = await import("@/integrations-supabase/client.server");
  return supabaseAdmin;
}

async function handleFreeKassaResult(request: Request) {
  let body: URLSearchParams;
  if (request.method === "POST") {
    const text = await request.text();
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const json = JSON.parse(text) as Record<string, string>;
        body = new URLSearchParams(Object.entries(json).map(([k, v]) => [k, String(v)]));
      } catch {
        body = new URLSearchParams(text);
      }
    } else {
      body = new URLSearchParams(text);
    }
  } else {
    body = new URL(request.url).searchParams;
  }

  const merchantId = body.get("MERCHANT_ID") || "";
  const amount = body.get("AMOUNT") || "";
  const orderIdRaw = body.get("MERCHANT_ORDER_ID") || "";
  const sign = body.get("SIGN") || "";
  const intid = body.get("intid") || "";

  if (!merchantId || !amount || !orderIdRaw || !sign) {
    return new Response("bad request", { status: 400 });
  }

  const s = await db();
  const { data: settings } = await s.from("app_settings").select("*");
  const getSetting = (key: string) => settings?.find((row) => row.key === key)?.value;

  if (getSetting("freekassa_enabled") !== "true") {
    return new Response("freekassa disabled", { status: 403 });
  }

  const cfgMerchant = getSetting("freekassa_merchant_id")?.trim() || "";
  const secret2 = getSetting("freekassa_secret2")?.trim() || "";
  if (!cfgMerchant || !secret2) {
    return new Response("freekassa not configured", { status: 500 });
  }

  const ok = verifyFreeKassaNotification(
    { merchantId: cfgMerchant, secret2 },
    {
      MERCHANT_ID: merchantId,
      AMOUNT: amount,
      MERCHANT_ORDER_ID: orderIdRaw,
      SIGN: sign,
    },
  );

  if (!ok) {
    console.error("[freekassa] bad sign", { merchantId, amount, orderIdRaw, sign });
    return new Response("wrong sign", { status: 400 });
  }

  const orderId = Number(orderIdRaw);
  if (!Number.isFinite(orderId)) {
    return new Response("bad order", { status: 400 });
  }

  const { data: order } = await s.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (order && order.status !== "delivered") {
    try {
      await deliverOrder(orderId);
      await s
        .from("orders")
        .update({
          payment_proof_path: "freekassa",
          admin_note: `Paid via FreeKassa. Amount: ${amount}. intid: ${intid || "—"}`,
        })
        .eq("id", orderId);
    } catch (e) {
      console.error("[freekassa] deliver error", e);
      return new Response("deliver failed", { status: 500 });
    }
  }

  // FreeKassa expects YES when confirmation check is enabled
  return new Response("YES");
}
