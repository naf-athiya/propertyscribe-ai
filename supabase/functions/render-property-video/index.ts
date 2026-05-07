import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  generationId: z.string().uuid(),
});

// fal.ai model — change here if you want a different Veed endpoint.
// Default: Veed avatar text-to-video (influencer photo + script).
const FAL_MODEL = Deno.env.get("FAL_MODEL") ?? "veed/avatars/text-to-video";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FAL_KEY = Deno.env.get("FAL_KEY");
    if (!FAL_KEY) {
      return new Response(JSON.stringify({ error: "FAL_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: row, error: rowErr } = await supabase
      .from("generations")
      .select("*")
      .eq("id", parsed.data.generationId)
      .single();

    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: "Generation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!row.influencer_image_url || !row.script) {
      return new Response(
        JSON.stringify({ error: "Missing influencer image or script" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build webhook URL so fal.ai notifies us when the render is done
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/fal-webhook?generationId=${row.id}`;

    // fal.ai queue submission with webhook
    const falRes = await fetch(
      `https://queue.fal.run/${FAL_MODEL}?fal_webhook=${encodeURIComponent(webhookUrl)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // These are the fields commonly accepted by fal Veed avatar models.
          // Adjust if your working call uses different field names.
          avatar_image_url: row.influencer_image_url,
          image_url: row.influencer_image_url,
          background_image_url: row.property_image_url,
          text: row.script,
          script: row.script,
        }),
      }
    );

    const falJson = await falRes.json();
    if (!falRes.ok) {
      console.error("fal.ai error", falRes.status, falJson);
      await supabase
        .from("generations")
        .update({ status: "failed", error: JSON.stringify(falJson).slice(0, 500) })
        .eq("id", row.id);
      return new Response(JSON.stringify({ error: "fal.ai submission failed", detail: falJson }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("generations")
      .update({
        status: "processing",
        fal_request_id: falJson.request_id ?? null,
      })
      .eq("id", row.id);

    return new Response(
      JSON.stringify({ ok: true, requestId: falJson.request_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("render-property-video error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
