import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// TTS proxy: receives text from browser, forwards to Sarvam, returns audio
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";
const SARVAM_TIMEOUT_MS = 5000;

const VALID_LANGUAGES = new Set(["en-IN", "hi-IN", "te-IN"]);
const DEFAULT_SPEAKER = "shubh";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("SarvamAiAPIKey");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Sarvam AI API key is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json() as { text?: string; target_language_code?: string; speaker?: string };

    if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const language = body.target_language_code ?? "en-IN";
    if (!VALID_LANGUAGES.has(language)) {
      return new Response(
        JSON.stringify({ error: `Invalid language '${language}'. Supported: en-IN, hi-IN, te-IN` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const speaker = body.speaker ?? DEFAULT_SPEAKER;

    const sarvamBody = {
      text: body.text,
      target_language_code: language,
      speaker: speaker,
      model: "bulbul:v3",
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SARVAM_TIMEOUT_MS);

    try {
      const sarvamRes = await fetch(SARVAM_TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey,
        },
        body: JSON.stringify(sarvamBody),
        signal: controller.signal,
      });

      if (!sarvamRes.ok) {
        const errBody = await sarvamRes.text();
        console.error("Sarvam TTS error:", sarvamRes.status, errBody);
        return new Response(
          JSON.stringify({ error: `Sarvam API returned ${sarvamRes.status}`, detail: errBody.slice(0, 500) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await sarvamRes.json();
      const audios: string[] | undefined = data?.audios;

      if (!audios || !Array.isArray(audios) || audios.length === 0) {
        return new Response(
          JSON.stringify({ error: "Sarvam returned no audios array", raw: JSON.stringify(data).slice(0, 500) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const audioBase64 = audios.join("");

      return new Response(
        JSON.stringify({ audioBase64 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      if (err.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "Sarvam TTS request timed out" }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
