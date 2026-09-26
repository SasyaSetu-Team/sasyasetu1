import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Banknote, Bell, BookOpen, Building2, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Droplet, Eye, EyeOff, FileCheck2, Filter, Handshake, Headphones, Leaf, Layers, Map, MapPin, Mic, Minus, Package, Pause, Phone, Play, Plus, Printer, QrCode, RotateCcw, Satellite, Scissors, Search, Settings, ShieldCheck, ShoppingBag, Snowflake, Sparkles, Sprout, Star, Thermometer, TrendingDown, Truck, UserRound, Users, Volume2, VolumeX, Warehouse, Wallet, X, Zap, RefreshCw, Download } from 'lucide-react';
import { allLanguages, makeT, codeFromLanguage, languageFromCode, type Language, type T } from '@/translations';
import { demoEmails, farmerDemoEmails, useAuth, type Profile } from '@/lib/auth';
const rameshEmail = farmerDemoEmails.find((f) => f.name === 'Ramesh Kumar')?.email ?? farmerDemoEmails[0].email;
import { fetchCrops, fetchMyListings, fetchPublicListings, fetchListing, createListing, updateListing, markAsHarvested, buyNow, bookListing, fetchMyOrders, computeCurrentPrice, nextDropMinutes, computeClusterCurrentPrice, clusterNextDropMinutes, bookedQuantity, formatKg, formatPrice, formatDate, cropDisplayName, cropDisplayVariety, OTHER_CROP_ID, fetchClusters, formatHarvestWindow, timeLeftUntil, fetchClusterInvites, fetchClusterMemberships, fetchClusterMembers, joinCluster, dismissClusterInvite, type Crop, type CropListing, type CropListingInput, type CropClusterWithMembers, type ClusterInvite, type ClusterMembership, type ClusterMemberDetail, type BuyNowResult, type OrderRow, type BookResult } from '@/lib/crops';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, seedDemoNotificationsIfNeeded, type NotificationRow } from '@/lib/notifications';
import { parseCommand, parseStatus, parseNumber, parseLanguageChange, extractValue, isSpeechRecognitionSupported, isSpeechSynthesisSupported, createRecognition, stopSpeaking, warmupSpeech, langCode, captureScreenText, subscribeDebug, getSynthState, emitDebug, isYesCommand, isNoCommand, type VoiceRecognition, type DebugEvent } from '@/lib/voice';
import { useVoiceSession, speakTextViaSarvam, getTabNarration, type FormField, type SarvamVoiceResult } from '@/lib/useVoiceSession';
import { playAudioBlob, stopAudio } from '@/lib/playAudio';
import { supabase } from '@/lib/supabase';
import { CalendarDayCell, getMockMonthDays, monthHasMockEvents, mockMonthEvents, mockCalendarLegend, stageLegendColor, CalendarLegendIcon, type CalendarDayEvent, type CalendarDayData, type CalendarStage } from '@/components/CalendarDayCell';
import { CropFlipCard, cropPhotoFor } from '@/components/CropFlipCard';

type Role = 'Farmer' | 'FPO' | 'Transport Provider' | 'Storage Provider' | 'Buyer';
type View = 'home' | 'features' | 'crops' | 'crop-detail' | 'buyer-crop-detail' | 'buyer-payment' | 'crop-create' | 'crop-edit' | 'farmeye-detail' | 'market' | 'calendar' | 'transport-options' | 'transport-detail' | 'journey' | 'storage' | 'approvals' | 'fpo' | 'tutorials' | 'help' | 'dispute' | 'profile' | 'settings' | 'orders' | 'deals';
type IconType = typeof Sprout;

const round2 = (n: number): number => Math.round(n * 100) / 100;
const formatRupee = (n: number): string => '₹' + Number(n).toLocaleString('en-IN');
const cropIconFor = (name: string): IconType => { const n = name.toLowerCase(); if (n.includes('tomato')) return Sprout; if (n.includes('onion')) return Leaf; if (n.includes('paddy') || n.includes('rice')) return Package; if (n.includes('corn') || n.includes('maize')) return Sprout; if (n.includes('chilli')) return Sprout; if (n.includes('potato')) return Package; if (n.includes('brinjal')) return Sprout; if (n.includes('okra')) return Sprout; if (n.includes('groundnut')) return Package; if (n.includes('cotton')) return Sprout; if (n.includes('banana')) return Sprout; if (n.includes('mango')) return Sprout; if (n.includes('turmeric')) return Package; return Sprout; };
const cropColorFor = (name: string): string => { const n = name.toLowerCase(); if (n.includes('tomato')) return 'tomato'; if (n.includes('onion')) return 'onion'; if (n.includes('paddy') || n.includes('rice')) return 'paddy'; if (n.includes('corn') || n.includes('maize')) return 'green'; if (n.includes('chilli')) return 'tomato'; if (n.includes('potato')) return 'onion'; if (n.includes('brinjal')) return 'paddy'; if (n.includes('okra')) return 'green'; if (n.includes('groundnut')) return 'amber'; if (n.includes('cotton')) return 'teal'; if (n.includes('banana')) return 'amber'; if (n.includes('mango')) return 'orange'; if (n.includes('turmeric')) return 'amber'; return 'green'; };
const roleMeta: Record<Role, { location: string; initials: string; color: string; illustration: string }> = {
  Farmer: { location: 'Anantapur, Andhra Pradesh', initials: 'RK', color: 'green', illustration: 'Female Indian farmer' },
  FPO: { location: 'Warangal, Telangana', initials: 'WF', color: 'teal', illustration: 'FPO farmer group' },
  'Transport Provider': { location: 'Warangal, Telangana', initials: 'ST', color: 'orange', illustration: 'Transport provider' },
  'Storage Provider': { location: 'Warangal, Telangana', initials: 'KS', color: 'amber', illustration: 'Storage provider' },
  Buyer: { location: 'Warangal, Telangana', initials: 'VR', color: 'blue', illustration: 'Buyer at market' },
};
const allRoles: Role[] = ['Farmer', 'FPO', 'Transport Provider', 'Storage Provider', 'Buyer'];
const visibleRoles: Role[] = allRoles.filter((r) => r !== 'FPO');
const rameshVerificationData = { verificationId: 'TG-WGL-1042', category: 'Land Owner', homeLocation: 'Warangal, Telangana', name: 'Ramesh Kumar' };

function Illustration({ label, color, icon: Icon = Sprout, photo }: { label: string; color: string; icon?: IconType; photo?: string }) { return <div className={`illustration ${color}`}>
    {photo ? <>
      <img src={photo} alt={label} className="illustration-photo" loading="lazy" />
      <div className="illustration-photo-overlay"><small>{label}</small></div>
    </> : <>
      <div className="illustration-shape"><Icon size={58} strokeWidth={1.5} /></div>
      <small>{label}</small>
    </>}
  </div>; }
function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span>; }
function Button({ children, icon: Icon, variant = 'primary', onClick, wide = false, disabled = false }: { children: ReactNode; icon?: IconType; variant?: string; onClick?: () => void; wide?: boolean; disabled?: boolean }) { return <button className={`button ${variant} ${wide ? 'wide' : ''}`} onClick={onClick} disabled={disabled}>{Icon && <Icon size={18} />}{children}</button>; }
function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) { return <div className={`card ${className} ${onClick ? 'clickable' : ''}`} onClick={onClick}>{children}</div>; }
function Demo({ children }: { children: ReactNode }) { return <span className="demo"><i />{children}</span>; }
function SectionHeading({ title, body, icon: Icon }: { title: string; body: string; icon: IconType }) { return <div className="section-heading"><span className="section-icon"><Icon size={24} /></span><div><h2>{title}</h2><p>{body}</p></div></div>; }
function VoiceButton({ onClick, t }: { onClick: () => void; t: T }) { return <button className="voice-fab" onClick={onClick} aria-label={t('voice.assistant')}><Mic size={28} /><span /></button>; }
function LanguagePicker({ value, setValue, t }: { value: Language; setValue: (value: Language) => void; t: T }) { return <div className="language-picker"><span>{t('common.language')}</span>{allLanguages.map((language) => <button key={language} className={value === language ? 'selected' : ''} onClick={() => setValue(language)}>{language}</button>)}</div>; }

