
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash"; 
const FALLBACK_GEMINI_MODEL = "gemini-1.5-flash-latest";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

// --- YOUR ORIGINAL HELPER FUNCTIONS (Restored) ---

const getFileName = (filePath?: string, audioUrl?: string, explicitFileName?: string) => {
  if (explicitFileName?.trim()) {
    return explicitFileName.trim();
  }

  if (filePath) {
    const parts = filePath.split("/");
    return parts[parts.length - 1] || "meeting-audio";
  }

  if (audioUrl) {
    try {
      const pathName = new URL(audioUrl).pathname;
      const parts = pathName.split("/");
      return parts[parts.length - 1] || "meeting-audio";
    } catch {
      return "meeting-audio";
    }
  }

  return "meeting-audio";
};

const inferMimeType = (fileName: string, providedMimeType?: string) => {
  if (providedMimeType?.trim()) {
    return providedMimeType.trim();
  }

  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".wav")) return "audio/wav";
  if (lowerName.endsWith(".m4a")) return "audio/mp4";
  if (lowerName.endsWith(".mp3")) return "audio/mpeg";
  if (lowerName.endsWith(".ogg")) return "audio/ogg";
  if (lowerName.endsWith(".webm")) return "audio/webm";
  return "audio/mpeg";
};

const parseBase64Payload = (rawBase64?: string, fallbackMimeType?: string) => {
  if (!rawBase64?.trim()) {
    return { data: "", mimeType: fallbackMimeType };
  }

  const trimmed = rawBase64.trim();
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);

  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      data: dataUrlMatch[2],
    };
  }

  return {
    data: trimmed,
    mimeType: fallbackMimeType,
  };
};

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const parseGeminiJson = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (normalized.startsWith("```json")) normalized = normalized.slice(7);
  else if (normalized.startsWith("```")) normalized = normalized.slice(3);
  if (normalized.endsWith("```")) normalized = normalized.slice(0, -3);

  try {
    return JSON.parse(normalized.trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeActionItems = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const typedItem = item as Record<string, unknown>;

      return {
        actionItem: typeof typedItem.actionItem === "string" ? typedItem.actionItem : "",
        owner: typeof typedItem.owner === "string" ? typedItem.owner : null,
        deadline: typeof typedItem.deadline === "string" ? typedItem.deadline : null,
        priority: typeof typedItem.priority === "string" ? typedItem.priority : null,
        notes: typeof typedItem.notes === "string" ? typedItem.notes : null,
      };
    })
    .filter((item) => item && item.actionItem);
};

const shouldRetryWithFallbackModel = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();

  return (
    message.includes("model") &&
    (message.includes("not found") ||
      message.includes("unsupported") ||
      message.includes("is not found") ||
      message.includes("permission denied"))
  );
};

