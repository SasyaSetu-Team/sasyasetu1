import type { Language, LanguageCode } from '@/translations';

export interface VoiceCommandMatch {
  key: string;
  view?: string;
  unavailable?: boolean;
  stopSession?: boolean;
}

type RoleKey = 'Farmer' | 'FPO' | 'Transport Provider' | 'Storage Provider' | 'Buyer';

export interface VoiceRoleMatch {
  role: RoleKey;
}

const STOP_PATTERNS: Record<LanguageCode, string[]> = {
  en: ['stop', 'cancel', 'close assistant', 'close', 'stop listening', 'exit', 'nevermind', 'never mind'],
  te: ['ఆపు', 'రద్దు', 'క్లోజ్', 'బయటకు', 'ఆపండి', 'వదిలించు'],
  hi: ['रोको', 'रद्द', 'बंद', 'बंद करो', 'बाहर', 'छोड़ो'],
};

const BACK_PATTERNS: Record<LanguageCode, string[]> = {
  en: ['go back', 'back', 'previous', 'return'],
  te: ['వెనుకకు', 'తిరిగి', 'వెనుక'],
  hi: ['पीछे', 'वापस', 'पिछला'],
};

const REDO_PATTERNS: Record<LanguageCode, string[]> = {
  en: ['redo', 'repeat', 'say again', 'again', 'do that again'],
  te: ['మళ్లీ', 'మరల', 'పునరావృతం', 'మళ్లీ చెప్పు'],
  hi: ['फिर से', 'दोहराएं', 'दोबारा', 'मौली'],
};

const UNDO_PATTERNS: Record<LanguageCode, string[]> = {
  en: ['undo', 'change back', 'revert', 'go back to'],
  te: ['చెయ్', 'వెనక్కి మార్చు', 'రద్దు చేయ్'],
  hi: ['पहले जैसा', 'वापस लाएं', 'उलटें'],
};

const YES_PATTERNS: Record<LanguageCode, string[]> = {
  en: ['yes', 'yeah', 'correct', 'right', 'confirm', 'confirmed', 'save', 'save it', 'go ahead', 'sure', 'okay', 'ok', 'proceed', 'yes proceed', 'looks good', 'that\'s correct', 'verify', 'submit'],
  te: ['అవును', 'సరే', 'కచ్చితంగా', 'దాచు', 'నిజం', 'సరైనది', 'ధృవీకరించు', 'కొనసాగించు'],
  hi: ['हाँ', 'हां', 'सही', 'बिल्कुल', 'सेव', 'दबाएँ', 'ठीक है', 'आगे बढ़ो', 'पुष्टि', 'जारी रखें'],
};

const NO_PATTERNS: Record<LanguageCode, string[]> = {
  en: ['no', 'nope', 'cancel', 'change', 'don\'t save', 'do not save', 'wrong', 'not correct', 'edit'],
  te: ['కాదు', 'వద్దు', 'రద్దు', 'తప్పు', 'మార్చు', 'వద్దు'],
  hi: ['नहीं', 'रद्द', 'गलत', 'बदलो', 'मत', 'नहीं सेव'],
};

const CANCEL_CROP_PATTERNS: Record<LanguageCode, string[]> = {
  en: ['cancel crop', 'cancel form', 'cancel add', 'discard crop', 'never mind crop'],
  te: ['పంట రద్దు', 'ఫారమ్ రద్దు', 'పంట వదిలించు'],
  hi: ['फसल रद्द', 'फॉर्म रद्द', 'फसल छोड़ो'],
};

const CONTINUE_CROP_PATTERNS: Record<LanguageCode, string[]> = {
  en: ['continue crop', 'resume crop', 'continue form', 'resume form', 'keep going'],
  te: ['పంట కొనసాగించు', 'ఫారమ్ కొనసాగించు', 'కొనసాగించు'],
  hi: ['फसल जारी', 'फॉर्म जारी', 'जारी रखें'],
};

