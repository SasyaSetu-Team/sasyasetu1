import { useState, useEffect, useCallback, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, Check, CircleHelp, Clock3, Eye, EyeOff, FileCheck2, Headphones, Leaf, Layers, Map, MapPin, Mic, Package, Phone, Plus, Satellite, Search, Settings, ShieldCheck, ShoppingBag, Sprout, Truck, UserRound, Users, Warehouse, X, Zap, TrendingDown } from 'lucide-react';
import { allLanguages, makeT, codeFromLanguage, languageFromCode, type Language, type T } from '@/translations';
import { demoEmails, farmerDemoEmails, useAuth, type Profile } from '@/lib/auth';
const rameshEmail = farmerDemoEmails.find((f) => f.name === 'Ramesh Kumar')?.email ?? farmerDemoEmails[0].email;
import { fetchCrops, fetchMyListings, fetchPublicListings, fetchListing, createListing, updateListing, markAsHarvested, buyNow, computeCurrentPrice, nextDropMinutes, computeClusterCurrentPrice, clusterNextDropMinutes, bookedQuantity, formatKg, formatPrice, formatDate, cropDisplayName, cropDisplayVariety, OTHER_CROP_ID, fetchClusters, formatHarvestWindow, timeLeftUntil, fetchClusterInvites, fetchClusterMemberships, fetchClusterMembers, joinCluster, dismissClusterInvite, type Crop, type CropListing, type CropListingInput, type CropClusterWithMembers, type ClusterInvite, type ClusterMembership, type ClusterMemberDetail, type BuyNowResult } from '@/lib/crops';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, seedDemoNotificationsIfNeeded, type NotificationRow } from '@/lib/notifications';
import { parseCommand, parseStatus, parseNumber, parseLanguageChange, extractValue, isSpeechRecognitionSupported, isSpeechSynthesisSupported, createRecognition, speak, stopSpeaking, warmupSpeech, langCode, captureScreenText, subscribeDebug, getSynthState, emitDebug, type VoiceRecognition, type DebugEvent } from '@/lib/voice';
import { useVoiceSession, type FormField } from '@/lib/useVoiceSession';

type Role = 'Farmer' | 'FPO' | 'Transport Provider' | 'Storage Provider' | 'Buyer';
type View = 'home' | 'features' | 'crops' | 'crop-detail' | 'crop-create' | 'crop-edit' | 'market' | 'calendar' | 'transport-options' | 'transport-detail' | 'journey' | 'storage' | 'approvals' | 'fpo' | 'tutorials' | 'help' | 'dispute' | 'profile' | 'settings' | 'orders' | 'deals';
type IconType = typeof Sprout;

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

function Illustration({ label, color, icon: Icon = Sprout }: { label: string; color: string; icon?: IconType }) { return <div className={`illustration ${color}`}><div className="illustration-shape"><Icon size={58} strokeWidth={1.5} /></div><small>{label}</small></div>; }
function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span>; }
function Button({ children, icon: Icon, variant = 'primary', onClick, wide = false, disabled = false }: { children: ReactNode; icon?: IconType; variant?: string; onClick?: () => void; wide?: boolean; disabled?: boolean }) { return <button className={`button ${variant} ${wide ? 'wide' : ''}`} onClick={onClick} disabled={disabled}>{Icon && <Icon size={18} />}{children}</button>; }
function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) { return <div className={`card ${className} ${onClick ? 'clickable' : ''}`} onClick={onClick}>{children}</div>; }
function Demo({ children }: { children: ReactNode }) { return <span className="demo"><i />{children}</span>; }
function SectionHeading({ title, body, icon: Icon }: { title: string; body: string; icon: IconType }) { return <div className="section-heading"><span className="section-icon"><Icon size={24} /></span><div><h2>{title}</h2><p>{body}</p></div></div>; }
function VoiceButton({ onClick, t }: { onClick: () => void; t: T }) { return <button className="voice-fab" onClick={onClick} aria-label={t('voice.assistant')}><Mic size={28} /><span /></button>; }
function LanguagePicker({ value, setValue, t }: { value: Language; setValue: (value: Language) => void; t: T }) { return <div className="language-picker"><span>{t('common.language')}</span>{allLanguages.map((language) => <button key={language} className={value === language ? 'selected' : ''} onClick={() => setValue(language)}>{language}</button>)}</div>; }

function VoiceModal({ close, t, language, open, currentView, setFormDraft, formDraft, setLanguage, selectRole, setLoginStep, setLoginField, submitLogin, loginRole }: {
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

  useEffect(() => { languageRef.current = language; }, [language]);

  const supported = isSpeechRecognitionSupported();

  const { state, dispatch, processUtterance, processUtteranceAsync, nextMissingField, askFieldPrompt, narrateScreen } = useVoiceSession({
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
  });

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const recognitionGenRef = useRef(0);

  const startListening = useCallback(() => {
    if (!sessionRef.current || !supported || speakingRef.current) return;
    recognitionRef.current?.stop();
    const gen = ++recognitionGenRef.current;
    setVoiceState('listening');
    const rec = createRecognition(
      languageRef.current,
      (text) => handleFinalResult(text),
      (text) => setInterim(text),
      (err) => handleError(err),
      () => {
        if (sessionRef.current && !speakingRef.current && gen === recognitionGenRef.current) {
          setTimeout(() => {
            if (sessionRef.current && !speakingRef.current && gen === recognitionGenRef.current) {
              startListening();
            }
          }, 300);
        }
      },
    );
    recognitionRef.current = rec;
    rec?.start();
  }, [supported]);

  const setConv = useCallback((s: 'IDLE' | 'SPEAKING' | 'WAIT_FOR_SPEECH' | 'TRANSCRIBING' | 'VALIDATING' | 'CONFIRMING') => {
    convStateRef.current = s;
    setConvState(s);
  }, []);

  const speakAndListen = useCallback((text: string) => {
    speakingRef.current = true;
    recognitionRef.current?.stop();
    setVoiceState('speaking');
    setConv('SPEAKING');
    setInterim('');
    speak(text, languageRef.current, () => {
      speakingRef.current = false;
      if (sessionRef.current) {
        setConv('WAIT_FOR_SPEECH');
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current) {
            startListening();
          }
        }, 400);
      }
    });
  }, [startListening, setConv]);

  const lastNarrationViewRef = useRef<string>('');
  useEffect(() => {
    if (speakingRef.current) { emitDebug('narration effect', 'SKIP: speakingRef is true'); return; }
    if (currentView === lastNarrationViewRef.current) { emitDebug('narration effect', `SKIP: same view ${currentView}`); return; }
    const isLoginView = currentView.startsWith('login-');
    if (isLoginView && !sessionRef.current) {
      emitDebug('narration effect', `ENTER login init path | view=${currentView} | sessionRef was false`);
      sessionRef.current = true;
      setSessionActive(true);
      setErrorMsg('');
      setTranscript('');
      setInterim('');
      dispatch({ type: 'GREET' });
      if (loginRole) {
        dispatch({ type: 'SET_LOGIN_ROLE', role: loginRole });
        dispatch({ type: 'START_INTENT', intent: 'voice_login' });
        dispatch({ type: 'SET_STEP', step: 'awaiting_mobile' });
        setDebugStep('awaiting_mobile');
      }
      lastNarrationViewRef.current = currentView;
      const narration = narrateScreen(currentView);
      emitDebug('narration effect', `narrateScreen returned: "${narration?.slice(0, 50) ?? 'EMPTY'}" | will speak in 350ms`);
      if (narration) {
        setTimeout(() => {
          emitDebug('narration timeout', `firing | sessionRef=${sessionRef.current} speakingRef=${speakingRef.current}`);
          if (sessionRef.current && !speakingRef.current) speakAndListen(narration);
          else emitDebug('narration timeout', `SKIP: sessionRef=${sessionRef.current} speakingRef=${speakingRef.current}`);
        }, 350);
      } else {
        setConv('WAIT_FOR_SPEECH');
        startListening();
      }
      return;
    }
    if (isLoginView) {
      emitDebug('narration effect', `login re-enter | view=${currentView} | sessionRef=${sessionRef.current}`);
      lastNarrationViewRef.current = currentView;
      setDebugStep(state.step ?? 'none');
      return;
    }
    if (sessionRef.current) {
      emitDebug('narration effect', `normal path | view=${currentView}`);
      lastNarrationViewRef.current = currentView;
      const narration = narrateScreen(currentView);
      if (narration) speakAndListen(narration);
    }
  }, [currentView, narrateScreen, speakAndListen, loginRole, state.step]);

  const handleFinalResult = useCallback(async (text: string) => {
    setTranscript(text);
    setInterim('');
    recognitionRef.current?.stop();
    setConv('TRANSCRIBING');
    const screenContext = captureScreenText();
    setConv('VALIDATING');
    const response = await processUtteranceAsync(text, screenContext);
    const s = stateRef.current;
    if (response) {
      setDebugStep(s.step ?? 'none');
      if (s.awaitingConfirmation) setConv('CONFIRMING');
      speakAndListen(response);
    } else {
      if (sessionRef.current) {
        setConv('WAIT_FOR_SPEECH');
        startListening();
      }
    }
  }, [processUtteranceAsync, speakAndListen, startListening, setConv]);

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
        speakAndListen(t('voice.openedAddCrop'));
        setTimeout(() => {
          if (sessionRef.current) {
            const next = nextMissingField();
            if (next) speakAndListen(askFieldPrompt(next));
          }
        }, 2500);
      } else {
        speakAndListen(t('voice.howCanIHelp'));
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current) startListening();
        }, 2000);
      }
    } else {
      if (currentView === 'crop-create' || currentView === 'crop-edit') {
        dispatch({ type: 'START_INTENT', intent: 'add_crop', view: currentView });
        if (formDraft && Object.keys(formDraft).length > 0) dispatch({ type: 'SEED_SLOTS', slots: formDraft });
        speakAndListen(t('voice.openedAddCrop'));
        setTimeout(() => {
          if (sessionRef.current) {
            const next = nextMissingField();
            if (next) speakAndListen(askFieldPrompt(next));
          }
        }, 2500);
      } else {
        speakAndListen(t('voice.welcomeBack'));
        setTimeout(() => {
          if (sessionRef.current && !speakingRef.current) startListening();
        }, 1800);
      }
    }
  }, [supported, t, speakAndListen, startListening, currentView, dispatch, nextMissingField, askFieldPrompt, formDraft]);

  const stopSession = useCallback(() => {
    sessionRef.current = false;
    setSessionActive(false);
    setVoiceState('idle');
    setConv('IDLE');
    setDebugStep('none');
    recognitionRef.current?.stop();
    stopSpeaking();
    speakingRef.current = false;
  }, [setConv]);

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

