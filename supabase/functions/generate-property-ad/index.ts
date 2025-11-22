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

    // System prompt for Indonesian property ad generation
    const systemPrompt = `Anda adalah asisten pembuat iklan properti profesional untuk pasar Indonesia. 
Tugas Anda adalah membuat konten iklan yang menarik, persuasif, dan mengonversi calon pembeli di Facebook Marketplace dan WhatsApp.

Tone: Ramah, terpercaya, menciptakan urgency secara halus
Bahasa: Indonesia yang natural dan mudah dipahami
Target: Pembeli properti serius di Indonesia

Anda harus mengembalikan output dalam format JSON dengan struktur berikut:
{
  "short_hook": "Headline 1 kalimat yang menarik perhatian",
  "ad_copy": "2-3 kalimat iklan yang persuasif dan lengkap",
  "narration": "Skrip narasi ramah untuk voiceover (3-4 kalimat)",
  "full_script": "Skrip video lengkap dengan section [Opening], [Main Content], [Closing]",
  "key_points": ["3-5 poin selling point dalam bentuk array"],
  "cta": "Call-to-action yang mendorong pembeli menghubungi via WhatsApp"
}`;

    const userPrompt = `Buatkan iklan properti dengan detail berikut:

Lokasi: ${propertyData.location}
Harga: Rp ${propertyData.price}
Ukuran Tanah: ${propertyData.size}
${propertyData.sellingPoints ? `Selling Points: ${propertyData.sellingPoints}` : ''}

Hasilkan konten iklan yang:
1. Menarik perhatian sejak awal
2. Menekankan value dan keuntungan investasi
3. Menciptakan urgency secara halus
4. Mengajak pembeli serius untuk chat via WhatsApp

Format output harus dalam JSON seperti yang dijelaskan di system prompt.`;

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
              description: "Generate structured property ad content in Indonesian",
              parameters: {
                type: "object",
                properties: {
                  short_hook: { 
                    type: "string",
                    description: "One-line attention-grabbing headline"
                  },
                  ad_copy: { 
                    type: "string",
                    description: "2-3 sentence persuasive ad copy"
                  },
                  narration: { 
                    type: "string",
                    description: "Friendly narration script for voiceover"
                  },
                  full_script: { 
                    type: "string",
                    description: "Complete video script with sections"
                  },
                  key_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 key selling points"
                  },
                  cta: { 
                    type: "string",
                    description: "Call-to-action encouraging WhatsApp contact"
                  }
                },
                required: ["short_hook", "ad_copy", "narration", "full_script", "key_points", "cta"],
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