const ROLE_PATTERNS: { lang: LanguageCode; patterns: string[]; role: RoleKey }[] = [
  { lang: 'en', role: 'Farmer', patterns: ['farmer login', 'log in as farmer', 'login as farmer', 'open farmer', 'farmer'] },
  { lang: 'en', role: 'FPO', patterns: ['fpo login', 'log in as fpo', 'login as fpo', 'open fpo'] },
  { lang: 'en', role: 'Buyer', patterns: ['buyer login', 'log in as buyer', 'login as buyer', 'open buyer', 'buyer', 'log in as a buyer', 'login as a buyer', 'i want to log in as buyer', 'i want to login as buyer'] },
  { lang: 'en', role: 'Storage Provider', patterns: ['storage login', 'log in as storage', 'login as storage', 'open storage provider', 'storage provider'] },
  { lang: 'en', role: 'Transport Provider', patterns: ['transport login', 'log in as transport', 'login as transport', 'open transport provider', 'transport provider'] },
  { lang: 'te', role: 'Farmer', patterns: ['రైతు లాగిన్', 'రైతుగా లాగిన్', 'రైతు'] },
  { lang: 'te', role: 'FPO', patterns: ['ఎఫ్‌పిఓ లాగిన్', 'ఎఫ్‌పిఓగా లాగిన్'] },
  { lang: 'te', role: 'Buyer', patterns: ['కొనుగోలుదారు లాగిన్', 'కొనుగోలుదారుగా లాగిన్'] },
  { lang: 'te', role: 'Storage Provider', patterns: ['నిల్వ లాగిన్', 'నిల్వ సేవా ప్రదాత లాగిన్'] },
  { lang: 'te', role: 'Transport Provider', patterns: ['రవాణా లాగిన్', 'రవాణా సేవా ప్రదాత లాగిన్'] },
  { lang: 'hi', role: 'Farmer', patterns: ['किसान लॉगिन', 'किसान के रूप में लॉगिन', 'किसान'] },
  { lang: 'hi', role: 'FPO', patterns: ['एफपीओ लॉगिन', 'एफपीओ के रूप में लॉगिन'] },
  { lang: 'hi', role: 'Buyer', patterns: ['खरीदार लॉगिन', 'खरीदार के रूप में लॉगिन'] },
  { lang: 'hi', role: 'Storage Provider', patterns: ['भंडारण लॉगिन', 'भंडारण सेवा प्रदाता लॉगिन'] },
  { lang: 'hi', role: 'Transport Provider', patterns: ['परिवहन लॉगिन', 'परिवहन सेवा प्रदाता लॉगिन'] },
];

const FIELD_CHANGE_PATTERNS: Record<LanguageCode, { trigger: string; field: string }[]> = {
  en: [
    { trigger: 'change crop', field: 'cropName' },
    { trigger: 'change crop name', field: 'cropName' },
    { trigger: 'change quantity', field: 'quantity' },
    { trigger: 'change available', field: 'available' },
    { trigger: 'change status', field: 'status' },
    { trigger: 'change date', field: 'date' },
    { trigger: 'change area', field: 'area' },
    { trigger: 'change yield', field: 'yield' },
    { trigger: 'change price', field: 'price' },
  ],
  te: [
    { trigger: 'పంట మార్చు', field: 'cropName' },
    { trigger: 'పరిమాణం మార్చు', field: 'quantity' },
    { trigger: 'తేదీ మార్చు', field: 'date' },
    { trigger: 'విస్తీర్ణం మార్చు', field: 'area' },
    { trigger: 'ధర మార్చు', field: 'price' },
  ],
  hi: [
    { trigger: 'फसल बदलो', field: 'cropName' },
    { trigger: 'मात्रा बदलो', field: 'quantity' },
    { trigger: 'तारीख बदलो', field: 'date' },
    { trigger: 'क्षेत्र बदलो', field: 'area' },
    { trigger: 'कीमत बदलो', field: 'price' },
  ],
};

