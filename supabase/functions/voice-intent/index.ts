import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Request / response types ──────────────────────────────────────────────

interface IntentRequest {
  transcript: string;
  currentPage: string;
  activeTab: string | null;
  visibleData: object | null;
  voiceSession: object | null;
  language: string;
  screenContent: string | null;
}

interface LlmIntentResult {
  intent: string;
  sub_target: string | null;
  slots: Record<string, string>;
  confidence: number;
}

// ── Gemini API call ───────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_TIMEOUT_MS = 12000;
// v2: updated model + timeout

function buildSystemPrompt(): string {
  return [
    "You are the intent parser for Sasya Setu, a multilingual (English, Telugu, Hindi) agricultural app.",
    "Given a voice transcript and the current app context, determine the user's intent.",
    "",
    "Return ONLY a JSON object with exactly these fields:",
    '{ "intent": string, "sub_target": string | null, "slots": object, "confidence": number }',
    "",
    "Intent values (use the closest match):",
    "  navigate, add_crop, mark_harvested, post_demand, start_journey,",
    "  open_map, pay_balance, language, role_select, read_screen,",
    "  confirm, cancel_confirm, back, stop, undo, redo,",
    "  fill_slot, field_change, cancel_crop, continue_crop,",
    "  voice_login, login_mobile, login_otp, login_category, unknown",
    "",
    "sub_target: the destination view for navigate (e.g. \"crops\", \"market\", \"storage\",",
    "  \"transport\", \"calendar\", \"fpo\", \"help\", \"home\", \"profile\", \"tutorials\",",
    "  \"orders\", \"deals\", \"settings\", \"notifications\"), or the role for role_select",
    '  (e.g. "Farmer", "Buyer", "FPO", "Storage Provider", "Transport Provider"),',
    "  or the field name for field_change, or null if not applicable.",
    "",
    "slots: key-value pairs extracted from the transcript, e.g.",
    '  {"cropName":"Tomato","quantity":"500"} or {"language":"Telugu"}.',
    "  Empty object {} if no slots.",
    "",
    "confidence: your confidence from 0.0 to 1.0.",
    "",
    "Respond with ONLY the JSON object. No markdown, no explanation, no code fences.",
  ].join("\n");
}

function buildUserPrompt(req: IntentRequest): string {
  const context: string[] = [
    `Transcript: "${req.transcript}"`,
    `Current page: ${req.currentPage}`,
  ];
  if (req.activeTab) context.push(`Active tab: ${req.activeTab}`);
  if (req.visibleData) context.push(`Visible data: ${JSON.stringify(req.visibleData)}`);
  if (req.screenContent) context.push(`Screen content: ${req.screenContent.slice(0, 1500)}`);
  if (req.voiceSession) context.push(`Voice session: ${JSON.stringify(req.voiceSession)}`);
  return context.join("\n");
}