function Login({ onRole, voiceOpen, t, language }: { onRole: (role: Role) => void; voiceOpen: () => void; t: T; language: Language }) { const handleRole = (role: Role) => { warmupSpeech(); onRole(role); }; return <main className="login-screen"><div className="login-brand"><span><Sprout size={27} /></span><strong>{t('app.name')}</strong></div><VoiceButton onClick={voiceOpen} t={t} /><div className="role-cards">{visibleRoles.map((role) => <button className="role-card" key={role} onClick={() => handleRole(role)}><Illustration label={roleMeta[role].illustration} color={roleMeta[role].color} icon={role === 'Farmer' ? Sprout : role === 'FPO' ? Users : role === 'Buyer' ? ShoppingBag : role === 'Storage Provider' ? Warehouse : Truck} /><h2>{t(`role.${role}`)}</h2><ArrowRight size={21} /></button>)}</div><button className="sasya-button" onClick={voiceOpen}><Sprout size={18} /> {t('app.name')}</button></main>; }

function LoginFlow({ role, done, back, t, authError, clearError, signingIn, step, setStep, mobile, setMobile, otp, setOtp, buyerCat, setBuyerCat }: { role: Role; done: (email: string, password: string, buyerCategory?: string) => Promise<void>; back: () => void; t: T; authError: string | null; clearError: () => void; signingIn: boolean; step: number; setStep: (step: number) => void; mobile: string; setMobile: (value: string) => void; otp: string; setOtp: (value: string) => void; buyerCat: string; setBuyerCat: (value: string) => void }) {
  const totalSteps = 3;
  const roleIcon = role === 'Farmer' ? Sprout : role === 'FPO' ? Users : role === 'Buyer' ? ShoppingBag : role === 'Storage Provider' ? Warehouse : Truck;
  const roleColor = roleMeta[role].color;

  const verifyAndSignIn = async (category?: string) => { const email = role === 'Farmer' ? rameshEmail : demoEmails[role]; await done(email, 'Demo1234!', category); };

  const stepTitle = role === 'Buyer' ? t('login.chooseCategory') : role === 'Farmer' ? t('login.farmerVerification') : role === 'FPO' ? t('login.fpoVerification') : t('login.providerVerification', { role: t(`role.${role}`) });

  const renderStep = () => {
    if (step === 0) return (<><div className="step-count">{t('login.step', { n: 1, total: totalSteps })}</div><h2>{t('login.enterMobile')}</h2><p>{t('login.sendOtpPrompt')}</p><form onSubmit={(e) => { e.preventDefault(); setStep(1); clearError(); }} className="login-form"><label>{t('login.mobileNumber')}<input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} autoComplete="tel" required /></label><Button wide>{t('login.sendOtp')}</Button></form></>);
    if (step === 1) return (<><div className="step-count">{t('login.step', { n: 2, total: totalSteps })}</div><h2>{t('login.enterOtp')}</h2><p>{t('login.otpPrompt')}</p><form onSubmit={(e) => { e.preventDefault(); setStep(2); clearError(); }} className="login-form"><label>{t('login.oneTimePassword')}<input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => { setOtp(e.target.value); clearError(); }} placeholder="123456" autoComplete="one-time-code" required /></label>{authError && <p className="auth-error" role="alert">{authError}</p>}<Button wide>{t('login.verifyOtp')}</Button><button type="button" className="text-link" onClick={() => setStep(0)}>{t('common.back')}</button></form></>);
    if (role === 'Buyer') { const categories = ['Normal Buyer', 'Bulk Buyer', 'Retail Buyer', 'Institutional Buyer']; return (<><div className="step-count">{t('login.step', { n: 3, total: totalSteps })}</div><h2>{t('login.chooseCategory')}</h2><p>{t('login.categoryPrompt')}</p><div className="category-list">{categories.map((cat) => <button key={cat} className={`category-option ${buyerCat === cat ? 'selected' : ''}`} onClick={() => { setBuyerCat(cat); clearError(); }} disabled={signingIn}><span>{cat}</span>{buyerCat === cat && <Check size={18} />}</button>)}</div>{authError && <p className="auth-error" role="alert">{authError}</p>}<Button wide onClick={() => verifyAndSignIn(buyerCat)} icon={signingIn ? undefined : ArrowRight}>{signingIn ? 'Signing in…' : t('login.continueAs', { category: buyerCat })}</Button><button type="button" className="text-link" onClick={() => setStep(1)} disabled={signingIn}>{t('common.back')}</button></>); }
    const fields = role === 'Farmer' ? [{ label: t('login.farmerId'), value: rameshVerificationData.verificationId }, { label: t('login.farmerName'), value: rameshVerificationData.name }, { label: t('login.farmerCategory'), value: rameshVerificationData.category }, { label: t('login.govVerification'), value: 'Demo Verified' }] : role === 'FPO' ? [{ label: t('login.fpoName'), value: 'Warangal Farmers FPO' }, { label: t('login.registrationNumber'), value: 'TG-FPO-2019-0452' }, { label: t('login.orgVerification'), value: 'Demo Verified' }] : [{ label: t('login.providerName'), value: role === 'Storage Provider' ? 'Krishna Cold Storage' : 'Suresh Transport Services' }, { label: t('login.permitNumber'), value: role === 'Storage Provider' ? 'AP-CS-2021-0093' : 'TG-TP-2018-1271' }, { label: t('login.permitReview'), value: 'Demo Verified' }];
    return (<><div className="step-count">{t('login.step', { n: 3, total: totalSteps })}</div><h2>{stepTitle}</h2><p>{role === 'Farmer' ? t('login.farmerVerificationPrompt') : role === 'FPO' ? t('login.fpoVerificationPrompt') : t('login.providerVerificationPrompt')}</p><div className="verification-fields">{fields.map((f) => <div key={f.label} className="verification-field"><small>{f.label}</small><strong>{f.value}</strong></div>)}<div className="verification-badge"><ShieldCheck size={16} /> Demo Verified</div></div>{authError && <p className="auth-error" role="alert">{authError}</p>}<Button wide onClick={() => verifyAndSignIn()} icon={signingIn ? undefined : ArrowRight}>{signingIn ? 'Signing in…' : t('login.continue')}</Button><button type="button" className="text-link" onClick={() => setStep(1)} disabled={signingIn}>{t('common.back')}</button></>);
  };

  return <main className="login-flow"><button className="back-button" onClick={back}><ArrowLeft size={18} /> {t('common.back')}</button><div className="flow-grid"><div><Illustration label={roleMeta[role].illustration} color={roleColor} icon={roleIcon} /><h1>{t(`role.${role}`)} {t('login.continue').toLowerCase()}</h1><p>{t('login.useSampleDetails', { role: t(`role.${role}`) })}</p><Demo>{t('login.demoAccount')}</Demo></div><Card className="login-form"><div className="step-indicator">{Array.from({ length: totalSteps }).map((_, i) => <span key={i} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />)}</div>{renderStep()}</Card></div></main>;
}
function FeatureCard({ title, body, icon: Icon, color, onClick }: { title: string; body: string; icon: IconType; color: string; onClick: () => void }) { return <button className="feature-card" onClick={onClick}><span className={`feature-icon ${color}`}><Icon size={27} /></span><span><strong>{title}</strong><small>{body}</small></span><ArrowRight size={19} /></button>; }
function RoleHome({ role, open, profile, notifications, t, profileData }: { role: Role; open: (view: View) => void; profile: () => void; notifications: () => void; t: T; profileData?: Profile | null }) { const feature = (titleKey: string, bodyKey: string, icon: IconType, color: string, view: View) => <FeatureCard title={t(titleKey)} body={t(bodyKey)} icon={icon} color={color} onClick={() => open(view)} />; const homeLocation = (role === 'Farmer' && profileData?.home_location) ? profileData.home_location : roleMeta[role].location; return <><section className={`welcome ${roleMeta[role].color}`}><div><Badge tone="green">{t('home.workspace', { role: t(`role.${role}`) })}</Badge><h1>{t(`home.greeting.${role}`)}</h1><p>{homeLocation}</p><div className="welcome-actions"><button onClick={profile}><UserRound size={18} /> {t('home.profile')}</button><button onClick={notifications}><Bell size={18} /> {t('home.notifications')}</button></div></div><Illustration label={roleMeta[role].illustration} color={roleMeta[role].color} /></section><div className="feature-grid">{role === 'Farmer' && <>{feature('feature.My Crops', 'feature.My Crops.body', Leaf, 'green', 'crops')}{feature('feature.Market', 'feature.Market.body', ShoppingBag, 'blue', 'market')}{feature('feature.Harvest Calendar', 'feature.Harvest Calendar.body', CalendarDays, 'orange', 'calendar')}{feature('feature.Transport', 'feature.Transport.body', Truck, 'teal', 'transport-options')}{feature('feature.Storage', 'feature.Storage.body', Warehouse, 'amber', 'storage')}{feature('feature.FPO Network', 'feature.FPO Network.body', Users, 'green', 'fpo')}{feature('feature.Tutorials', 'feature.Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Help & Dispute.body', CircleHelp, 'orange', 'help')}</>}{role === 'Buyer' && <>{feature('feature.Explore Crops', 'feature.Explore Crops.body', Search, 'green', 'market')}{feature('feature.My Orders', 'feature.My Orders.body', Package, 'blue', 'orders')}{feature('feature.Deals', 'feature.Deals.body', ShieldCheck, 'teal', 'deals')}{feature('feature.Tutorials', 'feature.Buyer Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Help & Dispute.body', CircleHelp, 'orange', 'help')}</>}{role === 'FPO' && <>{feature('feature.Member Crops', 'feature.Member Crops.body', Leaf, 'green', 'crops')}{feature('feature.Market', 'feature.Market FPO.body', ShoppingBag, 'blue', 'market')}{feature('feature.Harvest Calendar', 'feature.Member Calendar.body', CalendarDays, 'orange', 'calendar')}{feature('feature.Transport Provider', 'feature.Transport Provider.body', Truck, 'teal', 'transport-options')}{feature('feature.Storage', 'feature.Storage FPO.body', Warehouse, 'amber', 'storage')}{feature('feature.Tutorials', 'feature.FPO Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.FPO Help.body', CircleHelp, 'orange', 'help')}</>}{role === 'Storage Provider' && <>{feature('feature.Main Summary', 'feature.Main Summary.body', Zap, 'green', 'features')}{feature('feature.Storage Requests', 'feature.Storage Requests.body', Bell, 'blue', 'storage')}{feature('feature.My Approvals', 'feature.My Approvals.body', FileCheck2, 'teal', 'approvals')}{feature('feature.Tutorials', 'feature.Storage Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Provider Help.body', CircleHelp, 'orange', 'help')}</>}{role === 'Transport Provider' && <>{feature('feature.Cold Storage Requests', 'feature.Cold Storage Requests.body', Warehouse, 'amber', 'features')}{feature('feature.Farmer Requests', 'feature.Farmer Requests.body', Sprout, 'green', 'features')}{feature('feature.My Orders', 'feature.My Orders.body', Package, 'teal', 'orders')}{feature('feature.Live Journey', 'feature.Live Journey.body', Map, 'orange', 'journey')}{feature('feature.Tutorials', 'feature.Transport Tutorials.body', BookOpen, 'blue', 'tutorials')}{feature('feature.Help & Dispute', 'feature.Provider Help.body', CircleHelp, 'orange', 'help')}</>}</div><p className="scroll-hint">{t('home.scrollHint')}</p></>; }

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
  return <Card className={`cluster-row-card${isSoldCluster ? ' sold-card' : ''}`} onClick={onClick}>
    <span className={`cluster-row-illustration ${cropColorFor(name)}`}><Icon size={38} strokeWidth={1.5} /></span>
    <div className="cluster-row-content">
      <div className="cluster-row-badges">
        <span className="cluster-row-pill"><Layers size={12} /> {t('cluster.label')}</span>
        <Badge tone={tone}>{statusText}</Badge>
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
    <ArrowRight size={19} />
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
  return <Card className="cluster-row-card cluster-invite-card" onClick={onAccept}>
    <span className={`cluster-row-illustration ${cropColorFor(name)}`}><Icon size={38} strokeWidth={1.5} /></span>
    <div className="cluster-row-content">
      <div className="cluster-row-badges">
        <span className="cluster-row-pill cluster-invite-pill"><Layers size={12} /> {t('cluster.inviteBadge')}</span>
      </div>
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
        <div className="crop-stack">
          {filtered.map((listing) => {
            if (!upcoming) {
              return <PriceClockCard key={listing.id} listing={listing} t={t} />;
            }
            const name = cropDisplayName(listing);
            return <Card key={listing.id} className="crop-row" onClick={() => { selectCrop(listing); open('crop-detail'); }}>
              {listing.listing_verified && <span className="verified-badge"><Check size={11} strokeWidth={3} /> Verified</span>}
              <Illustration label={name} color={cropColorFor(name)} icon={cropIconFor(name)} />
              <div>
                <Badge tone="green">{t('crops.Upcoming')}</Badge>
                <h3>{name} · {cropDisplayVariety(listing)}</h3>
                <p>{formatKg(listing.quantity_kg)} · {formatDate(listing.expected_harvest_date)}</p>
              </div>
              <ArrowRight size={19} />
            </Card>;
          })}
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

