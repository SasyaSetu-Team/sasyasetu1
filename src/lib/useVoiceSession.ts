import { useReducer, useRef, useCallback, useEffect } from 'react';
import type { Language } from '@/translations';
import { makeT } from '@/translations';
import {
  parseCommand,
  parseStatus,
  parseNumber,
  parseDigitSequence,
  parseLanguageChange,
  parseRoleCommand,
  parseFieldChange,
  isStopCommand,
  isBackCommand,
  isRedoCommand,
  isUndoCommand,
  isYesCommand,
  isNoCommand,
  isCancelCropCommand,
  isContinueCropCommand,
  type VoiceCommandMatch,
} from '@/lib/voice';
import { fetchIntent, type IntentResult } from '@/lib/intentClient';

const VALID_ROLES = ['Farmer', 'FPO', 'Buyer', 'Storage Provider', 'Transport Provider'];

function normalizeRole(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  for (const role of VALID_ROLES) {
    if (role.toLowerCase() === lower) return role;
  }
  if (lower.includes('farmer')) return 'Farmer';
  if (lower.includes('fpo')) return 'FPO';
  if (lower.includes('buyer')) return 'Buyer';
  if (lower.includes('storage')) return 'Storage Provider';
  if (lower.includes('transport')) return 'Transport Provider';
  return null;
}

export type FormField = 'cropName' | 'quantity' | 'available' | 'status' | 'date' | 'area' | 'yield' | 'price';

export const FORM_STEPS: FormField[] = ['cropName', 'quantity', 'available', 'area', 'yield', 'price', 'status', 'date'];

export interface VoiceSessionState {
  greeted: boolean;
  activeIntent: string | null;
  slots: Record<string, string>;
  step: string | null;
  loginRole: string | null;
  awaitingConfirmation: boolean;
  pendingAction: { type: string; payload?: Record<string, string> } | null;
  lastSpoken: string;
  history: { view: string; label: string }[];
}

export type VoiceAction =
  | { type: 'GREET' }
  | { type: 'START_INTENT'; intent: string; view?: string }
  | { type: 'FILL_SLOT'; field: string; value: string }
  | { type: 'ASK_CONFIRMATION'; action: { type: string; payload?: Record<string, string> } }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL' }
  | { type: 'RESET' }
  | { type: 'CLOSE_SESSION' }
  | { type: 'SET_LAST_SPOKEN'; text: string }
  | { type: 'PUSH_HISTORY'; view: string; label: string }
  | { type: 'POP_HISTORY' }
  | { type: 'SET_STEP'; step: string | null }
  | { type: 'SET_LOGIN_ROLE'; role: string }
  | { type: 'SEED_SLOTS'; slots: Record<string, string> };

const initialState: VoiceSessionState = {
  greeted: typeof sessionStorage !== 'undefined' && sessionStorage.getItem('voiceGreeted') === 'true',
  activeIntent: null,
  slots: {},
  step: null,
  loginRole: null,
  awaitingConfirmation: false,
  pendingAction: null,
  lastSpoken: '',
  history: [],
};

function reducer(state: VoiceSessionState, action: VoiceAction): VoiceSessionState {
  switch (action.type) {
    case 'GREET':
      try { sessionStorage.setItem('voiceGreeted', 'true'); } catch { /* noop */ }
      return { ...state, greeted: true };
    case 'START_INTENT':
      return {
        ...state,
        activeIntent: action.intent,
        step: action.view ?? state.step,
        awaitingConfirmation: false,
        pendingAction: null,
      };
    case 'FILL_SLOT':
      return {
        ...state,
        slots: { ...state.slots, [action.field]: action.value },
      };
    case 'ASK_CONFIRMATION':
      return {
        ...state,
        awaitingConfirmation: true,
        pendingAction: action.action,
      };
    case 'CONFIRM':
      return {
        ...state,
        awaitingConfirmation: false,
        pendingAction: null,
      };
    case 'CANCEL':
      return {
        ...state,
        awaitingConfirmation: false,
        pendingAction: null,
      };
    case 'RESET':
      return {
        ...initialState,
        greeted: state.greeted,
        history: state.history,
      };
    case 'CLOSE_SESSION':
      return {
        ...initialState,
        greeted: state.greeted,
        loginRole: null,
      };
    case 'SET_LAST_SPOKEN':
      return { ...state, lastSpoken: action.text };
    case 'PUSH_HISTORY':
      return { ...state, history: [...state.history, { view: action.view, label: action.label }] };
    case 'POP_HISTORY': {
      const h = [...state.history];
      h.pop();
      return { ...state, history: h };
    }
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_LOGIN_ROLE':
      return { ...state, loginRole: action.role };
    case 'SEED_SLOTS':
      return { ...state, slots: { ...action.slots } };
    default:
      return state;
  }
}

