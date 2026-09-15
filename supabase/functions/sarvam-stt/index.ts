import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";
const SARVAM_TIMEOUT_MS = 30000;

const VALID_LANGUAGES = new Set(["en-IN", "hi-IN", "te-IN"]);

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

    const contentType = req.headers.get("Content-Type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Request must be multipart/form-data with an audio file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const language = (formData.get("language") as string) ?? "en-IN";

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "Audio file is required (field name: 'file')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!VALID_LANGUAGES.has(language)) {
      return new Response(
        JSON.stringify({ error: `Invalid language '${language}'. Supported: en-IN, hi-IN, te-IN` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build a fresh multipart body for Sarvam
    const sarvamForm = new FormData();
    sarvamForm.append("file", file, file.name || "audio.webm");
    sarvamForm.append("language", language);
    sarvamForm.append("model", "saarika:v2.5");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SARVAM_TIMEOUT_MS);

    try {
      const sarvamRes = await fetch(SARVAM_STT_URL, {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
        },
        body: sarvamForm,
        signal: controller.signal,
      });

      if (!sarvamRes.ok) {
        const errBody = await sarvamRes.text();
        console.error("Sarvam STT error:", sarvamRes.status, errBody);
        return new Response(
          JSON.stringify({ error: `Sarvam API returned ${sarvamRes.status}`, detail: errBody.slice(0, 500) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await sarvamRes.json();
      const transcript: string | undefined = data?.transcript;

      if (!transcript) {
        return new Response(
          JSON.stringify({ error: "Sarvam returned no transcript field", raw: JSON.stringify(data).slice(0, 500) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ transcript }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      if (err.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "Sarvam STT request timed out" }),
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