const COMMAND_MAP: Record<LanguageCode, { patterns: string[]; key: string; view?: string; unavailable?: boolean }[]> = {
  en: [
    { patterns: ['language', 'change language'], key: 'language' },
    { patterns: ['profile', 'my profile', 'open profile'], key: 'profile', view: 'profile' },
    { patterns: ['tutorial', 'tutorials', 'open tutorial', 'open tutorials'], key: 'tutorial', view: 'tutorials' },
    { patterns: ['my farm', 'my crop', 'show crop', 'crops', 'open crop', 'show my crops', 'farmer crop', 'show harvest', 'farmer tab'], key: 'crops', view: 'crops' },
    { patterns: ['add crop', 'create crop', 'new crop', 'add a crop', 'add crops', 'enter crop details', 'sell crop', 'add crop today'], key: 'addCrop', view: 'crop-create' },
    { patterns: ['mark harvest', 'harvest crop', 'mark as harvested'], key: 'markHarvested', view: 'crops' },
    { patterns: ['upcoming crop', 'upcoming crops', 'show upcoming'], key: 'crops', view: 'crops' },
    { patterns: ['harvested crop', 'harvested crops', 'ready crop', 'ready crops'], key: 'crops', view: 'crops' },
    { patterns: ['browse crop', 'explore crop', 'market', 'browse', 'explore', 'show market crops', 'find crops to buy'], key: 'browseCrops', view: 'market' },
    { patterns: ['storage', 'find storage'], key: 'findStorage', view: 'storage' },
    { patterns: ['transport', 'book transport', 'open transport'], key: 'bookTransport', view: 'transport-options' },
    { patterns: ['post demand', 'demand'], key: 'postDemand', unavailable: true },
    { patterns: ['track order', 'my order', 'orders', 'my orders'], key: 'trackOrder', view: 'orders' },
    { patterns: ['map', 'open map'], key: 'openMap', unavailable: true },
    { patterns: ['pay balance', 'payment', 'pay'], key: 'payBalance', unavailable: true },
    { patterns: ['request', 'view request', 'requests', 'view requests'], key: 'viewRequests', view: 'features' },
    { patterns: ['journey', 'start journey', 'live journey'], key: 'startJourney', unavailable: true },
    { patterns: ['home', 'go home', 'back to home'], key: 'home', view: 'home' },
    { patterns: ['help', 'help and dispute', 'dispute'], key: 'help', view: 'help' },
    { patterns: ['fpo', 'fpo network'], key: 'fpo', view: 'fpo' },
    { patterns: ['calendar', 'harvest calendar'], key: 'calendar', view: 'calendar' },
    { patterns: ['settings', 'open settings'], key: 'settings', view: 'settings' },
  ],
  te: [
    { patterns: ['భాష', 'భాష మార్చండి'], key: 'language' },
    { patterns: ['ప్రొఫైల్', 'నా ప్రొఫైల్'], key: 'profile', view: 'profile' },
    { patterns: ['ట్యుటోరియల్', 'ట్యుటోరియల్స్'], key: 'tutorial', view: 'tutorials' },
    { patterns: ['నా పంటలు', 'పంటలు', 'పంట', 'పంటలు చూపించు', 'నా పొలం'], key: 'crops', view: 'crops' },
    { patterns: ['పంట జోడించండి', 'కొత్త పంట', 'పంట చేర్చండి', 'పంట అమ్మండి'], key: 'addCrop', view: 'crop-create' },
    { patterns: ['పంట పండింది', 'కటాయ'], key: 'markHarvested', view: 'crops' },
    { patterns: ['మార్కెట్', 'పంటలను అన్వేషించండి', 'బ్రౌజ్', 'కొనడానికి పంటలు'], key: 'browseCrops', view: 'market' },
    { patterns: ['నిల్వ', 'నిల్వ కనుగొనండి'], key: 'findStorage', view: 'storage' },
    { patterns: ['రవాణా', 'రవాణా బుక్', 'రవాణా తెరువు'], key: 'bookTransport', view: 'transport-options' },
    { patterns: ['డిమాండ్', 'డిమాండ్ పోస్ట్'], key: 'postDemand', unavailable: true },
    { patterns: ['ఆర్డర్', 'నా ఆర్డర్లు', 'ట్రాక్'], key: 'trackOrder', view: 'orders' },
    { patterns: ['మ్యాప్', 'మ్యాప్ తెరువు'], key: 'openMap', unavailable: true },
    { patterns: ['చెల్లింపు', 'బ్యాలెన్స్'], key: 'payBalance', unavailable: true },
    { patterns: ['అభ్యర్థన', 'అభ్యర్థనలు'], key: 'viewRequests', view: 'features' },
    { patterns: ['ప్రయాణం', 'లైవ్ ప్రయాణం'], key: 'startJourney', unavailable: true },
    { patterns: ['హోమ్', 'ఇంటికి'], key: 'home', view: 'home' },
    { patterns: ['సహాయం', 'వివాదం'], key: 'help', view: 'help' },
    { patterns: ['ఎఫ్‌పిఓ', 'ఎఫ్‌పిఓ నెట్‌వర్క్'], key: 'fpo', view: 'fpo' },
    { patterns: ['క్యాలెండర్', 'పంట క్యాలెండర్'], key: 'calendar', view: 'calendar' },
    { patterns: ['సెట్టింగ్‌లు', 'సెట్టింగ్‌లు తెరువు'], key: 'settings', view: 'settings' },
  ],
  hi: [
    { patterns: ['भाषा', 'भाषा बदलें'], key: 'language' },
    { patterns: ['प्रोफ़ाइल', 'मेरी प्रोफ़ाइल'], key: 'profile', view: 'profile' },
    { patterns: ['ट्यूटोरियल', 'ट्यूटोरियल्स'], key: 'tutorial', view: 'tutorials' },
    { patterns: ['मेरी फसल', 'फसल', 'फसलें', 'फसल दिखाओ', 'मेरा खेत'], key: 'crops', view: 'crops' },
    { patterns: ['फसल जोड़ें', 'नई फसल', 'फसल करें', 'फसल बेचें'], key: 'addCrop', view: 'crop-create' },
    { patterns: ['कटाई', 'फसल कटाई'], key: 'markHarvested', view: 'crops' },
    { patterns: ['बाज़ार', 'फसलें खोजें', 'ब्राउज़', 'खरीदने के लिए फसलें'], key: 'browseCrops', view: 'market' },
    { patterns: ['भंडारण', 'भंडारण खोजें'], key: 'findStorage', view: 'storage' },
    { patterns: ['परिवहन', 'परिवहन बुक', 'परिवहन खोलो'], key: 'bookTransport', view: 'transport-options' },
    { patterns: ['मांग', 'मांग पोस्ट'], key: 'postDemand', unavailable: true },
    { patterns: ['आदेश', 'मेरे आदेश', 'ट्रैक'], key: 'trackOrder', view: 'orders' },
    { patterns: ['मानचित्र', 'मानचित्र खोलो'], key: 'openMap', unavailable: true },
    { patterns: ['भुगतान', 'शेष राशि'], key: 'payBalance', unavailable: true },
    { patterns: ['अनुरोध', 'अनुरोध देखें', 'अनुरोध'], key: 'viewRequests', view: 'features' },
    { patterns: ['यात्रा', 'लाइव यात्रा'], key: 'startJourney', unavailable: true },
    { patterns: ['होम', 'घर', 'होम पर'], key: 'home', view: 'home' },
    { patterns: ['सहायता', 'विवाद', 'सहायता और विवाद'], key: 'help', view: 'help' },
    { patterns: ['एफपीओ', 'एफपीओ नेटवर्क'], key: 'fpo', view: 'fpo' },
    { patterns: ['कैलेंडर', 'फसल कैलेंडर'], key: 'calendar', view: 'calendar' },
    { patterns: ['सेटिंग्स', 'सेटिंग्स खोलो'], key: 'settings', view: 'settings' },
  ],
};