function VoiceModal({ close, t, language, open, currentView, setFormDraft, formDraft, setLanguage, selectRole, setLoginStep, setLoginField, submitLogin, loginRole, isLoggedIn, role, autoRouteToDestination, appSpeakingRef, appPendingNarrationRef, speakNarrationOnly, narratedTabsRef, autoVoiceConsentRef }: {
  close: () => void;
  t: T;
  language: Language;
  open?: (view: View) => void;
  currentView: string;
  setFormDraft?: (field: string, value: string) => void;
  formDraft?: Record<string, string>;
  setLanguage?: (lang: Language) => void;
  selectRole?: (role: string) => void;
  setLoginStep?: (step: number) => void;
  setLoginField?: (field: 'mobile' | 'otp' | 'buyerCategory', value: string) => void;
  submitLogin?: () => void;
  loginRole?: string | null;
  isLoggedIn?: boolean;
  role?: string | null;
  autoRouteToDestination?: (destinationView: string, role: string) => void;
  appSpeakingRef?: React.MutableRefObject<boolean>;
  appPendingNarrationRef?: React.MutableRefObject<string | null>;
  speakNarrationOnly?: (text: string) => void;
  narratedTabsRef?: React.MutableRefObject<Set<string>>;
  autoVoiceConsentRef?: React.MutableRefObject<'pending' | 'granted' | 'declined'>;
}) {
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [convState, setConvState] = useState<'IDLE' | 'SPEAKING' | 'WAIT_FOR_SPEECH' | 'TRANSCRIBING' | 'VALIDATING' | 'CONFIRMING'>('IDLE');
  const [debugStep, setDebugStep] = useState('none');
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [synthSnapshot, setSynthSnapshot] = useState('');

  useEffect(() => {
    const unsub = subscribeDebug((e) => {
      setDebugEvents((prev) => [...prev.slice(-9), e]);
      setSynthSnapshot(getSynthState());
    });
    return unsub;
  }, []);

  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const sessionRef = useRef(false);
  const speakingRef = useRef(false);
  const languageRef = useRef(language);
  const convStateRef = useRef<'IDLE' | 'SPEAKING' | 'WAIT_FOR_SPEECH' | 'TRANSCRIBING' | 'VALIDATING' | 'CONFIRMING'>('IDLE');
  const drainRef = useRef<() => void>(() => {});
  const lastSpokenRef = useRef<{ text: string; contextKey: string } | null>(null);

  useEffect(() => { languageRef.current = language; }, [language]);
  const currentViewRef = useRef(currentView);
  useEffect(() => { currentViewRef.current = currentView; }, [currentView]);

  const supported = isSpeechRecognitionSupported();

  const { state, dispatch, processUtterance, processUtteranceAsync, processSarvamVoiceTurn, transcribeOnly, nextMissingField, askFieldPrompt, narrateScreen } = useVoiceSession({
    setFormDraft: (field, value) => setFormDraft?.(field, value),
    setLanguage: (lang) => setLanguage?.(lang),
    open: (view) => open?.(view as View),
    selectRole: (role) => selectRole?.(role),
    close,
    goBack: () => open?.('home' as View),
    currentView,
    language,
    setLoginStep: (step) => setLoginStep?.(step),
    setLoginField: (field, value) => setLoginField?.(field, value),
    submitLogin: () => submitLogin?.(),
    isLoggedIn: !!isLoggedIn,
    role: role ?? null,
    autoRouteToDestination: (destView, reqRole) => autoRouteToDestination?.(destView, reqRole),
  });

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const recognitionGenRef = useRef(0);

  const setConv = useCallback((s: 'IDLE' | 'SPEAKING' | 'WAIT_FOR_SPEECH' | 'TRANSCRIBING' | 'VALIDATING' | 'CONFIRMING') => {
    convStateRef.current = s;
    setConvState(s);
  }, []);

  const startListening = useCallback(() => {
    if (!sessionRef.current || !supported || speakingRef.current || appSpeakingRef?.current) return;
    recognitionRef.current?.stop();
    const gen = ++recognitionGenRef.current;
    setVoiceState('listening');
    const rec = createRecognition(
      languageRef.current,
      (text) => handleFinalResult(text),
      (text) => setInterim(text),
      (err) => handleError(err),
      () => {
        if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current && gen === recognitionGenRef.current) {
          setTimeout(() => {
            if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current && gen === recognitionGenRef.current) {
              startListening();
            }
          }, 300);
        }
      },
    );
    recognitionRef.current = rec;
    rec?.start();
  }, [supported]);

  const startSarvamTurn = useCallback(async () => {
    if (!sessionRef.current || speakingRef.current || appSpeakingRef?.current) return;
    recognitionRef.current?.stop();
    speakingRef.current = true;
    if (appSpeakingRef) appSpeakingRef.current = true;
    setVoiceState('speaking');
    setConv('TRANSCRIBING');
    emitDebug('sarvam turn', 'starting record+stt+intent+tts');
    emitDebug('mic', 'requesting microphone access via getUserMedia');
    const result: SarvamVoiceResult | null = await processSarvamVoiceTurn();
    if (!result) {
      emitDebug('sarvam turn', 'FAILED — retrying Sarvam TTS for didNotUnderstand');
      if (sessionRef.current) {
        setConv('SPEAKING');
        const retryText = t('voice.didNotUnderstand');
        const retryAudio = await speakTextViaSarvam(retryText, languageRef.current);
        if (retryAudio) {
          playAudioBlob(retryAudio, () => {
            speakingRef.current = false;
            if (appSpeakingRef) appSpeakingRef.current = false;
            if (sessionRef.current) {
              setConv('WAIT_FOR_SPEECH');
              setTimeout(() => {
                if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
              }, 400);
            }
            drainRef.current();
          });
        } else {
          emitDebug('sarvam turn', 'Sarvam TTS retry also failed — skipping audible reply');
          speakingRef.current = false;
          if (appSpeakingRef) appSpeakingRef.current = false;
          if (sessionRef.current) {
            setConv('WAIT_FOR_SPEECH');
            setTimeout(() => {
              if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
            }, 400);
          }
          drainRef.current();
        }
      } else {
        speakingRef.current = false;
        if (appSpeakingRef) appSpeakingRef.current = false;
        drainRef.current();
      }
      return;
    }
    setTranscript(result.transcript);
    setInterim('');
    setConv('VALIDATING');
    const s = stateRef.current;
    setDebugStep(s.step ?? 'none');
    if (s.awaitingConfirmation) setConv('CONFIRMING'); else setConv('SPEAKING');

    const ctxKey = `${currentViewRef.current}:${s.step ?? 'none'}:${s.awaitingConfirmation ? 'c' : 'n'}`;
    const onReplyEnded = () => {
      speakingRef.current = false;
      if (appSpeakingRef) appSpeakingRef.current = false;
      if (sessionRef.current) {
        setConv('WAIT_FOR_SPEECH');
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
        }, 400);
      }
      drainRef.current();
    };

    if (result.replyText && lastSpokenRef.current && lastSpokenRef.current.text === result.replyText && lastSpokenRef.current.contextKey === ctxKey) {
      emitDebug('sarvam turn', `SKIP duplicate reply: "${result.replyText.slice(0, 40)}" — asking to repeat`);
      const repeatText = t('voice.pleaseRepeat');
      const repeatAudio = await speakTextViaSarvam(repeatText, languageRef.current);
      lastSpokenRef.current = { text: repeatText, contextKey: ctxKey };
      if (repeatAudio) { playAudioBlob(repeatAudio, onReplyEnded); return; }
    }

    lastSpokenRef.current = { text: result.replyText, contextKey: ctxKey };
    playAudioBlob(result.replyAudio, onReplyEnded);
  }, [processSarvamVoiceTurn, narrateScreen, setConv, t]);

  const speakSarvamAndListenRef = useRef(async (_text: string, _postDelay = 400) => {});
  const speakSarvamAndListen = useCallback(async (text: string, postDelay = 400) => {
    const ctxKey = `${currentViewRef.current}:${stateRef.current.step ?? 'none'}:${stateRef.current.awaitingConfirmation ? 'c' : 'n'}`;
    if (lastSpokenRef.current && lastSpokenRef.current.text === text && lastSpokenRef.current.contextKey === ctxKey) {
      emitDebug('speakSarvam', `SKIP duplicate: "${text.slice(0, 40)}" already spoken in ${ctxKey}`);
      speakingRef.current = false;
      if (appSpeakingRef) appSpeakingRef.current = false;
      if (sessionRef.current) {
        setConv('WAIT_FOR_SPEECH');
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
        }, postDelay);
      }
      drainRef.current();
      return;
    }
    lastSpokenRef.current = { text, contextKey: ctxKey };
    speakingRef.current = true;
    if (appSpeakingRef) appSpeakingRef.current = true;
    recognitionRef.current?.stop();
    setVoiceState('speaking');
    setConv('SPEAKING');
    setInterim('');
    const onAudioEnded = () => {
      speakingRef.current = false;
      if (appSpeakingRef) appSpeakingRef.current = false;
      if (sessionRef.current) {
        setConv('WAIT_FOR_SPEECH');
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
        }, postDelay);
      }
      drainRef.current();
    };
    const audio = await speakTextViaSarvam(text, languageRef.current);
    if (!audio) {
      emitDebug('speakSarvam', 'Sarvam TTS failed — retrying once');
      const retryAudio = await speakTextViaSarvam(text, languageRef.current);
      if (!retryAudio) {
        emitDebug('speakSarvam', 'Sarvam TTS retry also failed — skipping audible reply');
        speakingRef.current = false;
        if (appSpeakingRef) appSpeakingRef.current = false;
        if (sessionRef.current) {
          setConv('WAIT_FOR_SPEECH');
          setTimeout(() => {
            if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
          }, postDelay);
        }
        drainRef.current();
        return;
      }
      playAudioBlob(retryAudio, onAudioEnded);
      return;
    }
    playAudioBlob(audio, onAudioEnded);
  }, [startSarvamTurn, narrateScreen, setConv]);
  useEffect(() => { speakSarvamAndListenRef.current = speakSarvamAndListen; }, [speakSarvamAndListen]);

  const drainPendingNarration = useCallback(() => {
    if (!appPendingNarrationRef || !appSpeakingRef) return;
    const pending = appPendingNarrationRef.current;
    if (!pending) return;
    if (appSpeakingRef.current) return;
    if (speakingRef.current) return;
    appPendingNarrationRef.current = null;
    narrationQueuedRef.current = false;
    emitDebug('narration drain', `draining queued narration: "${pending.slice(0, 50)}"`);
    speakSarvamAndListenRef.current(pending);
  }, [appPendingNarrationRef, appSpeakingRef]);

  useEffect(() => { drainRef.current = drainPendingNarration; }, [drainPendingNarration]);

  const lastNarrationViewRef = useRef<string>('');
  const lastNarrationKeyRef = useRef<string>('');
  const narrationQueuedRef = useRef(false);
  useEffect(() => {
    if (currentView !== lastNarrationViewRef.current && lastNarrationViewRef.current !== '') {
      lastSpokenRef.current = null;
      stopAudio(); stopSpeaking(); speakingRef.current = false;
      if (appSpeakingRef) { appSpeakingRef.current = false; if (appPendingNarrationRef) appPendingNarrationRef.current = null; }
      narrationQueuedRef.current = false;
      emitDebug('narration effect', `view changed ${lastNarrationViewRef.current} → ${currentView} — cancelled speech`);
      const prevView = lastNarrationViewRef.current;
      narratedTabsRef?.current.forEach((key) => {
        if (key.startsWith(prevView + ':') || key === prevView) narratedTabsRef?.current.delete(key);
      });
    }
    if (speakingRef.current) {
      const isLoginViewQ = currentView.startsWith('login-');
      const queueKey = isLoginViewQ ? `${currentView}:${state.step ?? 'none'}` : currentView;
      if (narrationQueuedRef.current || narratedTabsRef?.current.has(queueKey)) { emitDebug('narration effect', `SKIP: already queued or narrated for ${queueKey}`); return; }
      emitDebug('narration effect', 'QUEUE: speakingRef is true — deferring narration');
      const narration = narrateScreen(currentView, isLoginViewQ ? (state.step ?? undefined) : undefined);
      if (narration && appPendingNarrationRef) appPendingNarrationRef.current = narration;
      if (narration) { narrationQueuedRef.current = true; narratedTabsRef?.current.add(queueKey); }
      lastNarrationViewRef.current = currentView;
      lastNarrationKeyRef.current = queueKey;
      return;
    }
    const isLoginView = currentView.startsWith('login-');
    const narrationKey = isLoginView ? `${currentView}:${state.step ?? 'none'}` : currentView;
    if (currentView === lastNarrationViewRef.current && narrationKey === lastNarrationKeyRef.current) { emitDebug('narration effect', `SKIP: same view+step ${narrationKey}`); return; }
    if (narratedTabsRef?.current.has(narrationKey)) { emitDebug('narration effect', `SKIP: already narrated ${narrationKey}`); return; }
    narrationQueuedRef.current = false;
    if (!sessionRef.current) {
      emitDebug('narration effect', `ENTER init path | view=${currentView} | sessionRef was false`);
      sessionRef.current = true;
      setSessionActive(true);
      setErrorMsg('');
      setTranscript('');
      setInterim('');
      dispatch({ type: 'GREET' });
      if (isLoginView && loginRole) {
        dispatch({ type: 'SET_LOGIN_ROLE', role: loginRole });
        dispatch({ type: 'START_INTENT', intent: 'voice_login' });
        dispatch({ type: 'SET_STEP', step: 'awaiting_mobile' });
        setDebugStep('awaiting_mobile');
      }
      lastNarrationViewRef.current = currentView;
      lastNarrationKeyRef.current = narrationKey;
      const narration = narrateScreen(currentView, isLoginView ? (state.step ?? undefined) : undefined);
      emitDebug('narration effect', `narrateScreen returned: "${narration?.slice(0, 50) ?? 'EMPTY'}" | will speak immediately`);
      if (narration) {
        narratedTabsRef?.current.add(narrationKey);
        narrationQueuedRef.current = false;
        speakSarvamAndListen(narration);
      } else {
        setConv('WAIT_FOR_SPEECH');
        if (!speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
      }
      return;
    }
    emitDebug('narration effect', `normal path | view=${currentView} step=${state.step ?? 'none'}`);
    lastNarrationViewRef.current = currentView;
    lastNarrationKeyRef.current = narrationKey;
    const narration = narrateScreen(currentView, isLoginView ? (state.step ?? undefined) : undefined);
    if (narration) { narratedTabsRef?.current.add(narrationKey); narrationQueuedRef.current = false; speakSarvamAndListen(narration); }
  }, [currentView, narrateScreen, speakSarvamAndListen, loginRole, state.step, appPendingNarrationRef, narratedTabsRef, autoVoiceConsentRef]);

  const handleFinalResult = useCallback(async (text: string) => {
    setTranscript(text);
    setInterim('');
    recognitionRef.current?.stop();
    setConv('TRANSCRIBING');
    const screenContext = captureScreenText();
    setConv('VALIDATING');
    speakingRef.current = true;
    if (appSpeakingRef) appSpeakingRef.current = true;
    const response = await processUtteranceAsync(text, screenContext);
    const s = stateRef.current;
    if (response) {
      setDebugStep(s.step ?? 'none');
      if (s.awaitingConfirmation) setConv('CONFIRMING');
      speakSarvamAndListen(response);
    } else {
      speakingRef.current = false;
      if (appSpeakingRef) appSpeakingRef.current = false;
      if (sessionRef.current) {
        setConv('WAIT_FOR_SPEECH');
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
        }, 400);
      }
      drainRef.current();
    }
  }, [processUtteranceAsync, speakSarvamAndListen, startSarvamTurn, setConv]);

  const handleError = useCallback((err: string) => {
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      setErrorMsg(t('voice.micDenied'));
      stopSession();
      return;
    }
    if (err === 'no-speech') return;
    if (err === 'aborted') return;
    setErrorMsg(t('voice.error'));
  }, [t]);

  const startSession = useCallback(() => {
    if (!supported) { setErrorMsg(t('voice.notSupported')); return; }
    sessionRef.current = true;
    setSessionActive(true);
    setErrorMsg('');
    setTranscript('');
    setInterim('');

    if (!state.greeted) {
      dispatch({ type: 'GREET' });
      if (currentView === 'crop-create' || currentView === 'crop-edit') {
        dispatch({ type: 'START_INTENT', intent: 'add_crop', view: currentView });
        if (formDraft && Object.keys(formDraft).length > 0) dispatch({ type: 'SEED_SLOTS', slots: formDraft });
        speakSarvamAndListen(t('voice.openedAddCrop'));
        setTimeout(() => {
          if (sessionRef.current) {
            const next = nextMissingField();
            if (next) speakSarvamAndListen(askFieldPrompt(next));
          }
        }, 2500);
      } else {
        speakSarvamAndListen(t('voice.howCanIHelp'));
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
        }, 2000);
      }
    } else {
      if (currentView === 'crop-create' || currentView === 'crop-edit') {
        dispatch({ type: 'START_INTENT', intent: 'add_crop', view: currentView });
        if (formDraft && Object.keys(formDraft).length > 0) dispatch({ type: 'SEED_SLOTS', slots: formDraft });
        speakSarvamAndListen(t('voice.openedAddCrop'));
        setTimeout(() => {
          if (sessionRef.current) {
            const next = nextMissingField();
            if (next) speakSarvamAndListen(askFieldPrompt(next));
          }
        }, 2500);
      } else {
        speakSarvamAndListen(t('voice.welcomeBack'));
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
        }, 1800);
      }
    }
  }, [supported, t, speakSarvamAndListen, startSarvamTurn, currentView, dispatch, nextMissingField, askFieldPrompt, formDraft]);

  const stopSession = useCallback(() => {
    sessionRef.current = false;
    setSessionActive(false);
    setVoiceState('idle');
    setConv('IDLE');
    setDebugStep('none');
    recognitionRef.current?.stop();
    stopAudio();
    stopSpeaking();
    speakingRef.current = false;
    if (appSpeakingRef) appSpeakingRef.current = false;
    if (appPendingNarrationRef) appPendingNarrationRef.current = null;
  }, [setConv, appPendingNarrationRef, appSpeakingRef, autoVoiceConsentRef]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopAudio();
        stopSpeaking();
        speakingRef.current = false;
        if (appSpeakingRef) appSpeakingRef.current = false;
        if (appPendingNarrationRef) appPendingNarrationRef.current = null;
        narrationQueuedRef.current = false;
        emitDebug('narration effect', 'document hidden — stopped all audio');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      recognitionRef.current?.stop();
    };
  }, []);

  const handleClose = () => {
    stopSession();
    dispatch({ type: 'CLOSE_SESSION' });
    close();
  };

  const slotEntries = Object.entries(state.slots).filter(([, v]) => v);

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="voice-modal voice-modal-minimal" onClick={(e) => e.stopPropagation()}>
        <div className="voice-modal-bar">
          <button
            className={`voice-mic-button ${sessionActive ? 'active' : ''}`}
            onClick={sessionActive ? stopSession : startSession}
            aria-label={sessionActive ? t('voice.tapToStop') : t('voice.tapToStart')}
          >
            <Mic size={28} />
            <span className={`voice-mic-pulse ${sessionActive ? 'active' : ''}`} />
          </button>
          <div className="voice-modal-info">
            {!supported && <span className="voice-unsupported-inline">{t('voice.notSupported')}</span>}
            {supported && !sessionActive && <span>{t('voice.tapToStart')}</span>}
            {supported && sessionActive && voiceState === 'listening' && (
              <span className="voice-listening-text">{interim || t('voice.listening')}</span>
            )}
            {supported && sessionActive && voiceState === 'speaking' && (
              <span className="voice-speaking-text">{transcript || t('voice.sessionActive')}</span>
            )}
            {errorMsg && <small className="voice-error-inline">{errorMsg}</small>}
          </div>
          <button className="icon-button voice-close-button" onClick={handleClose} aria-label={t('voice.stop')}>
            <X size={22} />
          </button>
        </div>
        {sessionActive && transcript && (
          <div className="voice-transcript-display">{transcript}</div>
        )}
        {sessionActive && slotEntries.length > 0 && (
          <div className="voice-draft-pills">
            {slotEntries.map(([k, v]) => (
              <span key={k} className="voice-draft-pill">{k}: {v}</span>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

const roleCardPhotos: Record<Role, string> = {
  Farmer: 'https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'Transport Provider': 'https://images.pexels.com/photos/20922619/pexels-photo-20922619.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'Storage Provider': 'https://images.pexels.com/photos/4487364/pexels-photo-4487364.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  Buyer: 'https://images.pexels.com/photos/17160893/pexels-photo-17160893.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  FPO: 'https://images.pexels.com/photos/20356942/pexels-photo-20356942.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
};

function Login({ onRole, voiceOpen, t, language }: { onRole: (role: Role) => void; voiceOpen: () => void; t: T; language: Language }) { const handleRole = (role: Role) => { warmupSpeech(); onRole(role); }; return <main className="login-screen"><div className="login-brand"><span><Sprout size={27} /></span><strong>{t('app.name')}</strong></div><VoiceButton onClick={voiceOpen} t={t} /><div className="role-cards">{visibleRoles.map((role) => <button className="role-card" key={role} onClick={() => handleRole(role)}><div className="role-card-photo"><img src={roleCardPhotos[role]} alt={t(`role.${role}`)} loading="lazy" /></div><h2>{t(`role.${role}`)}</h2><ArrowRight size={21} /></button>)}</div><button className="sasya-button" onClick={voiceOpen}><Sprout size={18} /> {t('app.name')}</button></main>; }

const loginFlowPhotos: Record<string, string> = {
  Farmer: 'https://images.pexels.com/photos/29039798/pexels-photo-29039798.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'Transport Provider': 'https://images.pexels.com/photos/13922927/pexels-photo-13922927.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'Storage Provider': 'https://images.pexels.com/photos/4481327/pexels-photo-4481327.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  Buyer: 'https://images.pexels.com/photos/17160893/pexels-photo-17160893.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  FPO: 'https://images.pexels.com/photos/20356942/pexels-photo-20356942.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
};

function LoginFlow({ role, done, back, t, authError, clearError, signingIn, step, setStep, mobile, setMobile, otp, setOtp, buyerCat, setBuyerCat }: { role: Role; done: (email: string, password: string, buyerCategory?: string) => Promise<void>; back: () => void; t: T; authError: string | null; clearError: () => void; signingIn: boolean; step: number; setStep: (step: number) => void; mobile: string; setMobile: (value: string) => void; otp: string; setOtp: (value: string) => void; buyerCat: string; setBuyerCat: (value: string) => void }) {
  const totalSteps = 3;
  const roleIcon = role === 'Farmer' ? Sprout : role === 'FPO' ? Users : role === 'Buyer' ? ShoppingBag : role === 'Storage Provider' ? Warehouse : Truck;
  const roleColor = roleMeta[role].color;
  const rolePhoto = loginFlowPhotos[role];

  const verifyAndSignIn = async (category?: string) => { const email = role === 'Farmer' ? rameshEmail : demoEmails[role]; await done(email, 'Demo1234!', category); };

  const stepTitle = role === 'Buyer' ? t('login.chooseCategory') : role === 'Farmer' ? t('login.farmerVerification') : role === 'FPO' ? t('login.fpoVerification') : t('login.providerVerification', { role: t(`role.${role}`) });

  const renderStep = () => {
    if (step === 0) return (<><div className="step-count">{t('login.step', { n: 1, total: totalSteps })}</div><h2>{t('login.enterMobile')}</h2><p>{t('login.sendOtpPrompt')}</p><form onSubmit={(e) => { e.preventDefault(); setStep(1); clearError(); }} className="login-form"><label>{t('login.mobileNumber')}<input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} autoComplete="tel" required /></label><Button wide>{t('login.sendOtp')}</Button></form></>);
    if (step === 1) return (<><div className="step-count">{t('login.step', { n: 2, total: totalSteps })}</div><h2>{t('login.enterOtp')}</h2><p>{t('login.otpPrompt')}</p><form onSubmit={(e) => { e.preventDefault(); setStep(2); clearError(); }} className="login-form"><label>{t('login.oneTimePassword')}<input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => { setOtp(e.target.value); clearError(); }} placeholder="123456" autoComplete="one-time-code" required /></label>{authError && <p className="auth-error" role="alert">{authError}</p>}<Button wide>{t('login.verifyOtp')}</Button><button type="button" className="text-link" onClick={() => setStep(0)}>{t('common.back')}</button></form></>);
    if (role === 'Buyer') { const categories = ['Normal Buyer', 'Bulk Buyer', 'Retail Buyer', 'Institutional Buyer']; return (<><div className="step-count">{t('login.step', { n: 3, total: totalSteps })}</div><h2>{t('login.chooseCategory')}</h2><p>{t('login.categoryPrompt')}</p><div className="category-list">{categories.map((cat) => <button key={cat} className={`category-option ${buyerCat === cat ? 'selected' : ''}`} onClick={() => { setBuyerCat(cat); clearError(); }} disabled={signingIn}><span>{cat}</span>{buyerCat === cat && <Check size={18} />}</button>)}</div>{authError && <p className="auth-error" role="alert">{authError}</p>}<Button wide onClick={() => verifyAndSignIn(buyerCat)} icon={signingIn ? undefined : ArrowRight}>{signingIn ? 'Signing in…' : t('login.continueAs', { category: buyerCat })}</Button><button type="button" className="text-link" onClick={() => setStep(1)} disabled={signingIn}>{t('common.back')}</button></>); }
    const fields = role === 'Farmer' ? [{ label: t('login.farmerId'), value: rameshVerificationData.verificationId }, { label: t('login.farmerName'), value: rameshVerificationData.name }, { label: t('login.farmerCategory'), value: rameshVerificationData.category }, { label: t('login.govVerification'), value: 'Demo Verified' }] : role === 'FPO' ? [{ label: t('login.fpoName'), value: 'Warangal Farmers FPO' }, { label: t('login.registrationNumber'), value: 'TG-FPO-2019-0452' }, { label: t('login.orgVerification'), value: 'Demo Verified' }] : [{ label: t('login.providerName'), value: role === 'Storage Provider' ? 'Krishna Cold Storage' : 'Suresh Transport Services' }, { label: t('login.permitNumber'), value: role === 'Storage Provider' ? 'AP-CS-2021-0093' : 'TG-TP-2018-1271' }, { label: t('login.permitReview'), value: 'Demo Verified' }];
    return (<><div className="step-count">{t('login.step', { n: 3, total: totalSteps })}</div><h2>{stepTitle}</h2><p>{role === 'Farmer' ? t('login.farmerVerificationPrompt') : role === 'FPO' ? t('login.fpoVerificationPrompt') : t('login.providerVerificationPrompt')}</p><div className="verification-fields">{fields.map((f) => <div key={f.label} className="verification-field"><small>{f.label}</small><strong>{f.value}</strong></div>)}<div className="verification-badge"><ShieldCheck size={16} /> Demo Verified</div></div>{authError && <p className="auth-error" role="alert">{authError}</p>}<Button wide onClick={() => verifyAndSignIn()} icon={signingIn ? undefined : ArrowRight}>{signingIn ? 'Signing in…' : t('login.continue')}</Button><button type="button" className="text-link" onClick={() => setStep(1)} disabled={signingIn}>{t('common.back')}</button></>);
  };

  return <main className="login-flow"><button className="back-button" onClick={back}><ArrowLeft size={18} /> {t('common.back')}</button><div className="flow-grid"><div><Illustration label={roleMeta[role].illustration} color={roleColor} icon={roleIcon} photo={rolePhoto} /><h1>{t(`role.${role}`)} {t('login.continue').toLowerCase()}</h1><p>{t('login.useSampleDetails', { role: t(`role.${role}`) })}</p></div><Card className="login-form"><div className="step-indicator">{Array.from({ length: totalSteps }).map((_, i) => <span key={i} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />)}</div>{renderStep()}</Card></div></main>;
}
const featureCardPhotos: Record<string, string> = {
  'My Crops': 'https://images.pexels.com/photos/13061059/pexels-photo-13061059.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Market': 'https://images.pexels.com/photos/17161106/pexels-photo-17161106.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Harvest Calendar': 'https://images.pexels.com/photos/29509476/pexels-photo-29509476.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Transport': 'https://images.pexels.com/photos/29057949/pexels-photo-29057949.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Storage': 'https://images.pexels.com/photos/31112245/pexels-photo-31112245.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'FPO Network': 'https://images.pexels.com/photos/20356942/pexels-photo-20356942.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Tutorials': 'https://images.pexels.com/photos/5212666/pexels-photo-5212666.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Help & Dispute': 'https://images.pexels.com/photos/7709303/pexels-photo-7709303.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Explore Crops': 'https://images.pexels.com/photos/10133324/pexels-photo-10133324.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'My Orders': 'https://images.pexels.com/photos/36569208/pexels-photo-36569208.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Deals': 'https://images.pexels.com/photos/17870116/pexels-photo-17870116.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Member Crops': 'https://images.pexels.com/photos/28220703/pexels-photo-28220703.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Transport Provider': 'https://images.pexels.com/photos/29057947/pexels-photo-29057947.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Main Summary': 'https://images.pexels.com/photos/31112245/pexels-photo-31112245.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Storage Requests': 'https://images.pexels.com/photos/31199532/pexels-photo-31199532.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'My Approvals': 'https://images.pexels.com/photos/7709303/pexels-photo-7709303.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Cold Storage Requests': 'https://images.pexels.com/photos/31112245/pexels-photo-31112245.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Farmer Requests': 'https://images.pexels.com/photos/13044335/pexels-photo-13044335.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Requests': 'https://images.pexels.com/photos/31112245/pexels-photo-31112245.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Live Journey': 'https://images.pexels.com/photos/29057946/pexels-photo-29057946.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
};

function featurePhotoFor(titleKey: string): string | null {
  const key = titleKey.replace('feature.', '');
  return featureCardPhotos[key] ?? null;
}

function FeatureCard({ title, body, icon: Icon, color, onClick, photo }: { title: string; body: string; icon: IconType; color: string; onClick: () => void; photo?: string | null }) { return <button className="feature-card feature-card-photo" onClick={onClick}>{photo ? <><div className="feature-card-image-wrap"><img className="feature-card-image" src={photo} alt="" loading="lazy" /></div><div className="feature-card-label"><strong>{title}</strong><ArrowRight size={19} /></div></> : <><span className={`feature-icon ${color}`}><Icon size={27} /></span><span><strong>{title}</strong><small>{body}</small></span><ArrowRight size={19} /></>}</button>; }
function RoleHome({ role, open, profile, notifications, t, profileData }: { role: Role; open: (view: View) => void; profile: () => void; notifications: () => void; t: T; profileData?: Profile | null }) { const feature = (titleKey: string, bodyKey: string, icon: IconType, color: string, view: View) => <FeatureCard title={t(titleKey)} body={t(bodyKey)} icon={icon} color={color} onClick={() => open(view)} photo={featurePhotoFor(titleKey)} />; const homeLocation = (role === 'Farmer' && profileData?.home_location) ? profileData.home_location : roleMeta[role].location; return <><section className="welcome welcome-white"><div><Badge tone="green">{t('home.workspace', { role: t(`role.${role}`) })}</Badge><h1>{t(`home.greeting.${role}`)}</h1><p>{homeLocation}</p><div className="welcome-actions"><button onClick={profile}><UserRound size={18} /> {t('home.profile')}</button><button onClick={notifications}><Bell size={18} /> {t('home.notifications')}</button></div></div><Illustration label={roleMeta[role].illustration} color={roleMeta[role].color} /></section><div className="feature-grid">{role === 'Farmer' && <>{feature('feature.My Crops', 'feature.My Crops.body', Leaf, 'green', 'crops')}{feature('feature.Market', 'feature.Market.body', ShoppingBag, 'blue', 'market')}{feature('feature.Harvest Calendar', 'feature.Harvest Calendar.body', CalendarDays, 'orange', 'calendar')}{feature('feature.Transport', 'feature.Transport.body', Truck, 'teal', 'transport-options')}{feature('feature.Storage', 'feature.Storage.body', Warehouse, 'amber', 'storage')}{feature('feature.FPO Network', 'feature.FPO Network.body', Users, 'green', 'fpo')}{feature('feature.Tutorials', 'feature.Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Help & Dispute.body', CircleHelp, 'orange', 'help')}</>}{role === 'Buyer' && <>{feature('feature.Explore Crops', 'feature.Explore Crops.body', Search, 'green', 'market')}{feature('feature.My Orders', 'feature.My Orders.body', Package, 'blue', 'orders')}{feature('feature.Tutorials', 'feature.Buyer Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Help & Dispute.body', CircleHelp, 'orange', 'help')}</>}{role === 'FPO' && <>{feature('feature.Member Crops', 'feature.Member Crops.body', Leaf, 'green', 'crops')}{feature('feature.Market', 'feature.Market FPO.body', ShoppingBag, 'blue', 'market')}{feature('feature.Harvest Calendar', 'feature.Member Calendar.body', CalendarDays, 'orange', 'calendar')}{feature('feature.Transport Provider', 'feature.Transport Provider.body', Truck, 'teal', 'transport-options')}{feature('feature.Storage', 'feature.Storage FPO.body', Warehouse, 'amber', 'storage')}{feature('feature.Tutorials', 'feature.FPO Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.FPO Help.body', CircleHelp, 'orange', 'help')}</>}{role === 'Storage Provider' && <>{feature('feature.Storage Requests', 'feature.Storage Requests.body', Warehouse, 'blue', 'storage')}{feature('feature.My Approvals', 'feature.My Approvals.body', FileCheck2, 'teal', 'approvals')}{feature('feature.Tutorials', 'feature.Storage Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Provider Help.body', CircleHelp, 'orange', 'help')}</>}{role === 'Transport Provider' && <>{feature('feature.Requests', 'feature.Requests.body', Warehouse, 'amber', 'features')}{feature('feature.Live Journey', 'feature.Live Journey.body', Map, 'orange', 'journey')}{feature('feature.Tutorials', 'feature.Transport Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Provider Help.body', CircleHelp, 'orange', 'help')}</>}</div><p className="scroll-hint">{t('home.scrollHint')}</p></>; }

function ClusterSummaryCard({ cluster, t, badge, onClick }: { cluster: CropClusterWithMembers; t: T; badge: string; onClick: () => void }) {
  const name = cluster.crop_name;
  const Icon = cropIconFor(name);
  const isHarvested = cluster.status === 'sold' || cluster.status === 'closed';
  const isInTransit = cluster.transport_status != null && cluster.transport_status !== '' && !isHarvested;
  const tone = isHarvested ? 'blue' : isInTransit ? 'orange' : 'green';
  const statusText = isHarvested ? t('cluster.completed') : isInTransit ? t('cluster.inTransit') : t('cluster.youAreMember');
  const isMembership = 'my_quantity' in cluster;
  const myQty = isMembership ? (cluster as ClusterMembership).my_quantity : 0;
  const myShare = isMembership ? (cluster as ClusterMembership).my_payout_share : 0;
  const myPayoutAmt = isMembership ? (myShare / 100) * cluster.total_quantity : 0;
  const currentPrice = computeClusterCurrentPrice(cluster);
  const dropIn = clusterNextDropMinutes(cluster);
  const isAtFloor = currentPrice != null && cluster.price_floor_per_kg != null && currentPrice <= cluster.price_floor_per_kg;
  const isSoldCluster = cluster.status === 'sold';
  return <Card className={`cluster-image-card${isSoldCluster ? ' sold-card' : ''}`} onClick={onClick}>
    <div className="cluster-image-wrap">
      <img className="cluster-image-photo" src={cropPhotoFor(name)} alt={name} loading="lazy" />
      <span className={`flip-card-status ${isSoldCluster ? 'soldout' : isHarvested ? 'harvested' : isInTransit ? 'ready' : 'ready'}`}>{statusText}</span>
    </div>
    <div className="cluster-image-body">
      <div className="cluster-row-badges">
        <span className="cluster-row-pill"><Layers size={12} /> {t('cluster.label')}</span>
        {cluster.verified_count > 0 && <span className="cluster-verified-fraction"><Check size={11} strokeWidth={3} /> {cluster.verified_count}/{cluster.farmer_count} verified</span>}
      </div>
      <h3>{name}{cluster.variety ? ` · ${cluster.variety}` : ''}</h3>
      <p>{cluster.farmer_count} {t('cluster.farmers')} · {formatKg(cluster.total_quantity)}{isMembership ? ` · ${t('cluster.yourContribution')}: ${formatKg(myQty)}` : ''}{isMembership && isHarvested ? ` · ${t('cluster.payout')}: ₹${Math.round(myPayoutAmt).toLocaleString('en-IN')}` : ''}</p>
      {isMembership && !isHarvested && <p style={{ marginTop: 2 }}>{t('cluster.yourPayoutShare')}: {myShare.toFixed(1)}% · {t('cluster.harvestWindow')}: {formatHarvestWindow(cluster)}</p>}
      {currentPrice != null && isHarvested && <div className="price-clock-widget" style={{ marginTop: 6 }}>
        <div className="price-clock-left">
          <span className="price-clock-price"><TrendingDown size={14} /> <strong>{formatPrice(currentPrice)}</strong></span>
          {!isSoldCluster && <span className="price-clock-drop">{dropIn != null && dropIn > 0 && !isAtFloor ? t('market.nextDropIn', { minutes: dropIn }) : ''}</span>}
          {cluster.price_floor_per_kg != null && <span className="price-clock-floor">· {formatPrice(cluster.price_floor_per_kg)}</span>}
        </div>
      </div>}
    </div>
    <ArrowRight size={19} className="cluster-image-arrow" />
  </Card>;
}

function InviteCard({ invite, t, onAccept, onDeny, busy }: { invite: ClusterInvite; t: T; onAccept: () => void; onDeny: () => void; busy: boolean }) {
  const name = invite.crop_name;
  const Icon = cropIconFor(name);
  const myQty = invite.matching_listing_quantity;
  const combinedTotal = invite.total_quantity + myQty;
  const mySharePct = combinedTotal > 0 ? (myQty / combinedTotal) * 100 : 0;
  const estPricePerKg = 25;
  const myPayoutAmt = (mySharePct / 100) * combinedTotal * estPricePerKg;
  return <Card className="cluster-image-card cluster-invite-card" onClick={onAccept}>
    <div className="cluster-image-wrap">
      <img className="cluster-image-photo" src={cropPhotoFor(name)} alt={name} loading="lazy" />
      <span className="flip-card-status ready" style={{ background: '#fef3c7', color: '#78350f', border: '1px solid #fcd34d' }}><Layers size={12} /> {t('cluster.inviteBadge')}</span>
    </div>
    <div className="cluster-image-body">
      <h3>{name}{invite.variety ? ` · ${invite.variety}` : ''}</h3>
      <p>{invite.location_area ?? '—'}</p>
      <p style={{ marginTop: 2 }}>{t('cluster.becomesNIfJoin', { count: invite.farmer_count, next: invite.farmer_count + 1 })}</p>
      <p style={{ marginTop: 4 }}>{t('cluster.contributionPreview', { qty: formatKg(myQty) })}</p>
      <p style={{ marginTop: 2 }}>{t('cluster.payoutPreview', { amount: Math.round(myPayoutAmt).toLocaleString('en-IN'), percent: mySharePct.toFixed(1) })}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <Button icon={Check} onClick={onAccept} disabled={busy} wide>{busy ? '…' : t('cluster.accept')}</Button>
        <Button variant="outline" onClick={onDeny} disabled={busy}>{t('cluster.deny')}</Button>
      </div>
    </div>
  </Card>;
}

function ClusterDetail({ cluster, members, t, invite, busy, onAccept, onDeny, onClose, currentUserId }: { cluster: CropClusterWithMembers; members: ClusterMemberDetail[]; t: T; invite?: ClusterInvite; busy: boolean; onAccept: () => void; onDeny: () => void; onClose: () => void; currentUserId?: string }) {
  const [selectedFarmer, setSelectedFarmer] = useState<ClusterMemberDetail | null>(null);
  const harvested = cluster.status === 'sold' || cluster.status === 'closed';
  const isInTransit = cluster.transport_status != null && cluster.transport_status !== '' && !harvested;
  const statusLabel = cluster.status === 'forming' ? t('cluster.forming') : cluster.status === 'ready' ? t('cluster.ready') : cluster.status === 'sold' ? t('cluster.sold') : t('cluster.closed');
  const statusTone = cluster.status === 'ready' ? 'green' : cluster.status === 'forming' ? 'orange' : 'blue';
  const isMembership = 'my_quantity' in cluster;
  const myMember = members.find((m) => m.farmer_id === currentUserId);
  const myQty = isMembership ? (cluster as ClusterMembership).my_quantity : myMember?.quantity_contributed ?? 0;
  const mySharePct = isMembership ? (cluster as ClusterMembership).my_payout_share : myMember?.payout_share_percent ?? 0;
  const otherMembers = members.filter((m) => m.farmer_id !== currentUserId);
  const totalContributed = members.reduce((sum, m) => sum + m.quantity_contributed, 0);
  const estPricePerKg = myMember?.indicative_price_per_kg ?? 25;
  const myPayoutAmt = (mySharePct / 100) * totalContributed * estPricePerKg;
  const shareAmount = selectedFarmer ? (selectedFarmer.payout_share_percent / 100) * totalContributed * (selectedFarmer.indicative_price_per_kg ?? estPricePerKg) : 0;
  const totalEarnings = totalContributed * estPricePerKg;
  const inviteMyQty = invite?.matching_listing_quantity ?? 0;
  const inviteCombinedTotal = invite ? invite.total_quantity + inviteMyQty : 0;
  const inviteMySharePct = inviteCombinedTotal > 0 ? (inviteMyQty / inviteCombinedTotal) * 100 : 0;
  const inviteMyPayoutAmt = (inviteMySharePct / 100) * inviteCombinedTotal * estPricePerKg;
  const clusterTransportCost = cluster.transport_cost ?? null;
  const clusterStorageCost = cluster.storage_cost ?? null;
  const myTransportShare = clusterTransportCost != null && totalContributed > 0 ? (myQty / totalContributed) * clusterTransportCost : 0;
  const myStorageShare = clusterStorageCost != null && totalContributed > 0 ? (myQty / totalContributed) * clusterStorageCost : 0;
  const inviteTransportShare = invite && clusterTransportCost != null && inviteCombinedTotal > 0 ? (inviteMyQty / inviteCombinedTotal) * clusterTransportCost : 0;
  const inviteStorageShare = invite && clusterStorageCost != null && inviteCombinedTotal > 0 ? (inviteMyQty / inviteCombinedTotal) * clusterStorageCost : 0;
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="cluster-detail-modal" onClick={(event) => event.stopPropagation()}>
      <div className="cluster-detail-header"><div><span className="eyebrow">{selectedFarmer ? t('cluster.farmerDetail') : t('cluster.detailTitle')}</span><h2>{selectedFarmer?.farmer_name ?? `${cluster.crop_name}${cluster.variety ? ` · ${cluster.variety}` : ''}`}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('common.close')}><X size={22} /></button></div>
      {selectedFarmer ? <>
        <div className="cluster-detail-grid">
          <Detail label={t('cluster.location')} value={selectedFarmer.location_area ?? '—'} />
          <Detail label={t('cluster.contribution')} value={formatKg(selectedFarmer.quantity_contributed)} />
          <Detail label={t('cluster.sharePercent')} value={`${selectedFarmer.payout_share_percent.toFixed(1)}%`} />
          <Detail label={t('cluster.shareAmount')} value={`₹${Math.round(shareAmount).toLocaleString('en-IN')}`} />
        </div>
        <Button variant="outline" onClick={() => setSelectedFarmer(null)}>{t('common.back')}</Button>
      </> : <>
        <div className="cluster-detail-section"><h3>{t('cluster.coreDetails')}</h3>
          <div className="cluster-detail-grid">
            <Detail label={t('cluster.location')} value={cluster.location_area ?? '—'} />
            <Detail label={t('cluster.harvestWindow')} value={formatHarvestWindow(cluster)} />
            <Detail label={t('cluster.pricePerKg')} value={formatPrice(estPricePerKg)} />
            <div><small>&nbsp;</small><strong><Badge tone={statusTone}>{statusLabel}</Badge></strong></div>
          </div>
        </div>
        {(isMembership || myMember) && <div className="cluster-detail-section"><h3>{t('cluster.yourContribution')}</h3>
          <div className="cluster-detail-grid">
            <Detail label={t('cluster.yourContribution')} value={formatKg(myQty)} />
            <Detail label={t('cluster.totalContributed')} value={formatKg(totalContributed)} />
            <Detail label={t('cluster.yourPayoutShare')} value={`${mySharePct.toFixed(1)}%`} />
            <Detail label={t('cluster.yourPayoutAmount')} value={`₹${Math.round(myPayoutAmt).toLocaleString('en-IN')}`} />
          </div>
        </div>}
        {invite && <div className="cluster-detail-section"><h3>{t('cluster.expectedContribution')}</h3>
          <div className="cluster-detail-grid">
            <Detail label={t('cluster.yourContribution')} value={formatKg(inviteMyQty)} />
            <Detail label={t('cluster.totalContributed')} value={formatKg(invite.total_quantity)} />
            <Detail label={t('cluster.yourPayoutShare')} value={`${inviteMySharePct.toFixed(1)}%`} />
            <Detail label={t('cluster.yourPayoutAmount')} value={`₹${Math.round(inviteMyPayoutAmt).toLocaleString('en-IN')}`} />
          </div>
        </div>}
        {(clusterTransportCost != null || clusterStorageCost != null) && <div className="cluster-detail-section"><h3>{t('cluster.sharedCosts')}</h3>
          <div className="cluster-detail-grid">
            {clusterTransportCost != null && <Detail label={t('cluster.transportCost')} value={`₹${Math.round(clusterTransportCost).toLocaleString('en-IN')} total`} />}
            {clusterTransportCost != null && (isMembership || myMember) && <Detail label={t('cluster.transportCost')} value={`₹${Math.round(myTransportShare).toLocaleString('en-IN')}`} />}
            {clusterTransportCost != null && invite && <Detail label={t('cluster.transportCost')} value={`₹${Math.round(inviteTransportShare).toLocaleString('en-IN')}`} />}
            {clusterStorageCost != null && <Detail label={t('cluster.storageCost')} value={`₹${Math.round(clusterStorageCost).toLocaleString('en-IN')} total`} />}
            {clusterStorageCost != null && (isMembership || myMember) && <Detail label={t('cluster.storageCost')} value={`₹${Math.round(myStorageShare).toLocaleString('en-IN')}`} />}
            {clusterStorageCost != null && invite && <Detail label={t('cluster.storageCost')} value={`₹${Math.round(inviteStorageShare).toLocaleString('en-IN')}`} />}
          </div>
        </div>}
        {isInTransit && <div className="cluster-detail-section"><h3>{t('cluster.transportProgress')}</h3>
          <div className="cluster-detail-grid">
            <Detail label={t('cluster.transportPartner')} value={t('cluster.transportPartnerName')} />
            <Detail label={t('cluster.transportProgress')} value={t('cluster.inTransit')} />
          </div>
          <h3>{t('cluster.payoutSplit')}</h3>
          {otherMembers.length === 0 && myMember ? <p>{t('cluster.noMemberships')}</p> : <div className="cluster-member-list">{members.map((member) => <button className="cluster-member-row" key={member.id} onClick={() => setSelectedFarmer(member)}><div><strong>{member.farmer_name === currentUserId ? t('cluster.membership') : member.farmer_name}</strong><span style={{ marginLeft: 8, color: '#849189', fontSize: 11 }}>{member.payout_share_percent.toFixed(1)}% · {formatKg(member.quantity_contributed)}</span></div><ArrowRight size={16} /></button>)}</div>}
        </div>}
        {harvested && <div className="cluster-detail-section"><h3>{t('cluster.earningsSummary')}</h3>
          <div className="cluster-detail-grid">
            <Detail label={t('cluster.totalQuantitySold')} value={formatKg(totalContributed)} />
            <Detail label={t('cluster.pricePerKg')} value={formatPrice(estPricePerKg)} />
            <Detail label={t('cluster.totalEarnings')} value={`₹${Math.round(totalEarnings).toLocaleString('en-IN')}`} />
            <Detail label={t('cluster.amountReceived')} value={`₹${Math.round(myPayoutAmt).toLocaleString('en-IN')}`} />
          </div>
          <p style={{ marginTop: 10, fontWeight: 600, color: '#2c823b' }}>{t('cluster.youEarned', { amount: Math.round(myPayoutAmt).toLocaleString('en-IN') })}</p>
          <h3 style={{ marginTop: 12 }}>{t('cluster.perFarmerEarnings')}</h3>
          {otherMembers.length === 0 && !myMember ? <p>{t('cluster.noMemberships')}</p> : <div className="cluster-member-list">{members.map((member) => {
            const earned = (member.payout_share_percent / 100) * totalContributed * (member.indicative_price_per_kg ?? estPricePerKg);
            return <button className="cluster-member-row" key={member.id} onClick={() => setSelectedFarmer(member)}><div><strong>{member.farmer_id === currentUserId ? t('cluster.membership') : member.farmer_name}</strong><span style={{ marginLeft: 8, color: '#849189', fontSize: 11 }}>{member.payout_share_percent.toFixed(1)}% · ₹{Math.round(earned).toLocaleString('en-IN')}</span></div><ArrowRight size={16} /></button>;
          })}</div>}
        </div>}
        {!isInTransit && !harvested && <div className="cluster-detail-section"><h3>{t('cluster.members')}</h3>{otherMembers.length === 0 ? <p>{t('cluster.noMemberships')}</p> : <div className="cluster-member-list">{otherMembers.map((member) => <button className="cluster-member-row" key={member.id} onClick={() => setSelectedFarmer(member)}><div><strong>{member.farmer_name}</strong><span style={{ marginLeft: 8, color: '#849189', fontSize: 11 }}>{member.payout_share_percent.toFixed(1)}% · {formatKg(member.quantity_contributed)}</span></div><ArrowRight size={16} /></button>)}</div>}</div>}
        {invite && <div className="row"><Button icon={Check} onClick={onAccept} wide>{busy ? '…' : t('cluster.accept')}</Button><Button variant="outline" onClick={onDeny} disabled={busy}>{t('cluster.deny')}</Button></div>}
      </>}
    </div>
  </div>;
}

type ClusterModalState = { cluster: CropClusterWithMembers; members: ClusterMemberDetail[]; invite?: ClusterInvite } | null;

function MyCropImageCard({ listing, t, upcoming, onEdit, onMarkHarvested, onViewBuyerRequests, onFarmEye }: { listing: CropListing; t: T; upcoming: boolean; onEdit: () => void; onMarkHarvested: () => void; onViewBuyerRequests: () => void; onFarmEye: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const name = cropDisplayName(listing);
  const photo = cropPhotoFor(name);
  const isHarvested = listing.status === 'Harvested' || listing.status === 'Sold';
  const isSold = listing.status === 'Sold';
  const currentPrice = computeCurrentPrice(listing);
  const statusLabel = isSold ? t('market.sold') : upcoming ? t('crops.Upcoming') : t('crops.Harvested');
  const statusClass = isSold ? 'soldout' : upcoming ? 'ready' : 'harvested';
  const isVerified = upcoming ? listing.listing_verified : (listing.harvest_timing_verified && listing.harvest_quantity_verified);
  const booked = bookedQuantity(listing);
  const variety = cropDisplayVariety(listing);
  const dateLabel = upcoming ? formatDate(listing.expected_harvest_date) : formatDate(listing.harvested_at);
  const marketLabel = formatPrice(listing.indicative_price_per_kg);
  const priceLabel = upcoming && listing.indicative_price_per_kg != null ? formatPrice(listing.indicative_price_per_kg) : isHarvested && currentPrice != null ? formatPrice(currentPrice) : '—';

  return (
    <div className={`flip-card${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(f => !f)}>
      <div className="flip-card-inner">
        <div className="flip-card-face flip-card-front" style={{ pointerEvents: flipped ? 'none' : 'auto' }}>
          <div className="flip-card-image-wrap">
            <img className="flip-card-image" src={photo} alt={name} loading="lazy" />
            <button type="button" className="farmeye-badge" title="FarmEye Verified" onClick={(e) => { e.stopPropagation(); onFarmEye(); }}><Satellite size={16} /><span className="farmeye-ring" /></button>
            <span className={`flip-card-status ${statusClass}`}>{statusLabel}</span>
          </div>
          <h3 className="flip-card-title">{name} · {variety}</h3>
          <div className="flip-card-qty">{formatKg(listing.quantity_kg)}</div>
          <p style={{ fontSize: '13px', color: '#047857', fontWeight: 700, margin: '4px 0 8px' }}>{priceLabel}</p>
          <button type="button" className="flip-card-flip-btn" onClick={(e) => { e.stopPropagation(); setFlipped(true); }}>
            {t('market.seeInfo')} <ArrowRight size={14} />
          </button>
        </div>
        <div className="flip-card-face flip-card-back" style={{ pointerEvents: flipped ? 'auto' : 'none' }}>
          <div className="bf-header">
            <div className="bf-header-top">
              <div className="bf-header-left">
                {isVerified && <span className="mycrop-verified-pill"><Satellite size={11} /> Verified</span>}
              </div>
              <div className="bf-header-icons">
                <button type="button" className="bf-icon-btn" onClick={(e) => { e.stopPropagation(); }}>
                  <Volume2 size={15} />
                </button>
                <button type="button" className="bf-icon-btn" onClick={(e) => { e.stopPropagation(); setFlipped(false); }}>
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
            <h3 className="bf-crop-title">{name}</h3>
          </div>
          <div className="bf-body" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
            <div className="bf-specs-grid">
              <div className="bf-spec-box">
                <div className="bf-spec-label">{t('crops.variety').toUpperCase()}</div>
                <div className="bf-spec-value">{variety}</div>
              </div>
              <div className="bf-spec-box">
                <div className="bf-spec-label">{t('crops.quantity').toUpperCase()}</div>
                <div className="bf-spec-value">{formatKg(listing.quantity_kg)}</div>
              </div>
              <div className="bf-spec-box">
                <div className="bf-spec-label">{t('crops.bookedQuantity').toUpperCase()}</div>
                <div className="bf-spec-value">{formatKg(booked)}</div>
              </div>
              <div className="bf-spec-box">
                <div className="bf-spec-label">{t('crops.remainingQuantity').toUpperCase()}</div>
                <div className="bf-spec-value">{formatKg(listing.available_quantity_kg)}</div>
              </div>
              <div className="bf-spec-box">
                <div className="bf-spec-label">{t('crops.expectedHarvest').toUpperCase()}</div>
                <div className="bf-spec-value">{dateLabel}</div>
              </div>
              <div className="bf-spec-box">
                <div className="bf-spec-label">{t('crops.marketInfo').toUpperCase()}</div>
                <div className="bf-spec-value">{marketLabel}</div>
              </div>
            </div>
          </div>
          <div className="flip-card-actions mycrop-back-actions" style={{ flexShrink: 0 }}>
            <button type="button" className="button primary" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Settings size={16} /> {t('crops.edit')}</button>
            {!isHarvested && <button type="button" className="button primary" onClick={(e) => { e.stopPropagation(); onMarkHarvested(); }}><Check size={16} /> {t('crops.markHarvested')}</button>}
            <button type="button" className="button primary" onClick={(e) => { e.stopPropagation(); onViewBuyerRequests(); }}><ShoppingBag size={16} /> {t('crops.viewBuyerRequests')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CropView({ open, selectCrop, t, role, notify, currentUserId }: { open: (view: View) => void; selectCrop: (listing: CropListing) => void; t: T; role: Role; notify: (message: string) => void; currentUserId?: string }) {
  const [type, setType] = useState<'Upcoming' | 'Harvested' | 'Cluster'>('Upcoming');
  const [listings, setListings] = useState<CropListing[]>([]);
  const [invites, setInvites] = useState<ClusterInvite[]>([]);
  const [memberships, setMemberships] = useState<ClusterMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyClusterId, setBusyClusterId] = useState<string | null>(null);
  const [modal, setModal] = useState<ClusterModalState>(null);

  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [listingData, inviteData, membershipData] = await Promise.all([fetchMyListings(), fetchClusterInvites(), fetchClusterMemberships()]);
      setListings(listingData);
      setInvites(inviteData);
      setMemberships(membershipData);
    } catch {
      setError(tRef.current('crops.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      try {
        const [listingData, inviteData, membershipData] = await Promise.all([fetchMyListings(), fetchClusterInvites(), fetchClusterMemberships()]);
        if (!cancelled) { setListings(listingData); setInvites(inviteData); setMemberships(membershipData); }
      } catch {
        if (!cancelled) setError(tRef.current('crops.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openClusterModal = async (cluster: CropClusterWithMembers, invite?: ClusterInvite) => {
    setModal({ cluster, members: [], invite });
    try {
      const members = await fetchClusterMembers(cluster.id);
      setModal({ cluster, members, invite });
    } catch { setModal({ cluster, members: [], invite }); }
  };

  const handleAccept = async () => {
    if (!modal?.invite) return;
    const invite = modal.invite;
    setBusyClusterId(invite.id);
    try {
      await joinCluster(invite.id, invite.matching_listing_id);
      notify(t('cluster.joined', { crop: invite.crop_name }));
      setModal(null);
      await loadAll();
    } catch {
      notify(t('cluster.joinError'));
    } finally {
      setBusyClusterId(null);
    }
  };

  const handleDeny = async () => {
    if (!modal?.invite) return;
    const invite = modal.invite;
    setBusyClusterId(invite.id);
    try {
      await dismissClusterInvite(invite.id);
      notify(t('cluster.dismissed'));
      setModal(null);
      await loadAll();
    } catch {
      notify(t('cluster.dismissError'));
    } finally {
      setBusyClusterId(null);
    }
  };

  const showClusterSections = role === 'Farmer';
  const upcoming = type === 'Upcoming';
  const isClusterTab = type === 'Cluster';
  const filtered = listings.filter((l) => !l.is_cluster_linked && (upcoming ? l.status === 'Upcoming' : l.status === 'Harvested' || l.status === 'Sold'));
  const joinedForTab = memberships.filter((m) => upcoming ? m.status !== 'sold' && m.status !== 'closed' : m.status === 'sold' || m.status === 'closed');

  return <Page title={t('crops.title')} body={t('crops.body')} back={() => open('home')} t={t}>
    <div className="filter-row">
      <button className={type === 'Upcoming' ? 'selected' : ''} onClick={() => setType('Upcoming')}>{t('crops.Upcoming')}</button>
      <button className={type === 'Harvested' ? 'selected' : ''} onClick={() => setType('Harvested')}>{t('crops.Harvested')}</button>
      {showClusterSections && <button className={isClusterTab ? 'selected' : ''} onClick={() => setType('Cluster')}><Layers size={14} /> {t('cluster.tab')}</button>}
    </div>

    {isClusterTab ? (
      <>
        <h3 className="subhead cluster-section-heading"><Layers size={18} /> {t('cluster.invitesTitle')}</h3>
        {loading && <p className="calendar-empty">{t('crops.loading')}</p>}
        {error && <p className="calendar-empty">{error}</p>}
        {!loading && !error && invites.length === 0 && <Card className="cluster-card demo-buffer-card"><div className="cluster-badge-row"><span className="cluster-pill"><Layers size={14} /> {t('cluster.label')}</span><Badge tone="orange">{t('cluster.demoBufferInvite')}</Badge></div><div className="cluster-body"><span className="cluster-illustration green"><Sprout size={38} strokeWidth={1.5} /></span><div className="cluster-info"><h2>Onion · Bangalore Local</h2><p>{t('cluster.demoBufferInvite')}</p><div className="cluster-stats"><span><Package size={15} /> 1,200 kg</span><span><MapPin size={15} /> Bangalore, KA</span></div><div className="cluster-stats"><span><CalendarDays size={15} /> 5 Oct 2026</span><span><ShieldCheck size={15} /> Grade B</span></div><div className="cluster-stats"><span>₹26/kg</span><span>0 members joined</span></div></div></div></Card>}
        <div className="crop-stack">
          {invites.map((invite) => (
            <InviteCard key={invite.id} invite={invite} t={t} busy={busyClusterId === invite.id} onAccept={() => openClusterModal(invite, invite)} onDeny={async () => { setBusyClusterId(invite.id); try { await dismissClusterInvite(invite.id); notify(t('cluster.dismissed')); await loadAll(); } catch { notify(t('cluster.dismissError')); } finally { setBusyClusterId(null); } }} />
          ))}
        </div>
      </>
    ) : (
      <>
        <h3 className="subhead">{upcoming ? t('crops.upcomingCrops') : t('crops.harvestedCrops')}</h3>
        {showClusterSections && joinedForTab.length > 0 && (
          <div className="crop-stack">
            {joinedForTab.map((membership) => (
              <ClusterSummaryCard key={membership.id} cluster={membership} t={t} badge={t('cluster.memberBadge')} onClick={() => openClusterModal(membership)} />
            ))}
          </div>
        )}
        {loading && <p className="calendar-empty">{t('crops.loading')}</p>}
        {error && <p className="calendar-empty">{error}</p>}
        {!loading && !error && filtered.length === 0 && <Card className="crop-row demo-buffer-card"><Illustration label="Chilli" color="orange" icon={Sprout} /><div><Badge tone="orange">{t('crops.demoBuffer')}</Badge><h3>Chilli · Guntur Red</h3><p>{t('crops.demoBuffer')}</p><p style={{ marginTop: 4 }}>350 kg · Grade A · 3 Oct 2026 · ₹42/kg</p><p style={{ marginTop: 2 }}>1 member joined</p></div></Card>}
        <div className="flip-card-grid">
          {filtered.map((listing) => <MyCropImageCard key={listing.id} listing={listing} t={t} upcoming={upcoming} onEdit={() => { selectCrop(listing); open('crop-edit'); }} onMarkHarvested={async () => { try { await markAsHarvested(listing.id, new Date().toISOString()); notify(t('crops.markedHarvested')); await loadAll(); } catch { notify(t('crops.loadError')); } }} onViewBuyerRequests={() => { open('market'); }} onFarmEye={() => { selectCrop(listing); open('farmeye-detail'); }} />)}
        </div>
      </>
    )}
    {(role === 'Farmer' || role === 'FPO') && !isClusterTab && <Button icon={Plus} onClick={() => open('crop-create')}>{t('crops.createCrop')}</Button>}
    {modal && <ClusterDetail cluster={modal.cluster} members={modal.members} t={t} invite={modal.invite} busy={busyClusterId === modal.cluster.id} onAccept={handleAccept} onDeny={handleDeny} onClose={() => setModal(null)} currentUserId={currentUserId} />}
  </Page>;
}
function CropDetail({ open, crop, t, role, onEdit, onMarkHarvested }: { open: (view: View) => void; crop: CropListing; t: T; role: Role; onEdit: () => void; onMarkHarvested: () => void }) {
  const name = cropDisplayName(crop);
  const variety = cropDisplayVariety(crop);
  const isHarvested = crop.status === 'Harvested';
  const booked = bookedQuantity(crop);
  return <Page title={name} body={t('crops.tapToView')} back={() => open('crops')} t={t}>
    <Card className="flashcard">
      {isHarvested
        ? (crop.harvest_timing_verified && crop.harvest_quantity_verified && <button type="button" className="verified-badge" onClick={() => { open('farmeye-detail'); }}><Satellite size={11} /> Verified</button>)
        : (crop.listing_verified && <button type="button" className="verified-badge" onClick={() => { open('farmeye-detail'); }}><Satellite size={11} /> Verified</button>)}
      <Illustration label={`${name} illustration`} color={cropColorFor(name)} icon={cropIconFor(name)} />
      <h2>{name}</h2>
      <small>{t('crops.tapToViewDetails')}</small>
    </Card>
    <div className="detail-grid">
      <Detail label={t('crops.variety')} value={variety} />
      <Detail label={t('crops.quantity')} value={formatKg(crop.quantity_kg)} />
      <Detail label={t('crops.bookedQuantity')} value={formatKg(booked)} />
      <Detail label={t('crops.remainingQuantity')} value={formatKg(crop.available_quantity_kg)} />
      <Detail label={isHarvested ? t('crops.harvestedDate') : t('crops.expectedHarvest')} value={isHarvested ? formatDate(crop.harvested_at) : formatDate(crop.expected_harvest_date)} />
      <Detail label={t('crops.marketInfo')} value={formatPrice(crop.indicative_price_per_kg)} />
    </div>
    {(role === 'Farmer' || role === 'FPO') && <>
      <Button icon={Settings} onClick={onEdit}>{t('crops.edit')}</Button>
      {!isHarvested && <Button icon={Check} onClick={onMarkHarvested}>{t('crops.markHarvested')}</Button>}
    </>}
    <Button icon={ShoppingBag} onClick={() => open('market')}>{t('crops.viewBuyerRequests')}</Button>
  </Page>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="detail"><small>{label}</small><strong>{value}</strong></div>; }

const mockFarmerNames = ['Ramesh Kumar', 'Lakshmi Devi', 'Suresh Reddy', 'Anitha Rao', 'Venkat Reddy', 'Padma Devi', 'Narsimha Rao', 'Sarojamma'];
const mockFarmerRatingFor = (id: string): number => { let h = 0; for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0; return 3 + (Math.abs(h) % 3); };
const mockFarmerNameFor = (id: string): string => { let h = 0; for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0; return mockFarmerNames[Math.abs(h) % mockFarmerNames.length]; };

function BuyerCropDetail({ crop, open, t }: { crop: CropListing; open: (view: View) => void; t: T }) {
  const name = cropDisplayName(crop);
  const variety = cropDisplayVariety(crop);
  const isHarvested = crop.status === 'Harvested';
  const currentPrice = computeCurrentPrice(crop);
  const price = isHarvested ? currentPrice : crop.indicative_price_per_kg;
  const isVerified = isHarvested ? (crop.harvest_timing_verified && crop.harvest_quantity_verified) : crop.listing_verified;
  const farmerName = mockFarmerNameFor(crop.id);
  const farmerRating = mockFarmerRatingFor(crop.id);

  return <Page title={name} body={t('crops.tapToView')} back={() => open('market')} t={t}>
    <Card className="flashcard">
      {isVerified && <span className="verified-badge"><Satellite size={11} /> Verified</span>}
      <Illustration label={`${name} illustration`} color={cropColorFor(name)} icon={cropIconFor(name)} />
      <h2>{name}</h2>
      <small>{t('crops.tapToViewDetails')}</small>
    </Card>
    <div className="detail-grid">
      <Detail label={t('crops.variety')} value={variety} />
      <Detail label={t('crops.quantity')} value={formatKg(crop.quantity_kg)} />
      <Detail label={t('crops.remainingQuantity')} value={formatKg(crop.available_quantity_kg)} />
      <Detail label={isHarvested ? t('crops.harvestedDate') : t('crops.expectedHarvest')} value={isHarvested ? formatDate(crop.harvested_at) : formatDate(crop.expected_harvest_date)} />
      <Detail label={t('crops.farmerName')} value={farmerName} />
      <Detail label={t('crops.farmerRating')} value={`${farmerRating} / 5 ★`} />
      <Detail label={t('crops.marketInfo')} value={formatPrice(price)} />
      <Detail label={t('cluster.location')} value={crop.location_area ?? '—'} />
    </div>
  </Page>;
}

function BuyerPaymentView({ crop, open, notify, t }: { crop: CropListing; open: (view: View) => void; notify: (message: string) => void; t: T }) {
  const name = cropDisplayName(crop);
  const isHarvested = crop.status === 'Harvested';
  const currentPrice = computeCurrentPrice(crop);
  const price = isHarvested ? currentPrice : crop.indicative_price_per_kg;
  const [paying, setPaying] = useState(false);
  const [booked, setBooked] = useState(false);
  const paymentType: 'token' | 'full' = isHarvested ? 'full' : 'token';
  const quantity = crop.available_quantity_kg;
  const totalPrice = price != null ? round2(quantity * price) : 0;
  const tokenAmount = round2(totalPrice * 0.1);
  const amountDue = isHarvested ? totalPrice : tokenAmount;

  const handlePay = async () => {
    if (paying || booked) return;
    setPaying(true);
    try {
      const result = await bookListing(crop.id, paymentType);
      setBooked(true);
      notify(t('market.paymentSuccess', { amount: formatRupee(amountDue) }));
      void result;
    } catch {
      notify(t('market.paymentError'));
    } finally {
      setPaying(false);
    }
  };

  if (booked) {
    return <Page title={name} body={t('crops.tapToView')} back={() => open('market')} t={t}>
      <Card className="flashcard">
        <Illustration label={`${name} illustration`} color={cropColorFor(name)} icon={cropIconFor(name)} />
        <h2>{name}</h2>
        <Badge tone="green">{t('market.bookingConfirmed')}</Badge>
      </Card>
      <Card className="payment-card">
        <p>{t('market.bookingConfirmedBody')}</p>
        <Button onClick={() => open('orders')}>{t('market.viewMyOrders')}</Button>
      </Card>
    </Page>;
  }

  return <Page title={name} body={t('market.mockPaymentNote')} back={() => open('market')} t={t}>
    <Card className="payment-section">
      <div className="payment-section-header">
        <ShieldCheck size={22} />
        <h3>{isHarvested ? t('market.payFullAmount') : t('market.payToken')}</h3>
      </div>
      <div className="payment-breakdown">
        <div className="payment-row"><span>{t('market.quantityLabel')}</span><strong>{formatKg(quantity)}</strong></div>
        <div className="payment-row"><span>{t('market.pricePerKg')}</span><strong>{formatPrice(price)}</strong></div>
        <div className="payment-row"><span>{t('market.totalValue')}</span><strong>{formatRupee(totalPrice)}</strong></div>
        {!isHarvested && <div className="payment-row"><span>{t('market.tokenPercent')}</span><strong>10%</strong></div>}
        <div className="payment-row payment-due"><span>{t('market.amountDue')}</span><strong>{formatRupee(amountDue)}</strong></div>
      </div>
      <Button icon={ShieldCheck} onClick={handlePay} disabled={paying}>{paying ? '…' : (isHarvested ? t('market.payFullAmount') : t('market.payToken'))}</Button>
      <small className="payment-note">{t('market.mockPaymentNote')}</small>
    </Card>
  </Page>;
}

function ClusterCropCard({ cluster, t, onNotify, role, onBuyNow, onSold, sold, interestedCount, onInterested }: { cluster: CropClusterWithMembers; t: T; onNotify: (msg: string) => void; role: Role; onBuyNow?: (listing: CropListing) => Promise<BuyNowResult | null>; onSold?: (listingId: string) => void; sold?: boolean; interestedCount?: number; onInterested?: () => void }) {
  const name = cluster.crop_name;
  const Icon = cropIconFor(name);
  const color = cropColorFor(name);
  const statusLabel = cluster.status === 'forming' ? t('cluster.forming') : cluster.status === 'ready' ? t('cluster.ready') : cluster.status === 'sold' ? t('cluster.sold') : t('cluster.closed');
  const statusTone = cluster.status === 'ready' ? 'green' : cluster.status === 'forming' ? 'orange' : 'blue';
  const currentPrice = computeClusterCurrentPrice(cluster);
  const dropIn = clusterNextDropMinutes(cluster);
  const isAtFloor = currentPrice != null && cluster.price_floor_per_kg != null && currentPrice <= cluster.price_floor_per_kg;

  const isHarvested = cluster.status === 'sold' || cluster.status === 'closed';
  const isBuyer = role === 'Buyer';
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(sold ?? false);

  const handleBuy = async () => {
    if (purchasing || purchased || !onBuyNow) return;
    setPurchasing(true);
    try {
      const result = await onBuyNow({
        id: cluster.id,
        owner_id: '',
        fpo_id: null,
        crop_id: '',
        custom_crop_name: null,
        quantity_kg: Number(cluster.total_quantity),
        available_quantity_kg: Number(cluster.total_quantity),
        expected_harvest_date: cluster.harvest_window_start,
        harvested_at: null,
        area_acres: null,
        expected_yield_kg: null,
        indicative_price_per_kg: currentPrice,
        status: 'Harvested',
        is_visible: true,
        is_cluster_linked: true,
        location_area: cluster.location_area,
        created_at: cluster.created_at,
        updated_at: cluster.created_at,
        price_start_per_kg: cluster.price_start_per_kg,
        price_floor_per_kg: cluster.price_floor_per_kg,
        decay_speed: cluster.decay_speed,
        price_drop_started_at: cluster.price_drop_started_at,
        step_interval_minutes: cluster.step_interval_minutes,
        step_drop_amount: cluster.step_drop_amount,
        listing_verified: false,
        listing_verified_at: null,
        listing_vegetation_reading: null,
        harvest_timing_verified: false,
        harvest_quantity_verified: false,
        harvest_verified_at: null,
      });
      if (result) {
        setPurchased(true);
        onSold?.(cluster.id);
        onNotify(t('market.buyNowSuccess', { price: formatPrice(result.unit_price) }));
      }
    } catch {
      onNotify(t('market.buyNowError'));
    } finally {
      setPurchasing(false);
    }
  };

  if (purchased) {
    return <Card className="cluster-card sold-card">
      <div className="cluster-badge-row">
        <span className="cluster-pill"><Layers size={14} /> {t('cluster.label')}</span>
        <Badge tone="blue">{t('market.sold')}</Badge>
      </div>
      <div className="cluster-body">
        <span className={`cluster-illustration ${color}`}><Icon size={38} strokeWidth={1.5} /></span>
        <div className="cluster-info">
          <h2>{name}{cluster.variety ? ` · ${cluster.variety}` : ''}</h2>
          <p>{t('market.soldAtPrice', { price: formatPrice(currentPrice) })}</p>
        </div>
      </div>
    </Card>;
  }

  return (
    <Card className="cluster-card">
      <div className="cluster-badge-row">
        <span className="cluster-pill"><Layers size={14} /> {t('cluster.label')}</span>
        <span className="farmeye-badge-static" title="FarmEye Verified"><Satellite size={13} /></span>
        <Badge tone={statusTone}>{statusLabel}</Badge>
        {cluster.verified_count > 0 && <span className="cluster-verified-fraction"><Check size={11} strokeWidth={3} /> {cluster.verified_count}/{cluster.farmer_count} verified</span>}
      </div>
      <div className="cluster-body">
        <span className={`cluster-illustration ${color}`}><Icon size={38} strokeWidth={1.5} /></span>
        <div className="cluster-info">
          <h2>{name}{cluster.variety ? ` · ${cluster.variety}` : ''}</h2>
          <div className="cluster-stats">
            <span><Package size={15} /> {formatKg(cluster.total_quantity)}</span>
            <span><Users size={15} /> {cluster.farmer_count} {t('cluster.farmers')}</span>
            {cluster.location_area && <span><MapPin size={15} /> {cluster.location_area}</span>}
          </div>
          <div className="cluster-stats">
            <span><CalendarDays size={15} /> {t('cluster.harvestWindow')}: {formatHarvestWindow(cluster)}</span>
            <span><ShieldCheck size={15} /> {t('cluster.grade')}: {cluster.overall_quality_grade ?? 'A'}</span>
          </div>
          {isHarvested && currentPrice != null && <div className="price-clock-widget">
            <div className="price-clock-left">
              <span className="price-clock-price"><TrendingDown size={15} /> <strong>{formatPrice(currentPrice)}</strong></span>
              {isBuyer ? (
                <span className="price-clock-floor">{formatKg(Number(cluster.total_quantity))}</span>
              ) : (
                <>
                  <span className="price-clock-drop">{dropIn != null && dropIn > 0 && !isAtFloor ? t('market.nextDropIn', { minutes: dropIn }) : ''}</span>
                  {cluster.price_floor_per_kg != null && <span className="price-clock-floor">· {formatPrice(cluster.price_floor_per_kg)}</span>}
                </>
              )}
            </div>
            {isBuyer && <button className="button primary price-clock-buy" onClick={handleBuy} disabled={purchasing}>{purchasing ? '…' : t('market.buyNow')}</button>}
          </div>}
          {!isHarvested && !isBuyer && <div className="cluster-stats">
            <span><Clock3 size={15} /> {t('cluster.closesIn')}: {timeLeftUntil(cluster.closes_at)}</span>
            <span><Eye size={15} /> {t('cluster.buyersInterested', { count: interestedCount ?? 0 })}</span>
          </div>}
          {!isHarvested && isBuyer && <div className="cluster-stats">
            <span><Package size={15} /> {formatPrice(currentPrice ?? cluster.price_start_per_kg ?? 0)}</span>
            <span><Clock3 size={15} /> {t('cluster.closesIn')}: {timeLeftUntil(cluster.closes_at)}</span>
          </div>}
        </div>
      </div>
      {!isBuyer && currentPrice == null && <Button variant="soft" onClick={() => onNotify(t('cluster.expressInterest', { crop: name }))}>{t('cluster.expressInterestBtn')}</Button>}
      {isBuyer && !isHarvested && <Button variant="soft" onClick={() => { onInterested?.(); onNotify(t('cluster.interestedConfirm', { crop: name })); }}>{t('cluster.interestedBtn')}</Button>}
    </Card>
  );
}

function BuyerHarvestedCard({ listing, t, onBuyNow, onSold, sold, onOpenDetail, onOpenPayment }: { listing: CropListing; t: T; onBuyNow: (listing: CropListing) => Promise<BuyNowResult | null>; onSold: (listingId: string) => void; sold?: boolean; onOpenDetail?: () => void; onOpenPayment?: () => void }) {
  const [now, setNow] = useState(Date.now());
  const [purchased, setPurchased] = useState(sold ?? false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  void now;

  const name = cropDisplayName(listing);
  const currentPrice = computeCurrentPrice(listing);
  const dropIn = nextDropMinutes(listing);
  const isAtFloor = currentPrice != null && listing.price_floor_per_kg != null && currentPrice <= listing.price_floor_per_kg;

  if (purchased) {
    return <Card className="buyer-crop-card sold-card">
      <Illustration label={`${name} illustration`} color={cropColorFor(name)} icon={cropIconFor(name)} />
      <div className="buyer-card-text">
        <Badge tone="blue">{t('market.sold')}</Badge>
        <h2>{name} · {cropDisplayVariety(listing)}</h2>
        <p>{t('market.soldAtPrice', { price: formatPrice(currentPrice) })}</p>
      </div>
    </Card>;
  }

  return <Card className="buyer-crop-card">
    <Illustration label={`${name} illustration`} color={cropColorFor(name)} icon={cropIconFor(name)} />
    <div className="buyer-card-text">
      {listing.harvest_timing_verified && listing.harvest_quantity_verified && <span className="verified-badge verified-badge-inline"><Satellite size={11} /> Verified</span>}
      <h2>{name} · {cropDisplayVariety(listing)}</h2>
      <p>{formatKg(listing.available_quantity_kg)} · {formatDate(listing.harvested_at)}</p>
      <button type="button" className="card-detail-arrow" onClick={() => onOpenDetail?.()}><ArrowRight size={16} /></button>
      <div className="price-clock-widget">
        <div className="price-clock-left">
          <span className="price-clock-price buyer-price-neutral"><strong>{formatPrice(currentPrice)}</strong></span>
          <span className="price-clock-drop">{dropIn != null && dropIn > 0 && !isAtFloor ? t('market.nextDropIn', { minutes: dropIn }) : ''}</span>
        </div>
        <button className="button primary price-clock-buy compact-buy" onClick={() => onOpenPayment?.()}>{t('market.buyNow')}</button>
      </div>
    </div>
  </Card>;
}

function PriceClockCard({ listing, t, onFarmEye }: { listing: CropListing; t: T; onFarmEye?: () => void }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  void now;

  const name = cropDisplayName(listing);
  const currentPrice = computeCurrentPrice(listing);
  const dropIn = nextDropMinutes(listing);
  const isAtFloor = currentPrice != null && listing.price_floor_per_kg != null && currentPrice <= listing.price_floor_per_kg;

  const isSold = listing.status === 'Sold';
  return <Card className={`buyer-crop-card${isSold ? ' sold-card' : ''}`}>
    {listing.harvest_timing_verified && listing.harvest_quantity_verified && onFarmEye && <button type="button" className="verified-badge" onClick={(e) => { e.stopPropagation(); onFarmEye(); }}><Satellite size={11} /> Verified</button>}
    <Illustration label={`${name} illustration`} color={cropColorFor(name)} icon={cropIconFor(name)} />
    <div className="buyer-card-text">
      <Badge tone={isSold ? 'blue' : 'green'}>{isSold ? t('market.sold') : t('crops.Harvested')}</Badge>
      <h2>{name} · {cropDisplayVariety(listing)}</h2>
      <p>{formatKg(listing.available_quantity_kg)} · {formatDate(listing.harvested_at)}</p>
      <div className="price-clock-widget">
        <div className="price-clock-left">
          <span className="price-clock-price"><TrendingDown size={15} /> <strong>{formatPrice(currentPrice)}</strong></span>
          {!isSold && <span className="price-clock-drop">{dropIn != null && dropIn > 0 && !isAtFloor ? t('market.nextDropIn', { minutes: dropIn }) : ''}</span>}
          {listing.price_floor_per_kg != null && <span className="price-clock-floor">· {formatPrice(listing.price_floor_per_kg)}</span>}
        </div>
      </div>
    </div>
  </Card>;
}

function MarketView({ role, open, notify, t, selectCrop }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T; selectCrop: (crop: CropListing) => void }) {
  const [filter, setFilter] = useState<'Upcoming' | 'Harvested'>('Upcoming');
  const [listings, setListings] = useState<CropListing[]>([]);
  const [myListings, setMyListings] = useState<CropListing[]>([]);
  const [clusters, setClusters] = useState<CropClusterWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [soldIds, setSoldIds] = useState<Set<string>>(() => { try { const s = localStorage.getItem('soldIds'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); } });
  const [interestCounts, setInterestCounts] = useState<Record<string, number>>(() => { try { const s = localStorage.getItem('clusterInterest'); return s ? JSON.parse(s) : {}; } catch { return {}; } });
  const [calcCrop, setCalcCrop] = useState('');
  const [calcQty, setCalcQty] = useState(100);
  const [calcMarketA, setCalcMarketA] = useState('Warangal');
  const [calcMarketB, setCalcMarketB] = useState('Bengaluru');
  const [calcResult, setCalcResult] = useState<{ marketATotal: number; marketBTotal: number; difference: number; worthIt: boolean; truckCost: number; transitHrs: number; vehicleName: string; marketBPrice: number; basePrice: number; distance: number } | null>(null);
  const [comparePage, setComparePage] = useState(0);

  const handleInterested = (clusterId: string) => {
    setInterestCounts((prev) => {
      const next = { ...prev, [clusterId]: (prev[clusterId] ?? 0) + 1 };
      try { localStorage.setItem('clusterInterest', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      try {
        const [listingData, clusterData, myListingsData] = await Promise.all([fetchPublicListings(), fetchClusters(), fetchMyListings()]);
        if (!cancelled) { setListings(listingData); setClusters(clusterData); setMyListings(myListingsData); }
      }
      catch { if (!cancelled) setError(tRef.current('crops.loadError')); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleBuyNow = async (listing: CropListing): Promise<BuyNowResult | null> => {
    try {
      const result = await buyNow(listing.id);
      notify(t('market.buyNowSuccess', { price: formatPrice(result.unit_price) }));
      return result;
    } catch {
      return null;
    }
  };

  const handleSold = (listingId: string) => {
    setSoldIds((prev) => { const next = new Set(prev).add(listingId); try { localStorage.setItem('soldIds', JSON.stringify([...next])); } catch { /* ignore */ } return next; });
  };

  if (role === 'Buyer') {
    const filtered = listings.filter((l) => l.status === filter);
    const searchLower = searchQuery.trim().toLowerCase();
    const searchFiltered = searchLower ? filtered.filter((l) => cropDisplayName(l).toLowerCase().includes(searchLower)) : filtered;
    const clusterCropNames = new Set(clusters.map((c) => c.crop_name.toLowerCase()));
    const clusterSearchFiltered = searchLower ? clusters.filter((c) => c.crop_name.toLowerCase().includes(searchLower)) : clusters;
    const individualListings = searchFiltered.filter((l) => {
      const name = cropDisplayName(l).toLowerCase();
      return !clusterCropNames.has(name);
    });
    return <Page title={t('market.exploreTitle')} body={t('market.exploreBody')} back={() => open('home')} t={t}>
      <div className="crop-search"><Search size={18} /><input placeholder={t('market.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
      <div className="filter-row">{(['Upcoming', 'Harvested'] as const).map((item) => <button className={filter === item ? 'selected' : ''} key={item} onClick={() => setFilter(item)}>{t(`crops.${item}`)}</button>)}</div>
      {loading && <p className="calendar-empty">{t('crops.loading')}</p>}
      {error && <p className="calendar-empty">{error}</p>}
      {!loading && !error && clusterSearchFiltered.length > 0 && (
        <>
          <h3 className="subhead cluster-section-heading"><Layers size={18} /> {t('cluster.sectionTitle')}</h3>
          <div className="buyer-crop-list">
            {clusterSearchFiltered.map((cluster) => <ClusterCropCard key={cluster.id} cluster={cluster} t={t} onNotify={notify} role={role} onBuyNow={handleBuyNow} onSold={handleSold} sold={soldIds.has(cluster.id)} interestedCount={interestCounts[cluster.id] ?? 0} onInterested={() => handleInterested(cluster.id)} />)}
          </div>
          <h3 className="subhead">{t('cluster.individualListings')}</h3>
        </>
      )}
      {!loading && !error && searchFiltered.length === 0 && clusterSearchFiltered.length === 0 && <Card className="buyer-crop-card demo-buffer-card"><Illustration label="Paddy" color="teal" icon={Sprout} /><div className="buyer-card-text"><Badge tone="orange">{t('crops.demoBuffer')}</Badge><h2>Paddy · Sona Masuri</h2><p>{t('crops.demoBuffer')}</p><p style={{ marginTop: 4 }}>800 kg · 28 Oct 2026 · ₹22/kg · Warangal, TS</p><p style={{ marginTop: 2 }}>3 members joined</p></div></Card>}
      <div className="flip-card-grid">{(clusterSearchFiltered.length > 0 ? individualListings : searchFiltered).map((listing) => {
        return <CropFlipCard key={listing.id} listing={listing} t={t} sold={soldIds.has(listing.id)} onOpenDetail={() => { selectCrop(listing); open('buyer-crop-detail'); }} onOpenPayment={() => { selectCrop(listing); open('buyer-payment'); }} />;
      })}</div>
    </Page>;
  }
  const distantMarkets = ['Bengaluru', 'Hyderabad', 'Chennai'];
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredMyListings = searchLower ? myListings.filter((l) => cropDisplayName(l).toLowerCase().includes(searchLower)) : myListings;
  const harvestCutoff = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const qualifyingListings = filteredMyListings.filter((l) => { if (l.status === 'Sold') return false; if (l.status === 'Harvested') return true; if (!l.expected_harvest_date) return false; return new Date(l.expected_harvest_date).getTime() <= harvestCutoff; });
  const safeComparePage = Math.min(comparePage, Math.max(0, qualifyingListings.length - 1));
  const [benchmarkFilter, setBenchmarkFilter] = useState<'all' | 'vegetables' | 'spices' | 'grains' | 'fruits' | 'cash'>('all');
  const [truckModal, setTruckModal] = useState<{ crop: string; origin: string; dest: string; qty: number; distance: number } | null>(null);
  const [marketDetail, setMarketDetail] = useState<{ name: string; price: number; change: number; tons: number; photo: string; mandi: string } | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [loadingWindow, setLoadingWindow] = useState<string>('today_afternoon');
  const [dispatchConfirmed, setDispatchConfirmed] = useState(false);
  const [leftFlipped, setLeftFlipped] = useState(false);
  const [rightFlipped, setRightFlipped] = useState(false);
  const [leftTruckData, setLeftTruckData] = useState<{ crop: string; origin: string; dest: string; qty: number; distance: number; confirmed: boolean; driver?: string; reg?: string; eta?: string } | null>(null);
  const [cropSearch, setCropSearch] = useState('');
  const qtyPresets = [50, 100, 250, 500, 1000];
  const todayPrices = [
    { name: 'Tomato', price: 30, change: 2, category: 'vegetables' as const, tons: 142, photo: cropPhotoFor('Tomato'), mandi: 'Kolar Hub', variety: 'hybridFarmFresh' as const },
    { name: 'Onion', price: 28, change: 1, category: 'vegetables' as const, tons: 98, photo: cropPhotoFor('Onion'), mandi: 'Lasalgaon', variety: 'hybridLocal' as const },
    { name: 'Paddy', price: 22, change: 0, category: 'grains' as const, tons: 310, photo: cropPhotoFor('Paddy'), mandi: 'Karimnagar', variety: 'hybridHighYield' as const },
    { name: 'Chilli', price: 45, change: -3, category: 'spices' as const, tons: 67, photo: cropPhotoFor('Chilli'), mandi: 'Guntur Yard', variety: 'hybridFarmFresh' as const },
    { name: 'Banana', price: 18, change: 1, category: 'fruits' as const, tons: 54, photo: cropPhotoFor('Banana'), mandi: 'Jalgaon', variety: 'hybridLocal' as const },
    { name: 'Turmeric', price: 38, change: 2, category: 'spices' as const, tons: 41, photo: cropPhotoFor('Turmeric'), mandi: 'Erode', variety: 'orgicCertified' as const },
    { name: 'Cotton', price: 52, change: 1, category: 'cash' as const, tons: 88, photo: cropPhotoFor('Cotton'), mandi: 'Adilabad', variety: 'hybridDrought' as const },
    { name: 'Potato', price: 20, change: -1, category: 'vegetables' as const, tons: 120, photo: cropPhotoFor('Potato'), mandi: 'Agra', variety: 'hybridHighYield' as const },
    { name: 'Maize', price: 19, change: 1, category: 'grains' as const, tons: 85, photo: cropPhotoFor('Maize'), mandi: 'Nizamabad', variety: 'hybridHighYield' as const },
    { name: 'Groundnut', price: 55, change: 2, category: 'cash' as const, tons: 44, photo: cropPhotoFor('Groundnut'), mandi: 'Kurnool', variety: 'hybridLocal' as const },
    { name: 'Brinjal', price: 25, change: 0, category: 'vegetables' as const, tons: 62, photo: cropPhotoFor('Brinjal'), mandi: 'Warangal', variety: 'hybridFarmFresh' as const },
    { name: 'Okra', price: 32, change: 1, category: 'vegetables' as const, tons: 51, photo: cropPhotoFor('Okra'), mandi: 'Hyderabad', variety: 'hybridLocal' as const },
    { name: 'Mango', price: 60, change: 3, category: 'fruits' as const, tons: 38, photo: cropPhotoFor('Mango'), mandi: 'Krishna District', variety: 'orgicCertified' as const },
  ];
  const filteredPrices = benchmarkFilter === 'all' ? todayPrices : todayPrices.filter((p) => p.category === benchmarkFilter);
  const sparklineColor = (change: number) => change > 0 ? '#047857' : change < 0 ? '#9f1239' : '#a8a29e';
  const sparklineBars = (h: number, change: number) => { const bars: number[] = []; for (let i = 0; i < 7; i++) { bars.push(20 + ((h * (i + 3)) % 70) + (change > 0 ? i * 4 : change < 0 ? -i * 4 : 0)); } return bars; };
  const calcVehicles = [
    { id: 'ace', name: t('market.vehicleAce'), capacity: t('market.vehicleAceCap'), maxKg: 750, baseFare: 50, perKm: 10, avgSpeed: 35 },
    { id: 'bolero', name: t('market.vehicleBolero'), capacity: t('market.vehicleBoleroCap'), maxKg: 1500, baseFare: 100, perKm: 15, avgSpeed: 40 },
    { id: 'eicher', name: t('market.vehicleEicher'), capacity: t('market.vehicleEicherCap'), maxKg: 3500, baseFare: 200, perKm: 25, avgSpeed: 45 },
  ];
  const autoSelectVehicle = (qty: number) => { if (qty <= 750) return 'ace'; if (qty <= 1500) return 'bolero'; return 'eicher'; };
  const mandiOptions = [
    { name: 'Warangal APMC', state: 'Telangana' },
    { name: 'Hyderabad Market', state: 'Telangana' },
    { name: 'Bengaluru Yard', state: 'Karnataka' },
    { name: 'Chennai Terminal', state: 'Tamil Nadu' },
    { name: 'Kolar Hub', state: 'Karnataka' },
    { name: 'Guntur Yard', state: 'Andhra Pradesh' },
  ];
  const localMandiName = 'Warangal APMC';
  const handleCropSearch = (v: string) => {
    setCropSearch(v);
    const trimmed = v.trim().toLowerCase();
    if (!trimmed) { setCalcCrop(''); setCalcResult(null); return; }
    const match = todayPrices.find((c) => c.name.toLowerCase() === trimmed);
    if (match) { setCalcCrop(match.name); setCalcResult(null); return; }
    if (trimmed.length >= 2) {
      const partial = todayPrices.find((c) => c.name.toLowerCase().includes(trimmed));
      if (partial) { setCalcCrop(partial.name); setCalcResult(null); }
    }
  };
  const openTruckModal = (crop: string, origin: string, dest: string, qty: number, distance: number) => {
    setTruckModal({ crop, origin, dest, qty, distance });
    setSelectedVehicle(autoSelectVehicle(qty));
    setLoadingWindow('today_afternoon');
    setDispatchConfirmed(false);
  };
  const closeTruckModal = () => { setTruckModal(null); setDispatchConfirmed(false); };
  const confirmDispatch = () => { setDispatchConfirmed(true); notify(t('market.dispatchConfirmed'));
    if (truckModal && leftTruckData && leftTruckData.crop === truckModal.crop && leftTruckData.dest === truckModal.dest) {
      const driverNames = ['Ramesh Kumar', 'Suresh Reddy', 'Mahesh Singh'];
      const regNumbers = ['TS09 AB 4521', 'TS07 CD 8832', 'KA01 EF 1209'];
      const transitHrs = round2(leftTruckData.distance / 45);
      setLeftTruckData({ ...leftTruckData, confirmed: true, driver: driverNames[hashStr(leftTruckData.crop) % driverNames.length], reg: regNumbers[hashStr(leftTruckData.dest) % regNumbers.length], eta: `~${transitHrs} hrs` });
    }
  };
  return <Page title={t('market.title')} body={t('market.body')} back={() => open('home')} t={t}>
    <div className="crop-search"><Search size={18} /><input placeholder={t('market.searchCropMarket')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />{searchQuery && <button type="button" className="market-search-clear" onClick={() => setSearchQuery('')}><X size={16} /></button>}</div>
    <div className="market-location-badge"><MapPin size={16} /> {t('market.locationBadge')}</div>
    <div className="market-layout">
      <Card className="market-compare-section">
        <h3 className="subhead">{t('market.forYourCrops')}</h3>
        <p style={{ color: '#78716c', fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>{t('market.compareSubtitle')}</p>
        <div className={`flip-card market-flip${leftFlipped ? ' flipped' : ''}`}>
          <div className="flip-card-inner">
            <div className="flip-card-face flip-card-front market-flip-face">
              {loading && <p className="calendar-empty">{t('crops.loading')}</p>}
              {error && <p className="calendar-empty">{error}</p>}
              {!loading && !error && qualifyingListings.length === 0 && <p className="calendar-empty">{t('market.noQualifying')}</p>}
              {!loading && !error && qualifyingListings.length > 0 && (() => {
                const listing = qualifyingListings[safeComparePage];
                const name = cropDisplayName(listing);
                const h = hashStr(listing.id);
                const localPrice = computeCurrentPrice(listing) ?? listing.indicative_price_per_kg ?? 20;
                const qty = listing.quantity_kg;
                const localTotal = round2(qty * localPrice);
                let bestMarket = distantMarkets[0]; let bestDistance = 180 + (h % 120); let bestDistantPrice = round2(localPrice + 3 + (h % 6)); let bestTruckCost = bestDistance * 5; let bestInHand = round2(qty * bestDistantPrice - bestTruckCost); let bestDiff = round2(bestInHand - localTotal);
                distantMarkets.forEach((mkt) => { const mh = hashStr(listing.id + mkt); const dist = 180 + (mh % 120); const dPrice = round2(localPrice + 3 + (mh % 6)); const tc = dist * 5; const inHand = round2(qty * dPrice - tc); const diff = round2(inHand - localTotal); if (diff > bestDiff) { bestMarket = mkt; bestDistance = dist; bestDistantPrice = dPrice; bestTruckCost = tc; bestInHand = inHand; bestDiff = diff; } });
                const marketName = bestMarket; const distance = bestDistance; const distantPrice = bestDistantPrice; const truckCost = bestTruckCost; const distantInHand = bestInHand; const difference = bestDiff; const pct = Math.round((difference / localTotal) * 100);
                return <div className="market-compare-simple">
                  <div className="market-compare-hero" key={listing.id}>
                    <div className="market-compare-hero-head">
                      <img className="market-compare-hero-thumb" src={cropPhotoFor(name)} alt={name} loading="lazy" />
                      <div className="market-compare-hero-info">
                        <h3>{name}</h3>
                        <small>{formatKg(qty)} · {t('market.gradeA')}</small>
                        <span className="market-compare-hero-badge"><CheckCircle2 size={12} /> {t('market.recommended')}</span>
                      </div>
                    </div>
                    <div className="market-compare-stack">
                      <div className="market-compare-side local">
                        <div className="market-compare-side-label">{t('market.localMarket')}</div>
                        <div className="market-compare-side-price">{formatPrice(localPrice)}</div>
                        <div className="market-compare-side-meta" style={{ fontWeight: 700, color: '#16382b' }}>{formatRupee(localTotal)}</div>
                      </div>
                      <div className="market-compare-side distant">
                        <div className="market-compare-side-label">{marketName}</div>
                        <div className="market-compare-side-price">{formatPrice(distantPrice)}</div>
                        <div className="market-compare-side-meta" style={{ fontWeight: 700, color: '#16382b' }}>{t('market.inHand', { market: marketName })}: {formatRupee(distantInHand)}</div>
                      </div>
                    </div>
                    <p className="market-compare-verdict positive">{t('market.worthTripPct', { amount: formatRupee(difference), pct: String(pct) })}</p>
                    <button type="button" className="market-compare-cta" onClick={() => { setLeftTruckData({ crop: name, origin: localMandiName, dest: marketName, qty, distance, confirmed: false }); openTruckModal(name, localMandiName, marketName, qty, distance); setLeftFlipped(true); }}><Truck size={18} /> {t('market.truckToBengaluru', { market: marketName })}</button>
                  </div>
                </div>;
              })()}
            </div>
            <div className="flip-card-face flip-card-back market-flip-face">
              <div className="market-flip-back-content">
                <span className="market-modal-confirmed-icon"><Truck size={32} strokeWidth={1.5} /></span>
                <h4>{t('market.truckDispatchTitle')}</h4>
                {leftTruckData ? <>
                  <div className="market-modal-stat-row"><span>{t('market.cropLabel')}</span><strong>{leftTruckData.crop}</strong></div>
                  <div className="market-modal-stat-row"><span>{t('market.originLabel')}</span><strong>{leftTruckData.origin}</strong></div>
                  <div className="market-modal-stat-row"><span>{t('market.destinationLabel')}</span><strong>{leftTruckData.dest}</strong></div>
                  <div className="market-modal-stat-row"><span>{t('market.cargoWeight')}</span><strong>{formatKg(leftTruckData.qty)}</strong></div>
                  {leftTruckData.confirmed && <div className="market-modal-confirmed">
                    <span className="market-modal-confirmed-icon"><CheckCircle2 size={32} strokeWidth={1.5} /></span>
                    <h4>{t('market.dispatchConfirmed')}</h4>
                    <p>{t('market.driverName', { name: leftTruckData.driver ?? '' })}</p>
                    <p>{t('market.vehicleReg', { reg: leftTruckData.reg ?? '' })}</p>
                    <p>{t('market.eta', { eta: leftTruckData.eta ?? '' })}</p>
                    <button type="button" className="market-modal-call-btn" onClick={() => notify(t('market.callDriver'))}><Phone size={18} /> {t('market.callDriver')}</button>
                  </div>}
                </> : <p className="calendar-empty">{t('market.noQualifying')}</p>}
                <button type="button" className="flip-card-back-btn" onClick={() => setLeftFlipped(false)}><RotateCcw size={16} /> {t('common.back')}</button>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card className="market-calc market-calc-v2">
        <h3 className="subhead">{t('market.calcTitle')}</h3>
        <p style={{ color: '#78716c', fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>{t('market.calcSubtitle')}</p>
        <div className={`flip-card market-flip market-flip-calc${rightFlipped ? ' flipped' : ''}`}>
          <div className="flip-card-inner">
            <div className="flip-card-face flip-card-front market-flip-face">
              <div className="calc-step">
                <small className="calc-step-label">{t('market.calcPickCrop')}</small>
                <div className="calc-crop-search-bar"><Search size={18} /><input placeholder={t('market.searchCropMarket')} value={cropSearch} onChange={(e) => handleCropSearch(e.target.value)} />{cropSearch && <button type="button" className="market-search-clear" onClick={() => { setCropSearch(''); setCalcCrop(''); setCalcResult(null); }}><X size={16} /></button>}</div>
                {calcCrop && (() => { const cd = todayPrices.find((c) => c.name === calcCrop); return cd ? <div className="calc-crop-match"><img className="calc-crop-photo-thumb" src={cd.photo} alt={calcCrop} loading="lazy" /><strong>{calcCrop}</strong><span>{formatPrice(cd.price)}</span></div> : null; })()}
              </div>
              <div className="calc-step">
                <small className="calc-step-label">{t('market.calcQuantity')}</small>
                <div className="market-qty-row">
                  <div className="market-qty-stepper"><button type="button" onClick={() => { setCalcQty(Math.max(10, calcQty - 10)); setCalcResult(null); }}><Minus size={20} /></button><strong>{calcQty} kg</strong><button type="button" onClick={() => { setCalcQty(calcQty + 10); setCalcResult(null); }}><Plus size={20} /></button></div>
                </div>
                <div className="market-qty-presets">{qtyPresets.map((p) => <button key={p} type="button" className={`market-qty-preset ${calcQty === p ? 'selected' : ''}`} onClick={() => { setCalcQty(p); setCalcResult(null); }}>{p >= 1000 ? '1 Ton' : `${p}kg`}</button>)}</div>
              </div>
              <div className="calc-step">
                <small className="calc-step-label">{t('market.calcMarketALabel')}</small>
                <select className="calc-select" value={calcMarketA} onChange={(e) => { setCalcMarketA(e.target.value); setCalcResult(null); }}>{mandiOptions.map((m) => <option key={m.name} value={m.name}>{m.name}, {m.state}</option>)}</select>
              </div>
              <div className="calc-step">
                <small className="calc-step-label">{t('market.calcMarketBLabel')}</small>
                <select className="calc-select" value={calcMarketB} onChange={(e) => { setCalcMarketB(e.target.value); setCalcResult(null); }}>{mandiOptions.filter((m) => m.name !== calcMarketA).map((m) => <option key={m.name} value={m.name}>{m.name}, {m.state}</option>)}</select>
              </div>
              <Button onClick={() => { if (!calcCrop) return; const cropData = todayPrices.find((c) => c.name === calcCrop); const basePrice = cropData?.price ?? 20; const h = hashStr(calcCrop); const marketBPrice = round2(basePrice + 3 + (h % 6)); const distance = 180 + (h % 120); const vId = autoSelectVehicle(calcQty); const vehicle = calcVehicles.find((v) => v.id === vId)!; const truckCost = round2(vehicle.baseFare + vehicle.perKm * distance); const transitHrs = round2(distance / vehicle.avgSpeed); const marketATotal = round2(calcQty * basePrice); const marketBTotal = round2(calcQty * marketBPrice - truckCost); const difference = round2(marketBTotal - marketATotal); setCalcResult({ marketATotal, marketBTotal, difference, worthIt: difference > 0, truckCost, transitHrs, vehicleName: vehicle.name, marketBPrice, basePrice, distance }); setRightFlipped(true); }}><Sparkles size={18} /> {t('market.calcShowAnswer')}</Button>
            </div>
            <div className="flip-card-face flip-card-back market-flip-face">
              {calcResult ? (() => { const cropData = todayPrices.find((c) => c.name === calcCrop); const harvestDate = cropData ? new Date(Date.now() - (hashStr(calcCrop) % 5) * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''; return <div className="market-flash-card">
                <div className="market-flash-head">
                  <img className="market-flash-photo" src={cropData?.photo ?? cropPhotoFor(calcCrop)} alt={calcCrop} loading="lazy" />
                  <div className="market-flash-head-info">
                    <h4>{calcCrop}</h4>
                    <small>Harvested: {harvestDate} · {formatKg(calcQty)} · Grade A</small>
                  </div>
                  <span className={`market-flash-badge ${calcResult.worthIt ? 'positive' : 'negative'}`}>{calcResult.worthIt ? t('market.recommended') : t('market.notWorthTrip', { amount: '' }).split('—')[0].trim()}</span>
                </div>
                <div className="market-flash-versus">
                  <div className="market-flash-side local">
                    <div className="market-flash-side-label">{t('market.localMarket')}</div>
                    <div className="market-flash-side-price">{formatPrice(calcResult.basePrice)}</div>
                    <div className="market-flash-side-meta">{t('market.noTransportNeeded')}</div>
                    <div className="market-flash-side-total">{formatRupee(calcResult.marketATotal)}</div>
                  </div>
                  <div className="market-flash-vs">vs</div>
                  <div className="market-flash-side distant">
                    <div className="market-flash-side-label">{calcMarketB}</div>
                    <div className="market-flash-side-price">{formatPrice(calcResult.marketBPrice)}</div>
                    <div className="market-flash-side-meta">{calcResult.distance} km · {t('market.transitTime', { hrs: String(calcResult.transitHrs) })}</div>
                    <div className="market-flash-side-total">{t('market.inHand', { market: calcMarketB })}: {formatRupee(calcResult.marketBTotal)}</div>
                  </div>
                </div>
                <div className="market-flash-truck"><Truck size={16} /> <span>{t('market.truckFreight')}: {calcMarketB}</span> <strong>−{formatRupee(calcResult.truckCost)}</strong></div>
                <p className={`market-flash-banner ${calcResult.worthIt ? 'positive' : 'negative'}`}>{calcResult.worthIt ? t('market.worthTripTruck', { amount: formatRupee(calcResult.difference) }) : t('market.notWorthTripTruck', { amount: formatRupee(Math.abs(calcResult.difference)) })}</p>
                <button type="button" className="market-flash-cta" onClick={() => openTruckModal(calcCrop, calcMarketA, calcMarketB, calcQty, calcResult.distance)}><Truck size={18} /> {t('market.requestTruckTo', { market: calcMarketB })}</button>
                <p className="market-flash-caption">{t('market.freightCaption')}</p>
                <button type="button" className="flip-card-back-btn" onClick={() => setRightFlipped(false)}><RotateCcw size={16} /> {t('common.back')}</button>
              </div>; })() : <div className="market-flash-card"><p className="calendar-empty">{t('market.calcHelper')}</p><button type="button" className="flip-card-back-btn" onClick={() => setRightFlipped(false)}><RotateCcw size={16} /> {t('common.back')}</button></div>}
            </div>
          </div>
        </div>
      </Card>
    </div>
    <Card className="market-price-ref">
      <div className="market-benchmark-head">
        <div>
          <h3>{t('market.todayInMarketTitle')}</h3>
          <p className="market-benchmark-subtitle">{t('market.todayInMarketSubtitle')}</p>
        </div>
        <span className="market-live-pill">{t('market.liveMandiFeed')}</span>
      </div>
      <div className="market-filter-row"><Filter size={16} /> <span>{t('market.filterLabel')}</span> <div className="market-filter-chips">{(['all', 'vegetables', 'spices', 'grains', 'fruits', 'cash'] as const).map((f) => <button key={f} type="button" className={`market-filter-chip ${benchmarkFilter === f ? 'selected' : ''}`} onClick={() => setBenchmarkFilter(f)}>{t(`market.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}</button>)}</div></div>
      <div className="market-benchmark-list">{filteredPrices.map((p) => { const h = hashStr(p.name); const bars = sparklineBars(h, p.change); const color = sparklineColor(p.change); return <button type="button" className="market-benchmark-row" key={p.name} onClick={() => setMarketDetail(p)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(231,229,228,0.90)', borderRadius: 14, background: '#fff' }}><img className="market-benchmark-thumb" src={p.photo} alt={p.name} loading="lazy" /><div className="market-benchmark-info"><h4>{p.name}<span className="market-benchmark-variety">{t(`market.${p.variety}`)}</span></h4><div className="market-benchmark-location"><MapPin size={11} /> {p.mandi} · {t('market.tonsTraded', { tons: String(p.tons) })}</div><div className="market-benchmark-trend-label">{t('market.sevenDayTrend')}</div><div className="market-sparkline">{bars.map((b, i) => <span key={i} style={{ height: `${Math.max(8, Math.min(28, b))}px`, background: color, opacity: 0.3 + (i / 7) * 0.7 }} />)}</div><div className="market-benchmark-caption">{t('market.modalApcGrade')}</div></div><div className="market-benchmark-price-col"><div className="market-benchmark-price">₹{p.price}/kg</div><div className={`market-benchmark-change ${p.change > 0 ? 'up' : p.change < 0 ? 'down' : 'flat'}`}>{p.change > 0 ? '▲' : p.change < 0 ? '▼' : '—'} {p.change > 0 ? t('market.vsLastWeek', { amount: String(p.change) }) : p.change < 0 ? t('market.vsLastWeekDown', { amount: String(Math.abs(p.change)) }) : t('market.vsLastWeekFlat')}</div></div><span className="market-benchmark-chevron"><ChevronRight size={18} /></span></button>; })}</div>
    </Card>
    {marketDetail && (() => {
      const h = hashStr(marketDetail.name);
      const bars = sparklineBars(h, marketDetail.change);
      const color = sparklineColor(marketDetail.change);
      const bidders = 8 + (h % 15);
      return <div className="market-modal-overlay" onClick={() => setMarketDetail(null)}>
        <div className="market-modal" onClick={(e) => e.stopPropagation()}>
          <div className="market-modal-handle" />
          <div className="market-modal-header">
            <h3>{t('market.marketDetailTitle')}</h3>
            <button className="market-modal-close" onClick={() => setMarketDetail(null)}><X size={18} /></button>
          </div>
          <img className="market-modal-hero" src={marketDetail.photo} alt={marketDetail.name} />
          <div className="market-modal-body">
            <div className="market-modal-section">
              <h4>{marketDetail.name}</h4>
              <div className="market-modal-stat-row"><span>{t('market.gradeClassification')}</span><Badge tone="green">{t('market.varietyBadge')}</Badge></div>
              <div className="market-modal-stat-row"><span>{t('market.topMandi', { mandi: marketDetail.mandi })}</span><strong>{marketDetail.mandi}</strong></div>
              <div className="market-modal-stat-row"><span>{t('market.dailyArrival', { tons: String(marketDetail.tons) })}</span><strong>{marketDetail.tons} tons</strong></div>
              <div className="market-modal-stat-row"><span>{t('market.activeBidders', { count: String(bidders) })}</span><strong>{bidders}</strong></div>
              <div className="market-modal-stat-row"><span>{t('market.modalApc')}</span><strong>₹{marketDetail.price}/kg</strong></div>
            </div>
            <div className="market-modal-section">
              <h4>{t('market.todayInMarket')}</h4>
              <div className="market-sparkline" style={{ height: 40 }}>{bars.map((b, i) => <span key={i} style={{ height: `${Math.max(10, Math.min(40, b))}px`, background: color, opacity: 0.3 + (i / 7) * 0.7 }} />)}</div>
            </div>
          </div>
        </div>
      </div>;
    })()}
    {truckModal && (() => {
      const vId = selectedVehicle || autoSelectVehicle(truckModal.qty);
      const vehicle = calcVehicles.find((v) => v.id === vId)!;
      const fare = round2(vehicle.baseFare + vehicle.perKm * truckModal.distance);
      const transitHrs = round2(truckModal.distance / vehicle.avgSpeed);
      const driverNames = ['Ramesh Kumar', 'Suresh Reddy', 'Mahesh Singh'];
      const driverName = driverNames[hashStr(truckModal.crop) % driverNames.length];
      const regNumbers = ['TS09 AB 4521', 'TS07 CD 8832', 'KA01 EF 1209'];
      const regNumber = regNumbers[hashStr(truckModal.dest) % regNumbers.length];
      const loadingWindows = [{ id: 'today_afternoon', label: t('market.todayAfternoon') }, { id: 'today_evening', label: t('market.todayEvening') }, { id: 'tomorrow_morning', label: t('market.tomorrowMorning') }];
      return <div className="market-modal-overlay" onClick={closeTruckModal}>
        <div className="market-modal" onClick={(e) => e.stopPropagation()}>
          <div className="market-modal-handle" />
          <div className="market-modal-header">
            <h3>{t('market.truckDispatchTitle')}</h3>
            <button className="market-modal-close" onClick={closeTruckModal}><X size={18} /></button>
          </div>
          {!dispatchConfirmed ? <div className="market-modal-body">
            <div className="market-modal-section">
              <h4>{t('market.consignmentDetails')}</h4>
              <div className="market-modal-stat-row"><span>{t('market.cropLabel')}</span><strong>{truckModal.crop}</strong></div>
              <div className="market-modal-stat-row"><span>{t('market.originLabel')}</span><strong>{truckModal.origin}</strong></div>
              <div className="market-modal-stat-row"><span>{t('market.destinationLabel')}</span><strong>{truckModal.dest}</strong></div>
              <div className="market-modal-stat-row"><span>{t('market.cargoWeight')}</span><strong>{formatKg(truckModal.qty)}</strong></div>
            </div>
            <div className="market-modal-section">
              <h4>{t('market.vehicleSelector')}</h4>
              {calcVehicles.map((v) => { const VIcon = v.id === 'ace' ? Package : Truck; const isSel = (selectedVehicle || vId) === v.id; const vFare = round2(v.baseFare + v.perKm * truckModal.distance); return <div key={v.id} className={`market-modal-vehicle ${isSel ? 'selected' : ''}`} onClick={() => setSelectedVehicle(v.id)}><span className="market-modal-vehicle-icon"><VIcon size={22} strokeWidth={1.5} /></span><div className="market-modal-vehicle-info"><strong>{v.name}</strong><small>{v.capacity}</small></div><div className="market-modal-vehicle-price">{formatRupee(vFare)}</div></div>; })}
            </div>
            <div className="market-modal-section">
              <h4>{t('market.loadingWindow')}</h4>
              <div className="market-modal-window-chips">{loadingWindows.map((w) => <button key={w.id} type="button" className={`market-modal-window-chip ${loadingWindow === w.id ? 'selected' : ''}`} onClick={() => setLoadingWindow(w.id)}>{w.label}</button>)}</div>
            </div>
            <div className="market-modal-insurance"><ShieldCheck size={18} /> <span>{t('market.transitInsurance')} · {t('market.insuranceCoverage')}</span></div>
            <button type="button" className="market-modal-confirm" onClick={confirmDispatch}><Truck size={18} /> {t('market.confirmDispatch')} · {formatRupee(fare)}</button>
          </div> : <div className="market-modal-body">
            <div className="market-modal-confirmed">
              <span className="market-modal-confirmed-icon"><CheckCircle2 size={32} strokeWidth={1.5} /></span>
              <h4>{t('market.dispatchConfirmed')}</h4>
              <p>{t('market.driverName', { name: driverName })}</p>
              <p>{t('market.vehicleReg', { reg: regNumber })}</p>
              <p>{t('market.eta', { eta: `~${transitHrs} hrs` })}</p>
              <button type="button" className="market-modal-call-btn" onClick={() => notify(t('market.callDriver'))}><Phone size={18} /> {t('market.callDriver')}</button>
            </div>
          </div>}
        </div>
      </div>;
    })()}
  </Page>;
}

const harvestLifecycleSteps = [
  { label: 'Upcoming', icon: Clock3 },
  { label: 'Field Verified', icon: Satellite },
  { label: 'Harvested', icon: Scissors },
  { label: 'In Transport', icon: Truck },
  { label: 'Sold', icon: Handshake },
  { label: 'Payment Cleared', icon: Banknote },
];

function lifecycleStepFromEvent(event: CalendarDayEvent): number {
  const stages = event.stages ?? [];
  if (stages.includes('paid')) return 5;
  if (stages.includes('sold')) return 4;
  if (stages.includes('transport')) return 3;
  if (stages.includes('harvested')) return 2;
  if (stages.includes('verified')) return 1;
  return 0;
}

function HarvestDetailModal({ event, day, monthName, onClose, t, notify }: { event: CalendarDayEvent; day: number; monthName: string; onClose: () => void; t: T; notify: (msg: string) => void }) {
  const photo = event.photo ?? cropPhotoFor(event.crop);
  const listing = event.listing;
  const currentStep = lifecycleStepFromEvent(event);
  const variety = listing ? cropDisplayVariety(listing) : 'Hybrid Variety';
  const harvestDateLabel = listing ? formatDate(listing.expected_harvest_date ?? listing.harvested_at) : `${monthName} ${day}, 2026`;
  const quantityKg = listing ? Number(listing.quantity_kg) : 500;
  const quintals = quantityKg / 100;
  const acreage = listing?.area_acres != null ? Number(listing.area_acres) : 1.5;
  const mandiRate = listing ? (computeCurrentPrice(listing) ?? listing.indicative_price_per_kg ?? 25) : 25;
  const grossValue = quantityKg * mandiRate;
  const notes = listing?.listing_verified ? 'Satellite verification complete. Vegetation index healthy. No pest indicators detected. Ready for harvest window as scheduled.' : 'Pending field verification. Agronomist visit scheduled 3 days before harvest date.';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="harvest-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="harvest-detail-banner">
          <img src={photo} alt={event.crop} className="harvest-detail-banner-img" />
          <div className="harvest-detail-banner-overlay" />
          <button className="icon-button harvest-detail-close" onClick={onClose}><X size={22} /></button>
          <div className="harvest-detail-banner-text">
            <span className="harvest-detail-eyebrow">{monthName} {day}, 2026</span>
            <h2>{event.crop}</h2>
            <p>{variety} · Harvest {harvestDateLabel}</p>
          </div>
        </div>
        <div className="harvest-detail-body">
          <div className="harvest-detail-section">
            <h3>Harvest Lifecycle</h3>
            <div className="harvest-lifecycle">
              {harvestLifecycleSteps.map((step, i) => {
                const StepIcon = step.icon;
                const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
                return (
                  <div key={i} className={`harvest-lifecycle-step ${state}`}>
                    <span className="harvest-lifecycle-dot">{i < currentStep ? <Check size={13} /> : <StepIcon size={14} />}</span>
                    <span className="harvest-lifecycle-label">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="harvest-detail-section">
            <h3>Yield & Value Metrics</h3>
            <div className="detail-grid">
              <Detail label="Expected Yield" value={`${quintals.toFixed(1)} quintals`} />
              <Detail label="Quantity (kg)" value={formatKg(quantityKg)} />
              <Detail label="Plot Acreage" value={`${acreage} acres`} />
              <Detail label="Mandi Rate" value={formatPrice(mandiRate)} />
              <Detail label="Gross Estimated Value" value={`₹${Math.round(grossValue).toLocaleString('en-IN')}`} />
              <Detail label="Harvest Status" value={event.upcoming ? 'Upcoming' : event.stages.includes('paid') ? 'Payment Cleared' : event.stages.includes('sold') ? 'Sold' : event.stages.includes('harvested') ? 'Harvested' : 'Verified'} />
            </div>
          </div>
          <div className="harvest-detail-section">
            <h3>Inspection Notes</h3>
            <p className="harvest-detail-notes">{notes}</p>
          </div>
          <Button icon={Printer} wide onClick={() => notify('Mandi gate pass sent to printer')}>Print Mandi Gate Pass</Button>
        </div>
      </div>
    </div>
  );
}

function CalendarView({ open, t, profileData }: { open: (view: View) => void; t: T; profileData?: Profile | null }) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [listings, setListings] = useState<CropListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{ day: number; monthIndex: number; event: CalendarDayEvent } | null>(null);
  const [localToast, setLocalToast] = useState('');
  const notify = useCallback((msg: string) => { setLocalToast(msg); window.setTimeout(() => setLocalToast(''), 2500); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchMyListings();
        if (!cancelled) setListings(data);
      } catch { if (!cancelled) setError(t('crops.loadError')); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [t]);

  const farmerName = profileData?.display_name ?? 'Ramesh Kumar';
  const farmerLocation = profileData?.home_location ?? roleMeta.Farmer.location;

  const cropEmojiFor = (name: string): string => { const n = name.toLowerCase(); if (n.includes('tomato')) return '🍅'; if (n.includes('onion')) return '🧅'; if (n.includes('paddy') || n.includes('rice')) return '🌾'; if (n.includes('corn') || n.includes('maize')) return '🌽'; if (n.includes('chilli')) return '🌶️'; if (n.includes('potato')) return '🥔'; if (n.includes('brinjal')) return '🍆'; if (n.includes('okra')) return '🫛'; if (n.includes('groundnut') || n.includes('peanut')) return '🥜'; if (n.includes('cotton')) return '🌱'; if (n.includes('banana')) return '🍌'; if (n.includes('mango')) return '🥭'; if (n.includes('turmeric')) return '🟡'; return '🌿'; };

  const stagesForListing = (listing: CropListing): CalendarStage[] => {
    const stages: CalendarStage[] = [];
    if (listing.listing_verified) stages.push('verified');
    const dateStr = listing.expected_harvest_date ?? listing.harvested_at;
    const d = dateStr ? new Date(dateStr) : null;
    const isPast = d ? (d.getFullYear() < 2026 || (d.getFullYear() === 2026 && d.getMonth() <= 8)) : false;
    if (isPast) { stages.push('harvested', 'transport', 'sold', 'paid'); }
    return stages;
  };

  const monthStartOffsets2026 = [4, 0, 0, 3, 5, 1, 3, 6, 2, 4, 0, 2];
  const monthDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const dows = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const realEvents: Record<number, Record<number, CalendarDayEvent[]>> = {};

  for (const listing of listings) {
    const name = cropDisplayName(listing);
    const color = cropColorFor(name);
    const emoji = cropEmojiFor(name);
    const photo = cropPhotoFor(name);
    const dateStr = listing.expected_harvest_date ?? listing.harvested_at;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (d.getFullYear() !== 2026) continue;
    const monthIdx = d.getMonth();
    const day = d.getDate();
    const stages = stagesForListing(listing);
    const upcoming = monthIdx > 8;
    if (!realEvents[monthIdx]) realEvents[monthIdx] = {};
    if (!realEvents[monthIdx][day]) realEvents[monthIdx][day] = [];
    realEvents[monthIdx][day].push({ crop: name, emoji, color, stages, upcoming, photo, listing });
  }

  const mergedEvents: Record<number, Record<number, CalendarDayEvent[]>> = { ...mockMonthEvents };
  for (const mIdx of Object.keys(realEvents).map(Number)) {
    mergedEvents[mIdx] = { ...(mergedEvents[mIdx] ?? {}), ...realEvents[mIdx] };
  }

  const allEventsFlat: CalendarDayEvent[] = Object.values(mergedEvents).flatMap((days) => Object.values(days).flat());
  const totalHarvests = allEventsFlat.length;
  const upcomingCount = allEventsFlat.filter((e) => e.upcoming).length;
  const totalOutputKg = allEventsFlat.reduce((sum, e) => sum + (e.listing ? Number(e.listing.quantity_kg) : 500), 0);
  const estimatedRevenue = allEventsFlat.reduce((sum, e) => {
    const kg = e.listing ? Number(e.listing.quantity_kg) : 500;
    const rate = e.listing ? (computeCurrentPrice(e.listing) ?? e.listing.indicative_price_per_kg ?? 25) : 25;
    return sum + kg * rate;
  }, 0);
  const totalTons = totalOutputKg / 1000;
  const totalQuintals = totalOutputKg / 100;
  const revenueLakhs = estimatedRevenue / 100000;
  const activeLoads = allEventsFlat.filter((e) => e.stages.includes('transport') && !e.stages.includes('sold')).length;

  const getMonthDays = (monthIndex: number): CalendarDayData[] => {
    const startOffset = monthStartOffsets2026[monthIndex] ?? 0;
    const daysInMonth = monthDaysInMonth[monthIndex] ?? 31;
    const events = mergedEvents[monthIndex] ?? {};
    const cells: CalendarDayData[] = [];
    for (let i = 0; i < 35; i++) {
      const day = i - startOffset + 1;
      if (day < 1 || day > daysInMonth) cells.push({ day: 0, events: [] });
      else cells.push({ day, events: events[day] ?? [] });
    }
    return cells;
  };

  const monthEventCount = (monthIndex: number): number => {
    const events = mergedEvents[monthIndex];
    return events ? Object.keys(events).length : 0;
  };

  const monthCropChips = (monthIndex: number): { crop: string; day: number; color: string }[] => {
    const events = mergedEvents[monthIndex] ?? {};
    const chips: { crop: string; day: number; color: string }[] = [];
    for (const [dayStr, evs] of Object.entries(events)) {
      if (evs.length > 0) chips.push({ crop: evs[0].crop, day: Number(dayStr), color: evs[0].color });
    }
    return chips.sort((a, b) => a.day - b.day);
  };

  return <Page title={t('calendar.title')} body={t('calendar.body')} back={() => open('home')} t={t}>
    <Card className="cal-header-card">
      <div className="cal-header-title-row">
        <h2>2026 Harvest Calendar</h2>
        <Badge tone="green"><CheckCircle2 size={14} /> Kisan FPO Verified</Badge>
      </div>
      <p className="cal-header-subtitle">Scheduled picking dates, yield projections, harvest lifecycle status, and linked mandi liquidation for {farmerName} · {farmerLocation}</p>
      <div className="cal-intel-ribbon">
        <div className="cal-intel-stat">
          <span>Total 2026 Harvests</span>
          <strong>{totalHarvests}</strong>
          <small>{upcomingCount} upcoming picks</small>
        </div>
        <div className="cal-intel-stat">
          <span>Projected Output</span>
          <strong>{totalTons.toFixed(1)} t</strong>
          <small>{totalQuintals.toFixed(0)} quintals</small>
        </div>
        <div className="cal-intel-stat">
          <span>Estimated Realization</span>
          <strong>₹{revenueLakhs.toFixed(2)}L</strong>
          <small>at indicative rates</small>
        </div>
        <div className="cal-intel-stat">
          <span>Active Logistics</span>
          <strong>{activeLoads}</strong>
          <small>loads in transit</small>
        </div>
      </div>
    </Card>
    {loading && <p className="calendar-empty">{t('crops.loading')}</p>}
    {error && <p className="calendar-empty">{error}</p>}
    <div className="calendar-months">
      {months.map((month, monthIndex) => {
        const eventCount = monthEventCount(monthIndex);
        const chips = monthCropChips(monthIndex);
        return <Card className="calendar-month" key={month}>
          <div className="calendar-head">
            <h2>{month} 2026</h2>
            <Badge tone={eventCount > 0 ? 'orange' : 'blue'}>{eventCount > 0 ? `${eventCount} events` : 'No events'}</Badge>
          </div>
          {eventCount > 0 ? <>
            <div className="cal-dow-row">{dows.map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="calendar-grid">{getMonthDays(monthIndex).map((d, i) => <CalendarDayCell key={i} data={d} onDayClick={(day, events) => { if (events.length > 0) setSelectedEvent({ day, monthIndex, event: events[0] }); }} />)}</div>
            <div className="cal-month-footer">
              {chips.map((chip, i) => <span key={i} className="cal-month-chip"><i style={{ background: cropColorFor(chip.crop) === 'tomato' ? '#c15e48' : cropColorFor(chip.crop) === 'onion' ? '#a76784' : cropColorFor(chip.crop) === 'paddy' ? '#778b2e' : cropColorFor(chip.crop) === 'green' ? '#4c9554' : cropColorFor(chip.crop) === 'amber' ? '#b8860b' : cropColorFor(chip.crop) === 'orange' ? '#d97a36' : cropColorFor(chip.crop) === 'teal' ? '#1a8a7a' : '#4c9554' }} />{chip.crop} ({chip.day}th)</span>)}
            </div>
          </> : <p className="calendar-empty">{t('calendar.noHarvestEvents')}</p>}
        </Card>;
      })}
    </div>
    {selectedEvent && <HarvestDetailModal event={selectedEvent.event} day={selectedEvent.day} monthName={months[selectedEvent.monthIndex]} onClose={() => setSelectedEvent(null)} t={t} notify={notify} />}
    {localToast && <div className="toast">{localToast}</div>}
  </Page>;
}

function TransportOptions({ role, open, notify, t, profileData }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T; profileData?: Profile | null }) {
  const farmerLocation = role === 'Farmer' ? (profileData?.home_location ?? roleMeta.Farmer.location) : roleMeta[role].location;
  const [fromLocation, setFromLocation] = useState(farmerLocation);
  const [toLocation, setToLocation] = useState('');
  const [toSuggestionsOpen, setToSuggestionsOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const transportMarkets = ['Bengaluru', 'Hyderabad', 'Chennai', 'Warangal', 'Karimnagar', 'Kurnool', 'Anantapur'];
  const filteredMarkets = toLocation.trim() === '' ? transportMarkets : transportMarkets.filter((m) => m.toLowerCase().includes(toLocation.trim().toLowerCase()));

  const sampleDistanceKm = 150;
  const vehicles = [
    { id: 'tempo', name: t('transport.results.tempo'), capacity: t('transport.results.tempoCapacity'), baseFare: 50, perKm: 10, icon: Package, avgSpeed: 35 },
    { id: 'mini-truck', name: t('transport.results.miniTruck'), capacity: t('transport.results.miniTruckCapacity'), baseFare: 100, perKm: 15, icon: Truck, avgSpeed: 40 },
    { id: 'truck', name: t('transport.results.truck'), capacity: t('transport.results.truckCapacity'), baseFare: 200, perKm: 25, icon: Truck, avgSpeed: 45 },
  ];

  const handleFindTransport = (e: FormEvent) => {
    e.preventDefault();
    if (!toLocation.trim()) { notify(t('transport.search.selectDestination')); return; }
    setSearched(true);
    setSelectedVehicle(null);
  };

  const selectDestination = (market: string) => {
    setToLocation(market);
    setToSuggestionsOpen(false);
  };

  const handleSearchAgain = () => {
    setSearched(false);
    setSelectedVehicle(null);
  };

  const handleBookNow = () => {
    setBooked(true);
    setStatusStep(0);
    notify(t('transport.results.bookToast', { vehicle: vehicles.find((v) => v.id === selectedVehicle)?.name ?? '' }));
  };

  const handleAdvanceStep = () => {
    if (statusStep < 5) {
      setStatusStep(statusStep + 1);
      notify(t('transport.confirm.stepAdvanced', { step: t(`transport.confirm.step${statusStep + 1}`) }));
    }
  };

  const handleCancelBooking = () => {
    setBooked(false);
    setStatusStep(0);
    setSelectedVehicle(null);
    setSearched(false);
    notify(t('transport.confirm.cancelled'));
  };

  if (booked && selectedVehicle) {
    const vehicle = vehicles.find((v) => v.id === selectedVehicle)!;
    const price = round2(vehicle.baseFare + vehicle.perKm * sampleDistanceKm);
    const timeHrs = sampleDistanceKm / vehicle.avgSpeed;
    const timeMin = Math.round(timeHrs * 60);
    const timeLabel = timeMin >= 60 ? `${Math.floor(timeMin / 60)}h ${timeMin % 60}m` : `${timeMin}m`;
    const VIcon = vehicle.icon;
    const statusSteps = [
      { label: t('transport.confirm.step0'), icon: CheckCircle2 },
      { label: t('transport.confirm.step1'), icon: UserRound },
      { label: t('transport.confirm.step2'), icon: Truck },
      { label: t('transport.confirm.step3'), icon: Map },
      { label: t('transport.confirm.step4'), icon: Package },
      { label: t('transport.confirm.step5'), icon: CheckCircle2 },
    ];
    return <div className="transport-confirm">
      <button className="journey-back" onClick={handleCancelBooking}><ArrowLeft size={20} /> {t('common.back')}</button>
      <div className="transport-confirm-map">
        <Map size={64} strokeWidth={1.2} />
        <span className="route route-one" /><span className="route route-two" />
        <div className="map-marker pickup"><MapPin size={20} /><small>{fromLocation}</small></div>
        <div className="map-marker destination"><MapPin size={20} /><small>{toLocation}</small></div>
        <div className="map-marker vehicle"><VIcon size={20} /></div>
        <Demo>{t('transport.search.mockData')}</Demo>
      </div>
      <div className="transport-confirm-sheet">
        <Badge tone="green"><CheckCircle2 size={14} /> {t('transport.confirm.booked')}</Badge>
        <h1>{vehicle.name}</h1>
        <p>{fromLocation} → {toLocation} · {sampleDistanceKm} km · {timeLabel}</p>
        <Card className="transport-confirm-provider">
          <div className="transport-confirm-provider-head">
            <span className="transport-confirm-provider-icon"><VIcon size={26} strokeWidth={1.5} /></span>
            <div className="transport-confirm-provider-info">
              <h3>{t('transport.confirm.providerName')}</h3>
              <p>{vehicle.capacity}</p>
            </div>
            <div className="transport-confirm-provider-rating"><Star size={16} fill="currentColor" /> <span>4.8</span></div>
          </div>
          <div className="transport-confirm-price">
            <span>{t('transport.results.estPrice')}</span>
            <strong>{formatRupee(price)}</strong>
            <small>{t('market.samplePrice')}</small>
          </div>
        </Card>
        <div className="transport-confirm-timeline">
          {statusSteps.map((s, i) => {
            const SIcon = s.icon;
            const state = i < statusStep ? 'done' : i === statusStep ? 'active' : '';
            return <div key={i} className={`transport-confirm-step ${state}`}>
              <span className="transport-confirm-step-dot">{i < statusStep ? <Check size={14} /> : <SIcon size={14} />}</span>
              <div className="transport-confirm-step-body">
                <strong>{s.label}</strong>
                {i === statusStep && <small>{t('transport.confirm.inProgress')}</small>}
                {i < statusStep && <small>{t('transport.confirm.completed')}</small>}
              </div>
            </div>;
          })}
        </div>
        <div className="transport-confirm-actions">
          {statusStep < 5
            ? <Button icon={ArrowRight} wide onClick={handleAdvanceStep}>{t('transport.confirm.advance')}</Button>
            : <Button icon={CheckCircle2} wide onClick={() => { notify(t('transport.confirm.delivered')); open('home'); }}>{t('transport.confirm.finish')}</Button>}
          <Button variant="outline" onClick={handleCancelBooking}>{t('transport.confirm.cancel')}</Button>
        </div>
        <Demo>{t('transport.confirm.prototypeNote')}</Demo>
      </div>
    </div>;
  }

  if (searched) {
    return <Page title={t('transport.results.title')} body={t('transport.results.body')} back={handleSearchAgain} t={t}>
      <Card className="transport-route-summary">
        <div className="transport-route-from"><MapPin size={16} /> <span>{fromLocation}</span></div>
        <div className="transport-route-line" />
        <div className="transport-route-to"><MapPin size={16} /> <span>{toLocation}</span></div>
        <div className="transport-route-meta"><Clock3 size={14} /> {t('transport.results.sampleDistance', { km: sampleDistanceKm })}</div>
      </Card>
      <div className="transport-vehicle-list">
        {vehicles.map((v) => {
          const price = round2(v.baseFare + v.perKm * sampleDistanceKm);
          const timeHrs = sampleDistanceKm / v.avgSpeed;
          const timeMin = Math.round(timeHrs * 60);
          const timeLabel = timeMin >= 60 ? `${Math.floor(timeMin / 60)}h ${timeMin % 60}m` : `${timeMin}m`;
          const Icon = v.icon;
          const isSelected = selectedVehicle === v.id;
          return <Card key={v.id} className={`transport-vehicle-card ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedVehicle(v.id)}>
            <div className="transport-vehicle-icon"><Icon size={28} strokeWidth={1.5} /></div>
            <div className="transport-vehicle-info">
              <h3>{v.name}</h3>
              <p>{v.capacity}</p>
              <div className="transport-vehicle-stats">
                <span><strong>{formatRupee(price)}</strong> <small>{t('transport.results.estPrice')} · {t('market.samplePrice')}</small></span>
                <span><strong>{timeLabel}</strong> <small>{t('transport.results.estTime')}</small></span>
              </div>
            </div>
            <div className="transport-vehicle-check">{isSelected && <Check size={22} />}</div>
          </Card>;
        })}
      </div>
      <Demo>{t('transport.search.mockData')}</Demo>
      {selectedVehicle && <div className="transport-book-bar"><Button icon={Truck} wide onClick={handleBookNow}>{t('transport.results.bookNow')}</Button></div>}
      {role === 'FPO' && <Card className="provider-card"><Illustration label={t('transport.transportProvider')} color="teal" icon={Truck} /><div><Badge tone="green">{t('transport.available')}</Badge><h3>{t('transport.warangalFpoTransport')}</h3><p>{t('transport.capacityPrice')}</p><Button onClick={() => notify(t('transport.availabilityUpdated'))}>{t('transport.updateAvailability')}</Button></div></Card>}
    </Page>;
  }

  return <Page title={t('transport.search.title')} body={t('transport.search.body')} back={() => open('home')} t={t}>
    <Card className="transport-search-card">
      <div className="transport-search-hero">
        <div className="transport-search-icon"><Truck size={36} strokeWidth={1.5} /></div>
        <h2>{t('transport.search.heading')}</h2>
        <p>{t('transport.search.subheading')}</p>
      </div>
      <form className="transport-search-form" onSubmit={handleFindTransport}>
        <div className="transport-search-field">
          <label><MapPin size={16} /> {t('transport.search.from')}</label>
          <input value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} placeholder={t('transport.search.fromPlaceholder')} />
        </div>
        <div className="transport-search-divider"><span /></div>
        <div className="transport-search-field transport-search-to">
          <label><MapPin size={16} /> {t('transport.search.to')}</label>
          <input value={toLocation} onChange={(e) => { setToLocation(e.target.value); setToSuggestionsOpen(true); }} onFocus={() => setToSuggestionsOpen(true)} placeholder={t('transport.search.toPlaceholder')} />
          {toSuggestionsOpen && filteredMarkets.length > 0 && (
            <div className="transport-search-suggestions">
              {filteredMarkets.map((market) => (
                <button type="button" key={market} className="transport-search-suggestion" onClick={() => selectDestination(market)}>
                  <MapPin size={14} /> {market}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button icon={Search} wide>{t('transport.search.findButton')}</Button>
      </form>
      <Demo>{t('transport.search.mockData')}</Demo>
    </Card>
    {role === 'FPO' && <Card className="provider-card"><Illustration label={t('transport.transportProvider')} color="teal" icon={Truck} /><div><Badge tone="green">{t('transport.available')}</Badge><h3>{t('transport.warangalFpoTransport')}</h3><p>{t('transport.capacityPrice')}</p><Button onClick={() => notify(t('transport.availabilityUpdated'))}>{t('transport.updateAvailability')}</Button></div></Card>}
  </Page>;
}

function TransportDetail({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { const providers = [{ name: 'Suresh Transport Services', vehicle: 'AP 02 TR 7788', rating: '4.8', review: 'Reliable pickup and careful loading', price: '₹2,500' }, { name: 'Lakshmi Agro Logistics', vehicle: 'TS 09 UV 2468', rating: '4.6', review: 'Good route coverage for vegetables', price: '₹2,350' }]; return <Page title={t('transport.detailTitle')} body={t('transport.detailBody')} back={() => open('transport-options')} t={t}><div className="provider-list">{providers.map((provider) => <Card className="provider-detail" key={provider.name}><Illustration label={t('role.Transport Provider')} color="orange" icon={Truck} /><Badge tone="green">{t('transport.demoVerified')}</Badge><h2>{provider.name}</h2><p>{provider.vehicle} · {t('transport.capacity')}</p><div className="detail-grid"><Detail label={t('transport.pickup')} value="Anantapur farm gate" /><Detail label={t('transport.destination')} value="Bengaluru buyer" /><Detail label={t('transport.dateTime')} value="18 October 2026 · 8:00 AM" /><Detail label={t('transport.estimatedPrice')} value={`${provider.price} · ${t('market.samplePrice')}`} /><Detail label={t('transport.rating')} value={`${provider.rating} / 5 · ${t('transport.demoRating')}`} /><Detail label={t('transport.review')} value={provider.review} /></div><Button onClick={() => notify(t('transport.providerSelected', { name: provider.name }))}>{t('transport.bookProvider')}</Button></Card>)}</div></Page>; }

function JourneyView({ open, notify, t, consignment }: { open: (view: View) => void; notify: (message: string) => void; t: T; consignment?: TpConsignment | null }) {
  const [started, setStarted] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const c = consignment ?? null;
  const title = c ? `${c.farmerName} · ${c.cropName}` : t('journey.tomato500');
  const routeLabel = c ? `${c.routeFrom} → ${c.routeTo}` : t('journey.route');
  const distanceLabel = c ? `${c.distanceKm} km` : '25 km';
  const pickupLabel = c ? c.routeFrom : t('journey.pickup');
  const destLabel = c ? c.routeTo : t('journey.destination');
  const vehicle = c ? tpVehicleForConsignment(c) : null;
  const freight = c ? tpFreightPayout(c) : null;

  return <div className="journey-full">
    <button className="journey-back" onClick={() => open('home')}><ArrowLeft size={20} /> {t('common.back')}</button>
    <div className="journey-map">
      <Map size={80} />
      <span className="route route-one" />
      <span className="route route-two" />
      <div className="map-marker pickup"><MapPin size={22} /><small>{pickupLabel}</small></div>
      <div className="map-marker destination"><MapPin size={22} /><small>{destLabel}</small></div>
      <div className="map-marker vehicle"><Truck size={22} /></div>
      <Demo>{t('journey.notLiveGps')}</Demo>
    </div>
    <div className="journey-sheet">
      <Badge tone="orange">{started ? t('journey.started') : t('journey.notStarted')}</Badge>
      <h1>{title}</h1>
      <p>{routeLabel}</p>
      <div className="journey-stats">
        <div><strong>{started ? `${Math.round(c ? c.distanceKm * 0.8 : 42)} min` : `${c ? c.distanceKm + 13 : 55} min`}</strong><small>{t('journey.estTravelTime')}</small></div>
        <div><strong>{distanceLabel}</strong><small>{t('journey.distance')}</small></div>
        <div><strong>{started ? t('journey.inTransit') : t('journey.notStarted')}</strong><small>{t('journey.journeyStatus')}</small></div>
      </div>
      {c && <div className="journey-shipment-info">
        <div className="journey-info-row"><Thermometer size={14} /><span>{c.tempReq}</span></div>
        <div className="journey-info-row"><Package size={14} /><span>{formatKg(c.quantityKg)} · {c.unitCount} {c.unitType}</span></div>
        {vehicle && <div className="journey-info-row"><Truck size={14} /><span>{vehicle.regNumber} · {vehicle.vehicleType}</span></div>}
        {vehicle && <div className="journey-info-row"><UserRound size={14} /><span>{vehicle.driverName} · {vehicle.driverPhone}</span></div>}
        {freight != null && <div className="journey-info-row"><Banknote size={14} /><span>Freight: {formatRupee(freight)}</span></div>}
      </div>}
      <div className="journey-steps"><span className={started ? 'done' : 'active'}>{started ? <Check size={15} /> : '1'}</span><span className={started ? 'active' : ''}>{started ? '2' : ''}</span><span /></div>
      <Button icon={Truck} onClick={() => { setStarted(true); notify(t('journey.journeyStartedToast')); }}>{started ? t('journey.started') : t('journey.startJourney')}</Button>
      {c && <Button variant="outline" icon={FileCheck2} onClick={() => setShowDocs(true)}>Shipment Docs</Button>}
      <Demo>{t('journey.prototype')}</Demo>
    </div>
    {c && showDocs && <TpShipmentDocsModal c={c} t={t} onClose={() => setShowDocs(false)} />}
  </div>;
}

const storageFacilities = [
  { name: 'Storage A', type: 'Cold Storage', tempLabel: '4°C', tempRange: '4°C – 8°C', status: 'occupied', distance: '4.5 km away', capacity: '5,000 kg', location: 'Warangal APMC Yard (Enumamula)', crops: 'Red Chilli, Tomato, Capsicum, Onion', rateKg: '₹2.00/kg/day', rateQtl: '₹200/qtl/month', photo: 'https://images.pexels.com/photos/5953713/pexels-photo-5953713.jpeg?auto=compress&cs=tinysrgb&h=200&w=200' },
  { name: 'Storage B', type: 'Cool Vault', tempLabel: '10°C', tempRange: '10°C – 15°C', status: 'available', distance: '7.2 km away', capacity: '3,000 kg', location: 'Madikonda Cold Hub', crops: 'Onion, Potato, Banana, Citrus', rateKg: '₹1.50/kg/day', rateQtl: '₹150/qtl/month', photo: 'https://images.pexels.com/photos/4487363/pexels-photo-4487363.jpeg?auto=compress&cs=tinysrgb&h=200&w=200' },
  { name: 'Storage C', type: 'Scientific Dry Godown', tempLabel: 'Ambient Ventilated', tempRange: 'Ambient', status: 'available', distance: '12 km away', capacity: '10,000 kg', location: 'Kazipet Grain Depot', crops: 'Paddy, Maize, Pulses, Wheat', rateKg: '₹1.00/kg/day', rateQtl: '₹90/qtl/month', photo: 'https://images.pexels.com/photos/13870874/pexels-photo-13870874.jpeg?auto=compress&cs=tinysrgb&h=200&w=200' },
];

type SpTempRegime = 'chilled' | 'cool' | 'ca';
type SpStorageRequest = {
  id: string;
  farmerName: string;
  village: string;
  district: string;
  cropName: string;
  variety: string;
  packaging: string;
  batchCount: number;
  quantityKg: number;
  tempRegime: SpTempRegime;
  tempLabel: string;
  depositWindow: string;
  estRevenue: number;
  moisturePct: number;
  grade: string;
  arrivalDate: string;
  chamberTemp: string;
  chamberHumidity: string;
};

type SpEnwrReceipt = {
  enwrId: string;
  gatePassNo: string;
  farmerName: string;
  village: string;
  district: string;
  cropName: string;
  variety: string;
  netWeightKg: number;
  bagCount: number;
  grade: string;
  chamber: string;
  bay: string;
  temp: string;
  humidity: string;
  insuranceValue: number;
  valuation: number;
  depositDate: string;
  releaseDate?: string;
  status: 'in-vault' | 'released';
  finalEarnings?: number;
};

const spRequestsSeed: SpStorageRequest[] = [
  { id: 'sp-req-1', farmerName: 'Ramesh Kumar', village: 'Pembarthy', district: 'Warangal', cropName: 'Tomato', variety: 'Hybrid F1', packaging: 'Crates', batchCount: 25, quantityKg: 500, tempRegime: 'chilled', tempLabel: '0–4°C Chilled', depositWindow: '18–25 Oct 2026', estRevenue: 3750, moisturePct: 92, grade: 'A Grade', arrivalDate: '17 Oct 2026', chamberTemp: '2°C', chamberHumidity: '90% RH' },
  { id: 'sp-req-2', farmerName: 'Lakshmi Devi', village: 'Hasanparthy', district: 'Warangal', cropName: 'Potato', variety: 'Kufri Jyoti', packaging: 'Gunny Bags', batchCount: 10, quantityKg: 1000, tempRegime: 'cool', tempLabel: '10–15°C Cool', depositWindow: '20–30 Oct 2026', estRevenue: 6000, moisturePct: 78, grade: 'A Grade', arrivalDate: '19 Oct 2026', chamberTemp: '12°C', chamberHumidity: '85% RH' },
  { id: 'sp-req-3', farmerName: 'Suresh Reddy', village: 'Geesukonda', district: 'Warangal', cropName: 'Banana', variety: 'Grand Naine', packaging: 'Crates', batchCount: 40, quantityKg: 800, tempRegime: 'ca', tempLabel: 'Controlled Atmosphere', depositWindow: '22 Oct–5 Nov 2026', estRevenue: 7200, moisturePct: 75, grade: 'B Grade', arrivalDate: '21 Oct 2026', chamberTemp: '14°C', chamberHumidity: '92% RH' },
  { id: 'sp-req-4', farmerName: 'Warangal Farmers FPO', village: 'Nekkonda', district: 'Warangal', cropName: 'Onion', variety: 'Nasik Red', packaging: 'Jute Bags', batchCount: 20, quantityKg: 2000, tempRegime: 'cool', tempLabel: '10–15°C Cool', depositWindow: '26 Oct–2 Nov 2026', estRevenue: 9000, moisturePct: 65, grade: 'A Grade', arrivalDate: '25 Oct 2026', chamberTemp: '12°C', chamberHumidity: '70% RH' },
];

const spChambers = [
  { id: 'CH-A1', label: 'Chamber A1 · Chilled 0–4°C', capacity: '5 MT available', temp: '2°C', humidity: '90% RH' },
  { id: 'CH-B2', label: 'Chamber B2 · Cool 10–15°C', capacity: '12 MT available', temp: '12°C', humidity: '85% RH' },
  { id: 'CH-C3', label: 'Chamber C3 · Controlled Atmosphere', capacity: '8 MT available', temp: '14°C', humidity: '92% RH' },
];

const spCurrentApprovals: SpEnwrReceipt[] = [
  { enwrId: 'eNWR-TS-WRG-1027', gatePassNo: 'GP-2026-04821', farmerName: 'Ramesh Kumar', village: 'Pembarthy', district: 'Warangal', cropName: 'Tomato', variety: 'Hybrid F1', netWeightKg: 480, bagCount: 24, grade: 'A Grade', chamber: 'CH-A1', bay: 'B3/R7', temp: '3–5°C', humidity: '90% RH', insuranceValue: 12000, valuation: 14400, depositDate: '15 Oct 2026', status: 'in-vault' },
  { enwrId: 'eNWR-TS-WRG-1031', gatePassNo: 'GP-2026-04835', farmerName: 'Lakshmi Devi', village: 'Hasanparthy', district: 'Warangal', cropName: 'Potato', variety: 'Kufri Jyoti', netWeightKg: 960, bagCount: 20, grade: 'A Grade', chamber: 'CH-B2', bay: 'B1/R3', temp: '10–12°C', humidity: '85% RH', insuranceValue: 19200, valuation: 23040, depositDate: '18 Oct 2026', status: 'in-vault' },
];

const spPreviousApprovals: SpEnwrReceipt[] = [
  { enwrId: 'eNWR-TS-WRG-0982', gatePassNo: 'GP-2026-04715', farmerName: 'Warangal Farmers FPO', village: 'Nekkonda', district: 'Warangal', cropName: 'Onion', variety: 'Nasik Red', netWeightKg: 1850, bagCount: 37, grade: 'A Grade', chamber: 'CH-B2', bay: 'B2/R5', temp: '10–12°C', humidity: '70% RH', insuranceValue: 46250, valuation: 55500, depositDate: '26 Sep 2026', releaseDate: '10 Oct 2026', status: 'released', finalEarnings: 8325 },
];

function SpEnwrModal({ receipt, onClose, notify }: { receipt: SpEnwrReceipt; onClose: () => void; notify: (msg: string) => void }) {
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="sp-enwr-modal" onClick={(e) => e.stopPropagation()}>
      <div className="sp-enwr-header">
        <div>
          <h2>Krishna Cold Storage</h2>
          <div className="sp-enwr-accred"><ShieldCheck size={12} /> WDRA Accredited · License #WDRA-2026-AP09</div>
          <div className="sp-enwr-no">{receipt.enwrId}</div>
        </div>
        <div className="sp-enwr-qr"><QrCode size={40} /></div>
        <button className="icon-button" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}><X size={20} /></button>
      </div>
      <div className="sp-enwr-section">
        <h3>Depositor / Farmer Details</h3>
        <div className="sp-enwr-grid">
          <Detail label="Farmer Name" value={receipt.farmerName} />
          <Detail label="Village" value={receipt.village} />
          <Detail label="District" value={receipt.district} />
          <Detail label="Gate Pass No" value={receipt.gatePassNo} />
        </div>
      </div>
      <div className="sp-enwr-section">
        <h3>Commodity Details</h3>
        <div className="sp-enwr-grid">
          <Detail label="Crop" value={receipt.cropName} />
          <Detail label="Variety" value={receipt.variety} />
          <Detail label="Net Weight" value={formatKg(receipt.netWeightKg)} />
          <Detail label="Bag / Crate Count" value={String(receipt.bagCount)} />
          <Detail label="Grade" value={receipt.grade} />
          <Detail label="Deposit Date" value={receipt.depositDate} />
        </div>
      </div>
      <div className="sp-enwr-section">
        <h3>Storage Conditions & Location</h3>
        <div className="sp-enwr-grid">
          <Detail label="Chamber" value={receipt.chamber} />
          <Detail label="Bay / Rack" value={receipt.bay} />
          <Detail label="Temperature" value={receipt.temp} />
          <Detail label="Humidity" value={receipt.humidity} />
        </div>
      </div>
      <div className="sp-enwr-section">
        <h3>Insurance & Valuation</h3>
        <div className="sp-enwr-grid">
          <Detail label="Insured Value" value={formatRupee(receipt.insuranceValue)} />
          <Detail label="Declared Valuation" value={formatRupee(receipt.valuation)} />
          {receipt.releaseDate && <Detail label="Release Date" value={receipt.releaseDate} />}
          {receipt.finalEarnings != null && <Detail label="Final Earnings" value={formatRupee(receipt.finalEarnings)} />}
        </div>
      </div>
      <div className="sp-enwr-actions">
        <Button variant="outline" icon={Printer} onClick={() => notify('Gate Pass printed successfully.')} wide>Print Gate Pass</Button>
        <Button icon={Download} onClick={() => notify('Certified e-NWR PDF downloaded.')} wide>Download e-NWR PDF</Button>
      </div>
    </div>
  </div>;
}

function SpReviewModal({ request, selectedChamber, onSelectChamber, onClose, onDecline, onApprove }: {
  request: SpStorageRequest;
  selectedChamber: number;
  onSelectChamber: (i: number) => void;
  onClose: () => void;
  onDecline: () => void;
  onApprove: () => void;
}) {
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="sp-review-modal" onClick={(e) => e.stopPropagation()}>
      <div className="sp-review-header">
        <div>
          <span className="eyebrow">LOT INSPECTION & INTAKE</span>
          <h2>{request.farmerName} · {request.cropName}</h2>
        </div>
        <button className="icon-button" onClick={onClose}><X size={22} /></button>
      </div>
      <div className="sp-review-section">
        <h3>Lot Details</h3>
        <div className="sp-review-grid">
          <Detail label="Moisture" value={`${request.moisturePct}%`} />
          <Detail label="Grade" value={request.grade} />
          <Detail label="Arrival Date" value={request.arrivalDate} />
          <Detail label="Chamber Temp" value={request.chamberTemp} />
          <Detail label="Humidity" value={request.chamberHumidity} />
          <Detail label="Quantity" value={formatKg(request.quantityKg)} />
        </div>
      </div>
      <div className="sp-review-section">
        <h3>Chamber Allotment</h3>
        <div className="sp-chamber-select">
          {spChambers.map((c, i) => <div key={c.id} className={`sp-chamber-option${selectedChamber === i ? ' selected' : ''}`} onClick={() => onSelectChamber(i)}>
            <div className="sp-chamber-radio" />
            <div>
              <div>{c.label}</div>
              <small style={{ fontWeight: 600, color: '#78716C', fontSize: 11 }}>{c.capacity}</small>
            </div>
          </div>)}
        </div>
      </div>
      <div className="sp-review-section">
        <h3>Bay & Rack Assignment</h3>
        <div className="sp-review-grid">
          <Detail label="Bay" value={`B${(hashStr(request.id + 'bay') % 50) + 1}`} />
          <Detail label="Rack" value={`R${(hashStr(request.id + 'rack') % 20) + 1}`} />
        </div>
      </div>
      <div className="sp-review-actions">
        <Button variant="outline" icon={X} onClick={onDecline} wide>Decline / Capacity Full</Button>
        <Button icon={ShieldCheck} onClick={onApprove} wide>Approve & Issue Gate Pass</Button>
      </div>
    </div>
  </div>;
}

function StorageView({ role, open, notify, t }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedFacility, setSelectedFacility] = useState<typeof storageFacilities[number] | null>(null);
  const [listings, setListings] = useState<CropListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [cropSearch, setCropSearch] = useState('');
  const [selectedListing, setSelectedListing] = useState<CropListing | null>(null);
  const [customCrop, setCustomCrop] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [consignmentStage, setConsignmentStage] = useState(0);
  const [spSearch, setSpSearch] = useState('');
  const [spFilter, setSpFilter] = useState<'all' | SpTempRegime>('all');
  const [spReviewItem, setSpReviewItem] = useState<SpStorageRequest | null>(null);
  const [spSelectedChamber, setSpSelectedChamber] = useState(0);
  const [spEnwrModal, setSpEnwrModal] = useState<SpEnwrReceipt | null>(null);

  useEffect(() => {
    if (step !== 2 || listings.length > 0) return;
    setLoadingListings(true);
    (async () => {
      try {
        const all = await fetchMyListings();
        setListings(all.filter((l) => l.status === 'Upcoming'));
      } catch { setListings([]); } finally { setLoadingListings(false); }
    })();
  }, [step, listings.length]);

  if (role === 'Storage Provider') {
    const filteredRequests = spRequestsSeed.filter((r) => {
      if (spFilter !== 'all' && r.tempRegime !== spFilter) return false;
      if (spSearch.trim()) {
        const q = spSearch.toLowerCase();
        return r.farmerName.toLowerCase().includes(q) || r.cropName.toLowerCase().includes(q) || r.village.toLowerCase().includes(q);
      }
      return true;
    });
    const filterChips: { key: 'all' | SpTempRegime; label: string; icon?: IconType }[] = [
      { key: 'all', label: 'All' },
      { key: 'chilled', label: 'Chilled 0–4°C', icon: Snowflake },
      { key: 'cool', label: 'Cool 10–15°C', icon: Thermometer },
      { key: 'ca', label: 'Controlled Atmosphere', icon: Droplet },
    ];
    return <main className="dedicated-page">
      <div className="sp-workspace">
        <div className="sp-topbar">
          <button className="back-button" onClick={() => open('home')}><ArrowLeft size={18} /> Back to Home</button>
        </div>
        <div className="sp-breadcrumb"><span><Building2 size={12} /> Storage Provider</span> <ChevronRight size={12} /> <span>Storage Requests</span></div>
        <div className="sp-facility-bar">
          <div className="sp-facility-icon"><Warehouse size={24} /></div>
          <div>
            <h2>Krishna Cold Storage</h2>
            <p>Warangal, Telangana</p>
          </div>
          <div className="sp-facility-license">
            <small>WDRA License</small>
            <strong>#WDRA-2026-AP09</strong>
          </div>
        </div>
        <div className="sp-subtabs">
          <button className="selected"><Package size={15} /> Storage Requests <span className="sp-tab-badge">{spRequestsSeed.length}</span></button>
          <button onClick={() => open('approvals')}><FileCheck2 size={15} /> My Approvals</button>
        </div>
        <div className="sp-search-row">
          <div className="sp-search-wrap">
            <Search size={16} />
            <input type="text" placeholder="Search farmer, crop, or village..." value={spSearch} onChange={(e) => setSpSearch(e.target.value)} />
          </div>
        </div>
        <div className="sp-filter-chips">
          {filterChips.map((c) => <button key={c.key} className={spFilter === c.key ? 'selected' : ''} onClick={() => setSpFilter(c.key)}>{c.icon && <c.icon size={13} />}{c.label}</button>)}
        </div>
        {filteredRequests.length === 0 && <p className="sp-empty">No requests match your search.</p>}
        {filteredRequests.map((r) => <div className="sp-req-card" key={r.id}>
          <div className="sp-req-card-top">
            <div className="sp-req-thumb-wrap">
              <img src={cropPhotoFor(r.cropName)} alt={r.cropName} loading="lazy" />
              <div className="sp-req-thumb-overlay">
                <span className="sp-req-thumb-pill">{r.tempLabel}</span>
                <span className="sp-req-thumb-pill">{r.depositWindow}</span>
              </div>
            </div>
            <div className="sp-req-card-info">
              <div className="sp-req-card-header">
                <Badge tone="amber">Pending Review</Badge>
              </div>
              <p className="sp-req-farmer">{r.farmerName}</p>
              <p className="sp-req-origin">{r.village}, {r.district}</p>
              <p className="sp-req-crop-line">{r.cropName} · {r.variety}</p>
              <p className="sp-req-pkg-line">{r.packaging} · {r.batchCount} batches</p>
              <div className="sp-req-qty-row">
                <span className="sp-req-qty">{r.quantityKg.toLocaleString('en-IN')}</span>
                <span className="sp-req-qty-unit">kg</span>
                <span className="sp-req-revenue">Est. {formatRupee(r.estRevenue)}</span>
              </div>
            </div>
          </div>
          <div className="sp-req-action-row">
            <Button variant="soft" icon={Eye} onClick={() => { setSpReviewItem(r); setSpSelectedChamber(0); }}>Review request</Button>
          </div>
        </div>)}
      </div>
      {spReviewItem && <SpReviewModal request={spReviewItem} selectedChamber={spSelectedChamber} onSelectChamber={setSpSelectedChamber} onClose={() => setSpReviewItem(null)} onDecline={() => { notify('Request declined — capacity full.'); setSpReviewItem(null); }} onApprove={() => { notify('Gate Pass issued. Produce admitted to chamber.'); setSpReviewItem(null); }} />}
      {spEnwrModal && <SpEnwrModal receipt={spEnwrModal} onClose={() => setSpEnwrModal(null)} notify={notify} />}
    </main>;
  }

  const stepLabels = ['Storage Options', 'Book Space', 'My Stored Produce'];
  const stepIndicator = <div style={{ marginBottom: 24 }}><div className="step-indicator">{[1, 2, 3].map((s) => <span key={s} className={`step-dot ${s === step ? 'active' : ''} ${s < step ? 'done' : ''}`} />)}</div><div style={{ display: 'flex', gap: '6px' }}>{stepLabels.map((label, i) => <span key={label} style={{ flex: 1, fontSize: '11px', fontWeight: 700, color: i + 1 === step ? '#047857' : '#a8a29e' }}>{label}</span>)}</div></div>;

  if (step === 1) {
    return <Page title={t('storage.title')} body={t('storage.body')} back={() => open('home')} t={t}>{stepIndicator}<div className="storage-list">{storageFacilities.map((f) => <Card className="storage-row-card" key={f.name}><div className="storage-row-thumb"><img src={f.photo} alt={f.name} loading="lazy" /><span className="storage-row-temp">{f.tempLabel}</span></div><div className="storage-row-info"><div className="storage-row-top"><span className={"storage-row-status " + f.status}><span className="storage-row-dot"></span>{f.status === "available" ? "Available Space" : "Occupied"}</span><span className="storage-row-distance">{f.distance}</span></div><h3 className="storage-row-name">{f.name}</h3><p className="storage-row-detail">{f.tempRange} · {f.capacity} capacity</p><p className="storage-row-detail">{f.location} · Ideal for {f.crops}</p></div><div className="storage-row-right"><strong className="storage-row-rate">{f.rateKg}</strong><small className="storage-row-rate-sub">{f.rateQtl}</small>{f.status === "available" ? <Button variant="soft" onClick={() => { setSelectedFacility(f); setStep(2); }}>{t("storage.select")}</Button> : <Button variant="outline" onClick={() => { setSelectedFacility(f); setStep(2); }}>{t("storage.view")}</Button>}</div></Card>)}</div><Demo>{t("storage.notLiveGps")}</Demo></Page>;
  }

  if (step === 2 && selectedFacility) {
    const f = selectedFacility;
    const upcomingListings = listings;
    const filteredCrops = cropSearch.trim() ? upcomingListings.filter((l) => { const name = cropDisplayName(l); return name.toLowerCase().includes(cropSearch.toLowerCase()); }) : upcomingListings;
    const qty = Number(quantityKg) || 0;
    const dur = Number(durationDays) || 0;
    const ratePerKgDay = parseFloat(f.rateKg.replace(/[^0-9.]/g, '')) || 0;
    const storageRent = round2(qty * ratePerKgDay * dur);
    const handling = round2(qty * 0.5);
    const insurance = round2(qty * 0.25);
    const totalCost = round2(storageRent + handling + insurance);
    const bags = Math.ceil(qty / 50);
    const quintals = (qty / 100).toFixed(2);
    const months = (dur / 30).toFixed(1);
    const cropName = selectedListing ? cropDisplayName(selectedListing) : (customCrop || '—');
    const varietyLabel = selectedListing ? cropDisplayVariety(selectedListing) : '';
    const qtyPresets = [100, 200, 500, 1000, 2500];
    const durPresets = [15, 30, 60, 90];
    const searchCropTiles = [
      { name: 'Onion', variety: 'Nasik Red', photo: cropPhotoFor('Onion') },
      { name: 'Paddy', variety: 'Sona Masoori', photo: cropPhotoFor('Paddy') },
      { name: 'Groundnut', variety: 'TMV-2', photo: cropPhotoFor('Groundnut') },
      { name: 'Red Chilli', variety: 'Teja', photo: cropPhotoFor('Red Chilli') },
      { name: 'Tomato', variety: 'Hybrid', photo: cropPhotoFor('Tomato') },
      { name: 'Potato', variety: 'Kufri Jyoti', photo: cropPhotoFor('Potato') },
      { name: 'Mustard', variety: 'Pusa Bold', photo: cropPhotoFor('Mustard') },
      { name: 'Maize', variety: 'DHM-117', photo: cropPhotoFor('Maize') },
    ];

    return <Page title="Book Storage Space" body={`${f.name} · ${f.tempRange} · ${f.location}`} back={() => { setStep(1); }} t={t}>
      {stepIndicator}

      <div className="book-topbar">
        <button className="book-back-link" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back to Storage Options</button>
        <span className="book-step-label">STEP 2: RESERVE BAY</span>
      </div>

      <Card className="book-facility-summary">
        <div className="book-facility-thumb"><img src={f.photo} alt={f.name} loading="lazy" /></div>
        <div className="book-facility-info">
          <h3 className="book-facility-name">{f.name}</h3>
          <p className="book-facility-sub">{f.tempRange} · {f.location}</p>
          {f.status === 'occupied' && <span className="book-facility-occupied"><span className="storage-row-dot" style={{ background: '#f59e0b' }}></span>Currently Occupied — viewing details only</span>}
        </div>
        <div className="book-facility-price">
          <strong>{f.rateKg}</strong>
          <small>Standard tariff</small>
        </div>
      </Card>

      <div className="book-section-header">
        <div>
          <h3 className="book-section-title">SELECT CROP FROM YOUR HARVEST CALENDAR</h3>
          <p className="book-section-sub">Tap any harvested crop card below to auto-fill crop variety & harvest weight</p>
        </div>
        <span className="book-autofill-pill"><Zap size={13} /> Quick Auto-Fill</span>
      </div>
      {loadingListings && <p className="calendar-empty">{t('crops.loading')}</p>}
      {!loadingListings && upcomingListings.length === 0 && <Card><p className="calendar-empty">No upcoming harvest entries found. Use the search below to pick a crop manually.</p></Card>}
      {!loadingListings && upcomingListings.length > 0 && <div className="book-harvest-row">{upcomingListings.map((l) => { const name = cropDisplayName(l); const variety = cropDisplayVariety(l); const isSelected = selectedListing?.id === l.id; return <Card key={l.id} className={`book-harvest-card${isSelected ? ' selected' : ''}`} onClick={() => { setSelectedListing(l); setCustomCrop(''); setQuantityKg(String(l.quantity_kg)); }}><div className="book-harvest-thumb"><img src={cropPhotoFor(name)} alt={name} loading="lazy" />{isSelected && <span className="book-harvest-check"><Check size={14} /></span>}</div><div className="book-harvest-body"><div className="row"><Badge tone="orange">Upcoming</Badge><strong>{formatPrice(l.indicative_price_per_kg)}</strong></div><h4>{name} · {variety}</h4><p>{formatKg(l.quantity_kg)} · {formatDate(l.expected_harvest_date)}</p></div><button className="book-harvest-arrow"><ArrowRight size={16} /></button></Card>; })}</div>}

      <div className="book-section-header" style={{ marginTop: 24 }}>
        <div>
          <h3 className="book-section-title">OR SEARCH ANY COMMODITY TO STORE</h3>
        </div>
        {cropName !== '—' && <span className="book-selected-tag">Selected: {cropName}{varietyLabel ? ' · ' + varietyLabel : ''}</span>}
      </div>
      <div className="book-search-wrap">
        <Search size={18} className="book-search-icon" />
        <input type="text" className="book-search-input" value={cropSearch} onChange={(e) => setCropSearch(e.target.value)} placeholder="Search crop name, variety, or grade (e.g. Onion, Chilli, Paddy, Potato, Maize...)" />
      </div>
      <div className="book-crop-tile-grid">
        {searchCropTiles.filter((c) => !cropSearch.trim() || c.name.toLowerCase().includes(cropSearch.toLowerCase()) || c.variety.toLowerCase().includes(cropSearch.toLowerCase())).map((c) => { const isSelected = customCrop === c.name && !selectedListing; return <button type="button" key={c.name} className={`book-crop-tile${isSelected ? ' selected' : ''}`} onClick={() => { setSelectedListing(null); setCustomCrop(c.name); }}><div className="book-crop-tile-photo"><img src={c.photo} alt={c.name} loading="lazy" /></div><div className="book-crop-tile-label"><strong>{c.name}</strong><small>{c.variety}</small></div></button>; })}
      </div>

      <div className="book-section-header" style={{ marginTop: 24 }}>
        <div>
          <h3 className="book-section-title">QUANTITY NUMBER SELECTION</h3>
        </div>
        {qty > 0 && <span className="book-live-conversion">≈ {bags} Bags (50kg) · {quintals} Qtl</span>}
      </div>
      <div className="book-number-row">
        <button type="button" className="book-number-btn" onClick={() => setQuantityKg(String(Math.max(0, (Number(quantityKg) || 0) - 50)))}><Minus size={20} /></button>
        <div className="book-number-display"><span className="book-number-value">{quantityKg || '0'}</span><span className="book-number-unit">kg</span></div>
        <button type="button" className="book-number-btn" onClick={() => setQuantityKg(String((Number(quantityKg) || 0) + 50))}><Plus size={20} /></button>
      </div>
      <div className="book-preset-row">{qtyPresets.map((v) => { const presetBags = Math.ceil(v / 50); const isSel = qty === v; return <button key={v} type="button" className={`book-preset-pill${isSel ? ' selected' : ''}`} onClick={() => setQuantityKg(String(v))}>{v} kg ({presetBags} bags)</button>; })}</div>

      <div className="book-section-header" style={{ marginTop: 24 }}>
        <div>
          <h3 className="book-section-title">STORAGE DURATION NUMBER SELECTION</h3>
        </div>
        {dur > 0 && <span className="book-live-conversion">{dur} Days (~{months} Months)</span>}
      </div>
      <div className="book-number-row">
        <button type="button" className="book-number-btn" onClick={() => setDurationDays(String(Math.max(0, (Number(durationDays) || 0) - 5)))}><Minus size={20} /></button>
        <div className="book-number-display"><span className="book-number-value">{durationDays || '0'}</span><span className="book-number-unit">days</span></div>
        <button type="button" className="book-number-btn" onClick={() => setDurationDays(String((Number(durationDays) || 0) + 5))}><Plus size={20} /></button>
      </div>
      <div className="book-preset-row">{durPresets.map((v) => { const label = v < 30 ? `${v} Days (2 Wks)` : `${v} Days (${v / 30} Mo)`; const isSel = dur === v; return <button key={v} type="button" className={`book-preset-pill${isSel ? ' selected' : ''}`} onClick={() => setDurationDays(String(v))}>{label}</button>; })}</div>

      {qty > 0 && dur > 0 && <Card className="book-cost-summary">
        <div className="book-cost-left">
          <span className="book-cost-label">ESTIMATED TOTAL STORAGE CHARGE</span>
          <p className="book-cost-detail">{formatKg(qty)} ({bags} bags) · {dur} days · {cropName}{varietyLabel ? ' · ' + varietyLabel : ''}</p>
        </div>
        <div className="book-cost-right">
          <strong className="book-cost-total">{formatRupee(totalCost)}</strong>
          <small className="book-cost-breakdown">Rent: {formatRupee(storageRent)} + Handling: {formatRupee(handling)} + Insurance: {formatRupee(insurance)}</small>
        </div>
      </Card>}

      <div style={{ marginTop: 20 }}>
        <Button icon={ShieldCheck} wide disabled={qty <= 0 || dur <= 0 || f.status === 'occupied'} onClick={() => { setStep(3); notify('Bay reservation confirmed. Gate pass issued.'); }}>Confirm Bay Reservation & Issue Gate Pass</Button>
      </div>
      {f.status === 'occupied' && <p className="book-occupied-note">This facility is currently occupied. Select an available facility to make a reservation.</p>}
    </Page>;
  }

  if (step === 3) {
    const f = selectedFacility;
    const cropName = selectedListing ? cropDisplayName(selectedListing) : (customCrop || 'Crop');
    const qty = Number(quantityKg) || 0;
    const bags = Math.ceil(qty / 50);
    const enwrNum = `eNWR-TS-WRG-${(hashStr((f?.name ?? '') + cropName) % 9000) + 1000}`;
    const chamberId = `CH-${(hashStr((f?.name ?? '') + 'chamber') % 90) + 10}`;
    const bayRack = `B${(hashStr((f?.name ?? '') + 'bay') % 50) + 1}/R${(hashStr((f?.name ?? '') + 'rack') % 20) + 1}`;
    const stageLabels = ['Space Reserved', 'Arrived & Weighed', 'In Safe Cold Bay', 'Mandi Dispatch'];
    const stageToasts = ['Produce arrived at facility. Weighing in progress.', 'Weighment complete. Produce moved to cold bay.', 'Produce safely stored in climate-controlled bay. Ready for dispatch.', 'Dispatched to APMC Mandi. Truck en route.'];

    return <Page title="My Stored Produce" body="Your consignment is being tracked" back={() => { setStep(1); }} t={t}>{stepIndicator}
      <div className="consignment-card" style={{ background: '#16382b', borderRadius: 16, padding: 20, color: '#fff', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <span className="badge green" style={{ marginBottom: 8, display: 'inline-block' }}>Active Cold Consignment</span>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '4px 0 2px' }}>{f?.name ?? 'Storage Facility'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0 }}>{f?.tempRange} · {f?.location}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, display: 'block' }}>e-NWR Pass</small>
            <strong style={{ color: '#fff', fontSize: 15, fontFamily: 'monospace', letterSpacing: 0.5 }}>{enwrNum}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div><small style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Chamber</small><p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: 13 }}>{chamberId}</p></div>
          <div><small style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Bay / Rack</small><p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: 13 }}>{bayRack}</p></div>
          <div><small style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Duration</small><p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: 13 }}>{durationDays || '—'} days</p></div>
        </div>
      </div>

      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
        <Card className="stat-card-mini"><Warehouse size={20} /><h3 style={{ fontSize: 18, fontWeight: 700 }}>{f?.tempRange ?? '—'}</h3><p>Bay Temperature</p></Card>
        <Card className="stat-card-mini"><Package size={20} /><h3 style={{ fontSize: 18, fontWeight: 700 }}>{formatKg(qty)}</h3><p>{bags} bags</p></Card>
        <Card className="stat-card-mini"><Sprout size={20} /><h3 style={{ fontSize: 16, fontWeight: 700 }}>{cropName}</h3><p>Commodity</p></Card>
      </div>

      <Card className="payment-card">
        <h3 style={{ marginBottom: 12 }}>Consignment Tracker</h3>
        <div className="order-track" style={{ marginBottom: 16 }}>
          {stageLabels.map((label, i) => <span key={label} className={i < consignmentStage ? 'done' : i === consignmentStage ? 'active' : ''}>{label}</span>)}
        </div>
        <Button icon={Check} disabled={consignmentStage >= 3} onClick={() => { const next = consignmentStage + 1; setConsignmentStage(next); notify(stageToasts[next - 1] ?? stageToasts[2]); }}>Next Stage</Button>
      </Card>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}><div style={{ flex: 1, minWidth: 180 }}><Button icon={Truck} onClick={() => { notify('Truck dispatched to APMC Mandi. Live tracking enabled.'); open('journey'); }}>Dispatch to APMC Mandi via Truck</Button></div><div style={{ flex: 1, minWidth: 180 }}><a href="tel:+919876543210" style={{ textDecoration: 'none' }}><Button variant="outline" icon={Phone} wide>Call Cold Store Manager</Button></a></div></div>

      <div style={{ marginTop: 16 }}><Demo>Demo reservation — no real booking made</Demo></div>
      <div style={{ marginTop: 12 }}><Button variant="soft" onClick={() => { setStep(1); setSelectedFacility(null); setSelectedListing(null); setQuantityKg(''); setDurationDays(''); setCustomCrop(''); setConsignmentStage(0); }}>Book Another Storage</Button></div>
    </Page>;
  }

  return <Page title={t('storage.title')} body={t('storage.body')} back={() => open('home')} t={t}>{stepIndicator}<div className="storage-list">{storageFacilities.map((f) => <Card className="storage-row-card" key={f.name}><div className="storage-row-thumb"><img src={f.photo} alt={f.name} loading="lazy" /><span className="storage-row-temp">{f.tempLabel}</span></div><div className="storage-row-info"><div className="storage-row-top"><span className={'storage-row-status ' + f.status}><span className="storage-row-dot"></span>{f.status === 'available' ? 'Available Space' : 'Occupied'}</span><span className="storage-row-distance">{f.distance}</span></div><h3 className="storage-row-name">{f.name}</h3><p className="storage-row-detail">{f.tempRange} · {f.capacity} capacity</p><p className="storage-row-detail">{f.location} · Ideal for {f.crops}</p></div><div className="storage-row-right"><strong className="storage-row-rate">{f.rateKg}</strong><small className="storage-row-rate-sub">{f.rateQtl}</small></div></Card>)}</div></Page>;
}

function ApprovalsView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) {
  const [group, setGroup] = useState<'Current' | 'Previous'>('Current');
  const [enwrModal, setEnwrModal] = useState<SpEnwrReceipt | null>(null);
  const current = spCurrentApprovals;
  const previous = spPreviousApprovals;
  const approvals = group === 'Current' ? current : previous;
  return <main className="dedicated-page">
    <div className="sp-workspace">
      <div className="sp-topbar">
        <button className="back-button" onClick={() => open('home')}><ArrowLeft size={18} /> Back to Home</button>
      </div>
      <div className="sp-breadcrumb"><span><Building2 size={12} /> Storage Provider</span> <ChevronRight size={12} /> <span>My Approvals</span></div>
      <div className="sp-facility-bar">
        <div className="sp-facility-icon"><Warehouse size={24} /></div>
        <div>
          <h2>Krishna Cold Storage</h2>
          <p>Warangal, Telangana</p>
        </div>
        <div className="sp-facility-license">
          <small>Active Vaults</small>
          <strong>{current.length}</strong>
        </div>
      </div>
      <div className="sp-subtabs">
        <button onClick={() => open('storage')}><Package size={15} /> Storage Requests</button>
        <button className="selected"><FileCheck2 size={15} /> My Approvals <span className="sp-tab-badge">{current.length}</span></button>
      </div>
      <div className="sp-segmented">
        <button className={group === 'Current' ? 'selected' : ''} onClick={() => setGroup('Current')}><Warehouse size={15} /> Current · {current.length}</button>
        <button className={group === 'Previous' ? 'selected' : ''} onClick={() => setGroup('Previous')}><CheckCircle2 size={15} /> Previous · {previous.length}</button>
      </div>
      {approvals.length === 0 && <p className="sp-empty">{group === 'Current' ? 'No active vault entries.' : 'No previous approvals.'}</p>}
      {approvals.map((a) => <div className="sp-approval-card" key={a.enwrId}>
        <div className="sp-approval-top">
          <div>
            <div className="row" style={{ marginBottom: 6 }}>
              <Badge tone={a.status === 'in-vault' ? 'green' : 'blue'}>{a.status === 'in-vault' ? 'In Vault' : 'Released & Settled'}</Badge>
            </div>
            <p className="sp-approval-farmer">{a.farmerName}</p>
            <p className="sp-approval-crop">{a.cropName} · {a.variety}</p>
          </div>
        </div>
        <div className="sp-approval-meta">
          <Detail label="Deposit Date" value={a.depositDate} />
          <Detail label="Chamber / Bay" value={`${a.chamber} · ${a.bay}`} />
          {a.status === 'in-vault' ? <>
            <Detail label="Cold-Chain" value={`${a.temp} · ${a.humidity}`} />
            <Detail label="Gate Pass No" value={a.gatePassNo} />
            <Detail label="e-NWR ID" value={a.enwrId} />
            <Detail label="Net Weight" value={formatKg(a.netWeightKg)} />
          </> : <>
            <Detail label="Release Date" value={a.releaseDate ?? '—'} />
            <Detail label="Total Weight" value={formatKg(a.netWeightKg)} />
            <Detail label="Gate Exit Pass" value={a.gatePassNo} />
            <Detail label="Final Earnings" value={formatRupee(a.finalEarnings ?? 0)} />
          </>}
        </div>
        {a.status === 'in-vault' && <div className="sp-approval-chain"><Snowflake size={14} /> <span>{a.temp} · {a.humidity} — Climate-controlled vault active</span></div>}
        <div className="sp-approval-actions">
          <Button variant="soft" icon={FileCheck2} onClick={() => setEnwrModal(a)}>{a.status === 'in-vault' ? 'e-Receipt / Gate Pass' : 'View Gate Pass'}</Button>
        </div>
      </div>)}
    </div>
    {enwrModal && <SpEnwrModal receipt={enwrModal} onClose={() => setEnwrModal(null)} notify={notify} />}
  </main>;
}

function FpoView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('fpo.title')} body={t('fpo.body')} back={() => open('home')} t={t}><div className="fpo-list"><Card className="fpo-row"><Illustration label={t('role.FPO')} color="teal" icon={Users} /><div><Badge tone="green">{t('transport.demoVerified')}</Badge><h3>Warangal Farmers FPO</h3><p>{t('fpo.cooperative')}</p><Button variant="soft" onClick={() => notify(t('fpo.connectOpened'))}>{t('fpo.viewFpo')}</Button></div></Card><Card className="fpo-row"><Illustration label={t('role.FPO')} color="blue" icon={Users} /><div><Badge tone="blue">{t('fpo.sampleProfile')}</Badge><h3>Hanamkonda Growers FPO</h3><p>{t('fpo.society')}</p><Button variant="soft" onClick={() => notify(t('fpo.connectOpened'))}>{t('fpo.viewFpo')}</Button></div></Card></div></Page>; }

type TutorialRole = 'Farmer' | 'Transport Provider' | 'Storage Provider' | 'Buyer';
type TutorialVideo = { title: string; duration: string; badge: string; subtitle: string; action?: string; actionView?: View; thumbnail: string; summary: string; transcript: string };
type TutorialRoleData = { subtitle: string; filters: string[]; videos: TutorialVideo[] };

const tutorialData: Record<TutorialRole, TutorialRoleData> = {
  Farmer: {
    subtitle: 'Farmer-specific guidance with transcript and text fallback.',
    filters: ['All', 'Harvest Planning', 'Crop Pre-Booking', 'Storage & Godowns', 'Farmgate Transport', 'Mandi Rates', 'Telugu Audio', 'Hindi Audio'],
    videos: [
      { title: 'Add an upcoming crop', duration: '2:15', badge: '🌱 CROP SOWING', subtitle: '2 min guide · Voice audio ready', action: 'Open Harvest Calendar', actionView: 'calendar', thumbnail: 'https://images.pexels.com/photos/11573790/pexels-photo-11573790.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Learn how to add an upcoming crop to your harvest calendar, including selecting crop type, quantity, expected harvest date, and field area.', transcript: 'Step 1: Open Harvest Calendar from your home screen. Step 2: Tap Add Crop button at the bottom. Step 3: Select your crop from the list, for example Tomato. Step 4: Enter the total quantity in kilograms you expect to harvest. Step 5: Choose the expected harvest date from the calendar. Step 6: Enter your field area in acres for verification. Step 7: Tap Save to publish your crop listing. Buyers can now see your upcoming crop and pre-book it.' },
      { title: 'Pre-booking for farmers', duration: '2:40', badge: '🤝 MANDI TOKEN', subtitle: '2 min guide · Voice audio ready', action: 'Compare Mandi Rates', actionView: 'market', thumbnail: 'https://images.pexels.com/photos/5622309/pexels-photo-5622309.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Understand how pre-booking works for farmers, including mandi token payments, price comparison, and confirming buyer orders.', transcript: 'Step 1: Open Compare Mandi Rates from your home screen. Step 2: Check the current mandi prices for your crop. Step 3: When a buyer pre-books your crop, you receive a notification. Step 4: Review the buyer offer and quantity requested. Step 5: Confirm the order to lock in the price. Step 6: The buyer pays a token amount as commitment. Step 7: You will see the booking in your orders list with balance payment details.' },
      { title: 'Find storage', duration: '2:25', badge: '🏢 COLD STORAGE', subtitle: '2 min guide · Voice audio ready', action: 'Explore Storage Facilities', actionView: 'storage', thumbnail: 'https://images.pexels.com/photos/1267327/pexels-photo-1267327.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Discover how to find cold storage and godowns near you, check availability, and submit a storage request for your harvested crop.', transcript: 'Step 1: Open Explore Storage Facilities from your home screen. Step 2: Browse available storage providers in your area. Step 3: Check the capacity, temperature range, and rates. Step 4: Tap on a storage provider to see details. Step 5: Submit a storage request with your crop type and quantity. Step 6: The storage provider will review and approve your request. Step 7: You will receive a confirmation with bay allocation details.' },
      { title: 'Book transport', duration: '2:35', badge: '🚚 FARMGATE TRUCK', subtitle: '2 min guide · Voice audio ready', action: 'Open Farmgate Transport', actionView: 'transport-options', thumbnail: 'https://images.pexels.com/photos/20922619/pexels-photo-20922619.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Learn how to book farmgate transport for your harvested crop, including selecting truck type, comparing rates, and tracking delivery.', transcript: 'Step 1: Open Farmgate Transport from your home screen. Step 2: Enter your pickup location and destination. Step 3: Select the truck type based on your crop quantity. Step 4: Compare transport rates from available providers. Step 5: Confirm your booking with the preferred transport provider. Step 6: Track your shipment in real-time on the live map. Step 7: Confirm delivery completion once the crop reaches the buyer.' },
      { title: 'Compare mandi prices', duration: '2:10', badge: '⚖️ APMC RATES', subtitle: '2 min guide · Voice audio ready', action: 'Compare Mandi Rates', actionView: 'market', thumbnail: 'https://images.pexels.com/photos/17161099/pexels-photo-17161099.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'See how to compare live mandi prices across markets, understand price trends, and make informed selling decisions.', transcript: 'Step 1: Open Compare Mandi Rates from your home screen. Step 2: View the list of crops with current mandi prices. Step 3: Tap on your crop to see detailed price trends. Step 4: Compare prices across different mandis like Kolar, Lasalgaon, and your local market. Step 5: Check the price change indicators for trends. Step 6: Use this information to decide the best time to sell. Step 7: You can also see the indicative price for your listed crops.' },
      { title: 'Track live transport', duration: '1:55', badge: '📍 LIVE GPS ROUTE', subtitle: '2 min guide · Voice audio ready', action: 'Track Active Transport', actionView: 'journey', thumbnail: 'https://images.pexels.com/photos/6169859/pexels-photo-6169859.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Find out how to track your active transport in real-time, view trip milestones, and confirm delivery completion.', transcript: 'Step 1: Open Track Active Transport from your home screen. Step 2: View the live GPS map showing your shipment location. Step 3: Check the trip milestones like pickup, transit, and delivery. Step 4: See the estimated time of arrival at the destination. Step 5: Contact the transport provider directly if needed. Step 6: Confirm delivery once the crop reaches the buyer. Step 7: Rate your transport experience for future reference.' },
    ],
  },
  'Transport Provider': {
    subtitle: 'Transport Provider-specific guidance with transcript and text fallback.',
    filters: ['All', 'Dispatch & Loads', 'Navigation', 'Trip Milestones', 'Payouts'],
    videos: [
      { title: 'Review a request', duration: '2:10', badge: '📋 NEW REQUEST', subtitle: '2 min guide · Voice audio ready', action: 'View Orders', actionView: 'orders', thumbnail: 'https://images.pexels.com/photos/8730901/pexels-photo-8730901.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Learn how to review incoming transport requests, check pickup and delivery details, and evaluate crop quantities before accepting.', transcript: 'Step 1: Open View Orders from your home screen. Step 2: Review the new transport request showing pickup location, destination, and crop quantity. Step 3: Check the distance and estimated payout. Step 4: Verify the pickup date and time window. Step 5: Review the buyer and farmer details. Step 6: Decide whether to accept or decline the request. Step 7: Tap Accept to proceed with the trip.' },
      { title: 'Accept an order', duration: '2:20', badge: '✅ ACCEPT TRIP', subtitle: '2 min guide · Voice audio ready', action: 'View Orders', actionView: 'orders', thumbnail: 'https://images.pexels.com/photos/11412596/pexels-photo-11412596.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'See how to accept a transport order, confirm pickup details, and start preparing for the trip.', transcript: 'Step 1: Open View Orders from your home screen. Step 2: Tap on the request you want to accept. Step 3: Review all trip details including crop type, quantity, and route. Step 4: Tap Accept Trip to confirm. Step 5: The farmer and buyer will be notified of your acceptance. Step 6: Check the pickup location on the map. Step 7: Prepare your truck for the scheduled pickup time.' },
      { title: 'Start Journey', duration: '2:05', badge: '🚀 START TRIP', subtitle: '2 min guide · Voice audio ready', action: 'Open Live Journey', actionView: 'journey', thumbnail: 'https://images.pexels.com/photos/20922619/pexels-photo-20922619.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Learn how to start your journey, mark trip milestones, and keep the farmer and buyer updated on your progress.', transcript: 'Step 1: Open Live Journey from your home screen. Step 2: Tap Start Trip when you are ready to depart from the pickup location. Step 3: Confirm that the crop is loaded in your truck. Step 4: The live GPS tracking begins automatically. Step 5: Mark milestones like loaded, in transit, and approaching destination. Step 6: The farmer and buyer can see your live location. Step 7: Navigate to the delivery point using the map.' },
      { title: 'Complete delivery', duration: '2:30', badge: '🏁 UNLOADED', subtitle: '2 min guide · Voice audio ready', action: 'Open Live Journey', actionView: 'journey', thumbnail: 'https://images.pexels.com/photos/6169007/pexels-photo-6169007.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Find out how to complete a delivery, confirm unloading, and receive your payout for the transport trip.', transcript: 'Step 1: Open Live Journey from your home screen. Step 2: Arrive at the delivery destination. Step 3: Tap Mark as Delivered to confirm arrival. Step 4: Confirm that the crop has been unloaded by the buyer. Step 5: The buyer confirms receipt of the crop. Step 6: Your payout is calculated based on distance and quantity. Step 7: Check your earnings in the orders summary.' },
    ],
  },
  'Storage Provider': {
    subtitle: 'Storage Provider-specific guidance with transcript and text fallback.',
    filters: ['All', 'Chamber Intake', 'Approvals', 'Rate Cards', 'WDRA Receipts'],
    videos: [
      { title: 'Review a storage request', duration: '2:15', badge: '🔍 LOT INSPECTION', subtitle: '2 min guide · Voice audio ready', action: 'View Storage Requests', actionView: 'storage', thumbnail: 'https://images.pexels.com/photos/8730901/pexels-photo-8730901.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Learn how to review incoming storage requests, inspect crop lots, and verify farmer details before approval.', transcript: 'Step 1: Open Storage Requests from your home screen. Step 2: Review the new storage request showing crop type, quantity, and duration. Step 3: Check the farmer details and verification status. Step 4: Inspect the crop lot for quality and packaging. Step 5: Verify the storage duration and temperature requirements. Step 6: Decide whether to approve or decline the request. Step 7: Tap Approve to allocate a storage bay.' },
      { title: 'Approve storage', duration: '2:20', badge: '✅ BAY ALLOCATED', subtitle: '2 min guide · Voice audio ready', action: 'View Approvals', actionView: 'approvals', thumbnail: 'https://images.pexels.com/photos/11412596/pexels-photo-11412596.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'See how to approve a storage request, allocate a bay, and issue a WDRA receipt to the farmer.', transcript: 'Step 1: Open View Approvals from your home screen. Step 2: Tap on the pending storage request to review. Step 3: Verify all details including crop type, quantity, and duration. Step 4: Allocate an available storage bay from your capacity. Step 5: Tap Approve Storage to confirm the allocation. Step 6: A WDRA receipt is automatically generated for the farmer. Step 7: The farmer is notified with bay details and storage start date.' },
      { title: 'Update a listing', duration: '2:05', badge: '🏢 CAPACITY UPDATE', subtitle: '2 min guide · Voice audio ready', action: 'View Storage Requests', actionView: 'storage', thumbnail: 'https://images.pexels.com/photos/4481327/pexels-photo-4481327.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Find out how to update your storage facility listing, manage capacity, and adjust rate cards for different crop types.', transcript: 'Step 1: Open Storage Requests from your home screen. Step 2: Tap on your facility listing to edit. Step 3: Update the available capacity in quintals or kilograms. Step 4: Adjust the rate card for different temperature zones. Step 5: Add or remove supported crop types. Step 6: Update contact information and service hours. Step 7: Save changes to update your public listing for farmers.' },
      { title: 'Check earnings', duration: '2:10', badge: '💰 REVENUE', subtitle: '2 min guide · Voice audio ready', action: 'View Summary', actionView: 'features', thumbnail: 'https://images.pexels.com/photos/7459470/pexels-photo-7459470.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Learn how to check your storage facility earnings, review revenue history, and track payment status.', transcript: 'Step 1: Open Main Summary from your home screen. Step 2: View your total earnings displayed at the top. Step 3: Check the active storage orders and their payment status. Step 4: Review completed storage contracts and revenue history. Step 5: See pending payments from farmers and buyers. Step 6: Tap on any order for detailed payment information. Step 7: Export or share your earnings summary if needed.' },
    ],
  },
  Buyer: {
    subtitle: 'Buyer-specific guidance with transcript and text fallback.',
    filters: ['All', 'Crop Sourcing', 'Pre-Booking', 'Escrow Payments', 'Tracking'],
    videos: [
      { title: 'Explore crops', duration: '2:15', badge: '🌾 FRESH CROPS', subtitle: '2 min guide · Voice audio ready', action: 'Explore Crops', actionView: 'market', thumbnail: 'https://images.pexels.com/photos/4975357/pexels-photo-4975357.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Discover how to explore available crops on the market, filter by type and location, and compare prices from different farmers.', transcript: 'Step 1: Open Explore Crops from your home screen. Step 2: Browse the list of available crops with photos and prices. Step 3: Use filters to narrow down by crop type, quantity, or location. Step 4: Tap on a crop to see detailed information including variety, harvest date, and farmer details. Step 5: Check the FarmEye verification status for quality assurance. Step 6: Compare prices across different listings. Step 7: Shortlist crops you are interested in pre-booking.' },
      { title: 'Pre-book a crop', duration: '2:30', badge: '🤝 BUY CONTRACT', subtitle: '2 min guide · Voice audio ready', action: 'Explore Crops', actionView: 'market', thumbnail: 'https://images.pexels.com/photos/5622374/pexels-photo-5622374.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Learn how to pre-book a crop, pay a token amount, and secure your purchase contract with the farmer.', transcript: 'Step 1: Open Explore Crops from your home screen. Step 2: Select the crop you want to pre-book. Step 3: Review the crop details, quantity, and price per kilogram. Step 4: Enter the quantity you want to book. Step 5: Tap Pre-book to initiate the booking. Step 6: Pay the token amount to secure your contract. Step 7: The farmer will confirm your booking and you will see it in your orders list.' },
      { title: 'Pay Balance Amount', duration: '2:20', badge: '💳 ESCROW RELEASE', subtitle: '2 min guide · Voice audio ready', action: 'View Deals', actionView: 'deals', thumbnail: 'https://images.pexels.com/photos/50987/money-card-business-credit-card-50987.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'See how to pay the balance amount for your pre-booked crop, complete the escrow release, and finalize the transaction.', transcript: 'Step 1: Open View Deals from your home screen. Step 2: Find your pre-booked crop with a pending balance payment. Step 3: Review the total amount, token paid, and balance due. Step 4: Tap Pay Balance to proceed with the payment. Step 5: Confirm the payment amount and method. Step 6: The escrow is released to the farmer upon confirmation. Step 7: Your order status updates to completed and the crop is ready for delivery.' },
      { title: 'Track an order', duration: '2:05', badge: '🚚 INBOUND TRUCK', subtitle: '2 min guide · Voice audio ready', action: 'View Orders', actionView: 'orders', thumbnail: 'https://images.pexels.com/photos/20922619/pexels-photo-20922619.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', summary: 'Find out how to track your incoming crop order, view live transport status, and confirm delivery receipt.', transcript: 'Step 1: Open View Orders from your home screen. Step 2: Find your active order in the Current tab. Step 3: View the order status tracking from booked to delivered. Step 4: Tap View Map to see the live transport location. Step 5: Check the estimated delivery time. Step 6: Contact the transport provider if needed. Step 7: Confirm delivery receipt once the crop arrives at your location.' },
    ],
  },
};

const tutorialRoles: TutorialRole[] = ['Farmer', 'Transport Provider', 'Storage Provider', 'Buyer'];

function TutorialsView({ role, open, t, voiceOpen, language }: { role: Role; open: (view: View) => void; t: T; voiceOpen: () => void; language: Language }) {
  const activeRole: TutorialRole = tutorialRoles.includes(role as TutorialRole) ? (role as TutorialRole) : 'Farmer';
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(null);

  const data = tutorialData[activeRole];

  const filtered = data.videos.filter((v) => {
    if (search.trim() && !v.title.toLowerCase().includes(search.toLowerCase().trim())) return false;
    return true;
  });

  return <main className="dedicated-page tutorials-page">
    <button className="back-button" onClick={() => open('home')}><ArrowLeft size={18} /> {t('common.back')}</button>
    <div className="tutorials-header">
      <div className="tutorials-header-left">
        <h1>Tutorials</h1>
        <p>{data.subtitle}</p>
      </div>
      <button className="tutorials-voice-help" onClick={voiceOpen}><Headphones size={18} /> Voice Help</button>
    </div>

    <div className="tutorials-search">
      <Search size={18} />
      <input type="text" placeholder="Search tutorials..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {search && <button className="tutorials-search-clear" onClick={() => setSearch('')}><X size={18} /></button>}
    </div>

    <div className="tutorials-filters">
      {data.filters.map((f) => <button key={f} className={`tutorial-chip ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>)}
    </div>

    <div className="tutorials-grid">
      {filtered.length === 0 && <p className="calendar-empty">No tutorials found.</p>}
      {filtered.map((video) => <div className="tutorial-card" key={video.title} onClick={() => setSelectedVideo(video)}>
        <div className="tutorial-thumb-wrap">
          <img src={video.thumbnail} alt={video.title} className="tutorial-thumb" loading="lazy" />
          <span className="tutorial-emoji-badge">{video.badge}</span>
          <span className="tutorial-duration">{video.duration}</span>
          <button className="tutorial-listen-btn" onClick={(e) => { e.stopPropagation(); voiceOpen(); }} aria-label="Listen"><Volume2 size={16} /> Listen</button>
          <div className="tutorial-play-overlay"><div className="tutorial-play-icon"><Play size={32} /></div></div>
        </div>
        <div className="tutorial-card-body">
          <h3>{video.title}</h3>
          <p>{video.subtitle}</p>
        </div>
      </div>)}
    </div>

    <div className="tutorials-footer">
      <Demo>{t('tutorials.guidanceOnly')}</Demo>
    </div>

    {selectedVideo && <TutorialWatchModal video={selectedVideo} close={() => setSelectedVideo(null)} open={open} t={t} language={language} />}
  </main>;
}

function TutorialWatchModal({ video, close, open, t, language }: { video: TutorialVideo; close: () => void; open: (view: View) => void; t: T; language: Language }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [narrating, setNarrating] = useState(false);

  const totalSec = (() => { const [m, s] = video.duration.split(':').map(Number); return (m || 0) * 60 + (s || 0); })();
  const elapsedSec = Math.floor((progress / 100) * totalSec);
  const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  const togglePlay = () => setPlaying((p) => !p);

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgress(Number(e.target.value));
  };

  const narrate = () => {
    if (narrating) { window.speechSynthesis.cancel(); setNarrating(false); return; }
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setNarrating(true);
    const text = `${video.title}. ${video.summary}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.85;
    const code = langCode(language);
    utter.lang = code === 'te' ? 'te-IN' : code === 'hi' ? 'hi-IN' : 'en-IN';
    utter.onend = () => setNarrating(false);
    utter.onerror = () => setNarrating(false);
    window.speechSynthesis.speak(utter);
  };

  const handleAction = () => {
    window.speechSynthesis.cancel();
    close();
    if (video.actionView) open(video.actionView);
  };

  return <div className="modal-backdrop" onClick={close}>
    <div className="tutorial-watch-modal" onClick={(e) => e.stopPropagation()}>
      <div className="tutorial-watch-head">
        <div>
          <span className="tutorial-watch-badge">{video.badge}</span>
          <h2>{video.title}</h2>
        </div>
        <button className="icon-button" onClick={close}><X size={20} /></button>
      </div>

      <div className="tutorial-player">
        <img src={video.thumbnail} alt={video.title} className="tutorial-player-frame" loading="lazy" />
        <div className="tutorial-player-overlay">
          <button className="tutorial-player-play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={36} /> : <Play size={36} />}
          </button>
        </div>
        <div className="tutorial-player-controls">
          <button className="tutorial-ctrl-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <span className="tutorial-time">{fmtTime(elapsedSec)}</span>
          <input type="range" min="0" max="100" value={progress} onChange={handleScrub} className="tutorial-scrub" />
          <span className="tutorial-time">{video.duration}</span>
          <button className="tutorial-ctrl-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      <div className="tutorial-watch-actions">
        <button className={`tutorial-narrate-btn ${narrating ? 'active' : ''}`} onClick={narrate}>
          <Volume2 size={18} /> {narrating ? 'Stop Narration' : 'Narrate in ' + language}
        </button>
        {video.action && video.actionView && (
          <button className="tutorial-action-btn" onClick={handleAction}>
            <ArrowRight size={18} /> {video.action}
          </button>
        )}
      </div>

      <div className="tutorial-watch-text">
        <div className="tutorial-watch-summary">
          <h3>Summary</h3>
          <p>{video.summary}</p>
        </div>
        <div className="tutorial-watch-transcript">
          <h3>Full Transcript</h3>
          <p>{video.transcript}</p>
        </div>
      </div>
    </div>
  </div>;
}
function HelpView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('help.title')} body={t('help.body')} back={() => open('home')} t={t}><div className="help-list"><FeatureCard title={t('help.talkToSupport')} body={t('help.talkToSupport.body')} icon={Phone} color="blue" onClick={() => notify(t('help.phonePreview'))} /><FeatureCard title={t('help.raiseDispute')} body={t('help.raiseDispute.body')} icon={AlertTriangle} color="orange" onClick={() => open('dispute')} /><FeatureCard title={t('help.openGuidance')} body={t('help.openGuidance.body')} icon={BookOpen} color="teal" onClick={() => open('tutorials')} /></div></Page>; }
function DisputeView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('dispute.title')} body={t('dispute.body')} back={() => open('help')} t={t}><Card className="form-card"><label>{t('dispute.orderOrCrop')}<input placeholder="Tomato · 40 kg" /></label><label>{t('dispute.whatHappened')}<textarea placeholder={t('dispute.describeProblem')} /></label><label>{t('dispute.preferredNextStep')}<select><option>{t('dispute.reviewShortage')}</option><option>{t('dispute.replacementBuyer')}</option><option>{t('dispute.reviewPayment')}</option></select></label><Button icon={AlertTriangle} onClick={() => notify(t('dispute.submitted'))}>{t('dispute.submit')}</Button></Card><Notice tone="warning"><strong>{t('dispute.shortageTitle')}</strong><p>{t('dispute.shortageBody')}</p></Notice></Page>; }

function ProfileView({ role, open, language, setLanguage, buyerCategory, signOut, addAccount, t, profileData }: { role: Role; open: (view: View) => void; language: Language; setLanguage: (language: Language) => void; buyerCategory: string; signOut: () => void; addAccount: () => void; t: T; profileData?: Profile | null }) { return <Page title={t('profile.title')} body={t('profile.body')} back={() => open('home')} t={t}><Card className="profile-card"><span className={`profile-avatar ${roleMeta[role].color}`}>{roleMeta[role].initials}</span><div><Badge tone="green">{t('profile.demoVerified')}</Badge><h2>{role === 'Farmer' ? (profileData?.display_name ?? 'Ramesh Kumar') : role === 'Buyer' ? 'Venkat Reddy' : roleMeta[role].illustration}</h2><p>{role === 'Farmer' ? (profileData?.home_location ?? roleMeta[role].location) : roleMeta[role].location}</p></div></Card>{role === 'Farmer' && <><SectionHeading title={t('profile.farmerVerification')} body={t('profile.farmerVerificationBody')} icon={FileCheck2} /><div className="detail-grid"><Detail label={t('profile.farmerCategory')} value={profileData?.farmer_category ?? t('login.landOwner')} /><Detail label={t('profile.govVerification')} value={t('profile.pmKisan')} /><Detail label={t('profile.verificationDoc')} value={t('profile.aadhaarLinked')} /><Detail label={t('profile.landOwnership')} value={t('profile.landDetails')} /><Detail label={t('profile.cropsCultivated')} value="Tomato, Onion, Paddy" /><Detail label={t('profile.quantityHarvested')} value={t('profile.sampleQuantity')} /></div></>}{role === 'Buyer' && <><SectionHeading title={t('profile.buyerVerification')} body={t('profile.buyerVerificationBody')} icon={FileCheck2} /><div className="detail-grid"><Detail label={t('profile.buyerCategory')} value={buyerCategory} /><Detail label={t('profile.mobileNumber')} value="+91 98765 43210" /><Detail label={t('profile.googleAccount')} value="venkat@example.com" /><Detail label={t('profile.completeAddress')} value="Warangal Market Road, Telangana" /><Detail label={t('profile.blockArea')} value="Hanamkonda · Near Rythu Bazaar" /><Detail label={t('profile.buyerRating')} value={t('profile.demoRating')} /></div></>}{(role === 'FPO' || role === 'Storage Provider' || role === 'Transport Provider') && <div className="detail-grid"><Detail label={t('profile.organisation')} value={roleMeta[role].illustration} /><Detail label={t('profile.verification')} value={t('profile.permitReview')} /><Detail label={t('profile.contact')} value="+91 98765 43210 · sample@example.com" /><Detail label={t('profile.serviceArea')} value="Warangal, Karimnagar, Hyderabad" /></div>}<Card className="settings-card" onClick={() => open('settings')}><Settings size={22} /><div><h3>{t('profile.settings')}</h3><p>{t('profile.settingsBody')}</p></div><ArrowRight size={18} /></Card><div className="profile-actions"><Button variant="soft" onClick={addAccount}>{t('profile.addAccount')}</Button><Button variant="outline" onClick={signOut}>{t('profile.signOut')}</Button></div></Page>; }
function SettingsView({ open, language, setLanguage, t }: { open: (view: View) => void; language: Language; setLanguage: (language: Language) => void; t: T }) { return <Page title={t('settings.title')} body={t('settings.body')} back={() => open('profile')} t={t}><Card className="settings-card large"><Settings size={22} /><div><h3>{t('settings.language')}</h3><p>{t('settings.languageBody')}</p><div className="language-options"><LanguagePicker value={language} setValue={setLanguage} t={t} /></div></div></Card><Card className="settings-card large"><Headphones size={22} /><div><h3>{t('settings.voiceAssistant')}</h3><p>{t('settings.voiceBody')}</p></div><span className="toggle on" /></Card></Page>; }

function orderEtaDate(order: OrderRow): string {
  const booked = new Date(order.booked_at);
  booked.setDate(booked.getDate() + 2 + (hashStr(order.id) % 3));
  return booked.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function orderPlacedDate(order: OrderRow): string {
  return new Date(order.booked_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function orderShortId(order: OrderRow): string {
  return 'ORD-TS-' + (hashStr(order.id) % 9000 + 1000);
}

function orderIsTransit(order: OrderRow): boolean {
  return ['Booked', 'Farmer Confirmed', 'Assured Deal', 'Ready', 'In Transit'].includes(order.status);
}

function orderDriverInfo(order: OrderRow): { name: string; phone: string; vehicle: string; eWayBill: string } {
  const drivers = [
    { name: 'Mallikarjun', phone: '+91 90000 12345', vehicle: 'TS 09 UV 2468' },
    { name: 'Venkatesh', phone: '+91 90000 67890', vehicle: 'AP 02 TR 7788' },
    { name: 'Somaiah', phone: '+91 90000 33445', vehicle: 'TS 07 PQ 1122' },
    { name: 'Ravi Kumar', phone: '+91 90000 77889', vehicle: 'AP 16 KL 5566' },
  ];
  const idx = hashStr(order.id) % drivers.length;
  const d = drivers[idx];
  return { ...d, eWayBill: 'EWB-' + (hashStr(order.id + 'ewb') % 90000 + 10000) };
}

function orderFarmerInfo(order: OrderRow): { name: string; village: string; phone: string } {
  const farmerNames = ['Ramesh Kumar', 'Lakshmi Devi', 'Suresh Reddy', 'Anjali Rao', 'Pochamma'];
  const villages = ['Pembarthy', 'Hasanparthy', 'Geesukonda', 'Nekkonda', 'Atmakur'];
  const phones = ['+91 98765 43210', '+91 98765 12345', '+91 98765 56789', '+91 98765 67890', '+91 98765 78901'];
  const idx = hashStr(order.listing?.owner_id ?? order.id) % 5;
  return { name: farmerNames[idx], village: villages[idx], phone: phones[idx] };
}

const orderMilestones = ['Farmgate Loading', 'En Route Highway', 'APMC Weighbridge', 'Unloading Bay & Escrow'];

function OrderPreviewModal({ order, onClose, notify, t }: { order: OrderRow; onClose: () => void; notify: (msg: string) => void; t: T }) {
  const [tab, setTab] = useState<'track' | 'crop' | 'billing'>('track');
  const [milestones, setMilestones] = useState<boolean[]>(() => {
    const transit = orderIsTransit(order);
    const delivered = !transit;
    if (delivered) return [true, true, true, true];
    const stageMap: Record<string, number> = { 'Booked': 0, 'Farmer Confirmed': 1, 'Assured Deal': 1, 'Ready': 2, 'In Transit': 2 };
    const stage = stageMap[order.status] ?? 1;
    return [true, stage >= 1, stage >= 2, false];
  });

  const listing = order.listing;
  const cropName = listing ? cropDisplayName(listing) : 'Unknown crop';
  const variety = listing ? cropDisplayVariety(listing) : '';
  const totalAmount = round2(Number(order.quantity_kg) * Number(order.unit_price));
  const isTransit = orderIsTransit(order);
  const driver = orderDriverInfo(order);
  const farmer = orderFarmerInfo(order);
  const grossAmount = totalAmount;
  const ampcCess = round2(grossAmount * 0.01);
  const loadingFee = round2(Number(order.quantity_kg) * 0.5);
  const netTotal = round2(grossAmount + ampcCess + loadingFee);

  const toggleMilestone = (i: number) => {
    if (!isTransit && i < 3) return;
    setMilestones(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  const activeMilestone = milestones.findIndex((v, i) => v && !milestones[i + 1]);

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="ord-modal" onClick={(e) => e.stopPropagation()}>
      <div className="ord-modal-header">
        <div>
          <h2>Order {orderShortId(order)}</h2>
          <div className="ord-modal-meta">{orderPlacedDate(order)}</div>
          <Badge tone={isTransit ? 'amber' : 'green'}>{isTransit ? 'In Transit' : 'Delivered'}</Badge>
        </div>
        <button className="icon-button" onClick={onClose}><X size={22} /></button>
      </div>
      <div className="ord-modal-tabs">
        <button className={tab === 'track' ? 'selected' : ''} onClick={() => setTab('track')}><Map size={15} /> Track Package</button>
        <button className={tab === 'crop' ? 'selected' : ''} onClick={() => setTab('crop')}><Leaf size={15} /> Crop &amp; Farm</button>
        <button className={tab === 'billing' ? 'selected' : ''} onClick={() => setTab('billing')}><Wallet size={15} /> Billing &amp; Escrow</button>
      </div>
      <div className="ord-modal-body">
        {tab === 'track' && <>
          {isTransit && <div className="ord-track-alert"><Truck size={16} /><span>Arriving {orderEtaDate(order)} · GPS tracking active</span></div>}
          <div className="ord-track-driver">
            <div className="ord-track-driver-info">
              <strong>{driver.name}</strong>
              <small>Assigned driver</small>
              <div className="ord-vehicle">Vehicle: {driver.vehicle}</div>
            </div>
            <a href={`tel:${driver.phone}`} className="ord-call-driver"><Phone size={14} /> Call Driver</a>
          </div>
          <div className="ord-track-ewaybill"><ShieldCheck size={14} /> e-Way Bill: {driver.eWayBill}</div>
          <div className="ord-milestones">
            {orderMilestones.map((label, i) => <div key={label}>
              <div className={`ord-milestone ${milestones[i] ? 'done' : ''} ${!milestones[i] && i === activeMilestone + 1 ? 'active' : ''}`} onClick={() => toggleMilestone(i)}>
                <div className="ord-milestone-dot">{milestones[i] ? <Check size={14} /> : !milestones[i] && i === activeMilestone + 1 ? <span className="ord-pulse" /> : null}</div>
                <div className="ord-milestone-body"><strong>{label}</strong><small>{milestones[i] ? 'Completed' : 'Pending'}</small></div>
              </div>
              {i < orderMilestones.length - 1 && <div className={`ord-milestone-connector ${milestones[i] ? 'done' : ''}`} />}
            </div>)}
          </div>
          {isTransit && <Button icon={Check} wide onClick={() => { setMilestones([true, true, true, true]); notify('Intake confirmed at unloading bay.'); }}>Confirm Intake</Button>}
        </>}
        {tab === 'crop' && <>
          <div className="ord-crop-grid">
            <div className="ord-crop-img"><img src={cropPhotoFor(cropName)} alt={cropName} loading="lazy" /></div>
            <div className="ord-crop-details">
              <h3>{cropName}</h3>
              <div className="ord-crop-row"><Sprout size={13} /> Variety: {variety}</div>
              <div className="ord-crop-row"><UserRound size={13} /> Farmer: {farmer.name}</div>
              <div className="ord-crop-row"><MapPin size={13} /> Village: {farmer.village}</div>
              <div className="ord-crop-row"><Phone size={13} /> {farmer.phone}</div>
            </div>
          </div>
          <div className="ord-pkg-box">
            <h4>Destination &amp; Packaging</h4>
            <p>Warangal APMC Mandi · Unloading Bay {(hashStr(order.id) % 10) + 1}</p>
          </div>
          <div className="ord-pkg-box">
            <h4>Packaging Specifications</h4>
            <p>{Math.ceil(Number(order.quantity_kg) / 50)} × 50 kg gunny bags / crates</p>
          </div>
        </>}
        {tab === 'billing' && <>
          <div className="ord-billing-badge"><ShieldCheck size={14} /> e-NAM Escrow Protected</div>
          <div className="ord-billing-row"><span>Produce gross amount</span><strong>{formatRupee(grossAmount)}</strong></div>
          <div className="ord-billing-row"><span>APMC market cess (1.0%)</span><strong>{formatRupee(ampcCess)}</strong></div>
          <div className="ord-billing-row"><span>Loading / bagging fee</span><strong>{formatRupee(loadingFee)}</strong></div>
          <div className="ord-billing-row total"><span>Net total</span><strong>{formatRupee(netTotal)}</strong></div>
          <div style={{ marginTop: 14 }}>
            <Button variant="outline" icon={Printer} onClick={() => notify('APMC Mandi Tax Invoice & e-Way bill ready to print.')} wide>View APMC Mandi Tax Invoice</Button>
          </div>
        </>}
      </div>
      <div className="ord-modal-footer">
        <Button variant="outline" icon={Printer} onClick={() => notify('Invoice downloaded.')}>Invoice</Button>
        <div className="ord-footer-spacer" />
        {isTransit && <Button icon={Check} onClick={() => { setMilestones([true, true, true, true]); notify('Delivery confirmed. Escrow released to farmer.'); }}>Confirm Delivery</Button>}
        {!isTransit && <Button icon={ShoppingBag} onClick={() => { notify('Added to cart — buy again.'); }}>Buy Again</Button>}
        <button className="ord-problem-link" onClick={() => notify('Problem report submitted. Support will contact you.')}>Problem with order?</button>
      </div>
    </div>
  </div>;
}

// TODO: MOCK DATA — replace with real backend/Supabase wiring later
const mockOrders: OrderRow[] = [
  {
    id: 'mock-ord-1',
    buyer_id: 'mock-buyer',
    listing_id: 'mock-listing-1',
    quantity_kg: 500,
    unit_price: 25,
    status: 'In Transit',
    payment_type: 'token',
    amount_paid: 2500,
    token_percent: 20,
    booked_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    listing: {
      id: 'mock-listing-1',
      owner_id: 'mock-farmer-1',
      fpo_id: null,
      crop_id: 'crop-tomato',
      custom_crop_name: null,
      quantity_kg: 500,
      available_quantity_kg: 0,
      expected_harvest_date: null,
      harvested_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      area_acres: 1.5,
      expected_yield_kg: 500,
      indicative_price_per_kg: 25,
      status: 'Sold',
      is_visible: true,
      is_cluster_linked: false,
      location_area: 'Pembarthy',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      crop: { id: 'crop-tomato', name: 'Tomato', variety: 'Hybrid', unit: 'kg', description: null },
      price_start_per_kg: 25,
      price_floor_per_kg: 18,
      decay_speed: 'fast',
      price_drop_started_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      step_interval_minutes: 30,
      step_drop_amount: 0.5,
      listing_verified: true,
      listing_verified_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      listing_vegetation_reading: 'NDVI 0.72 — healthy canopy',
      harvest_timing_verified: true,
      harvest_quantity_verified: true,
      harvest_verified_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  },
  {
    id: 'mock-ord-2',
    buyer_id: 'mock-buyer',
    listing_id: 'mock-listing-2',
    quantity_kg: 300,
    unit_price: 70,
    status: 'Delivered',
    payment_type: 'full',
    amount_paid: 21000,
    token_percent: null,
    booked_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    listing: {
      id: 'mock-listing-2',
      owner_id: 'mock-farmer-2',
      fpo_id: null,
      crop_id: 'crop-chilli',
      custom_crop_name: null,
      quantity_kg: 300,
      available_quantity_kg: 0,
      expected_harvest_date: null,
      harvested_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      area_acres: 0.75,
      expected_yield_kg: 300,
      indicative_price_per_kg: 70,
      status: 'Sold',
      is_visible: true,
      is_cluster_linked: false,
      location_area: 'Hasanparthy',
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      crop: { id: 'crop-chilli', name: 'Chilli', variety: 'Red Teja', unit: 'kg', description: null },
      price_start_per_kg: 70,
      price_floor_per_kg: 55,
      decay_speed: 'slow',
      price_drop_started_at: null,
      step_interval_minutes: null,
      step_drop_amount: null,
      listing_verified: true,
      listing_verified_at: new Date(Date.now() - 16 * 86400000).toISOString(),
      listing_vegetation_reading: 'NDVI 0.68 — healthy',
      harvest_timing_verified: true,
      harvest_quantity_verified: true,
      harvest_verified_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
  },
  {
    id: 'mock-ord-3',
    buyer_id: 'mock-buyer',
    listing_id: 'mock-listing-3',
    quantity_kg: 1000,
    unit_price: 30,
    status: 'Delivered',
    payment_type: 'full',
    amount_paid: 30000,
    token_percent: null,
    booked_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    listing: {
      id: 'mock-listing-3',
      owner_id: 'mock-farmer-3',
      fpo_id: null,
      crop_id: 'crop-onion',
      custom_crop_name: null,
      quantity_kg: 1000,
      available_quantity_kg: 0,
      expected_harvest_date: null,
      harvested_at: new Date(Date.now() - 22 * 86400000).toISOString(),
      area_acres: 2,
      expected_yield_kg: 1000,
      indicative_price_per_kg: 30,
      status: 'Sold',
      is_visible: true,
      is_cluster_linked: false,
      location_area: 'Geesukonda',
      created_at: new Date(Date.now() - 24 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 18 * 86400000).toISOString(),
      crop: { id: 'crop-onion', name: 'Onion', variety: 'Bellary', unit: 'kg', description: null },
      price_start_per_kg: 30,
      price_floor_per_kg: 22,
      decay_speed: 'medium',
      price_drop_started_at: null,
      step_interval_minutes: null,
      step_drop_amount: null,
      listing_verified: true,
      listing_verified_at: new Date(Date.now() - 26 * 86400000).toISOString(),
      listing_vegetation_reading: 'NDVI 0.65 — good',
      harvest_timing_verified: true,
      harvest_quantity_verified: true,
      harvest_verified_at: new Date(Date.now() - 22 * 86400000).toISOString(),
    },
  },
  {
    id: 'mock-ord-4',
    buyer_id: 'mock-buyer',
    listing_id: 'mock-listing-4',
    quantity_kg: 2000,
    unit_price: 45,
    status: 'Delivered',
    payment_type: 'token',
    amount_paid: 9000,
    token_percent: 10,
    booked_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    listing: {
      id: 'mock-listing-4',
      owner_id: 'mock-farmer-4',
      fpo_id: null,
      crop_id: 'crop-cotton',
      custom_crop_name: null,
      quantity_kg: 2000,
      available_quantity_kg: 0,
      expected_harvest_date: null,
      harvested_at: new Date(Date.now() - 38 * 86400000).toISOString(),
      area_acres: 3,
      expected_yield_kg: 2000,
      indicative_price_per_kg: 45,
      status: 'Sold',
      is_visible: true,
      is_cluster_linked: false,
      location_area: 'Nekkonda',
      created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 33 * 86400000).toISOString(),
      crop: { id: 'crop-cotton', name: 'Cotton', variety: 'Bt Bunny', unit: 'kg', description: null },
      price_start_per_kg: 45,
      price_floor_per_kg: 38,
      decay_speed: 'slow',
      price_drop_started_at: null,
      step_interval_minutes: null,
      step_drop_amount: null,
      listing_verified: true,
      listing_verified_at: new Date(Date.now() - 42 * 86400000).toISOString(),
      listing_vegetation_reading: 'NDVI 0.70 — healthy',
      harvest_timing_verified: true,
      harvest_quantity_verified: true,
      harvest_verified_at: new Date(Date.now() - 38 * 86400000).toISOString(),
    },
  },
];

function OrdersView({ role, open, notify, t }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T }) {
  const [filter, setFilter] = useState<'all' | 'transit' | 'delivered'>('all');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<OrderRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchMyOrders();
        if (!cancelled) setOrders(data.length > 0 ? data : mockOrders);
      } catch (err) {
        console.error('[OrdersView] failed to load orders:', err);
        if (!cancelled) {
          setOrders(mockOrders);
          setError(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const transitOrders = orders.filter((o) => orderIsTransit(o));
  const deliveredOrders = orders.filter((o) => !orderIsTransit(o));
  const filteredOrders = filter === 'transit' ? transitOrders : filter === 'delivered' ? deliveredOrders : orders;

  if (role === 'Transport Provider') {
    return <Page title={t('orders.title')} body={t('orders.body')} back={() => open('home')} t={t}>
      <Button icon={Map} onClick={() => open('journey')}>{t('orders.openLiveJourney')}</Button>
    </Page>;
  }

  return <main className="dedicated-page">
    <div className="orders-page">
      <div className="orders-topbar">
        <button className="back-button" onClick={() => open('home')}><ArrowLeft size={18} /> Back to Home</button>
      </div>
      <div className="orders-header">
        <h1>Your Orders</h1>
        <p>Track shipments, view invoices, or reorder previous farmgate lots.</p>
      </div>
      <div className="orders-filter-pills">
        <button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>Orders <span className="orders-pill-count">{orders.length}</span></button>
        <button className={filter === 'transit' ? 'selected' : ''} onClick={() => setFilter('transit')}>In Transit <span className="orders-pill-count">{transitOrders.length}</span></button>
        <button className={filter === 'delivered' ? 'selected' : ''} onClick={() => setFilter('delivered')}>Delivered <span className="orders-pill-count">{deliveredOrders.length}</span></button>
      </div>
      {loading && <p className="sp-empty">{t('crops.loading')}</p>}
      {error && <p className="sp-empty">{error}</p>}
      {!loading && !error && filteredOrders.length === 0 && <p className="sp-empty">{t('orders.noOrders')}</p>}
      {!loading && !error && filteredOrders.map((order) => {
        const listing = order.listing;
        const cropName = listing ? cropDisplayName(listing) : 'Unknown crop';
        const variety = listing ? cropDisplayVariety(listing) : '';
        const totalAmount = round2(Number(order.quantity_kg) * Number(order.unit_price));
        const isTransit = orderIsTransit(order);
        return <div className="ord-card" key={order.id}>
          <div className="ord-card-topstrip">
            <div className="ord-strip-col"><small>Order Placed</small><strong>{orderPlacedDate(order)}</strong></div>
            <div className="ord-strip-col"><small>Total</small><strong>{formatRupee(totalAmount)}</strong></div>
            <div className="ord-strip-col"><small>Order #</small><strong>{orderShortId(order)}</strong></div>
          </div>
          <div className="ord-card-body">
            <div className="ord-card-thumb"><img src={cropPhotoFor(cropName)} alt={cropName} loading="lazy" /></div>
            <div className="ord-card-info">
              {isTransit
                ? <span className="ord-status-pill transit"><span className="ord-pulse" /> In Transit &middot; Arriving {orderEtaDate(order)}</span>
                : <span className="ord-status-pill delivered"><Check size={12} /> Delivered on {orderPlacedDate(order)}</span>}
              <h3>{cropName}{variety ? `, ${variety}` : ''}</h3>
              <p>{Number(order.quantity_kg).toLocaleString('en-IN')} kg &middot; {formatPrice(Number(order.unit_price))}</p>
            </div>
            <button className="ord-card-preview-btn" onClick={() => setPreviewOrder(order)}><Eye size={15} /> Preview</button>
          </div>
        </div>;
      })}
    </div>
    {previewOrder && <OrderPreviewModal order={previewOrder} onClose={() => setPreviewOrder(null)} notify={notify} t={t} />}
  </main>;
}
function DealsView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('deals.title')} body={t('deals.body')} back={() => open('home')} t={t}><Card className="payment-card"><Badge tone="orange">{t('deals.paymentPending')}</Badge><h2>{t('deals.tomatoOrder')}</h2><p>{t('deals.initialToken')}</p><div className="payment-states"><span className="done"><Check size={15} /> {t('deals.initialPayment')}</span><span className="active"><Clock3 size={15} /> {t('deals.paymentPending')}</span><span><Check size={15} /> {t('deals.paymentCompleted')}</span></div><Button icon={ShieldCheck} onClick={() => notify(t('orders.payBalanceFlow'))}>{t('deals.payBalance')}</Button><small>{t('deals.notRealPayment')}</small></Card></Page>; }
const tpTruckPhotos: Record<string, string> = {
  'Open Body': 'https://images.pexels.com/photos/29057947/pexels-photo-29057947.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Mini Truck': 'https://images.pexels.com/photos/20922619/pexels-photo-20922619.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Reefer': 'https://images.pexels.com/photos/29057949/pexels-photo-29057949.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  'Container': 'https://images.pexels.com/photos/29057946/pexels-photo-29057946.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
};


type TpSubTab = 'farmer-requests' | 'my-orders';

interface TpVehicle {
  id: string;
  regNumber: string;
  vehicleType: string;
  capacityKg: number;
  driverName: string;
  driverPhone: string;
}

const tpFleet: TpVehicle[] = [
  { id: 'veh-1', regNumber: 'TS 09 UV 2468', vehicleType: 'Open Body', capacityKg: 2000, driverName: 'Mallikarjun', driverPhone: '+91 90000 12345' },
  { id: 'veh-2', regNumber: 'AP 02 TR 7788', vehicleType: 'Reefer', capacityKg: 1000, driverName: 'Venkatesh', driverPhone: '+91 90000 67890' },
  { id: 'veh-3', regNumber: 'TS 07 PQ 1122', vehicleType: 'Mini Truck', capacityKg: 800, driverName: 'Somaiah', driverPhone: '+91 90000 33445' },
  { id: 'veh-4', regNumber: 'AP 16 KL 5566', vehicleType: 'Container', capacityKg: 1500, driverName: 'Ravi Kumar', driverPhone: '+91 90000 77889' },
];

function tpVehicleForConsignment(c: TpConsignment): TpVehicle {
  return tpFleet.find((v) => v.vehicleType === c.vehicleType) ?? tpFleet[0];
}

function tpConsignorPhone(name: string): string {
  const map: Record<string, string> = {
    'Ramesh Kumar': '+91 98765 43210',
    'Lakshmi Devi': '+91 98765 12345',
    'Suresh Reddy': '+91 98765 56789',
    'Anjali Rao': '+91 98765 67890',
    'Pochamma': '+91 98765 78901',
  };
  return map[name] ?? '+91 98765 00000';
}

interface TpConsignment {
  id: string;
  lrNumber: string;
  farmerName: string;
  consignorType: 'Farmer' | 'Cold Storage';
  cropName: string;
  quantityKg: number;
  unitType: 'crates' | 'gunny sacks';
  unitCount: number;
  vehicleType: string;
  distanceKm: number;
  routeFrom: string;
  routeTo: string;
  estValue: number;
  status: string;
  daysCold: number;
  tempReq: string;
  baseFare: number;
  perKmRate: number;
}

const tpFarmerRequestConsignmentsSeed: TpConsignment[] = [
  { id: 'tp-fr-1', lrNumber: 'AP-ANT-LR-4912', farmerName: 'Ramesh Kumar', consignorType: 'Farmer', cropName: 'Tomato', quantityKg: 500, unitType: 'crates', unitCount: 25, vehicleType: 'Open Body', distanceKm: 42, routeFrom: 'Anantapur', routeTo: 'Warangal Mandi', estValue: 12500, status: 'Open', daysCold: 0, tempReq: 'Ambient / Tarp Covered', baseFare: 200, perKmRate: 25 },
  { id: 'tp-fr-2', lrNumber: 'TS-NZB-LR-4918', farmerName: 'Anjali Rao', consignorType: 'Farmer', cropName: 'Onion', quantityKg: 1200, unitType: 'gunny sacks', unitCount: 24, vehicleType: 'Container', distanceKm: 67, routeFrom: 'Nizamabad', routeTo: 'Warangal Mandi', estValue: 36000, status: 'Open', daysCold: 0, tempReq: 'Ambient / Tarp Covered', baseFare: 200, perKmRate: 25 },
  { id: 'tp-fr-3', lrNumber: 'TS-WGL-LR-4920', farmerName: 'Pochamma', consignorType: 'Farmer', cropName: 'Cotton', quantityKg: 2000, unitType: 'gunny sacks', unitCount: 40, vehicleType: 'Open Body', distanceKm: 35, routeFrom: 'Warangal', routeTo: 'Warangal Mandi', estValue: 90000, status: 'Open', daysCold: 0, tempReq: 'Ambient / Tarp Covered', baseFare: 200, perKmRate: 25 },
];

const tpMyOrderConsignmentsSeed: TpConsignment[] = [
  { id: 'tp-mo-1', lrNumber: 'AP-ANT-LR-4912', farmerName: 'Ramesh Kumar', consignorType: 'Farmer', cropName: 'Tomato', quantityKg: 500, unitType: 'crates', unitCount: 25, vehicleType: 'Reefer', distanceKm: 42, routeFrom: 'Anantapur', routeTo: 'Warangal Mandi', estValue: 12500, status: 'In Transit', daysCold: 0, tempReq: 'Reefer 4–8°C', baseFare: 200, perKmRate: 25 },
  { id: 'tp-mo-2', lrNumber: 'TS-WGL-LR-4935', farmerName: 'Lakshmi Devi', consignorType: 'Farmer', cropName: 'Chilli', quantityKg: 300, unitType: 'gunny sacks', unitCount: 6, vehicleType: 'Open Body', distanceKm: 28, routeFrom: 'Warangal', routeTo: 'Hyderabad Mandi', estValue: 21000, status: 'Delivered', daysCold: 0, tempReq: 'Ambient / Tarp Covered', baseFare: 100, perKmRate: 15 },
];

function TpKpiCard({ icon: Icon, value, label, tone }: { icon: IconType; value: string; label: string; tone: string }) {
  return <div className="tp-kpi-card"><span className={`tp-kpi-icon ${tone}`}><Icon size={20} /></span><span className="tp-kpi-value">{value}</span><span className="tp-kpi-label">{label}</span></div>;
}

function tpFreightPayout(c: TpConsignment): number { return round2(c.baseFare + c.perKmRate * c.distanceKm); }

function TpRequestCard({ c, t, onClick }: { c: TpConsignment; t: T; onClick?: () => void }) {
  const cropPhoto = cropPhotoFor(c.cropName);
  const freight = tpFreightPayout(c);
  const clickable = !!onClick;
  return <div className="tp-req-card" onClick={onClick} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined} onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}>
    <div className="tp-req-card-top">
      <div className="tp-req-thumb-wrap">
        <img className="tp-req-thumb" src={cropPhoto} alt={c.cropName} loading="lazy" />
        <div className="tp-req-thumb-overlay" />
      </div>
      <div className="tp-req-card-info">
        <div className="tp-req-card-header">
          <Badge tone={c.status === 'Delivered' ? 'blue' : 'green'}>{c.status}</Badge>
          <span className="tp-req-lr">LR {c.lrNumber}</span>
        </div>
        <h3 className="tp-req-title">{c.farmerName} · {c.cropName}</h3>
        <div className="tp-req-meta-row">
          <span><Thermometer size={12} /> {c.tempReq}</span>
          <span><Truck size={12} /> {c.vehicleType}</span>
          <span><Package size={12} /> {c.unitCount} {c.unitType}</span>
        </div>
      </div>
      <div className="tp-req-weight-badge">
        <span className="tp-req-weight-label">Weight</span>
        <span className="tp-req-weight-value">{c.quantityKg.toLocaleString('en-IN')} kg</span>
      </div>
    </div>
    <div className="tp-req-route-section">
      <div className="tp-req-waypoint">
        <div className="tp-req-node tp-req-node-from"><span className="tp-req-node-dot" /></div>
        <div className="tp-req-waypoint-body">
          <span className="tp-req-waypoint-label tp-req-label-from">FROM</span>
          <span className="tp-req-waypoint-address">{c.routeFrom}</span>
        </div>
      </div>
      <div className="tp-req-connector" />
      <div className="tp-req-waypoint">
        <div className="tp-req-node tp-req-node-to"><MapPin size={12} /></div>
        <div className="tp-req-waypoint-body">
          <span className="tp-req-waypoint-label tp-req-label-to">TO</span>
          <span className="tp-req-waypoint-address">{c.routeTo}</span>
        </div>
      </div>
    </div>
    <div className="tp-req-driver-pay">
      <div className="tp-req-pay-stat">
        <span className="tp-req-pay-label">Driver Pay</span>
        <span className="tp-req-pay-value">{formatRupee(freight)}</span>
      </div>
      <div className="tp-req-pay-stat">
        <span className="tp-req-pay-label">Distance</span>
        <span className="tp-req-pay-value">{c.distanceKm} km</span>
      </div>
      <div className="tp-req-pay-detail">
        <span>Base ₹{c.baseFare} + ₹{c.perKmRate}/km × {c.distanceKm} km</span>
      </div>
    </div>
    {clickable && <button className="tp-req-accept-btn" onClick={(e) => { e.stopPropagation(); onClick?.(); }}>Accept Haul</button>}
  </div>;
}

function TpActiveOrderCard({ c, t, onOpenJourney }: { c: TpConsignment; t: T; onOpenJourney: (c: TpConsignment) => void }) {
  const cropPhoto = cropPhotoFor(c.cropName);
  const vehicle = tpVehicleForConsignment(c);
  return <div className="tp-req-card">
    <div className="tp-req-card-top">
      <div className="tp-req-thumb-wrap">
        <img className="tp-req-thumb" src={cropPhoto} alt={c.cropName} loading="lazy" />
        <div className="tp-req-thumb-overlay" />
      </div>
      <div className="tp-req-card-info">
        <div className="tp-req-card-header">
          <Badge tone="green">{c.status === 'Loading' ? 'Loading' : 'In Transit'}</Badge>
          <span className="tp-req-lr">LR {c.lrNumber}</span>
        </div>
        <h3 className="tp-req-title">{c.farmerName} · {c.cropName}</h3>
        <div className="tp-req-meta-row">
          <span><Thermometer size={12} /> {c.tempReq}</span>
          <span><Truck size={12} /> {c.vehicleType}</span>
          <span><Package size={12} /> {c.unitCount} {c.unitType}</span>
        </div>
      </div>
      <div className="tp-req-weight-badge">
        <span className="tp-req-weight-label">Weight</span>
        <span className="tp-req-weight-value">{c.quantityKg.toLocaleString('en-IN')} kg</span>
      </div>
    </div>
    <div className="tp-req-route-section">
      <div className="tp-req-waypoint">
        <div className="tp-req-node tp-req-node-from"><span className="tp-req-node-dot" /></div>
        <div className="tp-req-waypoint-body">
          <span className="tp-req-waypoint-label tp-req-label-from">FROM</span>
          <span className="tp-req-waypoint-address">{c.routeFrom}</span>
        </div>
      </div>
      <div className="tp-req-connector" />
      <div className="tp-req-waypoint">
        <div className="tp-req-node tp-req-node-to"><MapPin size={12} /></div>
        <div className="tp-req-waypoint-body">
          <span className="tp-req-waypoint-label tp-req-label-to">TO</span>
          <span className="tp-req-waypoint-address">{c.routeTo}</span>
        </div>
      </div>
    </div>
    <div className="tp-order-footer">
      <div className="tp-order-vehicle-info">
        <span className="tp-order-vehicle-reg">{vehicle.regNumber}</span>
        <span className="tp-order-driver-name">{vehicle.driverName}</span>
      </div>
      <button className="tp-req-accept-btn tp-order-action-btn" onClick={() => onOpenJourney(c)}>Open Live Journey</button>
    </div>
  </div>;
}

function TpCompletedOrderCard({ c, t, onViewWaybill }: { c: TpConsignment; t: T; onViewWaybill: () => void }) {
  const cropPhoto = cropPhotoFor(c.cropName);
  const freight = tpFreightPayout(c);
  const completedTs = new Date(Date.now() - (hashStr(c.id) % 7) * 86400000).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return <div className="tp-req-card">
    <div className="tp-req-card-top">
      <div className="tp-req-thumb-wrap">
        <img className="tp-req-thumb" src={cropPhoto} alt={c.cropName} loading="lazy" />
        <div className="tp-req-thumb-overlay" />
      </div>
      <div className="tp-req-card-info">
        <div className="tp-req-card-header">
          <Badge tone="blue">Delivered &amp; Settled</Badge>
          <span className="tp-req-lr">LR {c.lrNumber}</span>
        </div>
        <h3 className="tp-req-title">{c.farmerName} · {c.cropName}</h3>
        <div className="tp-req-meta-row">
          <span><Thermometer size={12} /> {c.tempReq}</span>
          <span><Truck size={12} /> {c.vehicleType}</span>
          <span><Package size={12} /> {c.unitCount} {c.unitType}</span>
        </div>
      </div>
      <div className="tp-req-weight-badge">
        <span className="tp-req-weight-label">Weight</span>
        <span className="tp-req-weight-value">{c.quantityKg.toLocaleString('en-IN')} kg</span>
      </div>
    </div>
    <div className="tp-req-route-section">
      <div className="tp-req-waypoint">
        <div className="tp-req-node tp-req-node-from"><span className="tp-req-node-dot" /></div>
        <div className="tp-req-waypoint-body">
          <span className="tp-req-waypoint-label tp-req-label-from">FROM</span>
          <span className="tp-req-waypoint-address">{c.routeFrom}</span>
        </div>
      </div>
      <div className="tp-req-connector" />
      <div className="tp-req-waypoint">
        <div className="tp-req-node tp-req-node-to"><MapPin size={12} /></div>
        <div className="tp-req-waypoint-body">
          <span className="tp-req-waypoint-label tp-req-label-to">TO</span>
          <span className="tp-req-waypoint-address">{c.routeTo}</span>
        </div>
      </div>
    </div>
    <div className="tp-order-footer tp-order-footer-completed">
      <div className="tp-order-pay-stats">
        <div className="tp-req-pay-stat">
          <span className="tp-req-pay-label">Amount Paid</span>
          <span className="tp-req-pay-value">{formatRupee(freight)}</span>
        </div>
        <div className="tp-req-pay-stat">
          <span className="tp-req-pay-label">Distance</span>
          <span className="tp-req-pay-value">{c.distanceKm} km</span>
        </div>
        <div className="tp-req-pay-stat">
          <span className="tp-req-pay-label">Completed</span>
          <span className="tp-req-pay-value tp-order-completed-ts">{completedTs}</span>
        </div>
      </div>
      <button className="tp-req-accept-btn tp-order-action-btn" onClick={onViewWaybill}>View e-Waybill</button>
    </div>
  </div>;
}



function TpConsignmentReviewModal({ c, t, onClose, onAccept, accepting }: { c: TpConsignment; t: T; onClose: () => void; onAccept: () => void; accepting: boolean }) {
  const freight = tpFreightPayout(c);
  const vehicle = tpVehicleForConsignment(c);
  const phone = tpConsignorPhone(c.farmerName);
  const cropPhoto = cropPhotoFor(c.cropName);
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="tp-review-modal" onClick={(e) => e.stopPropagation()}>
      <div className="tp-review-header">
        <div>
          <span className="eyebrow">Consignment Review</span>
          <h2>{c.farmerName} · {c.cropName}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label={t('common.close')}><X size={22} /></button>
      </div>
      <div className="tp-review-photo-wrap">
        <img className="tp-consignment-photo" src={cropPhoto} alt={c.cropName} loading="lazy" />
        <div className="tp-review-photo-overlay">
          <Badge tone={c.status === 'Delivered' ? 'blue' : 'green'}>{c.status}</Badge>
          <span className="tp-review-lr">LR {c.lrNumber}</span>
        </div>
      </div>
      <div className="tp-review-section">
        <h3>Consignor Details</h3>
        <div className="tp-review-grid">
          <div className="detail"><small>Name</small><strong>{c.farmerName}</strong></div>
          <div className="detail"><small>Type</small><strong>{c.consignorType}</strong></div>
          <div className="detail"><small>Phone</small><strong>{phone}</strong></div>
        </div>
      </div>
      <div className="tp-review-section">
        <h3>Vehicle Assignment <Demo>Sample</Demo></h3>
        <div className="tp-review-vehicle">
          <span className="tp-review-vehicle-icon"><Truck size={20} /></span>
          <div>
            <strong>{vehicle.regNumber}</strong>
            <span>{vehicle.vehicleType} · {formatKg(vehicle.capacityKg)} capacity</span>
          </div>
        </div>
        <div className="tp-review-grid">
          <div className="detail"><small>Driver</small><strong>{vehicle.driverName}</strong></div>
          <div className="detail"><small>Driver Phone</small><strong>{vehicle.driverPhone}</strong></div>
        </div>
      </div>
      <div className="tp-review-section">
        <h3>Logistics Details</h3>
        <div className="tp-review-grid">
          <div className="detail"><small>Crop</small><strong>{c.cropName}</strong></div>
          <div className="detail"><small>Quantity</small><strong>{formatKg(c.quantityKg)}</strong></div>
          <div className="detail"><small>Packaging</small><strong>{c.unitCount} {c.unitType}</strong></div>
          <div className="detail"><small>Vehicle Type</small><strong>{c.vehicleType}</strong></div>
          <div className="detail"><small>Temperature</small><strong>{c.tempReq}</strong></div>
          <div className="detail"><small>Distance</small><strong>{c.distanceKm} km</strong></div>
          <div className="detail"><small>From</small><strong>{c.routeFrom}</strong></div>
          <div className="detail"><small>To</small><strong>{c.routeTo}</strong></div>
          {c.daysCold > 0 && <div className="detail"><small>Cold Storage</small><strong>{c.daysCold} days</strong></div>}
          <div className="detail"><small>Est. Value</small><strong>{formatRupee(c.estValue)}</strong></div>
        </div>
      </div>
      <div className="tp-review-section tp-review-freight">
        <h3>Freight Payout <Demo>Sample</Demo></h3>
        <div className="tp-freight-detail">
          <span>Base ₹{c.baseFare}</span>
          <span>+ ₹{c.perKmRate}/km × {c.distanceKm} km</span>
          <strong>= {formatRupee(freight)}</strong>
        </div>
      </div>
      <div className="row">
        <Button icon={Check} onClick={onAccept} disabled={accepting} wide>{accepting ? 'Accepting…' : 'Accept Trip'}</Button>
        <Button variant="outline" onClick={onClose} disabled={accepting}>Close</Button>
      </div>
    </div>
  </div>;
}

function tpWeighbridgeSlip(c: TpConsignment): { slipNo: string; grossWeight: number; tareWeight: number; netWeight: number; dateTime: string; location: string } {
  const h = hashStr(c.id);
  const slipNo = `WB/${String(2000 + (h % 8000))}/${String(100 + (h % 900))}`;
  const tareWeight = Math.round(c.quantityKg * 1.05);
  const grossWeight = tareWeight + Math.round(c.quantityKg);
  const netWeight = grossWeight - tareWeight;
  const dt = new Date(Date.now() - (h % 86400000)).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const locations = ['Warangal APMC Weighbridge', 'Hyderabad Mandi Weighbridge', 'Khammam Weighbridge-2', 'Nizamabad APMC Weighbridge'];
  return { slipNo, grossWeight, tareWeight, netWeight, dateTime: dt, location: locations[h % locations.length] };
}

function tpEwaybill(c: TpConsignment): { ewbNo: string; validFrom: string; validUntil: string } {
  const h = hashStr(c.id);
  const partA = String(100000000000 + (h * 7919) % 900000000000).slice(0, 12);
  const partB = String((h % 100000)).padStart(6, '0');
  const ewbNo = `${partA}${partB}M`;
  const now = new Date();
  const from = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const until = new Date(now.getTime() + (c.distanceKm > 50 ? 3 : 1) * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return { ewbNo, validFrom: from, validUntil: until };
}

function TpShipmentDocsModal({ c, t, onClose }: { c: TpConsignment; t: T; onClose: () => void }) {
  const slip = tpWeighbridgeSlip(c);
  const ewb = tpEwaybill(c);
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="tp-review-modal" onClick={(e) => e.stopPropagation()}>
      <div className="tp-review-header">
        <div>
          <span className="eyebrow">Shipment Documentation</span>
          <h2>{c.farmerName} · {c.cropName}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label={t('common.close')}><X size={22} /></button>
      </div>
      <div className="tp-review-section">
        <div className="tp-docs-lr-row">
          <Badge tone="blue">LR {c.lrNumber}</Badge>
          <span className="tp-docs-route">{c.routeFrom} → {c.routeTo}</span>
        </div>
      </div>
      <div className="tp-review-section">
        <h3>Weighbridge Slip <Demo>Sample</Demo></h3>
        <div className="tp-doc-card">
          <div className="tp-doc-row"><small>Slip Number</small><strong>{slip.slipNo}</strong></div>
          <div className="tp-doc-grid">
            <div className="detail"><small>Gross Weight</small><strong>{slip.grossWeight.toLocaleString('en-IN')} kg</strong></div>
            <div className="detail"><small>Tare Weight</small><strong>{slip.tareWeight.toLocaleString('en-IN')} kg</strong></div>
            <div className="detail"><small>Net Weight</small><strong>{slip.netWeight.toLocaleString('en-IN')} kg</strong></div>
          </div>
          <div className="tp-doc-row"><small>Date / Time</small><strong>{slip.dateTime}</strong></div>
          <div className="tp-doc-row"><small>Weighbridge Location</small><strong>{slip.location}</strong></div>
        </div>
      </div>
      <div className="tp-review-section">
        <h3>e-Waybill <Demo>Sample</Demo></h3>
        <div className="tp-doc-card">
          <div className="tp-doc-row"><small>e-Waybill Number</small><strong className="tp-ewb-no">{ewb.ewbNo}</strong></div>
          <div className="tp-doc-grid">
            <div className="detail"><small>Valid From</small><strong>{ewb.validFrom}</strong></div>
            <div className="detail"><small>Valid Until</small><strong>{ewb.validUntil}</strong></div>
          </div>
          <div className="tp-doc-row"><small>Consignor</small><strong>{c.farmerName}</strong></div>
          <div className="tp-doc-row"><small>Commodity</small><strong>{c.cropName} · {formatKg(c.quantityKg)}</strong></div>
        </div>
      </div>
      <div className="tp-docs-disclaimer"><ShieldCheck size={14} /> Mock documentation for demo purposes only — not a real GST or regulatory document.</div>
      <div className="row"><Button variant="outline" onClick={onClose} wide>Close</Button></div>
    </div>
  </div>;
}

function FeatureView({ role, open, notify, t, profile, onNotifications, onOpenJourney }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T; profile: () => void; onNotifications: () => void; onOpenJourney: (c: TpConsignment) => void }) {
  const [subTab, setSubTab] = useState<TpSubTab>('farmer-requests');
  const [farmerRequestConsignments, setFarmerRequestConsignments] = useState<TpConsignment[]>(tpFarmerRequestConsignmentsSeed);
  const [myOrderConsignments, setMyOrderConsignments] = useState<TpConsignment[]>(tpMyOrderConsignmentsSeed);
  const [reviewConsignment, setReviewConsignment] = useState<TpConsignment | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [docsConsignment, setDocsConsignment] = useState<TpConsignment | null>(null);
  const [ordersSegment, setOrdersSegment] = useState<'active' | 'completed'>('active');

  if (role !== 'Transport Provider') {
    const request = t('feature.Main Summary');
    return <Page title={request} body={t('features.body')} back={() => open('home')} t={t}>
      <div className="summary-grid"><Card><Zap size={22} /><h2>₹45,000</h2><p>{t('features.totalEarnings')}</p></Card><Card><Package size={22} /><h2>3</h2><p>{t('features.activeOrders')}</p></Card><Card><Check size={22} /><h2>12</h2><p>{t('features.completed')}</p></Card></div>
      <Card className="request-card"><Illustration label={t('role.Farmer')} color="amber" icon={Warehouse} /><div><Badge tone="blue">{t('features.openRequest')}</Badge><h3>Ramesh Kumar · Tomato</h3><p>500 kg · 7 days · sample requirement</p><Button variant="soft" onClick={() => notify(t('features.requestReviewOpened'))}>{t('features.reviewRequest')}</Button></div></Card>
    </Page>;
  }

  const consignments = subTab === 'farmer-requests' ? farmerRequestConsignments : myOrderConsignments;

  const kpis = subTab === 'farmer-requests' ? (
    <div className="tp-kpi-grid">
      <TpKpiCard icon={Sprout} value={String(farmerRequestConsignments.length)} label="Farmer Requests" tone="green" />
      <TpKpiCard icon={Banknote} value={formatRupee(farmerRequestConsignments.reduce((s, c) => s + c.estValue, 0))} label="Total Value" tone="amber" />
      <TpKpiCard icon={Truck} value={String(new Set(farmerRequestConsignments.map((c) => c.vehicleType)).size)} label="Vehicle Types" tone="teal" />
    </div>
  ) : (
    <div className="tp-kpi-grid">
      <TpKpiCard icon={Package} value={String(myOrderConsignments.length)} label="Total Orders" tone="green" />
      <TpKpiCard icon={Check} value={String(myOrderConsignments.filter((c) => c.status === 'Delivered').length)} label="Delivered" tone="blue" />
      <TpKpiCard icon={Banknote} value={formatRupee(myOrderConsignments.reduce((s, c) => s + c.estValue, 0))} label="Order Value" tone="amber" />
    </div>
  );

  const tabLabel = subTab === 'farmer-requests' ? t('feature.Farmer Requests') : t('feature.My Orders');

  const handleAcceptTrip = async () => {
    if (!reviewConsignment) return;
    const c = reviewConsignment;
    setAccepting(true);
    try {
      const freight = tpFreightPayout(c);
      await supabase.from('transport_bookings').insert({
        pickup_location: c.routeFrom,
        destination: c.routeTo,
        quantity_kg: c.quantityKg,
        estimated_price: freight,
        status: 'Accepted',
      });
      const accepted: TpConsignment = { ...c, status: 'In Transit' };
      setMyOrderConsignments((prev) => [accepted, ...prev]);
      setFarmerRequestConsignments((prev) => prev.filter((item) => item.id !== c.id));
      setReviewConsignment(null);
      setSubTab('my-orders');
      notify(`Trip accepted — ${c.cropName} moved to My Orders`);
    } catch {
      notify('Could not accept trip. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  return <main className="dedicated-page">
    <div className="tp-unified-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <button className="back-button" onClick={() => open('home')}><ArrowLeft size={18} /> {t('common.back')}</button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="icon-button" onClick={profile} aria-label={t('profile.title')}><UserRound size={20} /></button>
        <button className="icon-button" onClick={onNotifications} aria-label={t('notifications.title')}><Bell size={20} /></button>
      </div>
    </div>
    <div className="page-title"><h1>{tabLabel}</h1><p>{t('features.body')}</p></div>
    <div className="filter-row">
      <button className={subTab === 'farmer-requests' ? 'selected' : ''} onClick={() => setSubTab('farmer-requests')}>{t('feature.Farmer Requests')}</button>
      <button className={subTab === 'my-orders' ? 'selected' : ''} onClick={() => setSubTab('my-orders')}>{t('feature.My Orders')}</button>
    </div>
    {kpis}
    {subTab === 'my-orders' && (() => {
      const active = myOrderConsignments.filter((c) => c.status === 'In Transit' || c.status === 'Loading');
      const completed = myOrderConsignments.filter((c) => c.status === 'Delivered');
      const segmentList = ordersSegment === 'active' ? active : completed;
      return <>
        <div className="tp-segmented-control">
          <button className={ordersSegment === 'active' ? 'selected' : ''} onClick={() => setOrdersSegment('active')}><Zap size={15} /> Active Dispatches ({active.length})</button>
          <button className={ordersSegment === 'completed' ? 'selected' : ''} onClick={() => setOrdersSegment('completed')}><CheckCircle2 size={15} /> Previous &amp; Completed ({completed.length})</button>
        </div>
        <div className="tp-card-list">
          {segmentList.length === 0 && <p className="calendar-empty">No {ordersSegment === 'active' ? 'active dispatches' : 'completed orders'}.</p>}
          {segmentList.map((c) => <div key={c.id}>
            {ordersSegment === 'active' ? (
              <TpActiveOrderCard c={c} t={t} onOpenJourney={onOpenJourney} />
            ) : (
              <TpCompletedOrderCard c={c} t={t} onViewWaybill={() => {
                const ewb = tpEwaybill(c);
                const slip = tpWeighbridgeSlip(c);
                notify(`e-Waybill ${ewb.ewbNo} and APMC weighbridge slip ${slip.slipNo} downloaded (mock).`);
              }} />
            )}
          </div>)}
        </div>
      </>;
    })()}
    {subTab !== 'my-orders' && <div className="tp-card-list">
      {consignments.length === 0 && <p className="calendar-empty">No consignments in this tab.</p>}
      {consignments.map((c) => <div key={c.id}>
        <TpRequestCard c={c} t={t} onClick={() => setReviewConsignment(c)} />
      </div>)}
    </div>}
    {reviewConsignment && <TpConsignmentReviewModal c={reviewConsignment} t={t} onClose={() => setReviewConsignment(null)} onAccept={handleAcceptTrip} accepting={accepting} />}
    {docsConsignment && <TpShipmentDocsModal c={docsConsignment} t={t} onClose={() => setDocsConsignment(null)} />}
  </main>;
}
function Notice({ children, tone = 'warning' }: { children: ReactNode; tone?: string }) { return <div className={`notice ${tone}`}>{children}</div>; }
function Page({ title, body, back, children, t }: { title: string; body: string; back: () => void; children: ReactNode; t: T }) { return <main className="dedicated-page"><button className="back-button" onClick={back}><ArrowLeft size={18} /> {t('common.back')}</button><div className="page-title"><h1>{title}</h1><p>{body}</p></div>{children}</main>; }
function notifIconFor(type: string): IconType { if (type === 'transport') return Truck; if (type === 'payment') return Check; if (type === 'shortage') return AlertTriangle; return Bell; }
function Notifications({ close, t, items, loading, error, onMarkRead, onMarkAllRead }: { close: () => void; t: T; items: NotificationRow[]; loading: boolean; error: string | null; onMarkRead: (id: string) => void; onMarkAllRead: () => void }) {
  const unread = items.filter((n) => !n.read_at).length;
  return <div className="modal-backdrop"><Card className="notifications"><div className="modal-head"><div>{unread > 0 && <Badge tone="orange">{unread} {t('notifications.2new').replace(/^\d+\s*/, '')}</Badge>}<h2>{t('notifications.title')}</h2></div><button className="icon-button" onClick={close}><X size={20} /></button></div>{loading && <p className="notif-empty">{t('crops.loading')}</p>}{error && <p className="notif-error">{error}</p>}{!loading && !error && items.length === 0 && <p className="notif-empty">{t('notifications.noNotifications')}</p>}{!loading && !error && items.length > 0 && unread > 0 && <div className="notif-actions"><button onClick={onMarkAllRead}>{t('notifications.markAll')}</button></div>}{!loading && !error && items.map((n) => <NotificationRow key={n.id} icon={notifIconFor(n.notification_type)} title={t(n.title)} body={t(n.body)} read={!!n.read_at} onClick={() => !n.read_at && onMarkRead(n.id)} />)}</Card></div>;
}
function NotificationRow({ icon: Icon, title, body, read, onClick }: { icon: IconType; title: string; body: string; read: boolean; onClick?: () => void }) { return <div className={`notification-row ${read ? 'read' : 'unread'}`} onClick={onClick}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{body}</small></div></div>; }

function CropFormView({ open, notify, t, editing, voiceFill, formDraft }: { open: (view: View) => void; notify: (message: string) => void; t: T; editing?: CropListing; voiceFill?: Record<string, string>; formDraft?: Record<string, string> }) {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropId, setCropId] = useState(editing?.crop_id ?? '');
  const [isOther, setIsOther] = useState(!!editing?.custom_crop_name);
  const [customCropName, setCustomCropName] = useState(editing?.custom_crop_name ?? '');
  const [quantityKg, setQuantityKg] = useState(editing ? String(editing.quantity_kg) : '');
  const [availableKg, setAvailableKg] = useState(editing ? String(editing.available_quantity_kg) : '');
  const [harvestDate, setHarvestDate] = useState(editing?.expected_harvest_date ?? '');
  const [harvestedAt, setHarvestedAt] = useState(editing?.harvested_at ?? '');
  const [areaAcres, setAreaAcres] = useState(editing?.area_acres != null ? String(editing.area_acres) : '');
  const [expectedYield, setExpectedYield] = useState(editing?.expected_yield_kg != null ? String(editing.expected_yield_kg) : '');
  const [pricePerKg, setPricePerKg] = useState(editing?.indicative_price_per_kg != null ? String(editing.indicative_price_per_kg) : '');
  const [status, setStatus] = useState<'Upcoming' | 'Harvested'>(editing?.status === 'Harvested' ? 'Harvested' : 'Upcoming');
  const [verifiedListing, setVerifiedListing] = useState(editing?.listing_verified ?? false);

  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  useEffect(() => { (async () => { try { setCrops(await fetchCrops()); } catch { setError(tRef.current('crops.loadError')); } finally { setLoading(false); } })(); }, []);

  useEffect(() => {
    if (!voiceFill) return;
    if (voiceFill.cropName !== undefined) {
      const name = voiceFill.cropName;
      const match = crops.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (match) { setCropId(match.id); setIsOther(false); }
      else { setIsOther(true); setCustomCropName(name); }
    }
    if (voiceFill.quantity !== undefined) setQuantityKg(voiceFill.quantity);
    if (voiceFill.available !== undefined) setAvailableKg(voiceFill.available);
    if (voiceFill.status !== undefined) setStatus(voiceFill.status as 'Upcoming' | 'Harvested');
    if (voiceFill.date !== undefined) {
      if (voiceFill.status === 'Harvested') setHarvestedAt(voiceFill.date);
      else setHarvestDate(voiceFill.date);
    }
    if (voiceFill.area !== undefined) setAreaAcres(voiceFill.area);
    if (voiceFill.yield !== undefined) setExpectedYield(voiceFill.yield);
    if (voiceFill.price !== undefined) setPricePerKg(voiceFill.price);
  }, [voiceFill, crops]);

  const currentDraft = formDraft ?? {};

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOther && !cropId) { setError(t('crops.selectCrop')); return; }
    if (isOther && !customCropName.trim()) { setError(t('crops.enterCropName')); return; }
    setSaving(true); setError(null);
    const resolvedCropId = isOther ? crops[0]?.id ?? '' : cropId;
    if (!resolvedCropId) { setError(t('crops.createError')); setSaving(false); return; }
    const input: CropListingInput = {
      crop_id: resolvedCropId,
      custom_crop_name: isOther ? customCropName.trim() : null,
      quantity_kg: Number(quantityKg) || 0,
      available_quantity_kg: Number(availableKg) || Number(quantityKg) || 0,
      expected_harvest_date: status === 'Upcoming' ? (harvestDate || null) : null,
      harvested_at: status === 'Harvested' ? (harvestedAt || null) : null,
      area_acres: areaAcres ? Number(areaAcres) : null,
      expected_yield_kg: expectedYield ? Number(expectedYield) : null,
      indicative_price_per_kg: pricePerKg ? Number(pricePerKg) : null,
      status,
    };
    try {
      if (editing) {
        await updateListing(editing.id, input);
        notify(t('crops.updated'));
      } else {
        await createListing({
          ...input,
          listing_verified: true,
          listing_verified_at: new Date().toISOString(),
          listing_vegetation_reading: 'Growing crop detected',
        });
        setVerifiedListing(true);
        notify(t('crops.saved'));
      }
    } catch { setError(t('crops.createError')); } finally { setSaving(false); }
  };

  return <Page title={editing ? t('crops.editCrop') : t('crops.createCrop')} body={editing ? t('crops.editCropBody') : t('crops.createCropBody')} back={() => open('crops')} t={t}>
    {loading && <p className="calendar-empty">{t('crops.loading')}</p>}
    {error && <p className="calendar-empty">{error}</p>}
    {!loading && <Card className="form-card">
      <form onSubmit={submit}>
        <label>{t('crops.selectCrop')}
          <div className="crop-selector-grid">
            {crops.map((c) => <button type="button" key={c.id} className={`crop-option ${(!isOther && cropId === c.id) ? 'selected' : ''}`} onClick={() => { setCropId(c.id); setIsOther(false); }}>
              <span className="crop-option-icon">{(() => { const Icon = cropIconFor(c.name); return <Icon size={22} />; })()}</span>
              <span><strong>{c.name}</strong><small>{c.variety}</small></span>
            </button>)}
            <button type="button" className={`crop-option ${isOther ? 'selected' : ''}`} onClick={() => { setIsOther(true); setCropId(''); }}>
              <span className="crop-option-icon"><Plus size={22} /></span>
              <span><strong>{t('crops.otherCrop')}</strong><small>{t('crops.otherCropHint')}</small></span>
            </button>
          </div>
        </label>
        {isOther && <label>{t('crops.cropName')}<input type="text" value={customCropName} onChange={(e) => setCustomCropName(e.target.value)} placeholder={t('crops.cropNamePlaceholder')} required /></label>}
        <label>{t('crops.totalQuantity')}<input type="number" min="1" step="1" value={quantityKg} onChange={(e) => setQuantityKg(e.target.value)} required /></label>
        <label>{t('crops.areaAcres')}<input type="number" min="0" step="0.1" value={areaAcres} onChange={(e) => setAreaAcres(e.target.value)} /></label>
        {verifiedListing && <div className="farmeye-verified-panel"><Satellite size={20} /><span>Field verified — Active cultivation confirmed for this plot</span></div>}
        <label>{t('crops.pricePerKg')}<input type="number" min="0" step="0.01" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} /></label>
        <label>{t('crops.status')}<select value={status} onChange={(e) => setStatus(e.target.value as 'Upcoming' | 'Harvested')}><option value="Upcoming">{t('crops.Upcoming')}</option><option value="Harvested">{t('crops.Harvested')}</option></select></label>
        {status === 'Upcoming' && <label>{t('crops.harvestDate')}<input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} /></label>}
        {status === 'Harvested' && <label>{t('crops.harvestedDate')}<input type="date" value={harvestedAt} onChange={(e) => setHarvestedAt(e.target.value)} /></label>}
        <div className="row"><Button>{saving ? '…' : t('crops.save')}</Button><Button variant="outline" onClick={() => open('crops')}>{t('crops.cancel')}</Button></div>
      </form>
    </Card>}
  </Page>;
}

const vegetationReadings = [
  'Healthy crop canopy observed',
  'Active vegetation confirmed',
  'Dense ground cover detected',
  'Uniform green cover confirmed',
  'Flowering stage detected',
  'Broadleaf canopy confirmed',
  'Healthy plantation growth observed',
  'Active canopy growth confirmed',
  'Vigorous leaf cover detected',
  'Dense plantation canopy observed',
  'Bushy growth confirmed',
  'Even ground cover detected',
  'Lush foliar growth confirmed',
  'Healthy rhizome canopy observed',
];

const timingDescriptions = [
  'Maturity drop matches expected harvest date',
  'Onset of senescence aligns with reported harvest',
  'Canopy browning consistent with harvest timing',
  'Phenological stage confirmed at harvest date',
  'Crop maturity indicators aligned with report',
];

const quantityDescriptions = [
  'Yield estimate within expected range for plot area',
  'Harvested quantity consistent with canopy cover',
  'Reported tonnage matches NDVI-based estimate',
  'Volume within 10% of satellite-derived forecast',
  'Output confirmed against field-area biomass model',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function mockMapStyle(listingId: string, cropName: string): { bg: string; patches: { top: string; left: string; w: string; h: string; color: string; radius: string }[] } {
  const h = hashStr(listingId);
  const palettes = [
    ['#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a'],
    ['#dcedc8', '#c5e1a5', '#aed581', '#9ccc65'],
    ['#f1f8e9', '#dcedc8', '#c5e1a5', '#aed581'],
    ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784'],
    ['#fff8e1', '#ffecb3', '#ffe082', '#ffd54f'],
    ['#fbe9e7', '#ffccbc', '#ffab91', '#ff8a65'],
    ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6'],
    ['#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8'],
  ];
  const p = palettes[h % palettes.length];
  const shapes = [
    { top: '12%', left: '18%', w: '40%', h: '30%', color: p[2], radius: '55% 45% 50% 50%' },
    { top: '48%', left: '52%', w: '32%', h: '28%', color: p[3], radius: '50% 60% 45% 55%' },
    { top: '62%', left: '10%', w: '25%', h: '22%', color: p[1], radius: '45% 55% 50% 50%' },
    { top: '8%', left: '60%', w: '22%', h: '20%', color: p[2], radius: '60% 40% 55% 45%' },
  ];
  const offset = h % 4;
  const patches = [
    shapes[offset % 4],
    shapes[(offset + 1) % 4],
    shapes[(offset + 2) % 4],
  ];
  return { bg: p[0], patches };
}

function FarmEyeDetailView({ crop, open, t, backView = 'crop-detail' }: { crop: CropListing; open: (view: View) => void; t: T; backView?: View }) {
  const isListing = crop.listing_verified === true;
  const name = cropDisplayName(crop);
  const color = cropColorFor(name);

  const daysAgo = crop.listing_verified_at
    ? Math.max(0, Math.floor((Date.now() - new Date(crop.listing_verified_at).getTime()) / 86400000))
    : 0;

  const vegReading = crop.listing_vegetation_reading ?? vegetationReadings[hashStr(crop.id) % vegetationReadings.length];
  const timingDesc = timingDescriptions[hashStr(crop.id) % timingDescriptions.length];
  const quantityDesc = quantityDescriptions[hashStr(crop.id) % quantityDescriptions.length];
  const mapStyle = mockMapStyle(crop.id, name);

  return <Page title="Farm verification" body={`${name} · ${cropDisplayVariety(crop)}`} back={() => open(backView)} t={t}>
    {isListing ? (
      <>
        <Card className={`farmeye-map-card ${color}`}>
          <div className="farmeye-map-terrain" style={{ background: mapStyle.bg }}>
            {mapStyle.patches.map((patch, i) => (
              <div key={i} className="farmeye-map-patch" style={{
                position: 'absolute',
                top: patch.top,
                left: patch.left,
                width: patch.w,
                height: patch.h,
                background: patch.color,
                borderRadius: patch.radius,
              }} />
            ))}
            <div className="farmeye-map-overlay">
              <Satellite size={20} />
              <span>{t('journey.notLiveGps')}</span>
            </div>
          </div>
          <div className="farmeye-map-meta">
            <span className="farmeye-map-crop"><Sprout size={14} /> {name}</span>
            <span className="farmeye-map-pass"><Satellite size={13} /> {daysAgo} day{daysAgo === 1 ? '' : 's'} ago</span>
          </div>
        </Card>
        <Card className="farmeye-detail-card">
          <div className="farmeye-detail-row">
            <span className="farmeye-detail-icon"><Check size={16} strokeWidth={3} /></span>
            <div className="farmeye-detail-body">
              <strong>Checkpoint</strong>
              <small>Listing verified</small>
            </div>
          </div>
          <div className="farmeye-detail-row">
            <span className="farmeye-detail-icon"><Satellite size={16} /></span>
            <div className="farmeye-detail-body">
              <strong>Satellite pass</strong>
              <small>{daysAgo} day{daysAgo === 1 ? '' : 's'} ago</small>
            </div>
          </div>
          <div className="farmeye-detail-row">
            <span className="farmeye-detail-icon"><Leaf size={16} /></span>
            <div className="farmeye-detail-body">
              <strong>Vegetation reading</strong>
              <small>{vegReading}</small>
            </div>
          </div>
        </Card>
      </>
    ) : (
      <>
        <Card className="farmeye-timeline-card">
          <div className="farmeye-timeline">
            <span className="farmeye-timeline-node done"><Check size={14} strokeWidth={3} /></span>
            <span className="farmeye-timeline-line" />
            <span className="farmeye-timeline-node done"><Check size={14} strokeWidth={3} /></span>
            <span className="farmeye-timeline-label">Listed</span>
            <span />
            <span className="farmeye-timeline-label">Harvested</span>
          </div>
        </Card>
        {crop.harvest_timing_verified && (
          <Card className="farmeye-checkpoint-box">
            <ShieldCheck size={22} />
            <div>
              <strong>Timing</strong>
              <p>{timingDesc}</p>
            </div>
          </Card>
        )}
        {crop.harvest_quantity_verified && (
          <Card className="farmeye-checkpoint-box">
            <ShieldCheck size={22} />
            <div>
              <strong>Quantity</strong>
              <p>{quantityDesc}</p>
            </div>
          </Card>
        )}
      </>
    )}
  </Page>;
}

function App() { const { role: authRole, profile, signInWithRole, signOut: authSignOut, updateLanguage, loading, signingIn, authError, clearError } = useAuth(); const [view, setView] = useState<View>('home'); const [loginRole, setLoginRole] = useState<Role | null>(null); const [voice, setVoice] = useState(false); const [notifications, setNotifications] = useState(false); const [language, setLanguageState] = useState<Language>('English'); const [toast, setToast] = useState(''); const [notifItems, setNotifItems] = useState<NotificationRow[]>([]); const [notifLoading, setNotifLoading] = useState(false); const [notifError, setNotifError] = useState<string | null>(null); const [selectedCrop, setSelectedCrop] = useState<CropListing | null>(null); const [selectedJourneyConsignment, setSelectedJourneyConsignment] = useState<TpConsignment | null>(null); const [formDraft, setFormDraftState] = useState<Record<string, string>>({}); const [loginStep, setLoginStep] = useState(0); const [loginMobile, setLoginMobile] = useState('+91 98765 43210'); const [loginOtp, setLoginOtp] = useState(''); const [loginBuyerCat, setLoginBuyerCat] = useState('Normal Buyer'); const [pendingDestinationView, setPendingDestinationView] = useState<string | null>(null); const role = (authRole && (allRoles as string[]).includes(authRole)) ? (authRole as Role) : null; const buyerCategory = profile?.buyer_category ?? 'Normal Buyer'; const appSpeakingRef = useRef(false); const pendingNarrationRef = useRef<string | null>(null); const narratedTabsRef = useRef<Set<string>>((() => { try { const stored = sessionStorage.getItem('narratedTabs'); if (stored) return new Set(JSON.parse(stored)); } catch {} return new Set(); })()); const autoVoiceConsentRef = useRef<'pending' | 'granted' | 'declined'>('pending'); const prefetchedAudioRef = useRef<{ text: string; promise: Promise<Blob | null> } | null>(null); const persistNarratedTabs = useCallback((set: Set<string>) => { try { sessionStorage.setItem('narratedTabs', JSON.stringify([...set])); } catch {} }, []); const speakNarrationOnly = useCallback(async (text: string) => { if (appSpeakingRef.current) { pendingNarrationRef.current = text; return; } appSpeakingRef.current = true; const prefetched = prefetchedAudioRef.current; const audio = prefetched && prefetched.text === text ? (await prefetched.promise) : await speakTextViaSarvam(text, language); if (prefetched && prefetched.text === text) prefetchedAudioRef.current = null; if (!audio) { emitDebug('narration', 'Sarvam TTS failed for narration — skipping audible reply'); appSpeakingRef.current = false; const pending = pendingNarrationRef.current; if (pending) { pendingNarrationRef.current = null; speakNarrationOnly(pending); } return; } playAudioBlob(audio, () => { appSpeakingRef.current = false; const pending = pendingNarrationRef.current; if (pending) { pendingNarrationRef.current = null; speakNarrationOnly(pending); } }); }, [language]); useEffect(() => { if (!role || voice) return; const narrationKey = view; if (narratedTabsRef.current.has(narrationKey)) return; const tr = makeT(language); const narration = getTabNarration(view, tr); if (!narration) return; const promptKey = `voice.tabActionPrompt.${view}`; const prompt = tr(promptKey); const full = prompt !== promptKey ? `${narration} ${prompt}` : narration; narratedTabsRef.current.add(narrationKey); persistNarratedTabs(narratedTabsRef.current); if (appSpeakingRef.current) { pendingNarrationRef.current = full; return; } speakNarrationOnly(full); }, [view, role, voice, language, speakNarrationOnly, persistNarratedTabs]); useEffect(() => { if (profile?.language) setLanguageState(languageFromCode(profile.language)); }, [profile?.language]); const setLanguage = (lang: Language) => { setLanguageState(lang); updateLanguage(codeFromLanguage(lang)); }; const t = useMemo(() => makeT(language), [language]); const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2300); }; const open = (next: View) => { stopAudio(); stopSpeaking(); appSpeakingRef.current = false; pendingNarrationRef.current = null; prefetchedAudioRef.current = null; const tr = makeT(language); const narration = getTabNarration(next, tr); const promptKey = `voice.tabActionPrompt.${next}`; const prompt = tr(promptKey); const full = prompt !== promptKey ? `${narration} ${prompt}` : narration; if (full) prefetchedAudioRef.current = { text: full, promise: speakTextViaSarvam(full, language) }; setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }; useEffect(() => { if (loginRole) setVoice(true); }, [loginRole]); const setFormDraft = useCallback((field: string, value: string) => { setFormDraftState((prev) => ({ ...prev, [field]: value })); }, []); const setLoginFieldVoice = useCallback((field: 'mobile' | 'otp' | 'buyerCategory', value: string) => { if (field === 'mobile') { setLoginMobile(value); setLoginStep(1); } else if (field === 'otp') { setLoginOtp(value); setLoginStep(2); } else if (field === 'buyerCategory') setLoginBuyerCat(value); }, []); const submitLoginVoice = useCallback(async () => { if (!loginRole || signingIn) return; try { await signInWithRole(loginRole, loginRole === 'Farmer' ? rameshEmail : demoEmails[loginRole], 'Demo1234!', loginBuyerCat); const dest = pendingDestinationView; setLoginRole(null); setLoginStep(0); setLoginMobile('+91 98765 43210'); setLoginOtp(''); setPendingDestinationView(null); setVoice(false); setView((dest ? (dest as View) : 'home')); } catch { } }, [loginRole, signingIn, loginBuyerCat, pendingDestinationView]); const autoRouteToDestination = useCallback((destinationView: string, requiredRole: string) => { setLoginRole(requiredRole as Role); setLoginStep(0); setLoginMobile('+91 98765 43210'); setLoginOtp(''); setLoginBuyerCat('Normal Buyer'); setPendingDestinationView(destinationView); }, []); const loadNotifications = useCallback(async () => { if (!role) return; setNotifLoading(true); setNotifError(null); try { await seedDemoNotificationsIfNeeded(); setNotifItems(await fetchNotifications()); } catch { setNotifError(t('notifications.loadError')); } finally { setNotifLoading(false); } }, [role, t]); useEffect(() => { loadNotifications(); }, [loadNotifications]); const handleMarkRead = async (id: string) => { try { await markNotificationRead(id); setNotifItems((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)); } catch { } }; const handleMarkAllRead = async () => { try { await markAllNotificationsRead(); setNotifItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))); } catch { } }; const unreadCount = notifItems.filter((n) => !n.read_at).length; const signOut = () => { stopAudio(); stopSpeaking(); appSpeakingRef.current = false; pendingNarrationRef.current = null; narratedTabsRef.current.clear(); try { sessionStorage.removeItem('narratedTabs'); } catch {} authSignOut(); setView('home'); }; const addAccount = () => { stopAudio(); stopSpeaking(); appSpeakingRef.current = false; pendingNarrationRef.current = null; narratedTabsRef.current.clear(); try { sessionStorage.removeItem('narratedTabs'); } catch {} authSignOut(); setView('home'); }; if (loading) return <main className="login-screen"><div className="login-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ display: 'grid', placeItems: 'center', width: '31px', height: '31px', borderRadius: '9px', color: '#fff', background: '#2c823b' }}><Sprout size={27} /></span><strong>{t('app.name')}</strong></div></main>; if (!role && loginRole) return <><LoginFlow role={loginRole} t={t} step={loginStep} setStep={setLoginStep} mobile={loginMobile} setMobile={setLoginMobile} otp={loginOtp} setOtp={setLoginOtp} buyerCat={loginBuyerCat} setBuyerCat={setLoginBuyerCat} done={async (email, password, buyerCategory) => { if (signingIn) return; try { await signInWithRole(loginRole, email, password, buyerCategory); setLoginRole(null); setLoginStep(0); setVoice(false); setView('home'); } catch { } }} back={() => { clearError(); setLoginRole(null); setVoice(false); }} authError={authError} clearError={clearError} signingIn={signingIn} /><VoiceButton onClick={() => { warmupSpeech(); setVoice(true); }} t={t} />{voice && <VoiceModal close={() => setVoice(false)} t={t} language={language} currentView={loginStep === 0 ? (loginRole === 'Farmer' ? 'login-farmer' : loginRole === 'FPO' ? 'login-fpo' : 'login-mobile') : loginStep === 1 ? 'login-otp' : (loginRole === 'Buyer' ? 'login-category' : 'login-verify')} loginRole={loginRole} isLoggedIn={!!role} autoRouteToDestination={autoRouteToDestination} selectRole={(r) => setLoginRole(r as Role)} setLoginStep={setLoginStep} setLoginField={setLoginFieldVoice} submitLogin={submitLoginVoice} role={loginRole ?? null} appSpeakingRef={appSpeakingRef} appPendingNarrationRef={pendingNarrationRef} speakNarrationOnly={speakNarrationOnly} narratedTabsRef={narratedTabsRef} autoVoiceConsentRef={autoVoiceConsentRef} />}{toast && <div className="toast"><AlertTriangle size={17} />{toast}</div>}</>; if (!role) return <><Login onRole={setLoginRole} voiceOpen={() => { warmupSpeech(); setVoice(true); }} t={t} language={language} />{voice && <VoiceModal close={() => setVoice(false)} t={t} language={language} currentView={loginRole ? (loginRole === 'Farmer' ? 'login-farmer' : loginRole === 'FPO' ? 'login-fpo' : 'login-mobile') : 'login'} isLoggedIn={!!role} role={null} autoRouteToDestination={autoRouteToDestination} selectRole={(r) => setLoginRole(r as Role)} setLoginStep={setLoginStep} setLoginField={setLoginFieldVoice} submitLogin={submitLoginVoice} appSpeakingRef={appSpeakingRef} appPendingNarrationRef={pendingNarrationRef} speakNarrationOnly={speakNarrationOnly} narratedTabsRef={narratedTabsRef} autoVoiceConsentRef={autoVoiceConsentRef} />}</>; return <div className="logged-in">{view === 'home' && <main className="long-scroll"><RoleHome role={role} open={open} profile={() => open('profile')} notifications={() => setNotifications(true)} t={t} profileData={profile} /></main>}{view === 'crops' && <CropView open={open} selectCrop={setSelectedCrop} t={t} role={role} notify={notify} currentUserId={profile?.id} />}{view === 'crop-detail' && selectedCrop && <CropDetail open={open} crop={selectedCrop} t={t} role={role} onEdit={() => open('crop-edit')} onMarkHarvested={async () => { try { await markAsHarvested(selectedCrop.id, new Date().toISOString()); notify(t('crops.markedHarvested')); setSelectedCrop({ ...selectedCrop, status: 'Harvested', harvested_at: new Date().toISOString() }); open('crops'); } catch { notify(t('crops.createError')); } }} />}{view === 'buyer-crop-detail' && selectedCrop && <BuyerCropDetail crop={selectedCrop} open={open} t={t} />}{view === 'buyer-payment' && selectedCrop && <BuyerPaymentView crop={selectedCrop} open={open} notify={notify} t={t} />}{view === 'farmeye-detail' && selectedCrop && <FarmEyeDetailView crop={selectedCrop} open={open} t={t} backView={role === 'Buyer' ? 'buyer-crop-detail' : 'crops'} />}{view === 'crop-create' && <CropFormView open={open} notify={notify} t={t} voiceFill={formDraft} formDraft={formDraft} />}{view === 'crop-edit' && selectedCrop && <CropFormView open={open} notify={notify} t={t} editing={selectedCrop} voiceFill={formDraft} formDraft={formDraft} />}{view === 'market' && <MarketView role={role} open={open} notify={notify} t={t} selectCrop={setSelectedCrop} />}{view === 'calendar' && <CalendarView open={open} t={t} profileData={profile} />}{view === 'transport-options' && <TransportOptions role={role} open={open} notify={notify} t={t} profileData={profile} />}{view === 'transport-detail' && <TransportDetail open={open} notify={notify} t={t} />}{view === 'journey' && <JourneyView open={open} notify={notify} t={t} consignment={selectedJourneyConsignment} />}{view === 'storage' && <StorageView role={role} open={open} notify={notify} t={t} />}{view === 'approvals' && <ApprovalsView open={open} notify={notify} t={t} />}{view === 'fpo' && <FpoView open={open} notify={notify} t={t} />}{view === 'tutorials' && <TutorialsView role={role} open={open} t={t} language={language} voiceOpen={() => { warmupSpeech(); setVoice(true); }} />}{view === 'help' && <HelpView open={open} notify={notify} t={t} />}{view === 'dispute' && <DisputeView open={open} notify={notify} t={t} />}{view === 'profile' && <ProfileView role={role} open={open} language={language} setLanguage={setLanguage} buyerCategory={buyerCategory} signOut={signOut} addAccount={addAccount} t={t} profileData={profile} />}{view === 'settings' && <SettingsView open={open} language={language} setLanguage={setLanguage} t={t} />}{view === 'orders' && <OrdersView role={role} open={open} notify={notify} t={t} />}{view === 'deals' && <DealsView open={open} notify={notify} t={t} />}{view === 'features' && <FeatureView role={role} open={open} notify={notify} t={t} profile={() => open('profile')} onNotifications={() => setNotifications(true)} onOpenJourney={(c) => { setSelectedJourneyConsignment(c); open('journey'); }} />}<div className="floating-tools"><button onClick={() => open('profile')} aria-label={t('profile.title')}><UserRound size={24} /></button><button onClick={() => setNotifications(true)} aria-label={t('notifications.title')}><Bell size={24} />{unreadCount > 0 && <i>{unreadCount}</i>}</button></div><VoiceButton onClick={() => { warmupSpeech(); setVoice(true); }} t={t} />{voice && <VoiceModal close={() => setVoice(false)} t={t} language={language} open={open} currentView={view} isLoggedIn={!!role} role={role} autoRouteToDestination={autoRouteToDestination} setFormDraft={setFormDraft} formDraft={formDraft} setLanguage={setLanguage} selectRole={(r) => { authSignOut(); setLoginRole(r as Role); }} appSpeakingRef={appSpeakingRef} appPendingNarrationRef={pendingNarrationRef} speakNarrationOnly={speakNarrationOnly} narratedTabsRef={narratedTabsRef} autoVoiceConsentRef={autoVoiceConsentRef} />}{notifications && <Notifications close={() => setNotifications(false)} t={t} items={notifItems} loading={notifLoading} error={notifError} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} />}{toast && <div className="toast"><Check size={17} />{toast}</div>}</div>; }
export default App;
