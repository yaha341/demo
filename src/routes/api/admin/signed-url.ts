import { createFileRoute } from "@tanstack/react-router";
import { isAdminAuthed } from "@/lib/admin-session.server";

export const Route = createFileRoute("/api/admin/signed-url")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isAdminAuthed())) {
          return new Response("Unauthorized", { status: 401 });
        }
        const body = await request.json();
        const bucket = body.bucket;
        const filename = body.filename;
        if (!bucket || !["product-images", "product-files"].includes(bucket)) {
          return new Response("Bad request", { status: 400 });
        }
        
        const ext = (filename.split(".").pop() || "bin").toLowerCase().slice(0, 10);
        const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        
        const { supabaseAdmin } = await import("@/integrations-supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(key);
        
        if (error || !data) return new Response(error?.message || "Error", { status: 500 });
        
        return Response.json({ path: key, name: filename, signedUrl: data.signedUrl });
      },
    },
  },
});
