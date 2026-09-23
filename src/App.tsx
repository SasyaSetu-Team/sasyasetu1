import { useState, useEffect, useCallback, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, Bell, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Eye, EyeOff, FileCheck2, Filter, Handshake, Headphones, Leaf, Layers, Map, MapPin, Mic, Minus, Package, Phone, Plus, Printer, RotateCcw, Satellite, Scissors, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Sprout, Star, TrendingDown, Truck, UserRound, Users, Warehouse, X, Zap } from 'lucide-react';
import { allLanguages, makeT, codeFromLanguage, languageFromCode, type Language, type T } from '@/translations';
import { demoEmails, farmerDemoEmails, useAuth, type Profile } from '@/lib/auth';
const rameshEmail = farmerDemoEmails.find((f) => f.name === 'Ramesh Kumar')?.email ?? farmerDemoEmails[0].email;
import { fetchCrops, fetchMyListings, fetchPublicListings, fetchListing, createListing, updateListing, markAsHarvested, buyNow, bookListing, fetchMyOrders, computeCurrentPrice, nextDropMinutes, computeClusterCurrentPrice, clusterNextDropMinutes, bookedQuantity, formatKg, formatPrice, formatDate, cropDisplayName, cropDisplayVariety, OTHER_CROP_ID, fetchClusters, formatHarvestWindow, timeLeftUntil, fetchClusterInvites, fetchClusterMemberships, fetchClusterMembers, joinCluster, dismissClusterInvite, type Crop, type CropListing, type CropListingInput, type CropClusterWithMembers, type ClusterInvite, type ClusterMembership, type ClusterMemberDetail, type BuyNowResult, type OrderRow, type BookResult } from '@/lib/crops';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, seedDemoNotificationsIfNeeded, type NotificationRow } from '@/lib/notifications';
import { parseCommand, parseStatus, parseNumber, parseLanguageChange, extractValue, isSpeechRecognitionSupported, isSpeechSynthesisSupported, createRecognition, speak, stopSpeaking, warmupSpeech, langCode, captureScreenText, subscribeDebug, getSynthState, emitDebug, isYesCommand, isNoCommand, isYesCommandAnyLang, isNoCommandAnyLang, type VoiceRecognition, type DebugEvent } from '@/lib/voice';
import { useVoiceSession, speakTextViaSarvam, getTabNarration, type FormField, type SarvamVoiceResult } from '@/lib/useVoiceSession';
import { playAudioBlob, stopAudio } from '@/lib/playAudio';
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