export interface VoiceSessionCallbacks {
  setFormDraft: (field: string, value: string) => void;
  setLanguage: (lang: Language) => void;
  open: (view: string) => void;
  selectRole: (role: string) => void;
  close: () => void;
  goBack: () => void;
  currentView: string;
  language: Language;
  setLoginStep?: (step: number) => void;
  setLoginField?: (field: 'mobile' | 'otp' | 'buyerCategory', value: string) => void;
  submitLogin?: () => void;
}

export interface VoiceSessionResult {
  state: VoiceSessionState;
  dispatch: React.Dispatch<VoiceAction>;
  processUtterance: (text: string) => string | null;
  processUtteranceAsync: (text: string, screenContext?: string) => Promise<string | null>;
  nextMissingField: () => FormField | null;
  askFieldPrompt: (field: FormField) => string;
  narrateScreen: (view: string, loginStep?: number) => string;
}

export function useVoiceSession(callbacks: VoiceSessionCallbacks): VoiceSessionResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const cbRef = useRef(callbacks);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { cbRef.current = callbacks; }, [callbacks]);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return makeT(cbRef.current.language)(key, params);
  }, []);

  const askFieldPrompt = useCallback((field: FormField): string => {
    const tr = makeT(cbRef.current.language);
    switch (field) {
      case 'cropName': return tr('voice.formAskCropName');
      case 'quantity': return tr('voice.formAskQuantity');
      case 'available': return tr('voice.formAskAvailable');
      case 'status': return tr('voice.formAskStatus');
      case 'date': {
        const st = stateRef.current.slots;
        return st.status === 'Harvested' ? tr('voice.formAskHarvestedDate') : tr('voice.formAskDate');
      }
      case 'area': return tr('voice.formAskArea');
      case 'yield': return tr('voice.formAskYield');
      case 'price': return tr('voice.formAskPrice');
    }
  }, []);

  const nextMissingField = useCallback((): FormField | null => {
    const slots = stateRef.current.slots;
    for (const f of FORM_STEPS) {
      if (slots[f] === undefined || slots[f] === '') return f;
    }
    return null;
  }, []);

  const nextMissingFieldAfter = useCallback((field: string, value: string): FormField | null => {
    const slots = { ...stateRef.current.slots, [field]: value };
    for (const f of FORM_STEPS) {
      if (slots[f] === undefined || slots[f] === '') return f;
    }
    return null;
  }, []);

  // HARD GUARD: summary narration can ONLY fire when every required field is filled.
  // If any field is still missing, ask the next question instead.
  const summaryOrNext = useCallback((overrideSlots?: Record<string, string>): string => {
    const slots = overrideSlots ?? stateRef.current.slots;
    for (const f of FORM_STEPS) {
      if (slots[f] === undefined || slots[f] === '') return askFieldPrompt(f);
    }
    return t('voice.formDraftSummary', slots);
  }, [t, askFieldPrompt]);

  const processUtterance = useCallback((text: string): string | null => {
    const lang = cbRef.current.language;
    const s = stateRef.current;

    if (isStopCommand(text, lang)) {
      dispatch({ type: 'CLOSE_SESSION' });
      cbRef.current.close();
      return t('voice.sessionEnded');
    }

    if (s.awaitingConfirmation) {
      if (isYesCommand(text, lang)) {
        const pending = s.pendingAction;
        dispatch({ type: 'CONFIRM' });
        if (pending?.type === 'language_change' && pending.payload?.lang) {
          const targetLang = pending.payload.lang as Language;
          cbRef.current.setLanguage(targetLang);
          const langKey = targetLang === 'English' ? 'voice.langChangedEn' : targetLang === 'తెలుగు' ? 'voice.langChangedTe' : 'voice.langChangedHi';
          return makeT(targetLang)(langKey);
        }
        if (pending?.type === 'save_crop') {
          dispatch({ type: 'RESET' });
          return t('voice.formSaved');
        }
        return t('voice.confirmYes');
      }
      if (isNoCommand(text, lang)) {
        dispatch({ type: 'CANCEL' });
        return t('voice.confirmNo');
      }
      return null;
    }

    if (s.activeIntent === 'add_crop') {
      if (isCancelCropCommand(text, lang)) {
        dispatch({ type: 'RESET' });
        return t('voice.cropDraftCancelled');
      }

      const fieldChange = parseFieldChange(text, lang);
      if (fieldChange) {
        const value = text.replace(/.*(?:change|మార్చు|बदलो)/i, '').trim();
        const numVal = parseNumber(value) || value;
        dispatch({ type: 'FILL_SLOT', field: fieldChange, value: numVal });
        cbRef.current.setFormDraft(fieldChange, numVal);
        const next = nextMissingFieldAfter(fieldChange, numVal);
        if (next) return askFieldPrompt(next);
        return summaryOrNext({ ...s.slots, [fieldChange]: numVal });
      }

      const status = parseStatus(text, lang);
      if (status) {
        dispatch({ type: 'FILL_SLOT', field: 'status', value: status });
        cbRef.current.setFormDraft('status', status);
        const next = nextMissingFieldAfter('status', status);
        if (next) return askFieldPrompt(next);
        return summaryOrNext({ ...stateRef.current.slots, status });
      }

      const num = parseNumber(text);
      const currentField = nextMissingField();
      if (currentField) {
        if (currentField === 'cropName') {
          const value = text.trim();
          dispatch({ type: 'FILL_SLOT', field: 'cropName', value });
          cbRef.current.setFormDraft('cropName', value);
          const next = nextMissingFieldAfter('cropName', value);
          if (next) return askFieldPrompt(next);
          return summaryOrNext({ ...stateRef.current.slots, cropName: value });
        }
        if (currentField === 'date') {
          const value = text.trim();
          dispatch({ type: 'FILL_SLOT', field: 'date', value });
          cbRef.current.setFormDraft('date', value);
          const next = nextMissingFieldAfter('date', value);
          if (next) return askFieldPrompt(next);
          return summaryOrNext({ ...stateRef.current.slots, date: value });
        }
        if (num) {
          dispatch({ type: 'FILL_SLOT', field: currentField, value: num });
          cbRef.current.setFormDraft(currentField, num);
          const next = nextMissingFieldAfter(currentField, num);
          if (next) return askFieldPrompt(next);
          return summaryOrNext({ ...stateRef.current.slots, [currentField]: num });
        }
        return askFieldPrompt(currentField);
      }

      if (isYesCommand(text, lang)) {
        const missing = nextMissingField();
        if (missing) return askFieldPrompt(missing);
        dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'save_crop', payload: s.slots } });
        return t('voice.confirmCropDraft', { cropName: s.slots.cropName || '', quantity: s.slots.quantity || '' });
      }

      return summaryOrNext(s.slots);
    }

    if (s.activeIntent === 'voice_login') {
      if (isStopCommand(text, lang)) {
        dispatch({ type: 'CLOSE_SESSION' });
        cbRef.current.close();
        return t('voice.sessionEnded');
      }

      if (s.awaitingConfirmation) {
        if (isYesCommand(text, lang)) {
          const pending = s.pendingAction;
          dispatch({ type: 'CONFIRM' });
          if (pending?.type === 'confirm_mobile' && pending.payload?.mobile) {
            cbRef.current.setLoginField?.('mobile', pending.payload.mobile);
            dispatch({ type: 'SET_STEP', step: 'awaiting_otp' });
            return t('voice.loginMobileConfirmed') + ' ' + t('voice.loginAskOtp');
          }
          if (pending?.type === 'confirm_otp' && pending.payload?.otp) {
            cbRef.current.setLoginField?.('otp', pending.payload.otp);
            if (stateRef.current.loginRole === 'Buyer') {
              dispatch({ type: 'SET_STEP', step: 'awaiting_category' });
              return t('voice.loginOtpConfirmed') + ' ' + t('voice.loginBuyerCategory');
            }
            dispatch({ type: 'SET_STEP', step: 'awaiting_verify' });
            return t('voice.loginOtpConfirmed') + ' ' + t('voice.loginVerifyPrompt');
          }
          if (pending?.type === 'confirm_category' && pending.payload?.category) {
            cbRef.current.setLoginField?.('buyerCategory', pending.payload.category);
            dispatch({ type: 'SET_STEP', step: 'awaiting_verify' });
            return t('voice.loginCategoryConfirmed') + ' ' + t('voice.loginVerifyPrompt');
          }
          if (pending?.type === 'confirm_verify') {
            dispatch({ type: 'SET_STEP', step: null });
            cbRef.current.submitLogin?.();
            return t('voice.loginComplete');
          }
          return t('voice.confirmYes');
        }
        if (isNoCommand(text, lang)) {
          const pending = s.pendingAction;
          dispatch({ type: 'CANCEL' });
          if (pending?.type === 'confirm_mobile') {
            dispatch({ type: 'SET_STEP', step: 'awaiting_mobile' });
            return t('voice.loginMobileRepeat');
          }
          if (pending?.type === 'confirm_otp') {
            dispatch({ type: 'SET_STEP', step: 'awaiting_otp' });
            return t('voice.loginOtpRepeat');
          }
          if (pending?.type === 'confirm_category') {
            dispatch({ type: 'SET_STEP', step: 'awaiting_category' });
            return t('voice.loginBuyerCategory');
          }
          if (pending?.type === 'confirm_verify') {
            dispatch({ type: 'SET_STEP', step: 'awaiting_verify' });
            return t('voice.loginVerifyPrompt');
          }
          return t('voice.confirmNo');
        }
        return null;
      }

      const digits = parseDigitSequence(text);
      if (s.step === 'awaiting_mobile') {
        if (digits.length >= 10) {
          const mobile = digits.slice(0, 10);
          dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'confirm_mobile', payload: { mobile } } });
          return t('voice.loginMobileHeard', { mobile });
        }
        return t('voice.loginAskMobile');
      }
      if (s.step === 'awaiting_otp') {
        if (digits.length >= 4) {
          const otp = digits.slice(0, 6);
          dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'confirm_otp', payload: { otp } } });
          return t('voice.loginOtpHeard', { otp });
        }
        return t('voice.loginAskOtp');
      }
      if (s.step === 'awaiting_verify') {
        if (isYesCommand(text, lang)) {
          dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'confirm_verify' } });
          return t('voice.loginVerifyConfirm');
        }
        return t('voice.loginVerifyPrompt');
      }
      if (s.step === 'awaiting_category') {
        const lower = text.toLowerCase().trim();
        const categories: Record<string, [string[], string][]> = {
          en: [[['normal buyer', 'normal'], 'Normal Buyer'], [['bulk buyer', 'bulk'], 'Bulk Buyer'], [['retail buyer', 'retail'], 'Retail Buyer'], [['institutional buyer', 'institutional'], 'Institutional Buyer']],
          te: [[['సాధారణ కొనుగోలుదారు', 'సాధారణ'], 'Normal Buyer'], [['బల్క్ కొనుగోలుదారు', 'బల్క్'], 'Bulk Buyer'], [['రిటైల్ కొనుగోలుదారు', 'రిటైల్'], 'Retail Buyer'], [['సంస్థాగత కొనుగోలుదారు', 'సంస్థాగత'], 'Institutional Buyer']],
          hi: [[['सामान्य खरीदार', 'सामान्य'], 'Normal Buyer'], [['बल्क खरीदार', 'बल्क'], 'Bulk Buyer'], [['रिटेल खरीदार', 'रिटेल'], 'Retail Buyer'], [['संस्थागत खरीदार', 'संस्थागत'], 'Institutional Buyer']],
        };
        const code = lang === 'English' ? 'en' : lang === 'తెలుగు' ? 'te' : 'hi';
        for (const [pats, cat] of categories[code] || []) {
          if (pats.some((p) => lower.includes(p.toLowerCase()))) {
            dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'confirm_category', payload: { category: cat } } });
            return t('voice.loginCategoryHeard', { category: cat });
          }
        }
        return t('voice.loginBuyerCategory');
      }
      return t('voice.didNotUnderstand');
    }

    if (isBackCommand(text, lang)) {
      const h = s.history;
      if (h.length > 0) {
        const prev = h[h.length - 1];
        dispatch({ type: 'POP_HISTORY' });
        cbRef.current.open(prev.view);
        return t('voice.goingBack');
      }
      cbRef.current.goBack();
      return t('voice.goingBack');
    }

    if (isUndoCommand(text, lang)) {
      if (s.history.length > 0) {
        const prev = s.history[s.history.length - 1];
        dispatch({ type: 'POP_HISTORY' });
        cbRef.current.open(prev.view);
        return t('voice.undoLast');
      }
      return t('voice.nothingToUndo');
    }

    if (isRedoCommand(text, lang)) {
      return t('voice.redoLast');
    }

    if (isContinueCropCommand(text, lang)) {
      if (s.slots && Object.keys(s.slots).length > 0) {
        dispatch({ type: 'START_INTENT', intent: 'add_crop' });
        return summaryOrNext(s.slots);
      }
      return t('voice.didNotUnderstand');
    }

    const roleMatch = parseRoleCommand(text, lang);
    if (roleMatch) {
      cbRef.current.selectRole(roleMatch.role);
      dispatch({ type: 'SET_LOGIN_ROLE', role: roleMatch.role });
      dispatch({ type: 'START_INTENT', intent: 'voice_login' });
      dispatch({ type: 'SET_STEP', step: 'awaiting_mobile' });
      return t('voice.roleSelected', { role: roleMatch.role }) + ' ' + t('voice.loginAskMobile');
    }

    const match = parseCommand(text, lang);
    if (!match) {
      return t('voice.didNotUnderstand');
    }

    if ((match as VoiceCommandMatch).unavailable) {
      return t('voice.notAvailable');
    }

    if (match.key === 'language') {
      const targetLang = parseLanguageChange(text);
      if (targetLang) {
        dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'language_change', payload: { lang: targetLang } } });
        return t('voice.confirmLangSwitch', { lang: targetLang });
      }
      return t('voice.openedLanguage');
    }

    if (match.key === 'addCrop') {
      if (match.view) {
        cbRef.current.open(match.view);
        dispatch({ type: 'PUSH_HISTORY', view: cbRef.current.currentView, label: 'home' });
      }
      dispatch({ type: 'START_INTENT', intent: 'add_crop', view: match.view });
      const next = nextMissingField();
      if (next) return askFieldPrompt(next);
      return t('voice.openedAddCrop');
    }

    if (match.view) {
      cbRef.current.open(match.view);
      dispatch({ type: 'PUSH_HISTORY', view: cbRef.current.currentView, label: match.view });
      const promptKey = `voice.page${match.view.charAt(0).toUpperCase()}${match.view.slice(1)}`;
      const tr = makeT(lang);
      const known = tr(promptKey);
      return known !== promptKey ? known : t('voice.followUp');
    }

    return t('voice.didNotUnderstand');
  }, [t, nextMissingField, nextMissingFieldAfter, summaryOrNext, askFieldPrompt]);

  const applyIntentResult = useCallback((result: IntentResult, text: string): string | null => {
    const lang = cbRef.current.language;
    const s = stateRef.current;

    if (result.stopSession) {
      dispatch({ type: 'CLOSE_SESSION' });
      cbRef.current.close();
      return t('voice.sessionEnded');
    }

    if (result.readScreen) {
      return result.description ?? t('voice.readScreenPrompt');
    }

    if (result.goBack) {
      const h = s.history;
      if (h.length > 0) {
        const prev = h[h.length - 1];
        dispatch({ type: 'POP_HISTORY' });
        cbRef.current.open(prev.view);
        return t('voice.goingBack');
      }
      cbRef.current.goBack();
      return t('voice.goingBack');
    }

    if (result.undo) {
      if (s.history.length > 0) {
        const prev = s.history[s.history.length - 1];
        dispatch({ type: 'POP_HISTORY' });
        cbRef.current.open(prev.view);
        return t('voice.undoLast');
      }
      return t('voice.nothingToUndo');
    }

    if (result.redo) {
      return t('voice.redoLast');
    }

    if (s.awaitingConfirmation) {
      if (result.confirmYes) {
        const pending = s.pendingAction;
        dispatch({ type: 'CONFIRM' });
        if (pending?.type === 'language_change' && pending.payload?.lang) {
          const targetLang = pending.payload.lang as Language;
          cbRef.current.setLanguage(targetLang);
          const langKey = targetLang === 'English' ? 'voice.langChangedEn' : targetLang === 'తెలుగు' ? 'voice.langChangedTe' : 'voice.langChangedHi';
          return makeT(targetLang)(langKey);
        }
        if (pending?.type === 'save_crop') {
          dispatch({ type: 'RESET' });
          return t('voice.formSaved');
        }
        if (pending?.type === 'confirm_mobile' && pending.payload?.mobile) {
          cbRef.current.setLoginField?.('mobile', pending.payload.mobile);
          dispatch({ type: 'SET_STEP', step: 'awaiting_otp' });
          return t('voice.loginMobileConfirmed') + ' ' + t('voice.loginAskOtp');
        }
        if (pending?.type === 'confirm_otp' && pending.payload?.otp) {
          cbRef.current.setLoginField?.('otp', pending.payload.otp);
          if (stateRef.current.loginRole === 'Buyer') {
            dispatch({ type: 'SET_STEP', step: 'awaiting_category' });
            return t('voice.loginOtpConfirmed') + ' ' + t('voice.loginBuyerCategory');
          }
          dispatch({ type: 'SET_STEP', step: 'awaiting_verify' });
          return t('voice.loginOtpConfirmed') + ' ' + t('voice.loginVerifyPrompt');
        }
        if (pending?.type === 'confirm_category' && pending.payload?.category) {
          cbRef.current.setLoginField?.('buyerCategory', pending.payload.category);
          dispatch({ type: 'SET_STEP', step: 'awaiting_verify' });
          return t('voice.loginCategoryConfirmed') + ' ' + t('voice.loginVerifyPrompt');
        }
        if (pending?.type === 'confirm_verify') {
          dispatch({ type: 'SET_STEP', step: null });
          cbRef.current.submitLogin?.();
          return t('voice.loginComplete');
        }
        return t('voice.confirmYes');
      }
      if (result.confirmNo) {
        const pending = s.pendingAction;
        dispatch({ type: 'CANCEL' });
        if (pending?.type === 'confirm_mobile') {
          dispatch({ type: 'SET_STEP', step: 'awaiting_mobile' });
          return t('voice.loginMobileRepeat');
        }
        if (pending?.type === 'confirm_otp') {
          dispatch({ type: 'SET_STEP', step: 'awaiting_otp' });
          return t('voice.loginOtpRepeat');
        }
        if (pending?.type === 'confirm_category') {
          dispatch({ type: 'SET_STEP', step: 'awaiting_category' });
          return t('voice.loginBuyerCategory');
        }
        if (pending?.type === 'confirm_verify') {
          dispatch({ type: 'SET_STEP', step: 'awaiting_verify' });
          return t('voice.loginVerifyPrompt');
        }
        return t('voice.confirmNo');
      }
      return null;
    }

    if (s.activeIntent === 'add_crop') {
      if (result.cancelCrop) {
        dispatch({ type: 'RESET' });
        return t('voice.cropDraftCancelled');
      }

      if (result.continueCrop) {
        if (s.slots && Object.keys(s.slots).length > 0) {
          dispatch({ type: 'START_INTENT', intent: 'add_crop' });
          return summaryOrNext(s.slots);
        }
        return t('voice.didNotUnderstand');
      }

      if (result.fieldChange && result.value) {
        dispatch({ type: 'FILL_SLOT', field: result.fieldChange, value: result.value });
        cbRef.current.setFormDraft(result.fieldChange, result.value);
        const next = nextMissingFieldAfter(result.fieldChange, result.value);
        if (next) return askFieldPrompt(next);
        return summaryOrNext({ ...s.slots, [result.fieldChange]: result.value });
      }

      if (result.intent === 'fill_slot_status' && result.value) {
        dispatch({ type: 'FILL_SLOT', field: 'status', value: result.value });
        cbRef.current.setFormDraft('status', result.value);
        const next = nextMissingFieldAfter('status', result.value);
        if (next) return askFieldPrompt(next);
        return summaryOrNext({ ...s.slots, status: result.value });
      }

      if (result.intent === 'fill_slot_value' && result.value) {
        const currentField = nextMissingField();
        if (currentField) {
          dispatch({ type: 'FILL_SLOT', field: currentField, value: result.value });
          cbRef.current.setFormDraft(currentField, result.value);
          const next = nextMissingFieldAfter(currentField, result.value);
          if (next) return askFieldPrompt(next);
          return summaryOrNext({ ...s.slots, [currentField]: result.value });
        }
      }

      if (result.intent === 'fill_slot_text' && result.value) {
        const currentField = nextMissingField();
        if (currentField) {
          dispatch({ type: 'FILL_SLOT', field: currentField, value: result.value });
          cbRef.current.setFormDraft(currentField, result.value);
          const next = nextMissingFieldAfter(currentField, result.value);
          if (next) return askFieldPrompt(next);
          return summaryOrNext({ ...s.slots, [currentField]: result.value });
        }
        return askFieldPrompt(currentField ?? 'cropName');
      }

      if (result.confirmYes) {
        const missing = nextMissingField();
        if (missing) return askFieldPrompt(missing);
        dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'save_crop', payload: s.slots } });
        return t('voice.confirmCropDraft', { cropName: s.slots.cropName || '', quantity: s.slots.quantity || '' });
      }

      return summaryOrNext(s.slots);
    }

    if (s.activeIntent === 'voice_login') {
      if (result.loginMobile) {
        let mobile = result.loginMobile.replace(/[^0-9]/g, '');
        if (mobile.length < 10) {
          const digits = parseDigitSequence(text);
          if (digits.length >= 10) mobile = digits.slice(0, 10);
        }
        if (mobile.length < 10) {
          return t('voice.loginAskMobile');
        }
        dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'confirm_mobile', payload: { mobile } } });
        return t('voice.loginMobileHeard', { mobile });
      }
      if (result.loginOtp) {
        let otp = result.loginOtp.replace(/[^0-9]/g, '');
        if (otp.length < 4) {
          const digits = parseDigitSequence(text);
          if (digits.length >= 4) otp = digits.slice(0, 6);
        }
        if (otp.length < 4) {
          return t('voice.loginAskOtp');
        }
        dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'confirm_otp', payload: { otp } } });
        return t('voice.loginOtpHeard', { otp });
      }
      if (result.loginCategory) {
        dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'confirm_category', payload: { category: result.loginCategory } } });
        return t('voice.loginCategoryHeard', { category: result.loginCategory });
      }
      if (s.step === 'awaiting_mobile' || s.step === 'awaiting_otp') {
        const digits = parseDigitSequence(text);
        if (s.step === 'awaiting_mobile' && digits.length >= 10) {
          dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'confirm_mobile', payload: { mobile: digits.slice(0, 10) } } });
          return t('voice.loginMobileHeard', { mobile: digits.slice(0, 10) });
        }
        if (s.step === 'awaiting_otp' && digits.length >= 4) {
          dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'confirm_otp', payload: { otp: digits.slice(0, 6) } } });
          return t('voice.loginOtpHeard', { otp: digits.slice(0, 6) });
        }
      }
      if (s.step === 'awaiting_verify' && result.confirmYes) {
        dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'confirm_verify' } });
        return t('voice.loginVerifyConfirm');
      }
      return t('voice.didNotUnderstand');
    }

    if (result.role) {
      const normalizedRole = normalizeRole(result.role);
      if (!normalizedRole) return t('voice.didNotUnderstand');
      cbRef.current.selectRole(normalizedRole);
      dispatch({ type: 'SET_LOGIN_ROLE', role: normalizedRole });
      dispatch({ type: 'START_INTENT', intent: 'voice_login' });
      dispatch({ type: 'SET_STEP', step: 'awaiting_mobile' });
      return t('voice.roleSelected', { role: normalizedRole }) + ' ' + t('voice.loginAskMobile');
    }

    if (result.unavailable) {
      return t('voice.notAvailable');
    }

    if (result.intent === 'language' && result.languageChange) {
      dispatch({ type: 'ASK_CONFIRMATION', action: { type: 'language_change', payload: { lang: result.languageChange } } });
      return t('voice.confirmLangSwitch', { lang: result.languageChange });
    }

    if (result.intent === 'add_crop' && result.view) {
      cbRef.current.open(result.view);
      dispatch({ type: 'PUSH_HISTORY', view: cbRef.current.currentView, label: 'home' });
      dispatch({ type: 'START_INTENT', intent: 'add_crop', view: result.view });
      const next = nextMissingField();
      if (next) return askFieldPrompt(next);
      return t('voice.openedAddCrop');
    }

    if (result.view) {
      cbRef.current.open(result.view);
      dispatch({ type: 'PUSH_HISTORY', view: cbRef.current.currentView, label: result.view });
      const promptKey = `voice.page${result.view.charAt(0).toUpperCase()}${result.view.slice(1)}`;
      const tr = makeT(lang);
      const known = tr(promptKey);
      return known !== promptKey ? known : t('voice.followUp');
    }

    return t('voice.didNotUnderstand');
  }, [t, nextMissingField, nextMissingFieldAfter, summaryOrNext, askFieldPrompt]);

  const processUtteranceAsync = useCallback(async (text: string, screenContext?: string): Promise<string | null> => {
    const lang = cbRef.current.language;
    const s = stateRef.current;

    const result = await fetchIntent(text, lang, {
      currentView: cbRef.current.currentView,
      activeIntent: s.activeIntent,
      step: s.step,
      slots: s.slots,
      awaitingConfirmation: s.awaitingConfirmation,
      screenContext,
    });

    if (!result) {
      return processUtterance(text);
    }

    return applyIntentResult(result, text);
  }, [processUtterance, applyIntentResult]);

  const narrateScreen = useCallback((view: string, loginStep?: number): string => {
    const tr = makeT(cbRef.current.language);
    if (view === 'home') return tr('voice.pageHome');
    if (view === 'crops') return tr('voice.pageCrops');
    if (view === 'crop-create') return tr('voice.pageCropCreate');
    if (view === 'market') return tr('voice.pageMarket');
    if (view === 'profile') return tr('voice.pageProfile');
    if (view === 'transport-options') return tr('voice.pageTransport');
    if (view === 'storage') return tr('voice.pageStorage');
    if (view === 'tutorials') return tr('voice.pageTutorials');
    if (view === 'orders') return tr('voice.pageOrders');
    if (view === 'calendar') return tr('voice.pageCalendar');
    if (view === 'help') return tr('voice.pageHelp');
    if (view === 'settings') return tr('voice.pageSettings');
    if (view === 'fpo') return tr('voice.pageFpo');
    if (view === 'features') return tr('voice.pageFeatures');
    if (view === 'login') return tr('voice.pageLogin');
    if (view === 'login-farmer') return tr('voice.loginAskMobile');
    if (view === 'login-fpo') return tr('voice.loginAskMobile');
    if (view === 'login-mobile') return tr('voice.pageLoginMobile');
    if (view === 'login-otp') return tr('voice.pageLoginOtp');
    if (view === 'login-category') return tr('voice.pageLoginCategory');
    if (view === 'login-verify') return tr('voice.pageLoginVerify');
    const promptKey = `voice.page${view.charAt(0).toUpperCase()}${view.slice(1)}`;
    const known = tr(promptKey);
    return known !== promptKey ? known : tr('voice.followUp');
  }, []);

  return { state, dispatch, processUtterance, processUtteranceAsync, nextMissingField, askFieldPrompt, narrateScreen };
}