function ClusterCropCard({ cluster, t, onNotify, role, onBuyNow, onSold, sold }: { cluster: CropClusterWithMembers; t: T; onNotify: (msg: string) => void; role: Role; onBuyNow?: (listing: CropListing) => Promise<BuyNowResult | null>; onSold?: (listingId: string) => void; sold?: boolean }) {
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
            <span><Eye size={15} /> {t('cluster.buyerInterest')}: 0</span>
          </div>}
          {!isHarvested && isBuyer && <div className="cluster-stats">
            <span><Package size={15} /> {formatPrice(currentPrice ?? cluster.price_start_per_kg ?? 0)}</span>
            <span><Clock3 size={15} /> {t('cluster.closesIn')}: {timeLeftUntil(cluster.closes_at)}</span>
          </div>}
        </div>
      </div>
      {!isBuyer && currentPrice == null && <Button variant="soft" onClick={() => onNotify(t('cluster.expressInterest', { crop: name }))}>{t('cluster.expressInterestBtn')}</Button>}
    </Card>
  );
}

function BuyerHarvestedCard({ listing, t, onBuyNow, onSold, sold }: { listing: CropListing; t: T; onBuyNow: (listing: CropListing) => Promise<BuyNowResult | null>; onSold: (listingId: string) => void; sold?: boolean }) {
  const [now, setNow] = useState(Date.now());
  const [purchasing, setPurchasing] = useState(false);
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

  const handleBuy = async () => {
    if (purchasing || purchased) return;
    setPurchasing(true);
    try {
      const result = await onBuyNow(listing);
      if (result) { setPurchased(true); onSold(listing.id); }
    } catch { } finally { setPurchasing(false); }
  };

  if (purchased) {
    return <Card className="buyer-crop-card sold-card">
      <Illustration label={`${name} illustration`} color={cropColorFor(name)} icon={cropIconFor(name)} />
      <div>
        <Badge tone="blue">{t('market.sold')}</Badge>
        <h2>{name} · {cropDisplayVariety(listing)}</h2>
        <p>{t('market.soldAtPrice', { price: formatPrice(currentPrice) })}</p>
      </div>
    </Card>;
  }

  return <Card className="buyer-crop-card">
    <Illustration label={`${name} illustration`} color={cropColorFor(name)} icon={cropIconFor(name)} />
    <div>
      <Badge tone="green">{t('crops.Harvested')}</Badge>
      <h2>{name} · {cropDisplayVariety(listing)}</h2>
      <p>{formatKg(listing.available_quantity_kg)} · {formatDate(listing.harvested_at)}</p>
      <div className="price-clock-widget">
        <div className="price-clock-left">
          <span className="price-clock-price"><TrendingDown size={15} /> <strong>{formatPrice(currentPrice)}</strong></span>
          <span className="price-clock-drop">{dropIn != null && dropIn > 0 && !isAtFloor ? t('market.nextDropIn', { minutes: dropIn }) : ''}</span>
        </div>
        <button className="button primary price-clock-buy" onClick={handleBuy} disabled={purchasing}>{purchasing ? '…' : t('market.buyNow')}</button>
      </div>
    </div>
  </Card>;
}

