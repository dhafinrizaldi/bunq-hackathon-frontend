const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';

console.log('[stt] api key present:', !!process.env.EXPO_PUBLIC_GROQ_API_KEY);
console.log('[stt] api key length:', process.env.EXPO_PUBLIC_GROQ_API_KEY?.length);

export interface TranscriptionResult {
  transcript: string;
  durationMs: number;
}

export async function transcribeAudio(audioUri: string): Promise<TranscriptionResult> {
  if (!GROQ_API_KEY) {
    throw new Error('EXPO_PUBLIC_GROQ_API_KEY not configured');
  }

  if (__DEV__) {
    console.log('[stt] Uploading', audioUri);
  }

  const startTime = Date.now();

  // IMPORTANT: Do NOT set Content-Type manually. fetch sets the multipart boundary
  // automatically. Setting it manually (without boundary) causes silent 400 errors.
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as any); // RN FormData accepts URI-style file objects, not DOM File instances
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'json');
  formData.append('language', 'en');
  formData.append('temperature', '0');

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 500) {
      console.warn('[stt] Turbo returned 500, falling back to whisper-large-v3');
      return transcribeWithFallback(audioUri, startTime);
    }
    throw new Error(`Groq STT failed: ${res.status} ${errorText}`);
  }

  const data: { text: string } = await res.json();
  const result: TranscriptionResult = {
    transcript: data.text.trim(),
    durationMs: Date.now() - startTime,
  };

  if (__DEV__) {
    console.log('[stt] Transcript received in', result.durationMs, 'ms:', result.transcript);
  }

  return result;
}

async function transcribeWithFallback(
  audioUri: string,
  startTime: number
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as any);
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');
  formData.append('language', 'en');

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq STT fallback failed: ${res.status} ${errorText}`);
  }

  const data: { text: string } = await res.json();
  const result: TranscriptionResult = {
    transcript: data.text.trim(),
    durationMs: Date.now() - startTime,
  };

  if (__DEV__) {
    console.log('[stt] Fallback transcript received in', result.durationMs, 'ms:', result.transcript);
  }

  return result;
}
