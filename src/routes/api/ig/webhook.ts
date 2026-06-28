import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookSignature, replyToComment, sendDirect } from "@/lib/instagram.server";

export const Route = createFileRoute("/api/ig/webhook")({
  server: {
    handlers: {
      // Meta webhook verification
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
          console.log("[IG webhook] Verified");
          return new Response(challenge, { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      // Incoming events from Instagram
      POST: async ({ request }) => {
        const bodyText = await request.text();

        // Verify signature
        const sig = request.headers.get("x-hub-signature-256") || "";
        if (!verifyWebhookSignature(bodyText, sig)) {
          console.error("[IG webhook] Invalid signature");
          return new Response("Forbidden", { status: 403 });
        }

        let body: any;
        try {
          body = JSON.parse(bodyText);
        } catch {
          return new Response("bad json", { status: 400 });
        }

        // Process asynchronously, respond immediately to Meta (must respond quickly)
        handleInstagramEvent(body).catch(e => console.error("[IG webhook] handler error:", e));

        return new Response("ok", { status: 200 });
      },
    },
  },
});

async function handleInstagramEvent(body: any) {
  const { supabaseAdmin } = await import("@/integrations-supabase/client.server");

  // Instagram sends entries array
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;

      const value = change.value;
      if (!value) continue;

      const commentId: string = value.id;
      const commentText: string = (value.text || "").trim();
      const mediaId: string = value.media?.id || "";
      const commenterIgUserId: string = value.from?.id || "";

      if (!commentId || !commentText || !mediaId || !commenterIgUserId) continue;

      // Look up rules for this media
      const { data: rules } = await supabaseAdmin
        .from("ig_rules")
        .select("*")
        .eq("media_id", mediaId)
        .eq("is_active", true);

      if (!rules || rules.length === 0) continue;

      // Check if any keyword matches the comment text
      const lowerComment = commentText.toLowerCase();
      let matchedRule: any = null;

      for (const rule of rules) {
        const keywords: string[] = rule.keywords ?? [];
        const matched = keywords.some((kw: string) => lowerComment.includes(kw.toLowerCase()));
        if (matched) {
          matchedRule = rule;
          break;
        }
      }

      if (!matchedRule) continue;

      // Log the trigger
      await supabaseAdmin.from("ig_triggers").insert({
        ig_rule_id: matchedRule.id,
        media_id: mediaId,
        comment_id: commentId,
        comment_text: commentText,
        sender_ig_id: commenterIgUserId,
      }).then(() => {});

      // Step 1: Reply to comment
      const commentReply = matchedRule.comment_reply || "Ответила вам в личные сообщения 😊";
      await replyToComment(commentId, commentReply);

      // Step 2: Try to send DM
      const dmSent = await sendDirect(commenterIgUserId, matchedRule.dm_message || "");

      // Step 3: If DM failed (closed account), send a different comment
      if (!dmSent) {
        await replyToComment(commentId,
          "Не смогла отправить вам сообщение — у вас закрытый аккаунт. Напишите мне, пожалуйста, в личные сообщения 🙏"
        );
      }
    }
  }
}