const LANG_KEYWORDS: { lang: Language; words: string[] }[] = [
  { lang: 'English', words: ['english', 'ఇంగ్లీష్', 'इंग्लिश', 'अंग्रेज़ी'] },
  { lang: 'తెలుగు', words: ['telugu', 'తెలుగు', 'तेलुगू', 'तेलगु'] },
  { lang: 'हिन्दी', words: ['hindi', 'हिन्दी', 'हिंदी', 'హిందీ'] },
];

const NUMBER_WORDS: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60,
  'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100,
  'thousand': 1000,
  'ఒక': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'దు': 5,
  'ఆరు': 6, 'డు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9, 'పది': 10,
  'వంద': 100, 'వెయ్యి': 1000,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
  'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'सौ': 100, 'हज़ार': 1000,
};

export function langCode(lang: Language): LanguageCode {
  return lang === 'తెలుగు' ? 'te' : lang === 'हिन्दी' ? 'hi' : 'en';
}

export function captureScreenText(): string {
  const main = document.querySelector('main.dedicated-page, main.long-scroll, main.login-screen, main.login-flow');
  const root = main ?? document.body;
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('button, script, style, svg, .voice-fab, .floating-tools, .modal-backdrop').forEach((el) => el.remove());
  const text = (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.slice(0, 3000);
}

export function isYesCommand(transcript: string, lang: Language): boolean {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  return YES_PATTERNS[code].some((p) => lower.includes(p.toLowerCase()));
}

export function isNoCommand(transcript: string, lang: Language): boolean {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  return NO_PATTERNS[code].some((p) => lower.includes(p.toLowerCase()));
}

export function isStopCommand(transcript: string, lang: Language): boolean {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  return STOP_PATTERNS[code].some((p) => lower.includes(p.toLowerCase()));
}

export function isBackCommand(transcript: string, lang: Language): boolean {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  return BACK_PATTERNS[code].some((p) => lower.includes(p.toLowerCase()));
}

export function isRedoCommand(transcript: string, lang: Language): boolean {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  return REDO_PATTERNS[code].some((p) => lower.includes(p.toLowerCase()));
}

export function isUndoCommand(transcript: string, lang: Language): boolean {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  return UNDO_PATTERNS[code].some((p) => lower.includes(p.toLowerCase()));
}

export function isCancelCropCommand(transcript: string, lang: Language): boolean {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  return CANCEL_CROP_PATTERNS[code].some((p) => lower.includes(p.toLowerCase()));
}

export function isContinueCropCommand(transcript: string, lang: Language): boolean {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  return CONTINUE_CROP_PATTERNS[code].some((p) => lower.includes(p.toLowerCase()));
}

export function parseRoleCommand(transcript: string, lang: Language): VoiceRoleMatch | null {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  for (const { lang: lc, patterns, role } of ROLE_PATTERNS) {
    if (lc !== code) continue;
    for (const p of patterns) {
      if (lower.includes(p.toLowerCase())) return { role };
    }
  }
  return null;
}

export function parseFieldChange(transcript: string, lang: Language): string | null {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  for (const { trigger, field } of FIELD_CHANGE_PATTERNS[code]) {
    if (lower.includes(trigger.toLowerCase())) return field;
  }
  return null;
}

export function parseCommand(transcript: string, lang: Language): VoiceCommandMatch | null {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();

  if (isStopCommand(transcript, lang)) {
    return { key: 'stop', stopSession: true };
  }

  for (const cmd of COMMAND_MAP[code]) {
    for (const pattern of cmd.patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return { key: cmd.key, view: cmd.view, unavailable: cmd.unavailable };
      }
    }
  }
  return null;
}

