import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioUrl, filePath } = await req.json();

    if (!audioUrl && !filePath) {
      return new Response(
        JSON.stringify({ error: "Missing audioUrl or filePath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For now, we'll use Lovable AI for transcription since Whisper requires OpenAI key
    // In production, you'd want to use OpenAI Whisper API here
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Since we can't directly transcribe audio with Gemini, we'll return a placeholder
    // In production, integrate with OpenAI Whisper or another transcription service
    console.log("Audio transcription requested for:", filePath || audioUrl);

    // For MVP, return message asking user to paste transcript instead
    return new Response(
      JSON.stringify({ 
        transcript: "[Audio transcription requires OpenAI Whisper integration. Please paste your transcript directly for now.]",
        note: "Audio transcription feature coming soon. For now, please paste your meeting transcript directly." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Transcription failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