function PriceClockCard({ listing, t }: { listing: CropListing; t: T }) {
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
    {listing.harvest_timing_verified && listing.harvest_quantity_verified && <span className="verified-badge"><Check size={11} strokeWidth={3} /> Verified</span>}
    <Illustration label={`${name} illustration`} color={cropColorFor(name)} icon={cropIconFor(name)} />
    <div>
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

function MarketView({ role, open, notify, t }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T }) {
  const [filter, setFilter] = useState<'Upcoming' | 'Harvested'>('Upcoming');
  const [listings, setListings] = useState<CropListing[]>([]);
  const [clusters, setClusters] = useState<CropClusterWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soldIds, setSoldIds] = useState<Set<string>>(() => { try { const s = localStorage.getItem('soldIds'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); } });

  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      try {
        const [listingData, clusterData] = await Promise.all([fetchPublicListings(), fetchClusters()]);
        if (!cancelled) { setListings(listingData); setClusters(clusterData); }
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
    const filtered = listings.filter((l) => l.status === filter || (l.status === 'Sold' && filter === 'Harvested'));
    const clusterCropNames = new Set(clusters.map((c) => c.crop_name.toLowerCase()));
    const individualListings = filtered.filter((l) => {
      const name = cropDisplayName(l).toLowerCase();
      return !clusterCropNames.has(name);
    });
    return <Page title={t('market.exploreTitle')} body={t('market.exploreBody')} back={() => open('home')} t={t}>
      <div className="crop-search"><Search size={18} /><input placeholder={t('market.searchPlaceholder')} /></div>
      <div className="filter-row">{(['Upcoming', 'Harvested'] as const).map((item) => <button className={filter === item ? 'selected' : ''} key={item} onClick={() => setFilter(item)}>{t(`crops.${item}`)}</button>)}</div>
      {loading && <p className="calendar-empty">{t('crops.loading')}</p>}
      {error && <p className="calendar-empty">{error}</p>}
      {!loading && !error && clusters.length > 0 && (
        <>
          <h3 className="subhead cluster-section-heading"><Layers size={18} /> {t('cluster.sectionTitle')}</h3>
          <div className="buyer-crop-list">
            {clusters.map((cluster) => <ClusterCropCard key={cluster.id} cluster={cluster} t={t} onNotify={notify} role={role} onBuyNow={handleBuyNow} onSold={handleSold} sold={soldIds.has(cluster.id)} />)}
          </div>
          <h3 className="subhead">{t('cluster.individualListings')}</h3>
        </>
      )}
      {!loading && !error && filtered.length === 0 && clusters.length === 0 && <Card className="buyer-crop-card demo-buffer-card"><Illustration label="Paddy" color="teal" icon={Sprout} /><div><Badge tone="orange">{t('crops.demoBuffer')}</Badge><h2>Paddy · Sona Masuri</h2><p>{t('crops.demoBuffer')}</p><p style={{ marginTop: 4 }}>800 kg · 28 Oct 2026 · ₹22/kg · Warangal, TS</p><p style={{ marginTop: 2 }}>3 members joined</p></div></Card>}
      <div className="buyer-crop-list">{(clusters.length > 0 ? individualListings : filtered).map((listing) => {
        if (filter === 'Harvested') {
          return <BuyerHarvestedCard key={listing.id} listing={listing} t={t} onBuyNow={handleBuyNow} onSold={handleSold} sold={soldIds.has(listing.id)} />;
        }
        const name = cropDisplayName(listing);
        return <Card className="buyer-crop-card" key={listing.id}><Illustration label={`${name} illustration`} color={cropColorFor(name)} icon={cropIconFor(name)} /><div><Badge tone="blue">{t('crops.Upcoming')}</Badge><h2>{name} · {cropDisplayVariety(listing)}</h2><p>{formatKg(listing.quantity_kg)} · {formatDate(listing.expected_harvest_date)}</p><strong>{formatPrice(listing.indicative_price_per_kg)} · {t('market.samplePrice')}</strong><Button variant="soft" onClick={() => notify(t('market.preBookFlow', { crop: name }))}>{t('market.preBook')}</Button></div></Card>;
      })}</div>
    </Page>;
  }
  return <Page title={t('market.title')} body={t('market.body')} back={() => open('home')} t={t}><div className="market-layout"><Card className="market-spot"><Badge tone="orange">{t('market.sampleData')}</Badge><h2>{t('market.strongDemand')}</h2><strong>Bengaluru</strong><p>{t('market.tomatoDemand')}</p><Demo>{t('market.guidanceOnly')}</Demo></Card><Card className="price-list">{[['Tomato', '₹30/kg', '+8%'], ['Onion', '₹28/kg', '+4%'], ['Paddy', '₹22/kg', t('market.steady')]].map(([name, price, move]) => <div className="price-row" key={name}><span>{name}</span><strong>{price} <small>{move}</small></strong></div>)}</Card></div></Page>;
}

