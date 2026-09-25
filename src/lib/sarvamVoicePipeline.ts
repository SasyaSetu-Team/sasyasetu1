import type { IntentResult } from '@/lib/intentClient';
import { emitDebug } from '@/lib/voice';

type SarvamLang = 'en-IN' | 'hi-IN' | 'te-IN';

async function blobToWav(audioBlob: Blob): Promise<Blob> {
  const t0 = performance.now();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioCtx();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer);

    // Sarvam STT expects 16kHz, 16-bit, mono WAV.
    // Browser AudioContext typically decodes at 48kHz stereo — we must resample.
    const TARGET_SAMPLE_RATE = 16000;
    const sourceRate = decoded.sampleRate;
    const sourceChannels = decoded.numberOfChannels;
    const sourceFrames = decoded.length;
    const sourceDurationMs = (sourceFrames / sourceRate) * 1000;

    // Downmix to mono
    const monoData = new Float32Array(sourceFrames);
    for (let i = 0; i < sourceFrames; i++) {
      let sum = 0;
      for (let c = 0; c < sourceChannels; c++) {
        sum += decoded.getChannelData(c)[i];
      }
      monoData[i] = sum / sourceChannels;
    }

    // Resample to 16kHz using linear interpolation
    let resampled: Float32Array;
    if (sourceRate === TARGET_SAMPLE_RATE) {
      resampled = monoData;
    } else {
      const ratio = TARGET_SAMPLE_RATE / sourceRate;
      const targetFrames = Math.round(sourceFrames * ratio);
      resampled = new Float32Array(targetFrames);
      for (let i = 0; i < targetFrames; i++) {
        const srcIdx = i / ratio;
        const idx0 = Math.floor(srcIdx);
        const idx1 = Math.min(idx0 + 1, sourceFrames - 1);
        const frac = srcIdx - idx0;
        resampled[i] = monoData[idx0] * (1 - frac) + monoData[idx1] * frac;
      }
    }

    const numChannels = 1;
    const sampleRate = TARGET_SAMPLE_RATE;
    const numFrames = resampled.length;

    // 16-bit PCM WAV
    const bytesPerSample = 2;
    const dataSize = numFrames * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
      const s = Math.max(-1, Math.min(1, resampled[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    // Compute RMS energy of the resampled audio to confirm real speech exists
    let maxSample = 0;
    let sumSq = 0;
    for (let i = 0; i < numFrames; i++) {
      const a = Math.abs(resampled[i]);
      if (a > maxSample) maxSample = a;
      sumSq += resampled[i] * resampled[i];
    }
    const rms = Math.sqrt(sumSq / numFrames);
    const outputDurationMs = (numFrames / sampleRate) * 1000;

    // Pad audio shorter than 1s with trailing silence — Sarvam STT can return
    // empty transcripts for sub-second clips even when speech is present.
    const MIN_DURATION_MS = 1000;
    let finalBuffer = buffer;
    let finalFrames = numFrames;
    if (outputDurationMs < MIN_DURATION_MS) {
      const padFrames = Math.round((MIN_DURATION_MS / 1000) * sampleRate) - numFrames;
      if (padFrames > 0) {
        const paddedSize = 44 + (numFrames + padFrames) * bytesPerSample;
        finalBuffer = new ArrayBuffer(paddedSize);
        const paddedView = new DataView(finalBuffer);
        const srcView = new DataView(buffer);
        for (let b = 0; b < buffer.byteLength; b++) paddedView.setUint8(b, srcView.getUint8(b));
        paddedView.setUint32(4, 36 + (numFrames + padFrames) * bytesPerSample, true);
        paddedView.setUint32(40, (numFrames + padFrames) * bytesPerSample, true);
        finalFrames = numFrames + padFrames;
        console.log('[sarvam] blobToWav: padded short audio', {
          originalMs: outputDurationMs.toFixed(0),
          paddedMs: ((finalFrames / sampleRate) * 1000).toFixed(0),
          padFrames,
        });
      }
    }

    const wavBlob = new Blob([finalBuffer], { type: 'audio/wav' });
    console.log('[sarvam] blobToWav:', {
      wavMs: (performance.now() - t0).toFixed(0),
      inputType: audioBlob.type,
      inputSize: audioBlob.size,
      inputSampleRate: sourceRate,
      inputChannels: sourceChannels,
      inputDurationMs: sourceDurationMs.toFixed(0),
      outputType: wavBlob.type,
      outputSize: wavBlob.size,
      outputSampleRate: sampleRate,
      outputChannels: numChannels,
      outputDurationMs: ((finalFrames / sampleRate) * 1000).toFixed(0),
      outputRms: rms.toFixed(5),
      outputMaxSample: maxSample.toFixed(5),
      padded: finalFrames > numFrames,
    });
    emitDebug('blobToWav', `in=${sourceRate}Hz/${sourceChannels}ch → out=${sampleRate}Hz/1ch size=${wavBlob.size} dur=${((finalFrames / sampleRate) * 1000).toFixed(0)}ms rms=${rms.toFixed(4)} max=${maxSample.toFixed(4)}`);
    return wavBlob;
  } finally {
    if (audioContext.state !== 'closed') audioContext.close().catch(() => {});
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface VoiceIntentResponse {
  intent: string;
  sub_target: string | null;
  slots: Record<string, string>;
  confidence: number;
  source?: string;
  description?: string | null;
  speech_reply?: string | null;
}

export interface SarvamVoiceTurnResult {
  ok: boolean;
  transcript?: string;
  intentData?: VoiceIntentResponse;
  replyText?: string;
  replyAudio?: Blob;
  error?: string;
}

function langCodeForSarvam(lang: SarvamLang): string {
  return lang.split('-')[0];
}

function buildReplyText(data: VoiceIntentResponse, lang: SarvamLang): string {
  if (data.description) return data.description;
  if (data.speech_reply) return data.speech_reply;

  const replies: Record<string, Record<string, string>> = {
    'en-IN': {
      navigate: `OK, opening ${data.sub_target ?? 'that page'}.`,
      add_crop: 'OK, let\'s add a new crop.',
      mark_harvested: 'OK, marking your crop as harvested.',
      stop: 'Stopping. Goodbye.',
      back: 'Going back.',
      confirm: 'Confirmed.',
      cancel_confirm: 'Cancelled.',
      unknown: 'Sorry, I didn\'t understand that.',
    },
    'hi-IN': {
      navigate: `ठीक है, ${data.sub_target ?? 'वह पेज'} खोल रहा हूँ।`,
      add_crop: 'ठीक है, आइए नई फसल जोड़ें।',
      mark_harvested: 'ठीक है, आपकी फसल कटाई के लिए चिह्नित कर रहा हूँ।',
      stop: 'रुक रहा हूँ। अलविदा।',
      back: 'वापस जा रहा हूँ।',
      confirm: 'पुष्टि हुई।',
      cancel_confirm: 'रद्द किया गया।',
      unknown: 'माफ़ कीजिए, मैं समझा नहीं।',
    },
    'te-IN': {
      navigate: `సరే, ${data.sub_target ?? 'ఆ పేజీ'} తెరుస్తున్నాను.`,
      add_crop: 'సరే, ఆ కొత్త పంట జోడించుదాం.',
      mark_harvested: 'సరే, మీ పంట కటాయగా గుర్తిస్తున్నాను.',
      stop: 'ఆపుతున్నాను. వీడ్కోలు.',
      back: 'వెనుకకు వెళ్తున్నాను.',
      confirm: 'నిర్ధారించబడింది.',
      cancel_confirm: 'రద్దు చేయబడింది.',
      unknown: 'క్షమించండి, నేను అర్థం చేసుకోలేదు.',
    },
  };

  const langReplies = replies[lang] ?? replies['en-IN'];
  return langReplies[data.intent] ?? langReplies.unknown;
}

async function callSarvamSTT(audioBlob: Blob, language: SarvamLang, mode?: 'transcribe' | 'verbatim'): Promise<string> {
  const t0 = performance.now();
  const wavBlob = await blobToWav(audioBlob);
  const formData = new FormData();
  formData.append('file', wavBlob, 'audio.wav');
  formData.append('language', language);
  if (mode) formData.append('stt_mode', mode);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/sarvam-stt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: formData,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  console.log('[sarvam] STT fetch done', { sttMs: (performance.now() - t0).toFixed(0), status: res.status, mode: mode ?? 'default' });
  emitDebug('sarvam STT done', `${(performance.now() - t0).toFixed(0)}ms status=${res.status} mode=${mode ?? 'default'}`);

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`STT failed (${res.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await res.json() as { transcript?: string; error?: string };
  console.log('[sarvam] raw STT response:', JSON.stringify(data));
  emitDebug('sarvam STT raw', `transcript="${(data.transcript ?? '').slice(0, 80)}" error=${data.error ?? 'none'}`);
  if (data.error) throw new Error(`STT error: ${data.error}`);
  if (!data.transcript || !data.transcript.trim()) {
    emitDebug('sarvam STT', 'empty transcript — no speech detected in audio');
    return '';
  }
  return data.transcript;
}

async function callVoiceIntent(
  transcript: string,
  lang: SarvamLang,
  context?: { currentPage?: string; voiceSession?: Record<string, unknown> | null; screenContent?: string | null },
): Promise<VoiceIntentResponse> {
  const t0 = performance.now();
  const body = {
    transcript,
    currentPage: context?.currentPage ?? 'unknown',
    activeTab: null,
    visibleData: null,
    voiceSession: context?.voiceSession ?? null,
    language: langCodeForSarvam(lang),
    screenContent: context?.screenContent ?? null,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/voice-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  console.log('[sarvam] intent fetch done', { intentMs: (performance.now() - t0).toFixed(0), status: res.status });
  emitDebug('sarvam intent done', `${(performance.now() - t0).toFixed(0)}ms status=${res.status}`);

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Intent failed (${res.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await res.json() as VoiceIntentResponse;
  if (!data || typeof data.intent !== 'string') {
    throw new Error('Intent returned invalid response');
  }
  return data;
}

const ttsCache = new Map<string, Blob>();

async function callSarvamTTS(text: string, lang: SarvamLang): Promise<Blob> {
  const cacheKey = `${lang}:${text}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    console.log('[sarvam] TTS cache hit', { text: text.slice(0, 50), lang });
    return cached;
  }
  const t0 = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/sarvam-tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ text, target_language_code: lang }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`TTS failed (${res.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await res.json() as { audioBase64?: string; error?: string };
  console.log('[sarvam] TTS fetch done', { ttsMs: (performance.now() - t0).toFixed(0), status: res.status, hasAudio: !!data.audioBase64 });
  emitDebug('sarvam TTS done', `${(performance.now() - t0).toFixed(0)}ms hasAudio=${!!data.audioBase64}`);
  if (data.error) throw new Error(`TTS error: ${data.error}`);
  if (!data.audioBase64) throw new Error('TTS returned no audio');

  const byteString = atob(data.audioBase64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'audio/wav' });
  ttsCache.set(cacheKey, blob);
  return blob;
}

export async function transcribeViaSarvam(
  audioBlob: Blob,
  languageCode: SarvamLang,
  mode?: 'transcribe' | 'verbatim',
): Promise<string | null> {
  try {
    return await callSarvamSTT(audioBlob, languageCode, mode);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sarvam] transcribeViaSarvam failed:', message);
    emitDebug('sarvam transcribe failed', message);
    return null;
  }
}

export async function speakWithSarvam(
  text: string,
  languageCode: SarvamLang,
): Promise<Blob | null> {
  try {
    return await callSarvamTTS(text, languageCode);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sarvam] speakWithSarvam failed:', message);
    return null;
  }
}

export async function runSarvamVoiceTurn(
  audioBlob: Blob,
  languageCode: SarvamLang,
  context?: { currentPage?: string; voiceSession?: Record<string, unknown> | null; screenContent?: string | null },
  mode?: 'transcribe' | 'verbatim',
): Promise<SarvamVoiceTurnResult> {
  const t0 = performance.now();
  try {
    const transcript = await callSarvamSTT(audioBlob, languageCode, mode);
    if (!transcript || !transcript.trim()) {
      emitDebug('sarvam turn', 'STT returned empty transcript — no speech detected, skipping intent');
      return { ok: false, error: 'no_speech_detected' };
    }
    const intentData = await callVoiceIntent(transcript, languageCode, context);
    const replyText = buildReplyText(intentData, languageCode);
    const replyAudio = await callSarvamTTS(replyText, languageCode);

    const totalMs = performance.now() - t0;
    console.log('[sarvam] runSarvamVoiceTurn complete', { totalMs: totalMs.toFixed(0) });
    emitDebug('sarvam turn total', `${totalMs.toFixed(0)}ms`);

    return { ok: true, transcript, intentData, replyText, replyAudio };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
