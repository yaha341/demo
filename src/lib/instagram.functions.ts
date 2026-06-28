import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./admin-session.server";

async function db() {
  const { supabaseAdmin } = await import("@/integrations-supabase/client.server");
  return supabaseAdmin;
}

// List all rules
export const listIgRules = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const s = await db();
  const { data } = await s
    .from("ig_rules")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
});

// Create or update a rule
export const saveIgRule = createServerFn({ method: "POST" })
  .validator((d: {
    id?: string;
    media_id: string;
    media_url: string;
    media_title: string;
    keywords: string[];
    dm_message: string;
    comment_reply: string;
    is_active: boolean;
  }) => d)
  .handler(async (ctx) => {
    await requireAdmin();
    const s = await db();
    const { id, ...rest } = ctx.data;

    if (id) {
      const { error } = await s.from("ig_rules").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await s.from("ig_rules").insert(rest);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Delete a rule
export const deleteIgRule = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async (ctx) => {
    await requireAdmin();
    const s = await db();
    const { error } = await s.from("ig_rules").delete().eq("id", ctx.data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Toggle active state
export const toggleIgRule = createServerFn({ method: "POST" })
  .validator((d: { id: string; is_active: boolean }) => d)
  .handler(async (ctx) => {
    await requireAdmin();
    const s = await db();
    const { error } = await s.from("ig_rules").update({ is_active: ctx.data.is_active }).eq("id", ctx.data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// List recent triggers (log)
export const listIgTriggers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const s = await db();
  const { data } = await s
    .from("ig_triggers")
    .select("*, ig_rules(media_title)")
    .order("triggered_at", { ascending: false })
    .limit(50);
  return data ?? [];
});