function CalendarView({ open, t }: { open: (view: View) => void; t: T }) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [listings, setListings] = useState<CropListing[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { setListings(await fetchMyListings()); } catch { } finally { setLoading(false); } })(); }, []);
  const harvestEvents = listings.filter((l) => l.expected_harvest_date || l.harvested_at).map((l) => ({ date: l.expected_harvest_date || l.harvested_at!, name: cropDisplayName(l), listing: l }));
  const eventCount = harvestEvents.length;
  return <Page title={t('calendar.title')} body={t('calendar.body')} back={() => open('home')} t={t}><div className="calendar-months">{months.map((month) => <Card className="calendar-month" key={month}><div className="calendar-head"><h2>{month} 2026</h2><Badge tone={month === 'October' ? 'orange' : 'blue'}>{month === 'October' ? t('calendar.events', { n: eventCount || 2 }) : t('calendar.noEvents')}</Badge></div>{month === 'October' ? <><div className="calendar-grid">{Array.from({ length: 35 }, (_, index) => { const day = index - 2; const hasEvent = harvestEvents.some((e) => { const d = new Date(e.date); return d.getDate() === day && d.getMonth() === 9; }); return <span key={index} className={hasEvent ? 'active' : ''}>{day > 0 && day < 32 ? day : ''}</span>; })}</div><div className="calendar-notes">{loading ? <span>{t('crops.loading')}</span> : harvestEvents.length > 0 ? harvestEvents.slice(0, 2).map((e) => <span key={e.listing.id}>{new Date(e.date).getDate()} {months[new Date(e.date).getMonth()].slice(0, 3)} · {e.name} {t('crops.harvestSuffix')}</span>) : <><span>{t('calendar.tomatoHarvest')}</span><span>{t('calendar.onionHarvest')}</span></>}</div></> : <p className="calendar-empty">{t('calendar.noHarvestEvents')}</p>}</Card>)}</div></Page>;
}

function TransportOptions({ role, open, notify, t }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('transport.title')} body={t('transport.body')} back={() => open('home')} t={t}><div className="feature-grid three"><FeatureCard title={t('transport.govScheme')} body={t('transport.govScheme.body')} icon={Truck} color="blue" onClick={() => notify(t('transport.govDetails'))} /><FeatureCard title={t('transport.fpoTransport')} body={t('transport.fpoTransport.body')} icon={Users} color="teal" onClick={() => notify(t('transport.fpoDetails'))} /><FeatureCard title={t('transport.privateTransport')} body={t('transport.privateTransport.body')} icon={Truck} color="orange" onClick={() => open('transport-detail')} /></div>{role === 'FPO' && <Card className="provider-card"><Illustration label={t('transport.transportProvider')} color="teal" icon={Truck} /><div><Badge tone="green">{t('transport.available')}</Badge><h3>{t('transport.warangalFpoTransport')}</h3><p>{t('transport.capacityPrice')}</p><Button onClick={() => notify(t('transport.availabilityUpdated'))}>{t('transport.updateAvailability')}</Button></div></Card>}</Page>; }

