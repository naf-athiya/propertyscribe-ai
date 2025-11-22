import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PropertyData {
  price: string;
  size: string;
  location: string;
  sellingPoints?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyData } = await req.json() as { propertyData: PropertyData };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating ad for property:", propertyData);

    // System prompt for viral 10-second scripts
    const systemPrompt = `You are an expert at creating viral 10-second property ad scripts for Indonesian TikTok/Instagram Reels.

Your style:
- Start with a PATTERN INTERRUPT ("STOP", "EH", "TUNGGU", "AWAS")
- Super informal, conversational Indonesian (use "kamu", "tuh", "deh", "banget")
- Create URGENCY and FOMO
- Max 25-30 words (speakable in 10 seconds)
- Direct, punchy, like talking to a friend while scrolling

Example tone: "STOP. Kamu lagi scroll cari tanah? Ini dia. Yang kayak gini tuh biasanya hilang dalam sehari. Serius, jangan nunggu sampe kamu nyesel—cek deh!"

Keep it SHORT, URGENT, and SCROLLABLE.`;

    const userPrompt = `Property details:
- Price: ${propertyData.price}
- Size: ${propertyData.size} m²
- Location: ${propertyData.location}
${propertyData.sellingPoints ? `- Features: ${propertyData.sellingPoints}` : ''}

Write ONE punchy 10-second video script (max 30 words). Start with a pattern interrupt. Make it urgent and conversational.`;

    // Call Lovable AI Gateway with structured output via tool calling
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_property_ad",
              description: "Generate a 10-second viral video script for property ads",
              parameters: {
                type: "object",
                properties: {
                  narration: {
                    type: "string",
                    description: "A punchy 10-second video script (max 30 words) with pattern interrupt opening, urgent tone, and conversational Indonesian"
                  }
                },
                required: ["narration"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { 
          type: "function", 
          function: { name: "generate_property_ad" } 
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate ad content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data, null, 2));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error("No tool call in response:", data);
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const generatedContent = JSON.parse(toolCall.function.arguments);
    console.log("Generated content:", generatedContent);

    return new Response(
      JSON.stringify({ output: generatedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-property-ad:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