function VoiceModal({ close, t, language, open, currentView, setFormDraft, formDraft, setLanguage, selectRole, setLoginStep, setLoginField, submitLogin, loginRole, isLoggedIn, autoRouteToDestination, appSpeakingRef, appPendingNarrationRef, speakNarrationOnly, narratedTabsRef, autoVoiceConsentRef }: {
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
  const consentModeRef = useRef(false);
  const consentAskedRef = useRef(false);

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
    setVoiceState('speaking');
    setConv('TRANSCRIBING');
    emitDebug('sarvam turn', 'starting record+stt+intent+tts');
    emitDebug('mic', 'requesting microphone access via getUserMedia');
    if (consentModeRef.current) {
      const transcript = await transcribeOnly();
      consentModeRef.current = false;
      const lang = languageRef.current;
      const heard = transcript && transcript.trim() ? transcript.trim() : '';
      emitDebug('consent', `heard: "${heard.slice(0, 80)}" | isYesAny=${isYesCommandAnyLang(heard)} | isNoAny=${isNoCommandAnyLang(heard)}`);

      if (heard && isYesCommandAnyLang(heard) && !isNoCommandAnyLang(heard)) {
        emitDebug('consent', 'granted');
        if (autoVoiceConsentRef) autoVoiceConsentRef.current = 'granted';
        setConv('SPEAKING');
        const audio = await speakTextViaSarvam(t('voice.consentGranted'), lang);
        const narrateAfterConsent = () => {
          const narration = narrateScreen(currentViewRef.current);
          if (narration) {
            narratedTabsRef?.current.add(currentViewRef.current);
            speakSarvamAndListenRef.current(narration);
          } else {
            speakingRef.current = false;
            drainRef.current();
            if (sessionRef.current) {
              setConv('WAIT_FOR_SPEECH');
              setTimeout(() => {
                if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
              }, 400);
            }
          }
        };
        if (audio) {
          playAudioBlob(audio, () => { narrateAfterConsent(); });
        } else {
          speak(t('voice.consentGranted'), lang, () => { narrateAfterConsent(); });
        }
      } else if (heard && isNoCommandAnyLang(heard)) {
        emitDebug('consent', 'declined (explicit no)');
        if (autoVoiceConsentRef) autoVoiceConsentRef.current = 'declined';
        setConv('SPEAKING');
        speak(t('voice.consentDeclined'), lang, () => {
          speakingRef.current = false;
          sessionRef.current = false;
          setSessionActive(false);
          setVoiceState('idle');
          setConv('IDLE');
          setDebugStep('none');
        });
      } else {
        emitDebug('consent', `unclear ("${heard.slice(0, 40)}") — retrying once`);
        consentModeRef.current = true;
        setConv('SPEAKING');
        speak(t('voice.consentQuestion'), lang, () => {
          speakingRef.current = false;
          if (sessionRef.current) {
            setConv('WAIT_FOR_SPEECH');
            setTimeout(() => {
              if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
            }, 400);
          }
        });
      }
      return;
    }
    const result: SarvamVoiceResult | null = await processSarvamVoiceTurn();
    if (!result) {
      emitDebug('sarvam turn', 'FAILED — speaking audible fallback via browser TTS');
      if (sessionRef.current) {
        setConv('SPEAKING');
        speak(t('voice.didNotUnderstand'), languageRef.current, () => {
          speakingRef.current = false;
          drainRef.current();
          if (sessionRef.current) {
            setConv('WAIT_FOR_SPEECH');
            setTimeout(() => {
              if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
            }, 400);
          }
        });
      } else {
        speakingRef.current = false;
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
    const stepBeforePlay = s.step;
    playAudioBlob(result.replyAudio, () => {
      speakingRef.current = false;
      drainRef.current();
      if (sessionRef.current) {
        const stepAfterPlay = stateRef.current.step;
        const isLoginView = currentViewRef.current.startsWith('login-');
        if (isLoginView && stepAfterPlay && stepAfterPlay !== stepBeforePlay) {
          emitDebug('sarvam turn', `step advanced ${stepBeforePlay} → ${stepAfterPlay}, narrating new step`);
          if (appPendingNarrationRef) appPendingNarrationRef.current = null;
          narrationQueuedRef.current = false;
          const narration = narrateScreen(currentViewRef.current, stepAfterPlay);
          if (narration) {
            const nKey = `${currentViewRef.current}:${stepAfterPlay}`;
            narratedTabsRef?.current.add(nKey);
            lastNarrationKeyRef.current = nKey;
            lastNarrationViewRef.current = currentViewRef.current;
            speakSarvamAndListenRef.current(narration);
            return;
          }
        }
        setConv('WAIT_FOR_SPEECH');
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
        }, 400);
      }
    });
  }, [processSarvamVoiceTurn, transcribeOnly, narrateScreen, setConv, t]);

  const speakSarvamAndListenRef = useRef(async (_text: string, _postDelay = 400) => {});
  const speakSarvamAndListen = useCallback(async (text: string, postDelay = 400) => {
    speakingRef.current = true;
    recognitionRef.current?.stop();
    setVoiceState('speaking');
    setConv('SPEAKING');
    setInterim('');
    const stepBeforeSpeak = stateRef.current.step;
    const audio = await speakTextViaSarvam(text, languageRef.current);
    if (!audio) {
      emitDebug('speakSarvam', 'TTS failed — falling back to browser speak');
      speak(text, languageRef.current, () => {
        speakingRef.current = false;
        drainRef.current();
        if (sessionRef.current) {
          const isLoginV = currentViewRef.current.startsWith('login-');
          const stepAfter = stateRef.current.step;
          if (isLoginV && stepAfter && stepAfter !== stepBeforeSpeak) {
            emitDebug('speakSarvam', `step advanced ${stepBeforeSpeak} → ${stepAfter}, narrating new step`);
            if (appPendingNarrationRef) appPendingNarrationRef.current = null;
            narrationQueuedRef.current = false;
            const narration = narrateScreen(currentViewRef.current, stepAfter);
            if (narration) {
              const nKey = `${currentViewRef.current}:${stepAfter}`;
              narratedTabsRef?.current.add(nKey);
              lastNarrationKeyRef.current = nKey;
              lastNarrationViewRef.current = currentViewRef.current;
              speakSarvamAndListenRef.current(narration);
              return;
            }
          }
          setConv('WAIT_FOR_SPEECH');
          setTimeout(() => {
            if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
          }, postDelay);
        }
      });
      return;
    }
    playAudioBlob(audio, () => {
      speakingRef.current = false;
      drainRef.current();
      if (sessionRef.current) {
        const isLoginV = currentViewRef.current.startsWith('login-');
        const stepAfter = stateRef.current.step;
        if (isLoginV && stepAfter && stepAfter !== stepBeforeSpeak) {
          emitDebug('speakSarvam', `step advanced ${stepBeforeSpeak} → ${stepAfter}, narrating new step`);
          if (appPendingNarrationRef) appPendingNarrationRef.current = null;
          narrationQueuedRef.current = false;
          const narration = narrateScreen(currentViewRef.current, stepAfter);
          if (narration) {
            const nKey = `${currentViewRef.current}:${stepAfter}`;
            narratedTabsRef?.current.add(nKey);
            lastNarrationKeyRef.current = nKey;
            lastNarrationViewRef.current = currentViewRef.current;
            speakSarvamAndListenRef.current(narration);
            return;
          }
        }
        setConv('WAIT_FOR_SPEECH');
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
        }, postDelay);
      }
    });
  }, [startSarvamTurn, narrateScreen, setConv]);
  useEffect(() => { speakSarvamAndListenRef.current = speakSarvamAndListen; }, [speakSarvamAndListen]);

  const drainPendingNarration = useCallback(() => {
    if (!appPendingNarrationRef || !appSpeakingRef) return;
    const pending = appPendingNarrationRef.current;
    if (!pending) return;
    if (appSpeakingRef.current) return;
    appPendingNarrationRef.current = null;
    narrationQueuedRef.current = false;
    emitDebug('narration drain', `draining queued narration: "${pending.slice(0, 50)}"`);
    if (speakNarrationOnly) speakNarrationOnly(pending);
  }, [appPendingNarrationRef, appSpeakingRef, speakNarrationOnly]);

  useEffect(() => { drainRef.current = drainPendingNarration; }, [drainPendingNarration]);

  const lastNarrationViewRef = useRef<string>('');
  const lastNarrationKeyRef = useRef<string>('');
  const narrationQueuedRef = useRef(false);
  useEffect(() => {
    if (currentView !== lastNarrationViewRef.current && lastNarrationViewRef.current !== '') {
      if (speakingRef.current) {
        emitDebug('narration effect', `view changed ${lastNarrationViewRef.current} → ${currentView} — speaking, will not cancel`);
      } else {
        stopAudio(); stopSpeaking(); speakingRef.current = false;
        if (appSpeakingRef) { appSpeakingRef.current = false; if (appPendingNarrationRef) appPendingNarrationRef.current = null; }
        narrationQueuedRef.current = false;
        emitDebug('narration effect', `view changed ${lastNarrationViewRef.current} → ${currentView} — cancelled speech`);
      }
    }
    if (autoVoiceConsentRef?.current === 'declined') { emitDebug('narration effect', 'SKIP: auto voice consent declined'); return; }
    if (speakingRef.current) {
      if (narrationQueuedRef.current) { emitDebug('narration effect', `SKIP: already queued for ${currentView}`); return; }
      emitDebug('narration effect', 'QUEUE: speakingRef is true — deferring narration');
      const isLoginViewQ = currentView.startsWith('login-');
      const narration = narrateScreen(currentView, isLoginViewQ ? (state.step ?? undefined) : undefined);
      if (narration && appPendingNarrationRef) appPendingNarrationRef.current = narration;
      if (narration) narrationQueuedRef.current = true;
      lastNarrationViewRef.current = currentView;
      lastNarrationKeyRef.current = isLoginViewQ ? `${currentView}:${state.step ?? 'none'}` : currentView;
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
      if (autoVoiceConsentRef?.current === 'pending' && !consentAskedRef.current) {
        consentAskedRef.current = true;
        consentModeRef.current = true;
        emitDebug('narration effect', 'CONSENT: asking standalone consent question with 1s pause');
        narratedTabsRef?.current.add(narrationKey);
        narrationQueuedRef.current = false;
        speakSarvamAndListen(t('voice.consentQuestion'), 1000);
        return;
      }
      if (autoVoiceConsentRef?.current !== 'granted') {
        emitDebug('narration effect', 'SKIP: consent not granted');
        return;
      }
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
    if (autoVoiceConsentRef?.current === 'granted') {
      emitDebug('narration effect', `normal path | view=${currentView} step=${state.step ?? 'none'}`);
      lastNarrationViewRef.current = currentView;
      lastNarrationKeyRef.current = narrationKey;
      const narration = narrateScreen(currentView, isLoginView ? (state.step ?? undefined) : undefined);
      if (narration) { narratedTabsRef?.current.add(narrationKey); narrationQueuedRef.current = false; speakSarvamAndListen(narration); }
    }
  }, [currentView, narrateScreen, speakSarvamAndListen, loginRole, state.step, appPendingNarrationRef, narratedTabsRef, autoVoiceConsentRef, t]);

  const handleFinalResult = useCallback(async (text: string) => {
    setTranscript(text);
    setInterim('');
    recognitionRef.current?.stop();
    setConv('TRANSCRIBING');
    const screenContext = captureScreenText();
    setConv('VALIDATING');
    speakingRef.current = true;
    const response = await processUtteranceAsync(text, screenContext);
    const s = stateRef.current;
    if (response) {
      setDebugStep(s.step ?? 'none');
      if (s.awaitingConfirmation) setConv('CONFIRMING');
      speakSarvamAndListen(response);
    } else {
      speakingRef.current = false;
      drainRef.current();
      if (sessionRef.current) {
        setConv('WAIT_FOR_SPEECH');
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current && !appSpeakingRef?.current) startSarvamTurn();
        }, 400);
      }
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
    if (consentModeRef.current) {
      consentModeRef.current = false;
      if (autoVoiceConsentRef) autoVoiceConsentRef.current = 'declined';
    }
    sessionRef.current = false;
    setSessionActive(false);
    setVoiceState('idle');
    setConv('IDLE');
    setDebugStep('none');
    recognitionRef.current?.stop();
    stopSpeaking();
    speakingRef.current = false;
    if (appSpeakingRef) appSpeakingRef.current = false;
    if (appPendingNarrationRef) appPendingNarrationRef.current = null;
  }, [setConv, appPendingNarrationRef, appSpeakingRef, autoVoiceConsentRef]);

  useEffect(() => {
    return () => {
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
        {sessionActive && (
          <div style={{ padding: '4px 12px 8px', fontSize: '10px', fontFamily: 'monospace', color: '#888', borderTop: '1px solid #eee' }}>
            [DEBUG] conv: {convState} | step: {debugStep} | intent: {state.activeIntent ?? 'none'}{state.awaitingConfirmation ? ' | awaitingConfirm' : ''}
          </div>
        )}
        <div style={{ padding: '6px 12px 10px', fontSize: '11px', fontFamily: 'monospace', color: '#333', background: '#fffaeb', borderTop: '2px solid #f59e0b', maxHeight: '240px', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', color: '#b45309' }}>VOICE DEBUG PANEL</div>
          <div style={{ marginBottom: '4px', color: '#92400e' }}>Synth: {synthSnapshot || '(no events yet)'}</div>
          {debugEvents.length === 0 && <div style={{ color: '#aaa' }}>No events yet. Tap a role card to start.</div>}
          {debugEvents.map((e, i) => (
            <div key={i} style={{ borderBottom: '1px dotted #ddd', paddingBottom: '2px', marginBottom: '2px' }}>
              <span style={{ color: '#666' }}>{e.time}</span>{' '}
              <strong style={{ color: e.label.includes('error') || e.label.includes('threw') ? '#dc2626' : '#065f46' }}>{e.label}</strong>{' '}
              <span style={{ color: '#444' }}>{e.detail}</span>
            </div>
          ))}
        </div>
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

  return <main className="login-flow"><button className="back-button" onClick={back}><ArrowLeft size={18} /> {t('common.back')}</button><div className="flow-grid"><div><Illustration label={roleMeta[role].illustration} color={roleColor} icon={roleIcon} photo={rolePhoto} /><h1>{t(`role.${role}`)} {t('login.continue').toLowerCase()}</h1><p>{t('login.useSampleDetails', { role: t(`role.${role}`) })}</p><Demo>{t('login.demoAccount')}</Demo></div><Card className="login-form"><div className="step-indicator">{Array.from({ length: totalSteps }).map((_, i) => <span key={i} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />)}</div>{renderStep()}</Card></div></main>;
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
  'Live Journey': 'https://images.pexels.com/photos/29057946/pexels-photo-29057946.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
};

function featurePhotoFor(titleKey: string): string | null {
  const key = titleKey.replace('feature.', '');
  return featureCardPhotos[key] ?? null;
}

function FeatureCard({ title, body, icon: Icon, color, onClick, photo }: { title: string; body: string; icon: IconType; color: string; onClick: () => void; photo?: string | null }) { return <button className="feature-card feature-card-photo" onClick={onClick}>{photo ? <><div className="feature-card-image-wrap"><img className="feature-card-image" src={photo} alt="" loading="lazy" /></div><div className="feature-card-label"><strong>{title}</strong><ArrowRight size={19} /></div></> : <><span className={`feature-icon ${color}`}><Icon size={27} /></span><span><strong>{title}</strong><small>{body}</small></span><ArrowRight size={19} /></>}</button>; }
function RoleHome({ role, open, profile, notifications, t, profileData }: { role: Role; open: (view: View) => void; profile: () => void; notifications: () => void; t: T; profileData?: Profile | null }) { const feature = (titleKey: string, bodyKey: string, icon: IconType, color: string, view: View) => <FeatureCard title={t(titleKey)} body={t(bodyKey)} icon={icon} color={color} onClick={() => open(view)} photo={featurePhotoFor(titleKey)} />; const homeLocation = (role === 'Farmer' && profileData?.home_location) ? profileData.home_location : roleMeta[role].location; return <><section className="welcome welcome-white"><div><Badge tone="green">{t('home.workspace', { role: t(`role.${role}`) })}</Badge><h1>{t(`home.greeting.${role}`)}</h1><p>{homeLocation}</p><div className="welcome-actions"><button onClick={profile}><UserRound size={18} /> {t('home.profile')}</button><button onClick={notifications}><Bell size={18} /> {t('home.notifications')}</button></div></div><Illustration label={roleMeta[role].illustration} color={roleMeta[role].color} /></section><div className="feature-grid">{role === 'Farmer' && <>{feature('feature.My Crops', 'feature.My Crops.body', Leaf, 'green', 'crops')}{feature('feature.Market', 'feature.Market.body', ShoppingBag, 'blue', 'market')}{feature('feature.Harvest Calendar', 'feature.Harvest Calendar.body', CalendarDays, 'orange', 'calendar')}{feature('feature.Transport', 'feature.Transport.body', Truck, 'teal', 'transport-options')}{feature('feature.Storage', 'feature.Storage.body', Warehouse, 'amber', 'storage')}{feature('feature.FPO Network', 'feature.FPO Network.body', Users, 'green', 'fpo')}{feature('feature.Tutorials', 'feature.Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Help & Dispute.body', CircleHelp, 'orange', 'help')}</>}{role === 'Buyer' && <>{feature('feature.Explore Crops', 'feature.Explore Crops.body', Search, 'green', 'market')}{feature('feature.My Orders', 'feature.My Orders.body', Package, 'blue', 'orders')}{feature('feature.Deals', 'feature.Deals.body', ShieldCheck, 'teal', 'deals')}{feature('feature.Tutorials', 'feature.Buyer Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Help & Dispute.body', CircleHelp, 'orange', 'help')}</>}{role === 'FPO' && <>{feature('feature.Member Crops', 'feature.Member Crops.body', Leaf, 'green', 'crops')}{feature('feature.Market', 'feature.Market FPO.body', ShoppingBag, 'blue', 'market')}{feature('feature.Harvest Calendar', 'feature.Member Calendar.body', CalendarDays, 'orange', 'calendar')}{feature('feature.Transport Provider', 'feature.Transport Provider.body', Truck, 'teal', 'transport-options')}{feature('feature.Storage', 'feature.Storage FPO.body', Warehouse, 'amber', 'storage')}{feature('feature.Tutorials', 'feature.FPO Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.FPO Help.body', CircleHelp, 'orange', 'help')}</>}{role === 'Storage Provider' && <>{feature('feature.Main Summary', 'feature.Main Summary.body', Zap, 'green', 'features')}{feature('feature.Storage Requests', 'feature.Storage Requests.body', Bell, 'blue', 'storage')}{feature('feature.My Approvals', 'feature.My Approvals.body', FileCheck2, 'teal', 'approvals')}{feature('feature.Tutorials', 'feature.Storage Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Provider Help.body', CircleHelp, 'orange', 'help')}</>}{role === 'Transport Provider' && <>{feature('feature.Cold Storage Requests', 'feature.Cold Storage Requests.body', Warehouse, 'amber', 'features')}{feature('feature.Farmer Requests', 'feature.Farmer Requests.body', Sprout, 'green', 'features')}{feature('feature.My Orders', 'feature.My Orders.body', Package, 'teal', 'orders')}{feature('feature.Live Journey', 'feature.Live Journey.body', Map, 'orange', 'journey')}{feature('feature.Tutorials', 'feature.Transport Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Provider Help.body', CircleHelp, 'orange', 'help')}</>}</div><p className="scroll-hint">{t('home.scrollHint')}</p></>; }

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

function MyCropImageCard({ listing, t, upcoming, onClick, onFarmEye }: { listing: CropListing; t: T; upcoming: boolean; onClick: () => void; onFarmEye: () => void }) {
  const name = cropDisplayName(listing);
  const photo = cropPhotoFor(name);
  const isHarvested = listing.status === 'Harvested' || listing.status === 'Sold';
  const isSold = listing.status === 'Sold';
  const currentPrice = computeCurrentPrice(listing);
  const statusLabel = isSold ? t('market.sold') : upcoming ? t('crops.Upcoming') : t('crops.Harvested');
  const statusClass = isSold ? 'soldout' : upcoming ? 'ready' : 'harvested';
  const isVerified = upcoming ? listing.listing_verified : (listing.harvest_timing_verified && listing.harvest_quantity_verified);

  return (
    <Card className="mycrop-image-card" onClick={onClick}>
      <div className="mycrop-image-wrap">
        <img className="mycrop-image" src={photo} alt={name} loading="lazy" />
        <span className={`flip-card-status ${statusClass}`}>{statusLabel}</span>
        {isVerified && <button type="button" className="verified-badge verified-badge-inline" onClick={(e) => { e.stopPropagation(); onFarmEye(); }}><Satellite size={11} /> Verified</button>}
      </div>
      <div className="mycrop-card-body">
        <h3 className="mycrop-card-title">{name} · {cropDisplayVariety(listing)}</h3>
        <p className="mycrop-card-qty">{formatKg(listing.quantity_kg)}</p>
        <p className="mycrop-card-price">{upcoming && listing.indicative_price_per_kg != null ? formatPrice(listing.indicative_price_per_kg) : isHarvested && currentPrice != null ? formatPrice(currentPrice) : '—'}</p>
      </div>
      <div className="mycrop-card-btn-wrap">
        <button type="button" className="flip-card-flip-btn" onClick={(e) => { e.stopPropagation(); onClick(); }}>{t('market.seeInfo')} <ArrowRight size={14} /></button>
      </div>
    </Card>
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
          {filtered.map((listing) => <MyCropImageCard key={listing.id} listing={listing} t={t} upcoming={upcoming} onClick={() => { selectCrop(listing); open(upcoming ? 'crop-detail' : 'farmeye-detail'); }} onFarmEye={() => { selectCrop(listing); open('farmeye-detail'); }} />)}
        </div>
      </>
    )}
    {(role === 'Farmer' || role === 'FPO') && !isClusterTab && <Button icon={Plus} onClick={() => open('crop-create')}>{t('crops.createCrop')}</Button>}
    <Demo>{t('crops.cropDetailsSample')}</Demo>
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
      <Detail label={t('crops.areaCultivated')} value={crop.area_acres != null ? `${crop.area_acres} ${t('crops.acresUnit')}` : '—'} />
      <Detail label={t('crops.expectedYield')} value={crop.expected_yield_kg != null ? formatKg(crop.expected_yield_kg) : '—'} />
      <Detail label={t('crops.marketInfo')} value={`${formatPrice(crop.indicative_price_per_kg)} · ${t('crops.sampleMarketPrice')}`} />
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
      <Detail label={t('crops.marketInfo')} value={`${formatPrice(price)} · ${t('crops.sampleMarketPrice')}`} />
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

function JourneyView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { const [started, setStarted] = useState(false); return <div className="journey-full"><button className="journey-back" onClick={() => open('home')}><ArrowLeft size={20} /> {t('common.back')}</button><div className="journey-map"><Map size={80} /><span className="route route-one" /><span className="route route-two" /><div className="map-marker pickup"><MapPin size={22} /><small>{t('journey.pickup')}</small></div><div className="map-marker destination"><MapPin size={22} /><small>{t('journey.destination')}</small></div><div className="map-marker vehicle"><Truck size={22} /></div><Demo>{t('journey.notLiveGps')}</Demo></div><div className="journey-sheet"><Badge tone="orange">{started ? t('journey.started') : t('journey.notStarted')}</Badge><h1>{t('journey.tomato500')}</h1><p>{t('journey.route')}</p><div className="journey-stats"><div><strong>{started ? '42 min' : '55 min'}</strong><small>{t('journey.estTravelTime')}</small></div><div><strong>25 km</strong><small>{t('journey.distance')}</small></div><div><strong>{started ? t('journey.inTransit') : t('journey.notStarted')}</strong><small>{t('journey.journeyStatus')}</small></div></div><div className="journey-steps"><span className={started ? 'done' : 'active'}>{started ? <Check size={15} /> : '1'}</span><span className={started ? 'active' : ''}>{started ? '2' : ''}</span><span /></div><Button icon={Truck} onClick={() => { setStarted(true); notify(t('journey.journeyStartedToast')); }}>{started ? t('journey.started') : t('journey.startJourney')}</Button><Demo>{t('journey.prototype')}</Demo></div></div>; }

const storageFacilities = [
  { name: 'Storage A', type: 'Cold Storage', tempLabel: '4°C', tempRange: '4°C – 8°C', status: 'occupied', distance: '4.5 km away', capacity: '5,000 kg', location: 'Warangal APMC Yard (Enumamula)', crops: 'Red Chilli, Tomato, Capsicum, Onion', rateKg: '₹2.00/kg/day', rateQtl: '₹200/qtl/month', photo: 'https://images.pexels.com/photos/5953713/pexels-photo-5953713.jpeg?auto=compress&cs=tinysrgb&h=200&w=200' },
  { name: 'Storage B', type: 'Cool Vault', tempLabel: '10°C', tempRange: '10°C – 15°C', status: 'available', distance: '7.2 km away', capacity: '3,000 kg', location: 'Madikonda Cold Hub', crops: 'Onion, Potato, Banana, Citrus', rateKg: '₹1.50/kg/day', rateQtl: '₹150/qtl/month', photo: 'https://images.pexels.com/photos/4487363/pexels-photo-4487363.jpeg?auto=compress&cs=tinysrgb&h=200&w=200' },
  { name: 'Storage C', type: 'Scientific Dry Godown', tempLabel: 'Ambient Ventilated', tempRange: 'Ambient', status: 'available', distance: '12 km away', capacity: '10,000 kg', location: 'Kazipet Grain Depot', crops: 'Paddy, Maize, Pulses, Wheat', rateKg: '₹1.00/kg/day', rateQtl: '₹90/qtl/month', photo: 'https://images.pexels.com/photos/13870874/pexels-photo-13870874.jpeg?auto=compress&cs=tinysrgb&h=200&w=200' },
];

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

  if (role === 'Storage Provider') return <Page title={t('storage.requestsTitle')} body={t('storage.requestsBody')} back={() => open('home')} t={t}><div className="storage-list">{[['Ramesh Kumar', 'Tomato', '500 kg', '18–25 October 2026', '4–8°C'], ['Warangal Farmers FPO', 'Onion', '1,000 kg', '26 October–2 November 2026', '10–15°C']].map(([farmer, crop, quantity, dates, temp]) => <Card className="storage-row" key={farmer}><Illustration label={t('storage.incomingRequest')} color="amber" icon={Warehouse} /><div><div className="row"><Badge tone="blue">{t('storage.incomingRequest')}</Badge><strong>{quantity}</strong></div><h3>{farmer}</h3><p>{crop} · {dates}</p><small>{temp} · {t('storage.storageRequirement')}</small></div><Button variant="soft" onClick={() => notify(t('storage.requestOpened', { farmer }))}>{t('storage.reviewRequest')}</Button></Card>)}</div></Page>;

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

function ApprovalsView({ open, t }: { open: (view: View) => void; t: T }) { const [group, setGroup] = useState<'Current' | 'Previous'>('Current'); const current = [['Ramesh Kumar', 'Tomato', '500 kg', '18–25 October 2026', 'Approved on 15 October 2026']]; const previous = [['Warangal Farmers FPO', 'Onion', '1,000 kg', '26 October–2 November 2026', 'Completed on 2 November 2025']]; const approvals = group === 'Current' ? current : previous; return <Page title={t('approvals.title')} body={t('approvals.body')} back={() => open('home')} t={t}><div className="filter-row"><button className={group === 'Current' ? 'selected' : ''} onClick={() => setGroup('Current')}>{t('approvals.current')}</button><button className={group === 'Previous' ? 'selected' : ''} onClick={() => setGroup('Previous')}>{t('approvals.previous')}</button></div><div className="storage-list">{approvals.map(([name, crop, quantity, dates, status]) => <Card className="storage-row" key={name}><Illustration label={group === 'Current' ? t('approvals.activeStorage') : t('approvals.completedStorage')} color="teal" icon={FileCheck2} /><div><div className="row"><Badge tone={group === 'Current' ? 'green' : 'blue'}>{group === 'Current' ? t('approvals.approved') : t('approvals.completed')}</Badge><strong>{quantity}</strong></div><h3>{name}</h3><p>{crop} · {dates}</p><small>{status}</small></div></Card>)}</div></Page>; }

function FpoView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('fpo.title')} body={t('fpo.body')} back={() => open('home')} t={t}><div className="fpo-list"><Card className="fpo-row"><Illustration label={t('role.FPO')} color="teal" icon={Users} /><div><Badge tone="green">{t('transport.demoVerified')}</Badge><h3>Warangal Farmers FPO</h3><p>{t('fpo.cooperative')}</p><Button variant="soft" onClick={() => notify(t('fpo.connectOpened'))}>{t('fpo.viewFpo')}</Button></div></Card><Card className="fpo-row"><Illustration label={t('role.FPO')} color="blue" icon={Users} /><div><Badge tone="blue">{t('fpo.sampleProfile')}</Badge><h3>Hanamkonda Growers FPO</h3><p>{t('fpo.society')}</p><Button variant="soft" onClick={() => notify(t('fpo.connectOpened'))}>{t('fpo.viewFpo')}</Button></div></Card></div></Page>; }

function TutorialsView({ role, open, t }: { role: Role; open: (view: View) => void; t: T }) { const content: Record<Role, string[]> = { Farmer: ['Add an upcoming crop', 'Pre-booking for farmers', 'Find storage', 'Book transport'], Buyer: ['Explore crops', 'Pre-book a crop', 'Pay Balance Amount', 'Track an order'], FPO: ['Offer transport', 'Support member farmers', 'Update availability', 'Review demand'], 'Storage Provider': ['Review a storage request', 'Approve storage', 'Update a listing', 'Check earnings'], 'Transport Provider': ['Review a request', 'Accept an order', 'Start Journey', 'Complete delivery'] }; return <Page title={t('tutorials.title')} body={t('tutorials.body', { role: t(`role.${role}`) })} back={() => open('home')} t={t}><div className="tutorial-list">{content[role].map((item) => <Card className="tutorial-row" key={item}><span><BookOpen size={22} /></span><div><h3>{item}</h3><p>{t('tutorials.transcript')}</p></div><ArrowRight size={18} /></Card>)}</div><Demo>{t('tutorials.guidanceOnly')}</Demo></Page>; }
function HelpView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('help.title')} body={t('help.body')} back={() => open('home')} t={t}><div className="help-list"><FeatureCard title={t('help.talkToSupport')} body={t('help.talkToSupport.body')} icon={Phone} color="blue" onClick={() => notify(t('help.phonePreview'))} /><FeatureCard title={t('help.raiseDispute')} body={t('help.raiseDispute.body')} icon={AlertTriangle} color="orange" onClick={() => open('dispute')} /><FeatureCard title={t('help.openGuidance')} body={t('help.openGuidance.body')} icon={BookOpen} color="teal" onClick={() => open('tutorials')} /></div></Page>; }
function DisputeView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('dispute.title')} body={t('dispute.body')} back={() => open('help')} t={t}><Card className="form-card"><label>{t('dispute.orderOrCrop')}<input placeholder="Tomato · 40 kg" /></label><label>{t('dispute.whatHappened')}<textarea placeholder={t('dispute.describeProblem')} /></label><label>{t('dispute.preferredNextStep')}<select><option>{t('dispute.reviewShortage')}</option><option>{t('dispute.replacementBuyer')}</option><option>{t('dispute.reviewPayment')}</option></select></label><Button icon={AlertTriangle} onClick={() => notify(t('dispute.submitted'))}>{t('dispute.submit')}</Button></Card><Notice tone="warning"><strong>{t('dispute.shortageTitle')}</strong><p>{t('dispute.shortageBody')}</p></Notice></Page>; }