function TransportDetail({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { const providers = [{ name: 'Suresh Transport Services', vehicle: 'AP 02 TR 7788', rating: '4.8', review: 'Reliable pickup and careful loading', price: '₹2,500' }, { name: 'Lakshmi Agro Logistics', vehicle: 'TS 09 UV 2468', rating: '4.6', review: 'Good route coverage for vegetables', price: '₹2,350' }]; return <Page title={t('transport.detailTitle')} body={t('transport.detailBody')} back={() => open('transport-options')} t={t}><div className="provider-list">{providers.map((provider) => <Card className="provider-detail" key={provider.name}><Illustration label={t('role.Transport Provider')} color="orange" icon={Truck} /><Badge tone="green">{t('transport.demoVerified')}</Badge><h2>{provider.name}</h2><p>{provider.vehicle} · {t('transport.capacity')}</p><div className="detail-grid"><Detail label={t('transport.pickup')} value="Anantapur farm gate" /><Detail label={t('transport.destination')} value="Bengaluru buyer" /><Detail label={t('transport.dateTime')} value="18 October 2026 · 8:00 AM" /><Detail label={t('transport.estimatedPrice')} value={`${provider.price} · ${t('market.samplePrice')}`} /><Detail label={t('transport.rating')} value={`${provider.rating} / 5 · ${t('transport.demoRating')}`} /><Detail label={t('transport.review')} value={provider.review} /></div><Button onClick={() => notify(t('transport.providerSelected', { name: provider.name }))}>{t('transport.bookProvider')}</Button></Card>)}</div></Page>; }

function JourneyView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { const [started, setStarted] = useState(false); return <div className="journey-full"><button className="journey-back" onClick={() => open('home')}><ArrowLeft size={20} /> {t('common.back')}</button><div className="journey-map"><Map size={80} /><span className="route route-one" /><span className="route route-two" /><div className="map-marker pickup"><MapPin size={22} /><small>{t('journey.pickup')}</small></div><div className="map-marker destination"><MapPin size={22} /><small>{t('journey.destination')}</small></div><div className="map-marker vehicle"><Truck size={22} /></div><Demo>{t('journey.notLiveGps')}</Demo></div><div className="journey-sheet"><Badge tone="orange">{started ? t('journey.started') : t('journey.notStarted')}</Badge><h1>{t('journey.tomato500')}</h1><p>{t('journey.route')}</p><div className="journey-stats"><div><strong>{started ? '42 min' : '55 min'}</strong><small>{t('journey.estTravelTime')}</small></div><div><strong>25 km</strong><small>{t('journey.distance')}</small></div><div><strong>{started ? t('journey.inTransit') : t('journey.notStarted')}</strong><small>{t('journey.journeyStatus')}</small></div></div><div className="journey-steps"><span className={started ? 'done' : 'active'}>{started ? <Check size={15} /> : '1'}</span><span className={started ? 'active' : ''}>{started ? '2' : ''}</span><span /></div><Button icon={Truck} onClick={() => { setStarted(true); notify(t('journey.journeyStartedToast')); }}>{started ? t('journey.started') : t('journey.startJourney')}</Button><Demo>{t('journey.prototype')}</Demo></div></div>; }

function StorageView({ role, open, notify, t }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T }) { if (role === 'Storage Provider') return <Page title={t('storage.requestsTitle')} body={t('storage.requestsBody')} back={() => open('home')} t={t}><div className="storage-list">{[['Ramesh Kumar', 'Tomato', '500 kg', '18–25 October 2026', '4–8°C'], ['Warangal Farmers FPO', 'Onion', '1,000 kg', '26 October–2 November 2026', '10–15°C']].map(([farmer, crop, quantity, dates, temp]) => <Card className="storage-row" key={farmer}><Illustration label={t('storage.incomingRequest')} color="amber" icon={Warehouse} /><div><div className="row"><Badge tone="blue">{t('storage.incomingRequest')}</Badge><strong>{quantity}</strong></div><h3>{farmer}</h3><p>{crop} · {dates}</p><small>{temp} · {t('storage.storageRequirement')}</small></div><Button variant="soft" onClick={() => notify(t('storage.requestOpened', { farmer }))}>{t('storage.reviewRequest')}</Button></Card>)}</div></Page>; return <Page title={t('storage.title')} body={t('storage.body')} back={() => open('home')} t={t}><div className="storage-list">{[['Storage A', 'Occupied', '4–8°C', '5,000 kg', '₹2/kg/day'], ['Storage B', 'Available', '10–15°C', '3,000 kg', '₹1.5/kg/day'], ['Storage C', 'Available', 'Ambient', '1,200 kg', '₹1/kg/day']].map(([name, status, temp, capacity, price]) => <Card className="storage-row" key={name}><Illustration label={t('storage.title')} color="amber" icon={Warehouse} /><div><div className="row"><Badge tone={status === 'Available' ? 'green' : 'orange'}>{status === 'Available' ? t('storage.availableStatus') : t('storage.occupied')}</Badge><strong>{price}</strong></div><h3>{name}</h3><p>{temp} · {capacity}</p><small>{t('storage.sampleLocation')}</small></div><Button variant="soft" onClick={() => notify(t('storage.selected', { name }))}>{status === 'Available' ? t('storage.select') : t('storage.view')}</Button></Card>)}</div><Demo>{t('storage.notLiveGps')}</Demo></Page>; }

function ApprovalsView({ open, t }: { open: (view: View) => void; t: T }) { const [group, setGroup] = useState<'Current' | 'Previous'>('Current'); const current = [['Ramesh Kumar', 'Tomato', '500 kg', '18–25 October 2026', 'Approved on 15 October 2026']]; const previous = [['Warangal Farmers FPO', 'Onion', '1,000 kg', '26 October–2 November 2026', 'Completed on 2 November 2025']]; const approvals = group === 'Current' ? current : previous; return <Page title={t('approvals.title')} body={t('approvals.body')} back={() => open('home')} t={t}><div className="filter-row"><button className={group === 'Current' ? 'selected' : ''} onClick={() => setGroup('Current')}>{t('approvals.current')}</button><button className={group === 'Previous' ? 'selected' : ''} onClick={() => setGroup('Previous')}>{t('approvals.previous')}</button></div><div className="storage-list">{approvals.map(([name, crop, quantity, dates, status]) => <Card className="storage-row" key={name}><Illustration label={group === 'Current' ? t('approvals.activeStorage') : t('approvals.completedStorage')} color="teal" icon={FileCheck2} /><div><div className="row"><Badge tone={group === 'Current' ? 'green' : 'blue'}>{group === 'Current' ? t('approvals.approved') : t('approvals.completed')}</Badge><strong>{quantity}</strong></div><h3>{name}</h3><p>{crop} · {dates}</p><small>{status}</small></div></Card>)}</div></Page>; }

function FpoView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('fpo.title')} body={t('fpo.body')} back={() => open('home')} t={t}><div className="fpo-list"><Card className="fpo-row"><Illustration label={t('role.FPO')} color="teal" icon={Users} /><div><Badge tone="green">{t('transport.demoVerified')}</Badge><h3>Warangal Farmers FPO</h3><p>{t('fpo.cooperative')}</p><Button variant="soft" onClick={() => notify(t('fpo.connectOpened'))}>{t('fpo.viewFpo')}</Button></div></Card><Card className="fpo-row"><Illustration label={t('role.FPO')} color="blue" icon={Users} /><div><Badge tone="blue">{t('fpo.sampleProfile')}</Badge><h3>Hanamkonda Growers FPO</h3><p>{t('fpo.society')}</p><Button variant="soft" onClick={() => notify(t('fpo.connectOpened'))}>{t('fpo.viewFpo')}</Button></div></Card></div></Page>; }

function TutorialsView({ role, open, t }: { role: Role; open: (view: View) => void; t: T }) { const content: Record<Role, string[]> = { Farmer: ['Add an upcoming crop', 'Pre-booking for farmers', 'Find storage', 'Book transport'], Buyer: ['Explore crops', 'Pre-book a crop', 'Pay Balance Amount', 'Track an order'], FPO: ['Offer transport', 'Support member farmers', 'Update availability', 'Review demand'], 'Storage Provider': ['Review a storage request', 'Approve storage', 'Update a listing', 'Check earnings'], 'Transport Provider': ['Review a request', 'Accept an order', 'Start Journey', 'Complete delivery'] }; return <Page title={t('tutorials.title')} body={t('tutorials.body', { role: t(`role.${role}`) })} back={() => open('home')} t={t}><div className="tutorial-list">{content[role].map((item) => <Card className="tutorial-row" key={item}><span><BookOpen size={22} /></span><div><h3>{item}</h3><p>{t('tutorials.transcript')}</p></div><ArrowRight size={18} /></Card>)}</div><Demo>{t('tutorials.guidanceOnly')}</Demo></Page>; }
function HelpView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('help.title')} body={t('help.body')} back={() => open('home')} t={t}><div className="help-list"><FeatureCard title={t('help.talkToSupport')} body={t('help.talkToSupport.body')} icon={Phone} color="blue" onClick={() => notify(t('help.phonePreview'))} /><FeatureCard title={t('help.raiseDispute')} body={t('help.raiseDispute.body')} icon={AlertTriangle} color="orange" onClick={() => open('dispute')} /><FeatureCard title={t('help.openGuidance')} body={t('help.openGuidance.body')} icon={BookOpen} color="teal" onClick={() => open('tutorials')} /></div></Page>; }
function DisputeView({ open, notify, t }: { open: (view: View) => void; notify: (message: string) => void; t: T }) { return <Page title={t('dispute.title')} body={t('dispute.body')} back={() => open('help')} t={t}><Card className="form-card"><label>{t('dispute.orderOrCrop')}<input placeholder="Tomato · 40 kg" /></label><label>{t('dispute.whatHappened')}<textarea placeholder={t('dispute.describeProblem')} /></label><label>{t('dispute.preferredNextStep')}<select><option>{t('dispute.reviewShortage')}</option><option>{t('dispute.replacementBuyer')}</option><option>{t('dispute.reviewPayment')}</option></select></label><Button icon={AlertTriangle} onClick={() => notify(t('dispute.submitted'))}>{t('dispute.submit')}</Button></Card><Notice tone="warning"><strong>{t('dispute.shortageTitle')}</strong><p>{t('dispute.shortageBody')}</p></Notice></Page>; }

