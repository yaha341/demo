// Instagram Graph API helper
const IG_API = "https://graph.facebook.com/v21.0";

function getToken(): string {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN not configured");
  return token;
}

async function igFetch(path: string, options?: RequestInit) {
  const url = path.startsWith("http") ? path : `${IG_API}${path}`;
  const res = await fetch(url, options);
  const json = await res.json() as any;
  return { ok: res.ok, data: json };
}

/**
 * Reply to a comment on Instagram
 */
export async function replyToComment(commentId: string, message: string): Promise<boolean> {
  const token = getToken();
  const { ok, data } = await igFetch(`/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  if (!ok) console.error("[IG] replyToComment error:", data);
  return ok;
}

/**
 * Send a Direct Message to a user via Instagram Messaging API
 * Returns false if the account is closed/not accepting DMs
 */
export async function sendDirect(igUserId: string, text: string): Promise<boolean> {
  const token = getToken();

  // Get the Instagram Business Account ID (page-scoped)
  const { data: meData } = await igFetch(`/me?fields=id,name&access_token=${token}`);
  const pageId = meData?.id;
  if (!pageId) {
    console.error("[IG] Could not get page ID");
    return false;
  }

  const { ok, data } = await igFetch(`/${pageId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: igUserId },
      message: { text },
      access_token: token,
      messaging_type: "RESPONSE",
    }),
  });

  if (!ok) {
    console.error("[IG] sendDirect error:", data);
    // Check if it's a closed account / messaging restricted error
    const code = data?.error?.code;
    // 551 = Cannot send message to user not accepting messages from this page
    // 200 with subcode 2534006 = Account is restricted
    if (code === 551 || code === 200 || code === 10) {
      return false;
    }
    return false;
  }
  return true;
}

/**
 * Get info about an Instagram media object from its URL or ID
 */
export async function getMediaInfoByUrl(mediaUrl: string): Promise<{ id: string; caption: string; media_type: string } | null> {
  const token = getToken();
  // Extract shortcode from URL like https://www.instagram.com/reel/ABC123/
  // We use oEmbed to get media info
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(mediaUrl)}&access_token=${token}`
    );
    const data = await res.json() as any;
    if (data?.media_id) {
      return { id: data.media_id, caption: data.title || "", media_type: "UNKNOWN" };
    }
    return null;
  } catch (e) {
    console.error("[IG] getMediaInfoByUrl error:", e);
    return null;
  }
}

/**
 * Verify that an incoming webhook request is legitimately from Meta
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret) return true; // Skip in dev

  try {
    const crypto = require("crypto") as typeof import("crypto");
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    return expected === signature;
  } catch {
    return false;
  }
}