function ProfileView({ role, open, language, setLanguage, buyerCategory, signOut, addAccount, t, profileData }: { role: Role; open: (view: View) => void; language: Language; setLanguage: (language: Language) => void; buyerCategory: string; signOut: () => void; addAccount: () => void; t: T; profileData?: Profile | null }) { return <Page title={t('profile.title')} body={t('profile.body')} back={() => open('home')} t={t}><Card className="profile-card"><span className={`profile-avatar ${roleMeta[role].color}`}>{roleMeta[role].initials}</span><div><Badge tone="green">{t('profile.demoVerified')}</Badge><h2>{role === 'Farmer' ? (profileData?.display_name ?? 'Ramesh Kumar') : role === 'Buyer' ? 'Venkat Reddy' : roleMeta[role].illustration}</h2><p>{role === 'Farmer' ? (profileData?.home_location ?? roleMeta[role].location) : roleMeta[role].location}</p></div></Card>{role === 'Farmer' && <><SectionHeading title={t('profile.farmerVerification')} body={t('profile.farmerVerificationBody')} icon={FileCheck2} /><div className="detail-grid"><Detail label={t('profile.farmerCategory')} value={profileData?.farmer_category ?? t('login.landOwner')} /><Detail label={t('profile.govVerification')} value={t('profile.pmKisan')} /><Detail label={t('profile.verificationDoc')} value={t('profile.aadhaarLinked')} /><Detail label={t('profile.landOwnership')} value={t('profile.landDetails')} /><Detail label={t('profile.cropsCultivated')} value="Tomato, Onion, Paddy" /><Detail label={t('profile.quantityHarvested')} value={t('profile.sampleQuantity')} /></div></>}{role === 'Buyer' && <><SectionHeading title={t('profile.buyerVerification')} body={t('profile.buyerVerificationBody')} icon={FileCheck2} /><div className="detail-grid"><Detail label={t('profile.buyerCategory')} value={buyerCategory} /><Detail label={t('profile.mobileNumber')} value="+91 98765 43210" /><Detail label={t('profile.googleAccount')} value="venkat@example.com" /><Detail label={t('profile.completeAddress')} value="Warangal Market Road, Telangana" /><Detail label={t('profile.blockArea')} value="Hanamkonda · Near Rythu Bazaar" /><Detail label={t('profile.buyerRating')} value={t('profile.demoRating')} /></div></>}{(role === 'FPO' || role === 'Storage Provider' || role === 'Transport Provider') && <div className="detail-grid"><Detail label={t('profile.organisation')} value={roleMeta[role].illustration} /><Detail label={t('profile.verification')} value={t('profile.permitReview')} /><Detail label={t('profile.contact')} value="+91 98765 43210 · sample@example.com" /><Detail label={t('profile.serviceArea')} value="Warangal, Karimnagar, Hyderabad" /></div>}<Card className="settings-card" onClick={() => open('settings')}><Settings size={22} /><div><h3>{t('profile.settings')}</h3><p>{t('profile.settingsBody')}</p></div><ArrowRight size={18} /></Card><div className="profile-actions"><Button variant="soft" onClick={addAccount}>{t('profile.addAccount')}</Button><Button variant="outline" onClick={signOut}>{t('profile.signOut')}</Button></div></Page>; }
function SettingsView({ open, language, setLanguage, t }: { open: (view: View) => void; language: Language; setLanguage: (language: Language) => void; t: T }) { return <Page title={t('settings.title')} body={t('settings.body')} back={() => open('profile')} t={t}><Card className="settings-card large"><Settings size={22} /><div><h3>{t('settings.language')}</h3><p>{t('settings.languageBody')}</p><div className="language-options"><LanguagePicker value={language} setValue={setLanguage} t={t} /></div></div></Card><Card className="settings-card large"><Headphones size={22} /><div><h3>{t('settings.voiceAssistant')}</h3><p>{t('settings.voiceBody')}</p></div><span className="toggle on" /></Card></Page>; }