export function parseLanguageChange(transcript: string): Language | null {
  const lower = transcript.toLowerCase().trim();
  for (const { lang, words } of LANG_KEYWORDS) {
    if (words.some((w) => lower.includes(w.toLowerCase()))) return lang;
  }
  return null;
}

export function parseStatus(transcript: string, lang: Language): 'Upcoming' | 'Harvested' | null {
  const code = langCode(lang);
  const lower = transcript.toLowerCase().trim();
  const upcomingWords: Record<LanguageCode, string[]> = {
    en: ['upcoming', 'not yet', 'still growing', 'growing', 'not ready'],
    te: ['రాబోతున్న', 'పండని', 'పెరుగుతున్న'],
    hi: ['आने वाली', 'अपेक्षित', 'बढ़ रही', 'अभी नहीं'],
  };
  const harvestedWords: Record<LanguageCode, string[]> = {
    en: ['harvested', 'ready', 'done', 'cut'],
    te: ['పండింది', 'కటాయ', 'సిద్ధం'],
    hi: ['कटाई', 'तैयार', 'कट गई'],
  };
  if (upcomingWords[code].some((w) => lower.includes(w.toLowerCase()))) return 'Upcoming';
  if (harvestedWords[code].some((w) => lower.includes(w.toLowerCase()))) return 'Harvested';
  return null;
}

export function extractValue(transcript: string, trigger: string): string {
  const lower = transcript.toLowerCase();
  const idx = lower.indexOf(trigger.toLowerCase());
  if (idx === -1) return transcript.trim();
  const after = transcript.slice(idx + trigger.length);
  return after.replace(/^[\s,।.]+/, '').trim();
}