// --- MAIN HANDLER (Fixed for Deno 2.0) ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      audioUrl,
      filePath,
      meetingId,
      audioBase64,
      mimeType: requestedMimeType,
      fileName: requestedFileName,
    } = await req.json();

    if (!audioUrl && !filePath && !audioBase64) {
      return new Response(
        JSON.stringify({ error: "Missing audio input. Provide one of: filePath, audioUrl, or audioBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
    const configuredModel = Deno.env.get("GEMINI_MODEL") || DEFAULT_GEMINI_MODEL;
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY (or GOOGLE_API_KEY) is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    let resolvedFileName = getFileName(filePath, audioUrl, requestedFileName);
    let resolvedMimeType = inferMimeType(resolvedFileName, requestedMimeType);
    const parsedBase64 = parseBase64Payload(audioBase64, resolvedMimeType);
    let encodedAudio = parsedBase64.data;
    resolvedMimeType = parsedBase64.mimeType || resolvedMimeType;

    if (!encodedAudio && filePath) {
      const { data, error } = await supabase.storage.from("meeting-audio").download(filePath);
      if (error || !data) {
        throw new Error(`Failed to download audio file: ${error?.message || "unknown error"}`);
      }
      resolvedFileName = getFileName(filePath, audioUrl, requestedFileName);
      resolvedMimeType = data.type || inferMimeType(resolvedFileName, requestedMimeType);
      const audioBytes = new Uint8Array(await data.arrayBuffer());
      encodedAudio = toBase64(audioBytes);
    } else if (!encodedAudio && audioUrl) {
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio URL: ${audioResponse.status}`);
      }
      const audioBlob = await audioResponse.blob();
      resolvedFileName = getFileName(filePath, audioUrl, requestedFileName);
      resolvedMimeType = audioBlob.type || inferMimeType(resolvedFileName, requestedMimeType);
      const audioBytes = new Uint8Array(await audioBlob.arrayBuffer());
      encodedAudio = toBase64(audioBytes);
    }

    if (!encodedAudio) {
      throw new Error("Failed to read audio payload");
    }

    const estimatedAudioBytes = Math.floor((encodedAudio.length * 3) / 4);
    if (estimatedAudioBytes > MAX_AUDIO_BYTES) {
      return new Response(
        JSON.stringify({ error: "Audio file exceeds 25MB processing limit" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = [
      "Transcribe this audio with timestamps and speaker labels, then extract the action items and meeting summary.",
      "Return ONLY valid JSON with this exact schema:",
      "{",
      '  "transcript": "full transcript with [HH:MM:SS] timestamps and speaker labels",',
      '  "meetingSummary": "concise summary",',
      '  "actionItems": [',
      "    {",
      '      "actionItem": "task description",',
      '      "owner": "name or null",',
      '      "deadline": "ISO date or null",',
      '      "priority": "High|Medium|Low or null",',
      '      "notes": "optional context or null"',
      "    }",
      "  ]",
      "}",
    ].join("\n");

    const generateWithModel = async (modelName: string) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      return model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: resolvedMimeType,
            data: encodedAudio,
          },
        },
      ]);
    };

    let geminiText = "";
    let usedModel = configuredModel;

    try {
      const geminiResult = await generateWithModel(configuredModel);
      geminiText = geminiResult.response.text();
    } catch (primaryError) {
      if (!shouldRetryWithFallbackModel(primaryError)) {
        throw primaryError;
      }

      const fallbackResult = await generateWithModel(FALLBACK_GEMINI_MODEL);
      usedModel = FALLBACK_GEMINI_MODEL;
      geminiText = fallbackResult.response.text();
    }

    const parsed = parseGeminiJson(geminiText);

    const transcript =
      (parsed && typeof parsed.transcript === "string" ? parsed.transcript : geminiText).trim();
    const meetingSummary =
      parsed && typeof parsed.meetingSummary === "string" ? parsed.meetingSummary.trim() : null;
    const actionItems = normalizeActionItems(parsed?.actionItems);

    if (!transcript) {
      throw new Error("Gemini transcription returned empty transcript");
    }

    let updatedMeetingId: string | null = null;

    if (meetingId) {
      const { data: updatedMeeting, error: updateError } = await supabase
        .from("meetings")
        .update({
          transcript,
          processed_at: new Date().toISOString(),
        })
        .eq("id", meetingId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error(`Failed to update meeting: ${updateError.message}`);
      }

      updatedMeetingId = updatedMeeting?.id ?? null;
    } else if (audioUrl) {
      const { data: existingMeeting } = await supabase
        .from("meetings")
        .select("id")
        .eq("user_id", user.id)
        .eq("audio_url", audioUrl)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingMeeting?.id) {
        const { error: updateError } = await supabase
          .from("meetings")
          .update({
            transcript,
            processed_at: new Date().toISOString(),
          })
          .eq("id", existingMeeting.id)
          .eq("user_id", user.id);

        if (updateError) {
          throw new Error(`Failed to update meeting: ${updateError.message}`);
        }

        updatedMeetingId = existingMeeting.id;
      }
    }

    return new Response(
      JSON.stringify({
        transcript,
        meetingSummary,
        actionItems,
        meetingUpdated: Boolean(updatedMeetingId),
        meetingId: updatedMeetingId,
        model: usedModel,
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