function OrdersView({ role, open, notify, t }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T }) {
  const [group, setGroup] = useState<'Current' | 'Previous'>('Current');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchMyOrders();
        if (!cancelled) setOrders(data);
      } catch {
        if (!cancelled) setError(t('crops.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeStatuses = ['Booked', 'Farmer Confirmed', 'Assured Deal', 'Ready', 'In Transit'];
  const currentOrders = orders.filter((o) => activeStatuses.includes(o.status));
  const previousOrders = orders.filter((o) => !activeStatuses.includes(o.status));
  const displayOrders = group === 'Current' ? currentOrders : previousOrders;

  return <Page title={t('orders.title')} body={t('orders.body')} back={() => open('home')} t={t}>
    <div className="filter-row"><button className={group === 'Current' ? 'selected' : ''} onClick={() => setGroup('Current')}>{t('orders.current')}</button><button className={group === 'Previous' ? 'selected' : ''} onClick={() => setGroup('Previous')}>{t('orders.previous')}</button></div>
    {loading && <p className="calendar-empty">{t('crops.loading')}</p>}
    {error && <p className="calendar-empty">{error}</p>}
    {!loading && !error && displayOrders.length === 0 && <Card className="order-card"><p className="calendar-empty">{t('orders.noOrders')}</p></Card>}
    {!loading && !error && displayOrders.map((order) => {
      const listing = order.listing;
      const cropName = listing ? cropDisplayName(listing) : 'Unknown crop';
      const variety = listing ? cropDisplayVariety(listing) : '';
      const totalAmount = round2(Number(order.quantity_kg) * Number(order.unit_price));
      const isToken = order.payment_type === 'token';
      const balanceAmount = isToken ? round2(totalAmount - Number(order.amount_paid ?? 0)) : 0;
      return <Card className="order-card" key={order.id}>
        <Badge tone={group === 'Current' ? 'green' : 'blue'}>{group === 'Current' ? t('orders.bookingConfirmed') : t('orders.completedOrder')}</Badge>
        <h2>{cropName}{variety ? ` · ${variety}` : ''} · {formatKg(Number(order.quantity_kg))}</h2>
        <p>{formatPrice(Number(order.unit_price))} · {formatDate(order.booked_at)}</p>
        <div className="order-track"><span className="done">{t('orders.booked')}</span><span className={order.status === 'Farmer Confirmed' || order.status === 'Assured Deal' || order.status === 'Ready' || order.status === 'In Transit' || order.status === 'Delivered' ? 'done' : ''}>{t('orders.farmerConfirmed')}</span><span className={order.status === 'Assured Deal' || order.status === 'Ready' || order.status === 'In Transit' || order.status === 'Delivered' ? 'done' : group === 'Current' ? 'active' : 'done'}>{t('orders.assuredDeal')}</span><span className={order.status === 'Delivered' ? 'done' : ''}>{t('orders.delivered')}</span></div>
        <div className="payment-summary">
          <div className="payment-row"><span>{t('market.totalValue')}</span><strong>{formatRupee(totalAmount)}</strong></div>
          <div className="payment-row"><span>{t('orders.paidSoFar')}</span><strong>{formatRupee(Number(order.amount_paid ?? 0))}</strong></div>
          {isToken && balanceAmount > 0 && <div className="payment-row payment-due"><span>{t('orders.balanceDue')}</span><strong>{formatRupee(balanceAmount)}</strong></div>}
        </div>
        <div className="row"><Demo>{t('orders.samplePayment')}</Demo></div>
        {group === 'Current' && isToken && balanceAmount > 0 && <Button icon={ShieldCheck} onClick={() => notify(t('orders.payBalanceFlow'))}>{t('orders.payBalance')}</Button>}
        {group === 'Current' && !isToken && <Button onClick={() => notify(t('orders.viewMapOpened'))}>{t('orders.viewMap')}</Button>}
      </Card>;
    })}
    {!loading && !error && displayOrders.length > 0 && <Notice tone="warning"><strong>{t('orders.shortageTitle')}</strong><p>{t('orders.shortageBody')}</p></Notice>}
    {role === 'Transport Provider' && <Button icon={Map} onClick={() => open('journey')}>{t('orders.openLiveJourney')}</Button>}
  </Page>;
}
function DealsView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('deals.title')} body={t('deals.body')} back={() => open('home')} t={t}><Card className="payment-card"><Badge tone="orange">{t('deals.paymentPending')}</Badge><h2>{t('deals.tomatoOrder')}</h2><p>{t('deals.initialToken')}</p><div className="payment-states"><span className="done"><Check size={15} /> {t('deals.initialPayment')}</span><span className="active"><Clock3 size={15} /> {t('deals.paymentPending')}</span><span><Check size={15} /> {t('deals.paymentCompleted')}</span></div><Button icon={ShieldCheck} onClick={() => notify(t('orders.payBalanceFlow'))}>{t('deals.payBalance')}</Button><small>{t('deals.notRealPayment')}</small></Card></Page>; }
function FeatureView({ role, open, notify, t }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T }) { const request = role === 'Transport Provider' ? t('feature.Cold Storage Requests') : t('feature.Main Summary'); return <Page title={request} body={t('features.body')} back={() => open('home')} t={t}><div className="summary-grid"><Card><Zap size={22} /><h2>{role === 'Storage Provider' ? '₹45,000' : '6'}</h2><p>{role === 'Storage Provider' ? t('features.totalEarnings') : t('features.openRequests')}</p></Card><Card><Package size={22} /><h2>3</h2><p>{t('features.activeOrders')}</p></Card><Card><Check size={22} /><h2>12</h2><p>{t('features.completed')}</p></Card></div><Card className="request-card"><Illustration label={role === 'Storage Provider' ? t('role.Farmer') : t('feature.Transport')} color={role === 'Storage Provider' ? 'amber' : 'orange'} icon={role === 'Storage Provider' ? Warehouse : Truck} /><div><Badge tone="blue">{t('features.openRequest')}</Badge><h3>Ramesh Kumar · Tomato</h3><p>500 kg · 7 days · sample requirement</p><Button variant="soft" onClick={() => notify(t('features.requestReviewOpened'))}>{role === 'Storage Provider' ? t('features.reviewRequest') : t('features.reviewDetails')}</Button></div></Card></Page>; }
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