export function parseNumber(transcript: string): string {
  const direct = transcript.replace(/[^0-9.]/g, '').trim();
  if (direct) return direct;
  const lower = transcript.toLowerCase().trim();
  const words = lower.split(/[\s,.]+/);
  let total = 0;
  let found = false;
  for (const w of words) {
    if (w in NUMBER_WORDS) { total += NUMBER_WORDS[w]; found = true; }
  }
  return found ? String(total) : '';
}

const DIGIT_WORDS: Record<string, string> = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'won': '1', 'too': '2', 'to': '2', 'tree': '3', 'for': '4', 'fore': '4',
  'fife': '5', 'sicks': '6', 'seen': '7', 'ate': '8', 'niner': '9',
  'first': '1', 'second': '2', 'third': '3', 'fourth': '4', 'fifth': '5',
  'sixth': '6', 'seventh': '7', 'eighth': '8', 'ninth': '9',
  'సున్నా': '0', 'ఒక': '1', 'రెండు': '2', 'మూడు': '3', 'నాలుగు': '4',
  'దు': '5', 'ఆరు': '6', 'ఏడు': '7', 'ఎనిమిది': '8', 'తొమ్మిది': '9',
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4',
  'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
};

export function parseDigitSequence(transcript: string): string {
  const direct = transcript.replace(/[^0-9]/g, '').trim();
  if (direct) return direct;
  const lower = transcript.toLowerCase().trim();
  const words = lower.split(/[\s,.]+/);
  const digits: string[] = [];
  for (const w of words) {
    if (w in DIGIT_WORDS) digits.push(DIGIT_WORDS[w]);
  }
  return digits.join('');
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let speechWarmupDone = false;
let voicesReady = false;
let cachedVoices: SpeechSynthesisVoice[] = [];
let warmupPending = false;
let userGestureSpeech = false;

export function markUserGestureSpeech(): void { userGestureSpeech = true; }
export function consumeUserGestureSpeech(): boolean { if (userGestureSpeech) { userGestureSpeech = false; return true; } return false; }

function refreshVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) { cachedVoices = voices; voicesReady = true; }
  return voices;
}

if (isSpeechSynthesisSupported()) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = () => { refreshVoices(); console.log('[voice] voices loaded:', refreshVoices().length); };
}

function pickVoiceForLang(targetLang: string): SpeechSynthesisVoice | undefined {
  const voices = cachedVoices.length > 0 ? cachedVoices : refreshVoices();
  if (voices.length === 0) return undefined;
  const exact = voices.find((v) => v.lang === targetLang);
  if (exact) return exact;
  const base = targetLang.split('-')[0];
  const baseMatch = voices.find((v) => v.lang.startsWith(base));
  if (baseMatch) return baseMatch;
  return voices[0];
}

export interface DebugEvent {
  time: string;
  label: string;
  detail: string;
}

const debugListeners: ((e: DebugEvent) => void)[] = [];

export function subscribeDebug(fn: (e: DebugEvent) => void): () => void {
  debugListeners.push(fn);
  return () => { const i = debugListeners.indexOf(fn); if (i >= 0) debugListeners.splice(i, 1); };
}

export function emitDebug(label: string, detail: string): void {
  const e: DebugEvent = { time: new Date().toLocaleTimeString(), label, detail };
  debugListeners.forEach((fn) => fn(e));
}

export function getSynthState(): string {
  if (!isSpeechSynthesisSupported()) return 'unsupported';
  const ss = window.speechSynthesis;
  return `speaking=${ss.speaking} pending=${ss.pending} paused=${ss.paused} voices=${ss.getVoices().length}`;
}

export function warmupSpeech(): void {
  if (!isSpeechSynthesisSupported() || speechWarmupDone) return;
  speechWarmupDone = true;
  warmupPending = true;
  emitDebug('warmupSpeech() called', getSynthState());
  try {
    refreshVoices();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = 'en-US';
    const v = pickVoiceForLang('en-US');
    if (v) u.voice = v;
    u.onstart = () => { console.log('[voice] warmup started, voices:', cachedVoices.length); emitDebug('warmup onstart', getSynthState()); };
    u.onerror = (e) => { console.error('[voice] warmup error:', e); warmupPending = false; speechWarmupDone = false; emitDebug('warmup onerror', String((e as any)?.error ?? e)); };
    u.onend = () => { console.log('[voice] warmup ended'); warmupPending = false; emitDebug('warmup onend', getSynthState()); };
    window.speechSynthesis.speak(u);
  } catch (e) { console.error('[voice] warmup threw:', e); warmupPending = false; speechWarmupDone = false; emitDebug('warmup threw', String(e)); }
}

