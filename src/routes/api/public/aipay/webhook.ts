import { createFileRoute } from "@tanstack/react-router";
import { deliverOrder } from "@/lib/orders.functions";
import {
  invoiceIdFromProof,
  isAiPayPaid,
  parseAiPayWebhookPayload,
} from "@/lib/aipay.server";

export const Route = createFileRoute("/api/public/aipay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handleAiPayWebhook(request),
      GET: async ({ request }) => handleAiPayWebhook(request),
    },
  },
});

async function db() {
  const { supabaseAdmin } = await import("@/integrations-supabase/client.server");
  return supabaseAdmin;
}

async function handleAiPayWebhook(request: Request) {
  let payload: unknown = null;
  try {
    if (request.method === "POST") {
      const ct = request.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        payload = await request.json();
      } else {
        const text = await request.text();
        try {
          payload = JSON.parse(text);
        } catch {
          payload = Object.fromEntries(new URLSearchParams(text).entries());
        }
      }
    } else {
      payload = Object.fromEntries(new URL(request.url).searchParams.entries());
    }
  } catch (e) {
    console.error("[aipay webhook] parse error", e);
    return new Response("bad request", { status: 400 });
  }

  console.log("[aipay webhook]", JSON.stringify(payload));

  const invoice = parseAiPayWebhookPayload(payload);
  if (!invoice?.id) {
    // Acknowledge unknown shapes so retries stop; we logged the body.
    return new Response("ok", { status: 200 });
  }

  if (!isAiPayPaid(invoice)) {
    return new Response("ok", { status: 200 });
  }

  const s = await db();
  const proof = `aipay:${invoice.id}`;
  const { data: order } = await s
    .from("orders")
    .select("id, status, payment_proof_path")
    .eq("payment_proof_path", proof)
    .maybeSingle();

  let orderId = order?.id as number | undefined;

  // Fallback: message like "Заказ #123"
  if (!orderId && invoice.message) {
    const m = String(invoice.message).match(/#(\d+)/);
    if (m) orderId = Number(m[1]);
  }

  if (!orderId) {
    console.error("[aipay webhook] order not found for invoice", invoice.id);
    return new Response("ok", { status: 200 });
  }

  const { data: current } = await s.from("orders").select("status, payment_proof_path").eq("id", orderId).maybeSingle();
  if (!current) return new Response("ok", { status: 200 });
  if (current.status === "delivered") return new Response("ok", { status: 200 });

  // Ensure proof path is set for future lookups
  if (invoiceIdFromProof(current.payment_proof_path) !== invoice.id) {
    await s
      .from("orders")
      .update({
        payment_proof_path: proof,
        admin_note: `Paid via AiPay. Invoice ${invoice.id}. Amount: ${invoice.amount ?? "?"}`,
      })
      .eq("id", orderId);
  }

  try {
    await deliverOrder(orderId);
  } catch (e) {
    console.error("[aipay webhook] deliver error", e);
    return new Response("deliver failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
