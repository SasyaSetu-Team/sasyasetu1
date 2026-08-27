import { langCode } from '@/lib/voice';
import type { Language } from '@/translations';

export interface IntentResult {
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
  description?: string;
  loginMobile?: string;
  loginOtp?: string;
  loginCategory?: string;
  confidence: number;
}

interface EdgeFunctionResponse {
  intent: string;
  sub_target: string | null;
  slots: Record<string, string>;
  confidence: number;
  source?: string;
  description?: string | null;
}

export interface IntentRequest {
  transcript: string;
  language: string;
  currentView?: string;
  activeIntent?: string | null;
  step?: string | null;
  slots?: Record<string, string>;
  awaitingConfirmation?: boolean;
  screenContext?: string;
}

const UNAVAILABLE_INTENTS = new Set(['post_demand', 'start_journey', 'open_map', 'pay_balance']);

export async function fetchIntent(
  transcript: string,
  language: Language,
  context: {
    currentView?: string;
    activeIntent?: string | null;
    step?: string | null;
    slots?: Record<string, string>;
    awaitingConfirmation?: boolean;
    screenContext?: string;
  } = {},
): Promise<IntentResult | null> {
  const code = langCode(language);

  const voiceSession: Record<string, unknown> = {};
  if (context.activeIntent !== undefined) voiceSession.activeIntent = context.activeIntent;
  if (context.step !== undefined) voiceSession.step = context.step;
  if (context.awaitingConfirmation !== undefined) voiceSession.awaitingConfirmation = context.awaitingConfirmation;
  if (context.slots) voiceSession.slots = context.slots;

  const body = {
    transcript,
    currentPage: context.currentView ?? 'unknown',
    activeTab: null as string | null,
    visibleData: null as object | null,
    voiceSession: Object.keys(voiceSession).length > 0 ? voiceSession : null,
    language: code,
    screenContent: context.screenContext ?? null,
  };

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-intent`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json() as EdgeFunctionResponse;
    if (!data || typeof data.intent !== 'string') return null;

    return translateResponse(data, code);
  } catch {
    return null;
  }
}

function translateResponse(data: EdgeFunctionResponse, _lang: string): IntentResult {
  const slots = data.slots ?? {};
  const result: IntentResult = {
    intent: data.intent,
    confidence: data.confidence,
    slots,
  };

  const sub = data.sub_target;

  switch (data.intent) {
    case 'navigate':
      result.view = sub ?? undefined;
      break;
    case 'add_crop':
      result.view = sub ?? 'crop-create';
      break;
    case 'mark_harvested':
      result.view = 'crops';
      break;
    case 'language':
      if (slots.language) result.languageChange = slots.language;
      break;
    case 'role_select':
      result.role = sub ?? undefined;
      break;
    case 'voice_login':
      result.intent = 'voice_login';
      break;
    case 'login_mobile':
      result.loginMobile = slots.mobile ?? '';
      break;
    case 'login_otp':
      result.loginOtp = slots.otp ?? '';
      break;
    case 'login_category':
      result.loginCategory = slots.category ?? '';
      break;
    case 'stop':
      result.stopSession = true;
      break;
    case 'back':
      result.goBack = true;
      break;
    case 'undo':
      result.undo = true;
      break;
    case 'redo':
      result.redo = true;
      break;
    case 'confirm':
      result.confirmYes = true;
      break;
    case 'cancel_confirm':
      result.confirmNo = true;
      break;
    case 'cancel_crop':
      result.cancelCrop = true;
      break;
    case 'continue_crop':
      result.continueCrop = true;
      break;
    case 'read_screen':
      result.readScreen = true;
      if (data.description) result.description = data.description;
      break;
    case 'field_change':
      result.fieldChange = sub ?? undefined;
      if (slots.value) result.value = slots.value;
      break;
    case 'fill_slot':
      if (slots.cropName) {
        result.intent = 'fill_slot_text';
        result.value = slots.cropName;
      } else if (slots.status) {
        result.intent = 'fill_slot_status';
        result.value = slots.status;
      } else if (slots.value) {
        result.intent = 'fill_slot_value';
        result.value = slots.value;
      } else {
        const knownFields = ['quantity', 'available', 'area', 'yield', 'price', 'date'];
        const found = knownFields.find((f) => slots[f] !== undefined && slots[f] !== '');
        if (found) {
          result.intent = 'fill_slot_value';
          result.value = slots[found];
        }
      }
      break;
    case 'fill_slot_text':
      result.intent = 'fill_slot_text';
      result.value = slots.value ?? sub ?? undefined;
      break;
    case 'fill_slot_value':
      result.intent = 'fill_slot_value';
      result.value = slots.value ?? sub ?? undefined;
      break;
    case 'post_demand':
    case 'start_journey':
    case 'open_map':
    case 'pay_balance':
      result.unavailable = true;
      break;
    case 'unknown':
      break;
    default:
      break;
  }

  if (UNAVAILABLE_INTENTS.has(data.intent)) {
    result.unavailable = true;
  }

  return result;
}
