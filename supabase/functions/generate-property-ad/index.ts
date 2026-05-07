import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  propertyData: z.object({
    price: z.string().trim().min(1).max(100),
    size: z.string().trim().min(1).max(100),
    location: z.string().trim().min(1).max(255),
    sellingPoints: z.string().trim().max(1000).optional().default(""),
  }),
  propertyImageUrl: z.string().url().optional(),
  influencerImageUrl: z.string().url().optional(),
});

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
    const { propertyData, propertyImageUrl, influencerImageUrl } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert at creating viral 10-second property ad scripts for Indonesian TikTok/Instagram Reels.

Your style:
- Start with a PATTERN INTERRUPT ("STOP", "EH", "TUNGGU", "AWAS")
- Super informal, conversational Indonesian (use "kamu", "tuh", "deh", "banget")
- Create URGENCY and FOMO
- Max 25-30 words (speakable in 10 seconds)
- Direct, punchy, like talking to a friend while scrolling

Keep it SHORT, URGENT, and SCROLLABLE.`;

    const userPrompt = `Property details:
- Price: ${propertyData.price}
- Size: ${propertyData.size} m²
- Location: ${propertyData.location}
${propertyData.sellingPoints ? `- Features: ${propertyData.sellingPoints}` : ""}

Write ONE punchy 10-second video script (max 30 words). Start with a pattern interrupt.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_property_ad",
            parameters: {
              type: "object",
              properties: { narration: { type: "string" } },
              required: ["narration"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_property_ad" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error", aiRes.status, txt);
      const status = aiRes.status === 429 ? 429 : aiRes.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: "Failed to generate script" }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { narration } = JSON.parse(args) as { narration: string };

    // Persist generation row (service role bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: row, error: insertErr } = await supabase
      .from("generations")
      .insert({
        property_data: propertyData,
        property_image_url: propertyImageUrl ?? null,
        influencer_image_url: influencerImageUrl ?? null,
        script: narration,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save generation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ output: { narration }, generationId: row.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-property-ad error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