function App() { const { role: authRole, profile, signInWithRole, signOut: authSignOut, updateLanguage, loading, signingIn, authError, clearError } = useAuth(); const [view, setView] = useState<View>('home'); const [loginRole, setLoginRole] = useState<Role | null>(null); const [voice, setVoice] = useState(false); const [notifications, setNotifications] = useState(false); const [language, setLanguageState] = useState<Language>('English'); const [toast, setToast] = useState(''); const [notifItems, setNotifItems] = useState<NotificationRow[]>([]); const [notifLoading, setNotifLoading] = useState(false); const [notifError, setNotifError] = useState<string | null>(null); const [selectedCrop, setSelectedCrop] = useState<CropListing | null>(null); const [formDraft, setFormDraftState] = useState<Record<string, string>>({}); const [loginStep, setLoginStep] = useState(0); const [loginMobile, setLoginMobile] = useState('+91 98765 43210'); const [loginOtp, setLoginOtp] = useState(''); const [loginBuyerCat, setLoginBuyerCat] = useState('Normal Buyer'); const [pendingDestinationView, setPendingDestinationView] = useState<string | null>(null); const role = (authRole && (allRoles as string[]).includes(authRole)) ? (authRole as Role) : null; const buyerCategory = profile?.buyer_category ?? 'Normal Buyer'; const appSpeakingRef = useRef(false); const pendingNarrationRef = useRef<string | null>(null); const narratedTabsRef = useRef<Set<string>>(new Set()); const autoVoiceConsentRef = useRef<'pending' | 'granted' | 'declined'>('pending'); const prefetchedAudioRef = useRef<{ text: string; promise: Promise<Blob | null> } | null>(null); const speakNarrationOnly = useCallback(async (text: string) => { if (appSpeakingRef.current) { pendingNarrationRef.current = text; return; } appSpeakingRef.current = true; const prefetched = prefetchedAudioRef.current; const audio = prefetched && prefetched.text === text ? (await prefetched.promise) : await speakTextViaSarvam(text, language); if (prefetched && prefetched.text === text) prefetchedAudioRef.current = null; if (!audio) { speak(text, language, () => { appSpeakingRef.current = false; const pending = pendingNarrationRef.current; if (pending) { pendingNarrationRef.current = null; speakNarrationOnly(pending); } }); return; } playAudioBlob(audio, () => { appSpeakingRef.current = false; const pending = pendingNarrationRef.current; if (pending) { pendingNarrationRef.current = null; speakNarrationOnly(pending); } }); }, [language]); useEffect(() => { if (!role || voice) return; if (autoVoiceConsentRef.current !== 'granted') return; if (narratedTabsRef.current.has(view)) return; const tr = makeT(language); const narration = getTabNarration(view, tr); if (!narration) return; const promptKey = `voice.tabActionPrompt.${view}`; const prompt = tr(promptKey); const full = prompt !== promptKey ? `${narration} ${prompt}` : narration; narratedTabsRef.current.add(view); if (appSpeakingRef.current) { pendingNarrationRef.current = full; return; } speakNarrationOnly(full); }, [view, role, voice, language, speakNarrationOnly]); useEffect(() => { if (profile?.language) setLanguageState(languageFromCode(profile.language)); }, [profile?.language]); const setLanguage = (lang: Language) => { setLanguageState(lang); updateLanguage(codeFromLanguage(lang)); }; const t = makeT(language); const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2300); }; const open = (next: View) => { stopAudio(); stopSpeaking(); appSpeakingRef.current = false; pendingNarrationRef.current = null; prefetchedAudioRef.current = null; const tr = makeT(language); const narration = getTabNarration(next, tr); const promptKey = `voice.tabActionPrompt.${next}`; const prompt = tr(promptKey); const full = prompt !== promptKey ? `${narration} ${prompt}` : narration; if (full) prefetchedAudioRef.current = { text: full, promise: speakTextViaSarvam(full, language) }; setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }; useEffect(() => { if (loginRole) setVoice(true); }, [loginRole]); const setFormDraft = useCallback((field: string, value: string) => { setFormDraftState((prev) => ({ ...prev, [field]: value })); }, []); const setLoginFieldVoice = useCallback((field: 'mobile' | 'otp' | 'buyerCategory', value: string) => { if (field === 'mobile') { setLoginMobile(value); setLoginStep(1); } else if (field === 'otp') { setLoginOtp(value); setLoginStep(2); } else if (field === 'buyerCategory') setLoginBuyerCat(value); }, []); const submitLoginVoice = useCallback(async () => { if (!loginRole || signingIn) return; try { await signInWithRole(loginRole, loginRole === 'Farmer' ? rameshEmail : demoEmails[loginRole], 'Demo1234!', loginBuyerCat); const dest = pendingDestinationView; setLoginRole(null); setLoginStep(0); setLoginMobile('+91 98765 43210'); setLoginOtp(''); setPendingDestinationView(null); setVoice(false); setView((dest ? (dest as View) : 'home')); } catch { } }, [loginRole, signingIn, loginBuyerCat, pendingDestinationView]); const autoRouteToDestination = useCallback((destinationView: string, requiredRole: string) => { setLoginRole(requiredRole as Role); setLoginStep(0); setLoginMobile('+91 98765 43210'); setLoginOtp(''); setLoginBuyerCat('Normal Buyer'); setPendingDestinationView(destinationView); }, []); const loadNotifications = useCallback(async () => { if (!role) return; setNotifLoading(true); setNotifError(null); try { await seedDemoNotificationsIfNeeded(); setNotifItems(await fetchNotifications()); } catch { setNotifError(t('notifications.loadError')); } finally { setNotifLoading(false); } }, [role, t]); useEffect(() => { loadNotifications(); }, [loadNotifications]); const handleMarkRead = async (id: string) => { try { await markNotificationRead(id); setNotifItems((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)); } catch { } }; const handleMarkAllRead = async () => { try { await markAllNotificationsRead(); setNotifItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))); } catch { } }; const unreadCount = notifItems.filter((n) => !n.read_at).length; const signOut = () => { stopAudio(); stopSpeaking(); appSpeakingRef.current = false; pendingNarrationRef.current = null; narratedTabsRef.current.clear(); authSignOut(); setView('home'); }; const addAccount = () => { stopAudio(); stopSpeaking(); appSpeakingRef.current = false; pendingNarrationRef.current = null; narratedTabsRef.current.clear(); authSignOut(); setView('home'); }; if (loading) return <main className="login-screen"><div className="login-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ display: 'grid', placeItems: 'center', width: '31px', height: '31px', borderRadius: '9px', color: '#fff', background: '#2c823b' }}><Sprout size={27} /></span><strong>{t('app.name')}</strong></div></main>; if (!role && loginRole) return <><LoginFlow role={loginRole} t={t} step={loginStep} setStep={setLoginStep} mobile={loginMobile} setMobile={setLoginMobile} otp={loginOtp} setOtp={setLoginOtp} buyerCat={loginBuyerCat} setBuyerCat={setLoginBuyerCat} done={async (email, password, buyerCategory) => { if (signingIn) return; try { await signInWithRole(loginRole, email, password, buyerCategory); setLoginRole(null); setLoginStep(0); setVoice(false); setView('home'); } catch { } }} back={() => { clearError(); setLoginRole(null); setVoice(false); }} authError={authError} clearError={clearError} signingIn={signingIn} /><VoiceButton onClick={() => { warmupSpeech(); setVoice(true); }} t={t} />{voice && <VoiceModal close={() => setVoice(false)} t={t} language={language} currentView={loginStep === 0 ? (loginRole === 'Farmer' ? 'login-farmer' : loginRole === 'FPO' ? 'login-fpo' : 'login-mobile') : loginStep === 1 ? 'login-otp' : (loginRole === 'Buyer' ? 'login-category' : 'login-verify')} loginRole={loginRole} isLoggedIn={!!role} autoRouteToDestination={autoRouteToDestination} selectRole={(r) => setLoginRole(r as Role)} setLoginStep={setLoginStep} setLoginField={setLoginFieldVoice} submitLogin={submitLoginVoice} appSpeakingRef={appSpeakingRef} appPendingNarrationRef={pendingNarrationRef} speakNarrationOnly={speakNarrationOnly} narratedTabsRef={narratedTabsRef} autoVoiceConsentRef={autoVoiceConsentRef} />}{toast && <div className="toast"><AlertTriangle size={17} />{toast}</div>}</>; if (!role) return <><Login onRole={setLoginRole} voiceOpen={() => { warmupSpeech(); setVoice(true); }} t={t} language={language} />{voice && <VoiceModal close={() => setVoice(false)} t={t} language={language} currentView={loginRole ? (loginRole === 'Farmer' ? 'login-farmer' : loginRole === 'FPO' ? 'login-fpo' : 'login-mobile') : 'login'} isLoggedIn={!!role} autoRouteToDestination={autoRouteToDestination} selectRole={(r) => setLoginRole(r as Role)} setLoginStep={setLoginStep} setLoginField={setLoginFieldVoice} submitLogin={submitLoginVoice} appSpeakingRef={appSpeakingRef} appPendingNarrationRef={pendingNarrationRef} speakNarrationOnly={speakNarrationOnly} narratedTabsRef={narratedTabsRef} autoVoiceConsentRef={autoVoiceConsentRef} />}</>; return <div className="logged-in">{view === 'home' && <main className="long-scroll"><RoleHome role={role} open={open} profile={() => open('profile')} notifications={() => setNotifications(true)} t={t} profileData={profile} /></main>}{view === 'crops' && <CropView open={open} selectCrop={setSelectedCrop} t={t} role={role} notify={notify} currentUserId={profile?.id} />}{view === 'crop-detail' && selectedCrop && <CropDetail open={open} crop={selectedCrop} t={t} role={role} onEdit={() => open('crop-edit')} onMarkHarvested={async () => { try { await markAsHarvested(selectedCrop.id, new Date().toISOString()); notify(t('crops.markedHarvested')); setSelectedCrop({ ...selectedCrop, status: 'Harvested', harvested_at: new Date().toISOString() }); open('crops'); } catch { notify(t('crops.createError')); } }} />}{view === 'buyer-crop-detail' && selectedCrop && <BuyerCropDetail crop={selectedCrop} open={open} t={t} />}{view === 'buyer-payment' && selectedCrop && <BuyerPaymentView crop={selectedCrop} open={open} notify={notify} t={t} />}{view === 'farmeye-detail' && selectedCrop && <FarmEyeDetailView crop={selectedCrop} open={open} t={t} backView={role === 'Buyer' ? 'buyer-crop-detail' : 'crop-detail'} />}{view === 'crop-create' && <CropFormView open={open} notify={notify} t={t} voiceFill={formDraft} formDraft={formDraft} />}{view === 'crop-edit' && selectedCrop && <CropFormView open={open} notify={notify} t={t} editing={selectedCrop} voiceFill={formDraft} formDraft={formDraft} />}{view === 'market' && <MarketView role={role} open={open} notify={notify} t={t} selectCrop={setSelectedCrop} />}{view === 'calendar' && <CalendarView open={open} t={t} profileData={profile} />}{view === 'transport-options' && <TransportOptions role={role} open={open} notify={notify} t={t} profileData={profile} />}{view === 'transport-detail' && <TransportDetail open={open} notify={notify} t={t} />}{view === 'journey' && <JourneyView open={open} notify={notify} t={t} />}{view === 'storage' && <StorageView role={role} open={open} notify={notify} t={t} />}{view === 'approvals' && <ApprovalsView open={open} t={t} />}{view === 'fpo' && <FpoView open={open} notify={notify} t={t} />}{view === 'tutorials' && <TutorialsView role={role} open={open} t={t} />}{view === 'help' && <HelpView open={open} notify={notify} t={t} />}{view === 'dispute' && <DisputeView open={open} notify={notify} t={t} />}{view === 'profile' && <ProfileView role={role} open={open} language={language} setLanguage={setLanguage} buyerCategory={buyerCategory} signOut={signOut} addAccount={addAccount} t={t} profileData={profile} />}{view === 'settings' && <SettingsView open={open} language={language} setLanguage={setLanguage} t={t} />}{view === 'orders' && <OrdersView role={role} open={open} notify={notify} t={t} />}{view === 'deals' && <DealsView open={open} notify={notify} t={t} />}{view === 'features' && <FeatureView role={role} open={open} notify={notify} t={t} />}<div className="floating-tools"><button onClick={() => open('profile')} aria-label={t('profile.title')}><UserRound size={24} /></button><button onClick={() => setNotifications(true)} aria-label={t('notifications.title')}><Bell size={24} />{unreadCount > 0 && <i>{unreadCount}</i>}</button></div><VoiceButton onClick={() => { warmupSpeech(); setVoice(true); }} t={t} />{voice && <VoiceModal close={() => setVoice(false)} t={t} language={language} open={open} currentView={view} isLoggedIn={!!role} autoRouteToDestination={autoRouteToDestination} setFormDraft={setFormDraft} formDraft={formDraft} setLanguage={setLanguage} selectRole={(r) => { authSignOut(); setLoginRole(r as Role); }} appSpeakingRef={appSpeakingRef} appPendingNarrationRef={pendingNarrationRef} speakNarrationOnly={speakNarrationOnly} narratedTabsRef={narratedTabsRef} autoVoiceConsentRef={autoVoiceConsentRef} />}{notifications && <Notifications close={() => setNotifications(false)} t={t} items={notifItems} loading={notifLoading} error={notifError} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} />}{toast && <div className="toast"><Check size={17} />{toast}</div>}</div>; }
export default App;