function ProfileView({ role, open, language, setLanguage, buyerCategory, signOut, addAccount, t, profileData }: { role: Role; open: (view: View) => void; language: Language; setLanguage: (language: Language) => void; buyerCategory: string; signOut: () => void; addAccount: () => void; t: T; profileData?: Profile | null }) { return <Page title={t('profile.title')} body={t('profile.body')} back={() => open('home')} t={t}><Card className="profile-card"><span className={`profile-avatar ${roleMeta[role].color}`}>{roleMeta[role].initials}</span><div><Badge tone="green">{t('profile.demoVerified')}</Badge><h2>{role === 'Farmer' ? (profileData?.display_name ?? 'Ramesh Kumar') : role === 'Buyer' ? 'Venkat Reddy' : roleMeta[role].illustration}</h2><p>{role === 'Farmer' ? (profileData?.home_location ?? roleMeta[role].location) : roleMeta[role].location}</p></div></Card>{role === 'Farmer' && <><SectionHeading title={t('profile.farmerVerification')} body={t('profile.farmerVerificationBody')} icon={FileCheck2} /><div className="detail-grid"><Detail label={t('profile.farmerCategory')} value={profileData?.farmer_category ?? t('login.landOwner')} /><Detail label={t('profile.govVerification')} value={t('profile.pmKisan')} /><Detail label={t('profile.verificationDoc')} value={t('profile.aadhaarLinked')} /><Detail label={t('profile.landOwnership')} value={t('profile.landDetails')} /><Detail label={t('profile.cropsCultivated')} value="Tomato, Onion, Paddy" /><Detail label={t('profile.quantityHarvested')} value={t('profile.sampleQuantity')} /></div></>}{role === 'Buyer' && <><SectionHeading title={t('profile.buyerVerification')} body={t('profile.buyerVerificationBody')} icon={FileCheck2} /><div className="detail-grid"><Detail label={t('profile.buyerCategory')} value={buyerCategory} /><Detail label={t('profile.mobileNumber')} value="+91 98765 43210" /><Detail label={t('profile.googleAccount')} value="venkat@example.com" /><Detail label={t('profile.completeAddress')} value="Warangal Market Road, Telangana" /><Detail label={t('profile.blockArea')} value="Hanamkonda · Near Rythu Bazaar" /><Detail label={t('profile.buyerRating')} value={t('profile.demoRating')} /></div></>}{(role === 'FPO' || role === 'Storage Provider' || role === 'Transport Provider') && <div className="detail-grid"><Detail label={t('profile.organisation')} value={roleMeta[role].illustration} /><Detail label={t('profile.verification')} value={t('profile.permitReview')} /><Detail label={t('profile.contact')} value="+91 98765 43210 · sample@example.com" /><Detail label={t('profile.serviceArea')} value="Warangal, Karimnagar, Hyderabad" /></div>}<Card className="settings-card" onClick={() => open('settings')}><Settings size={22} /><div><h3>{t('profile.settings')}</h3><p>{t('profile.settingsBody')}</p></div><ArrowRight size={18} /></Card><div className="profile-actions"><Button variant="soft" onClick={addAccount}>{t('profile.addAccount')}</Button><Button variant="outline" onClick={signOut}>{t('profile.signOut')}</Button></div></Page>; }
function SettingsView({ open, language, setLanguage, t }: { open: (view: View) => void; language: Language; setLanguage: (language: Language) => void; t: T }) { return <Page title={t('settings.title')} body={t('settings.body')} back={() => open('profile')} t={t}><Card className="settings-card large"><Settings size={22} /><div><h3>{t('settings.language')}</h3><p>{t('settings.languageBody')}</p><div className="language-options"><LanguagePicker value={language} setValue={setLanguage} t={t} /></div></div></Card><Card className="settings-card large"><Headphones size={22} /><div><h3>{t('settings.voiceAssistant')}</h3><p>{t('settings.voiceBody')}</p></div><span className="toggle on" /></Card></Page>; }

function OrdersView({ role, open, notify, t }: { role: Role; open: (view: View) => void; notify: (message: string) => void; t: T }) { const [group, setGroup] = useState<'Current' | 'Previous'>('Current'); return <Page title={t('orders.title')} body={t('orders.body')} back={() => open('home')} t={t}><div className="filter-row"><button className={group === 'Current' ? 'selected' : ''} onClick={() => setGroup('Current')}>{t('orders.current')}</button><button className={group === 'Previous' ? 'selected' : ''} onClick={() => setGroup('Previous')}>{t('orders.previous')}</button></div><Card className="order-card"><Badge tone={group === 'Current' ? 'green' : 'blue'}>{group === 'Current' ? t('orders.bookingConfirmed') : t('orders.completedOrder')}</Badge><h2>{group === 'Current' ? 'Tomato · Arka Rakshak · 40 kg' : 'Paddy · Sona Masuri · 80 kg'}</h2><p>{group === 'Current' ? 'Ramesh Kumar · Harvest 18 October 2026' : 'Warangal Farmers FPO · Delivered 12 August 2026'}</p><div className="order-track"><span className="done">{t('orders.booked')}</span><span className="done">{t('orders.farmerConfirmed')}</span><span className={group === 'Current' ? 'active' : 'done'}>{group === 'Current' ? t('orders.assuredDeal') : t('orders.delivered')}</span><span>{group === 'Current' ? t('orders.delivered') : t('orders.archived')}</span></div><div className="row"><Demo>{t('orders.samplePayment')}</Demo>{group === 'Current' ? <Button onClick={() => notify(t('orders.viewMapOpened'))}>{t('orders.viewMap')}</Button> : <Button variant="soft" onClick={() => notify(t('orders.orderDetailsOpened'))}>{t('orders.viewDetails')}</Button>}</div>{group === 'Current' && <Button icon={ShieldCheck} onClick={() => notify(t('orders.payBalanceFlow'))}>{t('orders.payBalance')}</Button>}</Card><Notice tone="warning"><strong>{t('orders.shortageTitle')}</strong><p>{t('orders.shortageBody')}</p></Notice>{role === 'Transport Provider' && <Button icon={Map} onClick={() => open('journey')}>{t('orders.openLiveJourney')}</Button>}</Page>; }
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

