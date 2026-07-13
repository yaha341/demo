import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { deliverOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/api/public/robokassa/result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleRobokassaResult(request);
      },
      GET: async ({ request }) => {
        return handleRobokassaResult(request);
      }
    },
  },
});

async function db() {
  const { supabaseAdmin } = await import("@/integrations-supabase/client.server");
  return supabaseAdmin;
}

async function handleRobokassaResult(request: Request) {
  let body: URLSearchParams;
  if (request.method === "POST") {
    const text = await request.text();
    body = new URLSearchParams(text);
  } else {
    const url = new URL(request.url);
    body = url.searchParams;
  }

  const outSum = body.get("OutSum");
  const invId = body.get("InvId");
  const signature = body.get("SignatureValue");
  const isTest = body.get("IsTest");

  if (!outSum || !invId || !signature) {
    return new Response("bad request", { status: 400 });
  }

  const s = await db();
  
  const { data: settings } = await s.from("app_settings").select("*");
  const getSetting = (key: string) => settings?.find(s => s.key === key)?.value;
  
  const enabled = getSetting("robokassa_enabled") === "true";
  if (!enabled) {
    return new Response("robokassa disabled", { status: 403 });
  }

  const testMode = getSetting("robokassa_test_mode") === "true";
  
  const pass2 = (isTest === "1" || testMode) 
    ? getSetting("robokassa_pass2_test") 
    : getSetting("robokassa_pass2");

  if (!pass2) {
    return new Response("robokassa not configured", { status: 500 });
  }

  // Generate signature to check: OutSum:InvId:Pass2
  // Custom parameters should also be included, but usually they are not needed if not passed.
  // Standard format without Shp:
  const checkString = `${outSum}:${invId}:${pass2}`;
  
  // Custom params (Shp_item=value), sorted by name if exist
  const customParams = [];
  for (const [key, value] of body.entries()) {
    if (key.toLowerCase().startsWith("shp_")) {
      customParams.push({ key, value });
    }
  }
  
  let finalCheckString = checkString;
  if (customParams.length > 0) {
    customParams.sort((a, b) => a.key.localeCompare(b.key));
    const customString = customParams.map(p => `${p.key}=${p.value}`).join(":");
    finalCheckString = `${checkString}:${customString}`;
  }

  const expectedSignature = crypto.createHash('md5').update(finalCheckString).digest('hex').toUpperCase();

  if (signature.toUpperCase() !== expectedSignature) {
    console.error(`Robokassa signature mismatch: expected ${expectedSignature}, got ${signature.toUpperCase()}`);
    return new Response("bad sign", { status: 400 });
  }

  // Update order status and deliver
  const orderId = Number(invId);
  const { data: order } = await s
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (order && order.status !== "delivered") {
    // We update to delivered and send files
    try {
      await deliverOrder(orderId);
      // Also update payment info if you want to store it
      await s.from("orders").update({ 
        payment_proof_path: "robokassa",
        admin_note: `Paid via Robokassa. Amount: ${outSum}`
      }).eq("id", orderId);
    } catch (e) {
      console.error("Robokassa deliver error:", e);
    }
  }

  return new Response(`OK${invId}`);
}