async function describeScreen(screenContent: string, lang: string): Promise<string | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  const langName = lang === "te" ? "Telugu" : lang === "hi" ? "Hindi" : "English";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: `You are a screen reader for Sasya Setu, a multilingual agricultural app. Describe what is currently visible on the screen in ${langName}. Be concise and natural for spoken output. Mention the page title, key sections, and important details like crop names, quantities, prices, or statuses. Keep it under 3 sentences. Respond with ONLY the description text — no JSON, no markdown, no code fences.` }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: `Screen content:\n${screenContent.slice(0, 3000)}` }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Gemini describeScreen error:", res.status, errBody);
      return null;
    }

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() ?? null;
  } catch (err) {
    console.error("describeScreen failed:", err.message || err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(req: IntentRequest): Promise<LlmIntentResult | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: buildSystemPrompt() }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildUserPrompt(req) }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Gemini API error:", res.status, errBody);
      return null;
    }

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as LlmIntentResult;
    if (typeof parsed.intent !== "string") return null;

    return {
      intent: parsed.intent,
      sub_target: parsed.sub_target ?? null,
      slots: parsed.slots ?? {},
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch (err) {
    console.error("Gemini call failed:", err.message || err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Rule-based fallback (preserved from original) ──────────────────────────

interface IntentRequestLegacy {
  transcript: string;
  language: "en" | "te" | "hi";
  currentView?: string;
  activeIntent?: string | null;
  step?: string | null;
  slots?: Record<string, string>;
  awaitingConfirmation?: boolean;
  screenContext?: string;
}

interface IntentResponse {
  intent: string;
  view?: string;
  slots?: Record<string, string>;
  fieldChange?: string;
  value?: string;
  unavailable?: boolean;
  stopSession?: boolean;
  goBack?: boolean;
  undo?: boolean;
  redo?: boolean;
  confirmYes?: boolean;
  confirmNo?: boolean;
  cancelCrop?: boolean;
  continueCrop?: boolean;
  languageChange?: string;
  role?: string;
  readScreen?: boolean;
  confidence: number;
}

const STOP_WORDS: Record<string, string[]> = {
  en: ["stop", "cancel", "close assistant", "close", "stop listening", "exit", "nevermind", "never mind"],
  te: ["ఆపు", "రద్దు", "క్లోజ్", "బయటకు", "ఆపండి", "వదిలించు"],
  hi: ["रोको", "रद्द", "बंद", "बंद करो", "बाहर", "छोड़ो"],
};

const BACK_WORDS: Record<string, string[]> = {
  en: ["go back", "back", "previous", "return"],
  te: ["వెనుకకు", "తిరిగి", "వెనుక"],
  hi: ["पीछे", "वापस", "पिछला"],
};

const UNDO_WORDS: Record<string, string[]> = {
  en: ["undo", "change back", "revert", "go back to"],
  te: ["చెయ్", "వెనక్కి మార్చు", "రద్దు చేయ్"],
  hi: ["पहले जैसा", "वापस लाएं", "उलटें"],
};

const REDO_WORDS: Record<string, string[]> = {
  en: ["redo", "repeat", "say again", "again", "do that again"],
  te: ["మళ్లీ", "మరల", "పునరావృతం", "మళ్లీ చెప్పు"],
  hi: ["फिर से", "दोहराएं", "दोबारा", "मौली"],
};

const YES_WORDS: Record<string, string[]> = {
  en: ["yes", "yeah", "correct", "right", "confirm", "confirmed", "save", "save it", "go ahead", "sure", "okay", "ok", "proceed", "yes proceed", "looks good", "that's correct", "verify", "submit"],
  te: ["అవును", "సరే", "కచ్చితంగా", "దాచు", "నిజం", "సరైనది", "ధృవీకరించు", "కొనసాగించు"],
  hi: ["हाँ", "हां", "सही", "बिल्कुल", "सेव", "दबाएँ", "ठीक है", "आगे बढ़ो", "पुष्टि", "जारी रखें"],
};

const NO_WORDS: Record<string, string[]> = {
  en: ["no", "nope", "cancel", "change", "don't save", "do not save", "wrong", "not correct", "edit"],
  te: ["కాదు", "వద్దు", "రద్దు", "తప్పు", "మార్చు", "వద్దు"],
  hi: ["नहीं", "रद्द", "गलत", "बदलो", "मत", "नहीं सेव"],
};

const CANCEL_CROP_WORDS: Record<string, string[]> = {
  en: ["cancel crop", "cancel form", "cancel add", "discard crop", "never mind crop"],
  te: ["పంట రద్దు", "ఫారమ్ రద్దు", "పంట వదిలించు"],
  hi: ["फसल रद्द", "फॉर्म रद्द", "फसल छोड़ो"],
};

const CONTINUE_CROP_WORDS: Record<string, string[]> = {
  en: ["continue crop", "resume crop", "continue form", "resume form", "keep going"],
  te: ["పంట కొనసాగించు", "ఫారమ్ కొనసాగించు", "కొనసాగించు"],
  hi: ["फसल जारी", "फॉर्म जारी", "जारी रखें"],
};

const READ_SCREEN_WORDS: Record<string, string[]> = {
  en: ["read screen", "what's on screen", "what is on screen", "read page", "what do you see", "describe page", "read aloud", "what's here", "what is here"],
  te: ["స్క్రీన్ చదవండి", "పేజీ చదవండి", "ఇందులో ఏమి ఉంది", "చదివి వినిపించు"],
  hi: ["स्क्रीन पढ़ो", "पेज पढ़ो", "यहाँ क्या है", "यहां क्या है", "पढ़कर सुनाओ"],
};

const ROLE_MAP: { lang: string; patterns: string[]; role: string }[] = [
  { lang: "en", role: "Farmer", patterns: ["farmer login", "log in as farmer", "login as farmer", "open farmer", "farmer"] },
  { lang: "en", role: "FPO", patterns: ["fpo login", "log in as fpo", "login as fpo", "open fpo"] },
  { lang: "en", role: "Buyer", patterns: ["buyer login", "log in as buyer", "login as buyer", "open buyer", "buyer", "log in as a buyer", "login as a buyer", "i want to log in as buyer", "i want to login as buyer"] },
  { lang: "en", role: "Storage Provider", patterns: ["storage login", "log in as storage", "login as storage", "open storage provider", "storage provider"] },
  { lang: "en", role: "Transport Provider", patterns: ["transport login", "log in as transport", "login as transport", "open transport provider", "transport provider"] },
  { lang: "te", role: "Farmer", patterns: ["రైతు లాగిన్", "రైతుగా లాగిన్", "రైతు"] },
  { lang: "te", role: "FPO", patterns: ["ఎఫ్‌పిఓ లాగిన్", "ఎఫ్‌పిఓగా లాగిన్"] },
  { lang: "te", role: "Buyer", patterns: ["కొనుగోలుదారు లాగిన్", "కొనుగోలుదారుగా లాగిన్"] },
  { lang: "te", role: "Storage Provider", patterns: ["నిల్వ లాగిన్", "నిల్వ సేవా ప్రదాత లాగిన్"] },
  { lang: "te", role: "Transport Provider", patterns: ["రవాణా లాగిన్", "రవాణా సేవా ప్రదాత లాగిన్"] },
  { lang: "hi", role: "Farmer", patterns: ["किसान लॉगिन", "किसान के रूप में लॉगिन", "किसान"] },
  { lang: "hi", role: "FPO", patterns: ["एफपीओ लॉगिन", "एफपीओ के रूप में लॉगिन"] },
  { lang: "hi", role: "Buyer", patterns: ["खरीदार लॉगिन", "खरीदार के रूप में लॉगिन"] },
  { lang: "hi", role: "Storage Provider", patterns: ["भंडारण लॉगिन", "भंडारण सेवा प्रदाता लॉगिन"] },
  { lang: "hi", role: "Transport Provider", patterns: ["परिवहन लॉगिन", "परिवहन सेवा प्रदाता लॉगिन"] },
];

const BUYER_CATEGORY_MAP: { lang: string; patterns: string[]; category: string }[] = [
  { lang: "en", category: "Normal Buyer", patterns: ["normal buyer", "normal"] },
  { lang: "en", category: "Bulk Buyer", patterns: ["bulk buyer", "bulk"] },
  { lang: "en", category: "Retail Buyer", patterns: ["retail buyer", "retail"] },
  { lang: "en", category: "Institutional Buyer", patterns: ["institutional buyer", "institutional"] },
  { lang: "te", category: "Normal Buyer", patterns: ["సాధారణ కొనుగోలుదారు", "సాధారణ"] },
  { lang: "te", category: "Bulk Buyer", patterns: ["బల్క్ కొనుగోలుదారు", "బల్క్"] },
  { lang: "te", category: "Retail Buyer", patterns: ["రిటైల్ కొనుగోలుదారు", "రిటైల్"] },
  { lang: "te", category: "Institutional Buyer", patterns: ["సంస్థాగత కొనుగోలుదారు", "సంస్థాగత"] },
  { lang: "hi", category: "Normal Buyer", patterns: ["सामान्य खरीदार", "सामान्य"] },
  { lang: "hi", category: "Bulk Buyer", patterns: ["बल्क खरीदार", "बल्क"] },
  { lang: "hi", category: "Retail Buyer", patterns: ["रिटेल खरीदार", "रिटेल"] },
  { lang: "hi", category: "Institutional Buyer", patterns: ["संस्थागत खरीदार", "संस्थागत"] },
];

const FIELD_CHANGE_MAP: Record<string, { trigger: string; field: string }[]> = {
  en: [
    { trigger: "change crop name", field: "cropName" },
    { trigger: "change crop", field: "cropName" },
    { trigger: "change quantity", field: "quantity" },
    { trigger: "change available", field: "available" },
    { trigger: "change status", field: "status" },
    { trigger: "change date", field: "date" },
    { trigger: "change area", field: "area" },
    { trigger: "change yield", field: "yield" },
    { trigger: "change price", field: "price" },
  ],
  te: [
    { trigger: "పంట మార్చు", field: "cropName" },
    { trigger: "పరిమాణం మార్చు", field: "quantity" },
    { trigger: "తేదీ మార్చు", field: "date" },
    { trigger: "విస్తీర్ణం మార్చు", field: "area" },
    { trigger: "ధర మార్చు", field: "price" },
  ],
  hi: [
    { trigger: "फसल बदलो", field: "cropName" },
    { trigger: "मात्रा बदलो", field: "quantity" },
    { trigger: "तारीख बदलो", field: "date" },
    { trigger: "क्षेत्र बदलो", field: "area" },
    { trigger: "कीमत बदलो", field: "price" },
  ],
};

const COMMAND_MAP: Record<string, { patterns: string[]; intent: string; view?: string; unavailable?: boolean }[]> = {
  en: [
    { patterns: ["language", "change language"], intent: "language" },
    { patterns: ["profile", "my profile", "open profile"], intent: "navigate", view: "profile" },
    { patterns: ["tutorial", "tutorials", "open tutorial", "open tutorials"], intent: "navigate", view: "tutorials" },
    { patterns: ["my farm", "my crop", "show crop", "crops", "open crop", "show my crops", "farmer crop", "show harvest", "farmer tab"], intent: "navigate", view: "crops" },
    { patterns: ["add crop", "create crop", "new crop", "add a crop", "add crops", "enter crop details", "sell crop", "add crop today"], intent: "add_crop", view: "crop-create" },
    { patterns: ["mark harvest", "harvest crop", "mark as harvested"], intent: "mark_harvested", view: "crops" },
    { patterns: ["upcoming crop", "upcoming crops", "show upcoming"], intent: "navigate", view: "crops" },
    { patterns: ["harvested crop", "harvested crops", "ready crop", "ready crops"], intent: "navigate", view: "crops" },
    { patterns: ["browse crop", "explore crop", "market", "browse", "explore", "show market crops", "find crops to buy"], intent: "navigate", view: "market" },
    { patterns: ["storage", "find storage"], intent: "navigate", view: "storage" },
    { patterns: ["transport", "book transport", "open transport"], intent: "navigate", view: "transport-options" },
    { patterns: ["post demand", "demand"], intent: "post_demand", unavailable: true },
    { patterns: ["track order", "my order", "orders", "my orders"], intent: "navigate", view: "orders" },
    { patterns: ["map", "open map"], intent: "open_map", unavailable: true },
    { patterns: ["pay balance", "payment", "pay"], intent: "pay_balance", unavailable: true },
    { patterns: ["request", "view request", "requests", "view requests"], intent: "navigate", view: "features" },
    { patterns: ["journey", "start journey", "live journey"], intent: "start_journey", unavailable: true },
    { patterns: ["home", "go home", "back to home"], intent: "navigate", view: "home" },
    { patterns: ["help", "help and dispute", "dispute"], intent: "navigate", view: "help" },
    { patterns: ["fpo", "fpo network"], intent: "navigate", view: "fpo" },
    { patterns: ["calendar", "harvest calendar"], intent: "navigate", view: "calendar" },
    { patterns: ["settings", "open settings"], intent: "navigate", view: "settings" },
    { patterns: ["notifications", "show notifications", "open notifications"], intent: "navigate", view: "notifications" },
    { patterns: ["orders tab", "show orders", "go to orders"], intent: "navigate", view: "orders" },
    { patterns: ["deals", "show deals", "go to deals"], intent: "navigate", view: "deals" },
  ],
  te: [
    { patterns: ["భాష", "భాష మార్చండి"], intent: "language" },
    { patterns: ["ప్రొఫైల్", "నా ప్రొఫైల్"], intent: "navigate", view: "profile" },
    { patterns: ["ట్యుటోరియల్", "ట్యుటోరియల్స్"], intent: "navigate", view: "tutorials" },
    { patterns: ["నా పంటలు", "పంటలు", "పంట", "పంటలు చూపించు", "నా పొలం"], intent: "navigate", view: "crops" },
    { patterns: ["పంట జోడించండి", "కొత్త పంట", "పంట చేర్చండి", "పంట అమ్మండి"], intent: "add_crop", view: "crop-create" },
    { patterns: ["పంట పండింది", "కటాయ"], intent: "mark_harvested", view: "crops" },
    { patterns: ["మార్కెట్", "పంటలను అన్వేషించండి", "బ్రౌజ్", "కొనడానికి పంటలు"], intent: "navigate", view: "market" },
    { patterns: ["నిల్వ", "నిల్వ కనుగొనండి"], intent: "navigate", view: "storage" },
    { patterns: ["రవాణా", "రవాణా బుక్", "రవాణా తెరువు"], intent: "navigate", view: "transport-options" },
    { patterns: ["డిమాండ్", "డిమాండ్ పోస్ట్"], intent: "post_demand", unavailable: true },
    { patterns: ["ఆర్డర్", "నా ఆర్డర్లు", "ట్రాక్"], intent: "navigate", view: "orders" },
    { patterns: ["మ్యాప్", "మ్యాప్ తెరువు"], intent: "open_map", unavailable: true },
    { patterns: ["చెల్లింపు", "బ్యాలెన్స్"], intent: "pay_balance", unavailable: true },
    { patterns: ["అభ్యర్థన", "అభ్యర్థనలు"], intent: "navigate", view: "features" },
    { patterns: ["ప్రయాణం", "లైవ్ ప్రయాణం"], intent: "start_journey", unavailable: true },
    { patterns: ["హోమ్", "ఇంటికి"], intent: "navigate", view: "home" },
    { patterns: ["సహాయం", "వివాదం"], intent: "navigate", view: "help" },
    { patterns: ["ఎఫ్‌పిఓ", "ఎఫ్‌పిఓ నెట్‌వర్క్"], intent: "navigate", view: "fpo" },
    { patterns: ["క్యాలెండర్", "పంట క్యాలెండర్"], intent: "navigate", view: "calendar" },
    { patterns: ["సెట్టింగ్‌లు", "సెట్టింగ్‌లు తెరువు"], intent: "navigate", view: "settings" },
  ],
  hi: [
    { patterns: ["भाषा", "भाषा बदलें"], intent: "language" },
    { patterns: ["प्रोफ़ाइल", "मेरी प्रोफ़ाइल"], intent: "navigate", view: "profile" },
    { patterns: ["ट्यूटोरियल", "ट्यूटोरियल्स"], intent: "navigate", view: "tutorials" },
    { patterns: ["मेरी फसल", "फसल", "फसलें", "फसल दिखाओ", "मेरा खेत"], intent: "navigate", view: "crops" },
    { patterns: ["फसल जोड़ें", "नई फसल", "फसल करें", "फसल बेचें"], intent: "add_crop", view: "crop-create" },
    { patterns: ["कटाई", "फसल कटाई"], intent: "mark_harvested", view: "crops" },
    { patterns: ["बाज़ार", "फसलें खोजें", "ब्राउज़", "खरीदने के लिए फसलें"], intent: "navigate", view: "market" },
    { patterns: ["भंडारण", "भंडारण खोजें"], intent: "navigate", view: "storage" },
    { patterns: ["परिवहन", "परिवहन बुक", "परिवहन खोलो"], intent: "navigate", view: "transport-options" },
    { patterns: ["मांग", "मांग पोस्ट"], intent: "post_demand", unavailable: true },
    { patterns: ["आदेश", "मेरे आदेश", "ट्रैक"], intent: "navigate", view: "orders" },
    { patterns: ["मानचित्र", "मानचित्र खोलो"], intent: "open_map", unavailable: true },
    { patterns: ["भुगतान", "शेष राशि"], intent: "pay_balance", unavailable: true },
    { patterns: ["अनुरोध", "अनुरोध देखें", "अनुरोध"], intent: "navigate", view: "features" },
    { patterns: ["यात्रा", "लाइव यात्रा"], intent: "start_journey", unavailable: true },
    { patterns: ["होम", "घर", "होम पर"], intent: "navigate", view: "home" },
    { patterns: ["सहायता", "विवाद", "सहायता और विवाद"], intent: "navigate", view: "help" },
    { patterns: ["एफपीओ", "एफपीओ नेटवर्क"], intent: "navigate", view: "fpo" },
    { patterns: ["कैलेंडर", "फसल कैलेंडर"], intent: "navigate", view: "calendar" },
    { patterns: ["सेटिंग्स", "सेटिंग्स खोलो"], intent: "navigate", view: "settings" },
  ],
};

const LANG_KEYWORDS: { lang: string; words: string[] }[] = [
  { lang: "English", words: ["english", "ఇంగ్లీష్", "इंग्लिश", "अंग्रेज़ी"] },
  { lang: "తెలుగు", words: ["telugu", "తెలుగు", "तेलुगू", "तेलगु"] },
  { lang: "हिन्दी", words: ["hindi", "हिन्दी", "हिंदी", "హిందీ"] },
];

const NUMBER_WORDS: Record<string, number> = {
  "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
  "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
  "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20,
  "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60,
  "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100,
  "thousand": 1000,
  "ఒక": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "దు": 5,
  "ఆరు": 6, "డు": 7, "ఎనిమిది": 8, "తొమ్మిది": 9, "పది": 10,
  "వంద": 100, "వెయ్యి": 1000,
  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5,
  "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
  "सौ": 100, "हज़ार": 1000,
};

function matchAny(lower: string, words: string[]): boolean {
  return words.some((w) => lower.includes(w.toLowerCase()));
}

const DIGIT_WORDS: Record<string, string> = {
  "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
  "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
  "won": "1", "too": "2", "to": "2", "tree": "3", "for": "4", "fore": "4",
  "fife": "5", "sicks": "6", "seen": "7", "ate": "8", "niner": "9",
  "first": "1", "second": "2", "third": "3", "fourth": "4", "fifth": "5",
  "sixth": "6", "seventh": "7", "eighth": "8", "ninth": "9",
  "సున్నా": "0", "ఒక": "1", "రెండు": "2", "మూడు": "3", "నాలుగు": "4",
  "దు": "5", "ఆరు": "6", "ఏడు": "7", "ఎనిమిది": "8", "తొమ్మిది": "9",
  "शून्य": "0", "एक": "1", "दो": "2", "तीन": "3", "चार": "4",
  "पांच": "5", "छह": "6", "सात": "7", "आठ": "8", "नौ": "9",
};

function parseDigitSequence(text: string): string {
  const direct = text.replace(/[^0-9]/g, "").trim();
  if (direct) return direct;
  const lower = text.toLowerCase().trim();
  const words = lower.split(/[\s,.]+/);
  const digits: string[] = [];
  for (const w of words) {
    if (w in DIGIT_WORDS) digits.push(DIGIT_WORDS[w]);
  }
  return digits.join("");
}

function parseNumber(text: string): string {
  const direct = text.replace(/[^0-9.]/g, "").trim();
  if (direct) return direct;
  const lower = text.toLowerCase().trim();
  const words = lower.split(/[\s,.]+/);
  let total = 0;
  let found = false;
  for (const w of words) {
    if (w in NUMBER_WORDS) { total += NUMBER_WORDS[w]; found = true; }
  }
  return found ? String(total) : "";
}

function parseStatusValue(text: string, lang: string): "Upcoming" | "Harvested" | null {
  const lower = text.toLowerCase().trim();
  const upcoming: Record<string, string[]> = {
    en: ["upcoming", "not yet", "still growing", "growing", "not ready"],
    te: ["రాబోతున్న", "పండని", "పెరుగుతున్న"],
    hi: ["आने वाली", "अपेक्षित", "बढ़ रही", "अभी नहीं"],
  };
  const harvested: Record<string, string[]> = {
    en: ["harvested", "ready", "done", "cut"],
    te: ["పండింది", "కటాయ", "సిద్ధం"],
    hi: ["कटाई", "तैयार", "कट गई"],
  };
  if ((upcoming[lang] || []).some((w) => lower.includes(w.toLowerCase()))) return "Upcoming";
  if ((harvested[lang] || []).some((w) => lower.includes(w.toLowerCase()))) return "Harvested";
  return null;
}

function detectLang(text: string): "en" | "te" | "hi" {
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

function parseIntent(req: IntentRequestLegacy): IntentResponse {
  const lower = req.transcript.toLowerCase().trim();
  const lang = req.language;

  if (matchAny(lower, STOP_WORDS[lang] || [])) {
    return { intent: "stop", stopSession: true, confidence: 0.95 };
  }

  if (matchAny(lower, READ_SCREEN_WORDS[lang] || [])) {
    return { intent: "read_screen", readScreen: true, confidence: 0.9 };
  }

  if (matchAny(lower, BACK_WORDS[lang] || [])) {
    return { intent: "back", goBack: true, confidence: 0.85 };
  }

  if (matchAny(lower, UNDO_WORDS[lang] || [])) {
    return { intent: "undo", undo: true, confidence: 0.8 };
  }

  if (matchAny(lower, REDO_WORDS[lang] || [])) {
    return { intent: "redo", redo: true, confidence: 0.8 };
  }

  if (req.awaitingConfirmation) {
    if (matchAny(lower, YES_WORDS[lang] || [])) {
      return { intent: "confirm", confirmYes: true, confidence: 0.9 };
    }
    if (matchAny(lower, NO_WORDS[lang] || [])) {
      return { intent: "cancel_confirm", confirmNo: true, confidence: 0.9 };
    }
    return { intent: "unknown", confidence: 0.3 };
  }

  if (req.activeIntent === "add_crop") {
    if (matchAny(lower, CANCEL_CROP_WORDS[lang] || [])) {
      return { intent: "cancel_crop", cancelCrop: true, confidence: 0.9 };
    }
    if (matchAny(lower, CONTINUE_CROP_WORDS[lang] || [])) {
      return { intent: "continue_crop", continueCrop: true, confidence: 0.85 };
    }

    const fieldChanges = FIELD_CHANGE_MAP[lang] || [];
    for (const { trigger, field } of fieldChanges) {
      if (lower.includes(trigger.toLowerCase())) {
        const valueText = req.transcript.replace(/.*(?:change|మార్చు|बदलो)/i, "").trim();
        const numVal = parseNumber(valueText) || valueText;
        return { intent: "field_change", fieldChange: field, value: numVal, confidence: 0.85 };
      }
    }

    const status = parseStatusValue(req.transcript, lang);
    if (status) {
      return { intent: "fill_slot", slots: { status }, confidence: 0.8 };
    }

    const num = parseNumber(req.transcript);
    if (num) {
      return { intent: "fill_slot_value", value: num, confidence: 0.7 };
    }

    return { intent: "fill_slot_text", value: req.transcript.trim(), confidence: 0.6 };
  }

  for (const { lang: lc, patterns, role } of ROLE_MAP) {
    if (lc !== lang) continue;
    for (const p of patterns) {
      if (lower.includes(p.toLowerCase())) {
        return { intent: "role_select", role, confidence: 0.9 };
      }
    }
  }

  if (req.activeIntent === "voice_login") {
    const digits = parseDigitSequence(req.transcript);
    if (req.step === "awaiting_mobile") {
      if (digits.length >= 10) {
        return { intent: "login_mobile", slots: { mobile: digits.slice(0, 10) }, confidence: 0.85 };
      }
    }
    if (req.step === "awaiting_otp") {
      if (digits.length >= 4) {
        return { intent: "login_otp", slots: { otp: digits.slice(0, 6) }, confidence: 0.85 };
      }
    }
    if (req.step === "awaiting_category") {
      for (const { lang: lc, patterns, category } of BUYER_CATEGORY_MAP) {
        if (lc !== lang) continue;
        for (const p of patterns) {
          if (lower.includes(p.toLowerCase())) {
            return { intent: "login_category", slots: { category }, confidence: 0.85 };
          }
        }
      }
    }
    if (matchAny(lower, YES_WORDS[lang] || [])) {
      return { intent: "confirm", confirmYes: true, confidence: 0.9 };
    }
    if (matchAny(lower, NO_WORDS[lang] || [])) {
      return { intent: "cancel_confirm", confirmNo: true, confidence: 0.9 };
    }
    return { intent: "unknown", confidence: 0.3 };
  }

  for (const cmd of COMMAND_MAP[lang] || []) {
    for (const pattern of cmd.patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return {
          intent: cmd.intent,
          view: cmd.view,
          unavailable: cmd.unavailable,
          confidence: 0.85,
        };
      }
    }
  }

  if (matchAny(lower, YES_WORDS[lang] || [])) {
    return { intent: "confirm", confirmYes: true, confidence: 0.7 };
  }
  if (matchAny(lower, NO_WORDS[lang] || [])) {
    return { intent: "cancel_confirm", confirmNo: true, confidence: 0.7 };
  }

  return { intent: "unknown", confidence: 0.2 };
}

function parseLanguageTarget(text: string): string | null {
  const lower = text.toLowerCase().trim();
  for (const { lang, words } of LANG_KEYWORDS) {
    if (words.some((w) => lower.includes(w.toLowerCase()))) return lang;
  }
  return null;
}

function ruleBasedFallback(req: IntentRequest): LlmIntentResult {
  const lang = detectLang(req.transcript);
  const legacyReq: IntentRequestLegacy = {
    transcript: req.transcript,
    language: lang,
    currentView: req.currentPage,
    activeIntent: ((req.voiceSession as Record<string, unknown> | null)?.activeIntent as string) ?? null,
    step: ((req.voiceSession as Record<string, unknown> | null)?.step as string) ?? null,
    awaitingConfirmation: ((req.voiceSession as Record<string, unknown> | null)?.awaitingConfirmation as boolean) ?? false,
  };

  const result = parseIntent(legacyReq);

  let subTarget: string | null = null;
  const slots: Record<string, string> = {};

  if (result.intent === "language") {
    const target = parseLanguageTarget(req.transcript);
    if (target) slots.language = target;
  }
  if (result.view) subTarget = result.view;
  if (result.role) subTarget = result.role;
  if (result.fieldChange) {
    subTarget = result.fieldChange;
    if (result.value) slots.value = result.value;
  }
  if (result.value && !result.fieldChange) slots.value = result.value;
  if (result.slots) Object.assign(slots, result.slots);
  if (result.languageChange) slots.language = result.languageChange;

  return {
    intent: result.intent,
    sub_target: subTarget,
    slots,
    confidence: result.confidence,
  };
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json() as Partial<IntentRequest>;

    if (!body.transcript || typeof body.transcript !== "string") {
      return new Response(
        JSON.stringify({ error: "transcript is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reqData: IntentRequest = {
      transcript: body.transcript,
      currentPage: body.currentPage ?? "unknown",
      activeTab: body.activeTab ?? null,
      visibleData: body.visibleData ?? null,
      voiceSession: body.voiceSession ?? null,
      language: body.language ?? "en",
      screenContent: body.screenContent ?? null,
    };

    // Try Gemini LLM first, fall back to rule-based parser
    const llmResult = await callGemini(reqData);
    const result = llmResult ?? ruleBasedFallback(reqData);
    const source = llmResult ? "gemini" : "rules";

    let description: string | null = null;
    if (result.intent === "read_screen" && reqData.screenContent) {
      description = await describeScreen(reqData.screenContent, reqData.language);
    }

    return new Response(
      JSON.stringify({ ...result, source, description }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