function App() { const { role: authRole, profile, signInWithRole, signOut: authSignOut, updateLanguage, loading, signingIn, authError, clearError } = useAuth(); const [view, setView] = useState<View>('home'); const [loginRole, setLoginRole] = useState<Role | null>(null); const [voice, setVoice] = useState(false); const [notifications, setNotifications] = useState(false); const [language, setLanguageState] = useState<Language>('English'); const [toast, setToast] = useState(''); const [notifItems, setNotifItems] = useState<NotificationRow[]>([]); const [notifLoading, setNotifLoading] = useState(false); const [notifError, setNotifError] = useState<string | null>(null); const [selectedCrop, setSelectedCrop] = useState<CropListing | null>(null); const [formDraft, setFormDraftState] = useState<Record<string, string>>({}); const [loginStep, setLoginStep] = useState(0); const [loginMobile, setLoginMobile] = useState('+91 98765 43210'); const [loginOtp, setLoginOtp] = useState(''); const [loginBuyerCat, setLoginBuyerCat] = useState('Normal Buyer'); const role = (authRole && (allRoles as string[]).includes(authRole)) ? (authRole as Role) : null; const buyerCategory = profile?.buyer_category ?? 'Normal Buyer'; useEffect(() => { if (profile?.language) setLanguageState(languageFromCode(profile.language)); }, [profile?.language]); const setLanguage = (lang: Language) => { setLanguageState(lang); updateLanguage(codeFromLanguage(lang)); }; const t = makeT(language); const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2300); }; const open = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }; useEffect(() => { if (loginRole) setVoice(true); }, [loginRole]); const setFormDraft = useCallback((field: string, value: string) => { setFormDraftState((prev) => ({ ...prev, [field]: value })); }, []); const setLoginFieldVoice = useCallback((field: 'mobile' | 'otp' | 'buyerCategory', value: string) => { if (field === 'mobile') { setLoginMobile(value); setLoginStep(1); } else if (field === 'otp') { setLoginOtp(value); setLoginStep(2); } else if (field === 'buyerCategory') setLoginBuyerCat(value); }, []); const submitLoginVoice = useCallback(async () => { if (!loginRole || signingIn) return; try { await signInWithRole(loginRole, loginRole === 'Farmer' ? rameshEmail : demoEmails[loginRole], 'Demo1234!', loginBuyerCat); setLoginRole(null); setLoginStep(0); setLoginMobile('+91 98765 43210'); setLoginOtp(''); setVoice(false); setView('home'); } catch { } }, [loginRole, signingIn, loginBuyerCat]); const loadNotifications = useCallback(async () => { if (!role) return; setNotifLoading(true); setNotifError(null); try { await seedDemoNotificationsIfNeeded(); setNotifItems(await fetchNotifications()); } catch { setNotifError(t('notifications.loadError')); } finally { setNotifLoading(false); } }, [role, t]); useEffect(() => { loadNotifications(); }, [loadNotifications]); const handleMarkRead = async (id: string) => { try { await markNotificationRead(id); setNotifItems((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)); } catch { } }; const handleMarkAllRead = async () => { try { await markAllNotificationsRead(); setNotifItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))); } catch { } }; const unreadCount = notifItems.filter((n) => !n.read_at).length; const signOut = () => { authSignOut(); setView('home'); }; const addAccount = () => { authSignOut(); setView('home'); }; if (loading) return <main className="login-screen"><div className="login-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ display: 'grid', placeItems: 'center', width: '31px', height: '31px', borderRadius: '9px', color: '#fff', background: '#2c823b' }}><Sprout size={27} /></span><strong>{t('app.name')}</strong></div></main>; if (!role && loginRole) return <><LoginFlow role={loginRole} t={t} step={loginStep} setStep={setLoginStep} mobile={loginMobile} setMobile={setLoginMobile} otp={loginOtp} setOtp={setLoginOtp} buyerCat={loginBuyerCat} setBuyerCat={setLoginBuyerCat} done={async (email, password, buyerCategory) => { if (signingIn) return; try { await signInWithRole(loginRole, email, password, buyerCategory); setLoginRole(null); setLoginStep(0); setVoice(false); setView('home'); } catch { } }} back={() => { clearError(); setLoginRole(null); setVoice(false); }} authError={authError} clearError={clearError} signingIn={signingIn} /><VoiceButton onClick={() => { warmupSpeech(); setVoice(true); }} t={t} />{voice && <VoiceModal close={() => setVoice(false)} t={t} language={language} currentView={loginStep === 0 ? (loginRole === 'Farmer' ? 'login-farmer' : loginRole === 'FPO' ? 'login-fpo' : 'login-mobile') : loginStep === 1 ? 'login-otp' : (loginRole === 'Buyer' ? 'login-category' : 'login-verify')} loginRole={loginRole} selectRole={(r) => setLoginRole(r as Role)} setLoginStep={setLoginStep} setLoginField={setLoginFieldVoice} submitLogin={submitLoginVoice} />}{toast && <div className="toast"><AlertTriangle size={17} />{toast}</div>}</>; if (!role) return <><Login onRole={setLoginRole} voiceOpen={() => { warmupSpeech(); setVoice(true); }} t={t} language={language} />{voice && <VoiceModal close={() => setVoice(false)} t={t} language={language} currentView="home" selectRole={(r) => setLoginRole(r as Role)} setLoginStep={setLoginStep} setLoginField={setLoginFieldVoice} submitLogin={submitLoginVoice} />}</>; return <div className="logged-in">{view === 'home' && <main className="long-scroll"><RoleHome role={role} open={open} profile={() => open('profile')} notifications={() => setNotifications(true)} t={t} profileData={profile} /></main>}{view === 'crops' && <CropView open={open} selectCrop={setSelectedCrop} t={t} role={role} notify={notify} currentUserId={profile?.id} />}{view === 'crop-detail' && selectedCrop && <CropDetail open={open} crop={selectedCrop} t={t} role={role} onEdit={() => open('crop-edit')} onMarkHarvested={async () => { try { await markAsHarvested(selectedCrop.id, new Date().toISOString()); notify(t('crops.markedHarvested')); setSelectedCrop({ ...selectedCrop, status: 'Harvested', harvested_at: new Date().toISOString() }); open('crops'); } catch { notify(t('crops.createError')); } }} />}{view === 'crop-create' && <CropFormView open={open} notify={notify} t={t} voiceFill={formDraft} formDraft={formDraft} />}{view === 'crop-edit' && selectedCrop && <CropFormView open={open} notify={notify} t={t} editing={selectedCrop} voiceFill={formDraft} formDraft={formDraft} />}{view === 'market' && <MarketView role={role} open={open} notify={notify} t={t} />}{view === 'calendar' && <CalendarView open={open} t={t} />}{view === 'transport-options' && <TransportOptions role={role} open={open} notify={notify} t={t} />}{view === 'transport-detail' && <TransportDetail open={open} notify={notify} t={t} />}{view === 'journey' && <JourneyView open={open} notify={notify} t={t} />}{view === 'storage' && <StorageView role={role} open={open} notify={notify} t={t} />}{view === 'approvals' && <ApprovalsView open={open} t={t} />}{view === 'fpo' && <FpoView open={open} notify={notify} t={t} />}{view === 'tutorials' && <TutorialsView role={role} open={open} t={t} />}{view === 'help' && <HelpView open={open} notify={notify} t={t} />}{view === 'dispute' && <DisputeView open={open} notify={notify} t={t} />}{view === 'profile' && <ProfileView role={role} open={open} language={language} setLanguage={setLanguage} buyerCategory={buyerCategory} signOut={signOut} addAccount={addAccount} t={t} profileData={profile} />}{view === 'settings' && <SettingsView open={open} language={language} setLanguage={setLanguage} t={t} />}{view === 'orders' && <OrdersView role={role} open={open} notify={notify} t={t} />}{view === 'deals' && <DealsView open={open} notify={notify} t={t} />}{view === 'features' && <FeatureView role={role} open={open} notify={notify} t={t} />}<div className="floating-tools"><button onClick={() => open('profile')} aria-label={t('profile.title')}><UserRound size={24} /></button><button onClick={() => setNotifications(true)} aria-label={t('notifications.title')}><Bell size={24} />{unreadCount > 0 && <i>{unreadCount}</i>}</button></div><VoiceButton onClick={() => { warmupSpeech(); setVoice(true); }} t={t} />{voice && <VoiceModal close={() => setVoice(false)} t={t} language={language} open={open} currentView={view} setFormDraft={setFormDraft} formDraft={formDraft} setLanguage={setLanguage} selectRole={(r) => { authSignOut(); setLoginRole(r as Role); }} />}{notifications && <Notifications close={() => setNotifications(false)} t={t} items={notifItems} loading={notifLoading} error={notifError} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} />}{toast && <div className="toast"><Check size={17} />{toast}</div>}</div>; }
export default App;
