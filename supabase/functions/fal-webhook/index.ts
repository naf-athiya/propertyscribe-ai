import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Recursively look for the first .url field that ends in a video extension.
function findVideoUrl(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findVideoUrl(item);
      if (found) return found;
    }
    return null;
  }
  const o = obj as Record<string, unknown>;
  if (typeof o.url === "string" && /\.(mp4|webm|mov)(\?|$)/i.test(o.url)) {
    return o.url;
  }
  if (typeof o.video === "object") {
    const v = o.video as Record<string, unknown>;
    if (typeof v.url === "string") return v.url;
  }
  for (const k of Object.keys(o)) {
    const found = findVideoUrl(o[k]);
    if (found) return found;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const generationId = url.searchParams.get("generationId");
    if (!generationId) {
      return new Response("Missing generationId", { status: 400, headers: corsHeaders });
    }

    const payload = await req.json();
    console.log("fal-webhook payload", JSON.stringify(payload).slice(0, 1000));

    const status = payload.status ?? payload.state;
    const isOk = status === "OK" || status === "COMPLETED" || payload.payload || payload.data;

    if (!isOk) {
      const errMsg = JSON.stringify(payload.error ?? payload).slice(0, 500);
      await supabase
        .from("generations")
        .update({ status: "failed", error: errMsg })
        .eq("id", generationId);
      return new Response("ok", { headers: corsHeaders });
    }

    const result = payload.payload ?? payload.data ?? payload;
    const videoUrl = findVideoUrl(result);

    if (!videoUrl) {
      await supabase
        .from("generations")
        .update({ status: "failed", error: "No video URL in fal payload" })
        .eq("id", generationId);
      return new Response("ok", { headers: corsHeaders });
    }

    // Re-host to our 'videos' bucket so URL is permanent
    let finalUrl = videoUrl;
    try {
      const vidRes = await fetch(videoUrl);
      if (vidRes.ok) {
        const buf = new Uint8Array(await vidRes.arrayBuffer());
        const path = `${generationId}.mp4`;
        const { error: upErr } = await supabase.storage
          .from("videos")
          .upload(path, buf, { contentType: "video/mp4", upsert: true });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("videos").getPublicUrl(path);
          finalUrl = pub.publicUrl;
        } else {
          console.error("upload error", upErr);
        }
      }
    } catch (e) {
      console.error("rehost failed, using original", e);
    }

    await supabase
      .from("generations")
      .update({ status: "ready", video_url: finalUrl, error: null })
      .eq("id", generationId);

    return new Response("ok", { headers: corsHeaders });
  } catch (err) {
    console.error("fal-webhook error", err);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