export function speak(text: string, lang: Language, onEnd?: () => void): void {
  if (!isSpeechSynthesisSupported()) { console.warn('[voice] speechSynthesis not supported'); emitDebug('speak() - unsupported', 'onEnd fired'); onEnd?.(); return; }
  try {
    const code = langCode(lang);
    const targetLang = code === 'te' ? 'te-IN' : code === 'hi' ? 'hi-IN' : 'en-IN';
    const voices = refreshVoices();
    const voice = pickVoiceForLang(targetLang);
    console.log('[voice] speak called, text:', text.slice(0, 60), 'lang:', targetLang, 'voice:', voice?.name ?? 'none', 'voicesCount:', voices.length, 'warmupPending:', warmupPending);
    emitDebug('speak() called', `text="${text.slice(0, 50)}" voice=${voice?.name ?? 'none'} voices=${voices.length} warmupPending=${warmupPending} | ${getSynthState()}`);

    if (!warmupPending) {
      window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.volume = 1;
    utterance.onstart = () => { console.log('[voice] speak started:', text.slice(0, 50)); emitDebug('speak onstart', getSynthState()); };
    utterance.onerror = (e) => { console.error('[voice] speak error:', e, 'lang:', targetLang, 'voice:', voice?.name ?? 'none'); emitDebug('speak onerror', String((e as any)?.error ?? e)); };
    if (onEnd) utterance.onend = () => { emitDebug('speak onend', getSynthState()); onEnd(); };
    window.speechSynthesis.speak(utterance);
  } catch (e) { console.error('[voice] speak threw:', e); emitDebug('speak threw', String(e)); onEnd?.(); }
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
    emitDebug('speechSynthesis.cancel()', getSynthState());
  } catch { /* noop */ }
}

export interface VoiceRecognition {
  start: () => void;
  stop: () => void;
}

export function createRecognition(
  lang: Language,
  onFinalResult: (text: string) => void,
  onInterimResult: (text: string) => void,
  onError: (err: string) => void,
  onEnd: () => void,
): VoiceRecognition | null {
  if (!isSpeechRecognitionSupported()) return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SR();
  const code = langCode(lang);
  recognition.lang = code === 'te' ? 'te-IN' : code === 'hi' ? 'hi-IN' : 'en-IN';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  let lastInterim = '';
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let gotFinalResult = false;

  const clearSilenceTimer = () => {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  };

  recognition.onstart = () => {
    gotFinalResult = false;
    lastInterim = '';
  };
  recognition.onspeechstart = () => {
    clearSilenceTimer();
  };
  recognition.onspeechend = () => {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      try { recognition.stop(); } catch { /* already stopped */ }
    }, 300);
  };
  recognition.onresult = (event: any) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        final += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }
    if (interim) {
      lastInterim = interim;
      onInterimResult(interim);
      clearSilenceTimer();
      silenceTimer = setTimeout(() => {
        try { recognition.stop(); } catch { /* already stopped */ }
      }, 2000);
    }
    if (final.trim()) {
      gotFinalResult = true;
      clearSilenceTimer();
      onFinalResult(final.trim());
    }
  };
  recognition.onerror = (event: any) => {
    clearSilenceTimer();
    const err = event.error || 'unknown';
    if (err === 'no-speech' || err === 'aborted') {
      gotFinalResult = true;
    }
    onError(err);
  };
  recognition.onend = () => {
    clearSilenceTimer();
    if (!gotFinalResult && lastInterim.trim()) {
      onFinalResult(lastInterim.trim());
    }
    onEnd();
  };
  return {
    start: () => {
      gotFinalResult = false;
      lastInterim = '';
      try { recognition.start(); } catch { /* already started */ }
    },
    stop: () => {
      clearSilenceTimer();
      try { recognition.stop(); } catch { /* already stopped */ }
    },
  };
}
