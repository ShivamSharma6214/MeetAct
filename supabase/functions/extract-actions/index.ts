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
    const { transcript, meetingId, meetingDate } = await req.json();

    if (!transcript || !meetingId) {
      return new Response(
        JSON.stringify({ error: "Missing transcript or meetingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const currentDate = meetingDate || new Date().toISOString();

    const systemPrompt = `You are an expert at extracting action items from meeting transcripts. Your task is to analyze the transcript and extract ALL action items with the following details:

1. Action Item: The specific task or action to be done
2. Owner: The person responsible (extract name and email if mentioned, format as "Name (@email)")
3. Deadline: Parse any dates mentioned (relative dates like "next Friday" should be converted to ISO format based on the meeting date: ${currentDate})
4. Priority: Infer from context - "High" for urgent/ASAP/critical, "Medium" for normal, "Low" for when possible
5. Confidence: Score 0.0-1.0 indicating how confident you are this is a real action item

Rules:
- Extract action items even if implicit ("I'll handle..." means the speaker is the owner)
- Use speaker names for ownership when mentioned ("John said he'll..." → owner: John)
- Flag low confidence (< 0.7) for ambiguous items
- Output ONLY valid JSON array, no other text`;

    const userPrompt = `Analyze this meeting transcript and extract all action items:

${transcript}

Output ONLY a JSON array with this exact schema:
[
  {
    "actionItem": "string - the task description",
    "owner": "string or null - person responsible",
    "ownerEmail": "string or null - email if detected",
    "deadline": "ISO date string or null",
    "priority": "High" | "Medium" | "Low",
    "confidence": number between 0 and 1,
    "notes": "string or null - relevant context"
  }
]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "[]";
    
    // Parse JSON from response (handle potential markdown code blocks)
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    
    let actionItems;
    try {
      actionItems = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      actionItems = [];
    }

    // Get auth context for user ID
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import Supabase client
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert action items into database
    const itemsToInsert = actionItems.map((item: Record<string, unknown>) => ({
      meeting_id: meetingId,
      user_id: user.id,
      action_item: item.actionItem || "Unnamed action",
      owner: item.owner || null,
      owner_email: item.ownerEmail || null,
      deadline: item.deadline || null,
      priority: item.priority || "Medium",
      status: "Open",
      confidence: item.confidence ?? 0.8,
      notes: item.notes || null,
    }));

    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("action_items")
        .insert(itemsToInsert);

      if (insertError) {
        console.error("Error inserting action items:", insertError);
        throw insertError;
      }
    }

    console.log(`Extracted ${itemsToInsert.length} action items for meeting ${meetingId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        actionItems: itemsToInsert,
        count: itemsToInsert.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Extract actions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
