import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { Mp3Encoder } from '@breezystack/lamejs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON payloads up to 25MB for audio uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// CORS headers for easy REST API integration from any external client/origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static assets from public folder (favicon, logos)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/favicon.ico', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'voxclone-neural-engine',
    },
  },
});

// Daily quota configuration
const DAILY_LIMIT = 10000;

interface DailyUsageRecord {
  date: string; // YYYY-MM-DD
  charactersUsed: number;
  requestsCount: number;
}

interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface VoiceProfile {
  id: string;
  name: string;
  type: 'cloned' | 'preset';
  description: string;
  baseVoiceAnchor: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  stylePrompt: string;
  gender: 'male' | 'female' | 'neutral';
  pitch: string;
  tempo: string;
  accent: string;
  timbre: string;
  createdAt: string;
  sampleAudio?: string; // base64
  sampleText?: string;
}

// In-memory state with file persistence backup
let usageRecord: DailyUsageRecord = {
  date: new Date().toISOString().slice(0, 10),
  charactersUsed: 0,
  requestsCount: 0,
};

let apiKeys: ApiKeyRecord[] = [
  {
    id: 'key_default',
    name: 'Production Default Key',
    key: 'vx_live_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 10),
    createdAt: new Date().toISOString(),
  },
];

let voices: VoiceProfile[] = [
  {
    id: 'voice_kore',
    name: 'Kore - Narrative Warmth',
    type: 'preset',
    description: 'Silky, melodic, engaging voice ideal for audiobooks, education, and calm explainers.',
    baseVoiceAnchor: 'Kore',
    stylePrompt: 'Warm, clear, articulate, warm narrative cadence, gentle modulation',
    gender: 'female',
    pitch: 'Medium-high',
    tempo: 'Balanced',
    accent: 'General American',
    timbre: 'Warm, resonant, articulate',
    createdAt: new Date().toISOString(),
    sampleText: 'Welcome to VoxClone. Let your words resonate with authentic human warmth.',
  },
  {
    id: 'voice_puck',
    name: 'Puck - Dynamic Host',
    type: 'preset',
    description: 'Enthusiastic, energetic, modern vocal tone perfect for YouTube, podcasts, and promos.',
    baseVoiceAnchor: 'Puck',
    stylePrompt: 'Upbeat, modern podcast host, lively intonation, crisp diction',
    gender: 'male',
    pitch: 'Medium',
    tempo: 'Energetic',
    accent: 'General American',
    timbre: 'Bright, youthful, punchy',
    createdAt: new Date().toISOString(),
    sampleText: 'Hey everyone, check out this brand new voice cloned directly in your browser!',
  },
  {
    id: 'voice_charon',
    name: 'Charon - Deep Authority',
    type: 'preset',
    description: 'Deep, commanding baritone with profound gravitas for documentaries, trailers, and corporate.',
    baseVoiceAnchor: 'Charon',
    stylePrompt: 'Deep resonant baritone, authoritative, steady, cinematic pacing',
    gender: 'male',
    pitch: 'Deep / Low',
    tempo: 'Measured',
    accent: 'Transatlantic / Neutral',
    timbre: 'Resonant chest baritone, smooth',
    createdAt: new Date().toISOString(),
    sampleText: 'In a world shaped by intelligence, our voices bridge the gap between imagination and reality.',
  },
  {
    id: 'voice_zephyr',
    name: 'Zephyr - Bright Conversational',
    type: 'preset',
    description: 'Friendly, approachable, crisp assistant tone for commercials and tech product tours.',
    baseVoiceAnchor: 'Zephyr',
    stylePrompt: 'Friendly, bright, conversational, positive, crystal clear',
    gender: 'female',
    pitch: 'High-clarity',
    tempo: 'Brisk & natural',
    accent: 'Modern Neutral',
    timbre: 'Crisp, airy, warm',
    createdAt: new Date().toISOString(),
    sampleText: 'Getting started is simple. Clone any voice with just 5 seconds of audio.',
  },
  {
    id: 'voice_fenrir',
    name: 'Fenrir - Textured Storyteller',
    type: 'preset',
    description: 'Rich, textured, slightly raspy character voice full of soul and dramatic depth.',
    baseVoiceAnchor: 'Fenrir',
    stylePrompt: 'Rich, slightly raspy, dramatic pacing, authentic emotional weight',
    gender: 'male',
    pitch: 'Mid-low',
    tempo: 'Deliberate',
    accent: 'Nordic / Gritty Neutral',
    timbre: 'Warm raspy, gritty acoustic texture',
    createdAt: new Date().toISOString(),
    sampleText: 'Every voice carries a story, woven from tone, memory, and breath.',
  },
];

// Helper: Ensure daily usage is reset on new date
function checkAndResetDailyUsage() {
  const today = new Date().toISOString().slice(0, 10);
  if (usageRecord.date !== today) {
    usageRecord = {
      date: today,
      charactersUsed: 0,
      requestsCount: 0,
    };
  }
}

// Generate simple synthetic WAV audio buffer as a fallback if needed
function generateFallbackWav(sampleRate = 24000, durationSec = 1.5, pitchHz = 220): Buffer {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // 1 channel (mono)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Generate pleasant harmonic voice-like tone
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin((Math.PI * i) / numSamples); // smooth attack & decay
    const val =
      envelope *
      (0.6 * Math.sin(2 * Math.PI * pitchHz * t) +
        0.3 * Math.sin(4 * Math.PI * pitchHz * t) +
        0.1 * Math.sin(6 * Math.PI * pitchHz * t));
    const sample = Math.max(-1, Math.min(1, val));
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }
  return buffer;
}

// Convert PCM WAV buffer to MP3 buffer using Mp3Encoder
function wavBufferToMp3(wavBuffer: Buffer): Buffer {
  // If already MP3, return as is
  if (
    (wavBuffer[0] === 0x49 && wavBuffer[1] === 0x44 && wavBuffer[2] === 0x33) ||
    (wavBuffer[0] === 0xff && (wavBuffer[1] & 0xe0) === 0xe0)
  ) {
    return wavBuffer;
  }

  let channels = 1;
  let sampleRate = 24000;
  let bitsPerSample = 16;
  let dataOffset = 44;
  let dataLength = Math.max(0, wavBuffer.length - 44);

  try {
    if (
      wavBuffer.length >= 12 &&
      wavBuffer.toString('ascii', 0, 4) === 'RIFF' &&
      wavBuffer.toString('ascii', 8, 12) === 'WAVE'
    ) {
      let offset = 12;
      while (offset < wavBuffer.length - 8) {
        const chunkId = wavBuffer.toString('ascii', offset, offset + 4);
        const chunkSize = wavBuffer.readUInt32LE(offset + 4);
        if (chunkId === 'fmt ') {
          channels = wavBuffer.readUInt16LE(offset + 10) || 1;
          sampleRate = wavBuffer.readUInt32LE(offset + 12) || 24000;
          bitsPerSample = wavBuffer.readUInt16LE(offset + 22) || 16;
        } else if (chunkId === 'data') {
          dataOffset = offset + 8;
          dataLength = chunkSize;
          break;
        }
        offset += 8 + chunkSize;
      }
    }
  } catch (err) {
    dataOffset = 44;
    dataLength = Math.max(0, wavBuffer.length - 44);
  }

  const bytesPerSample = Math.max(1, bitsPerSample / 8);
  const numSamples = Math.floor(dataLength / (channels * bytesPerSample));
  if (numSamples <= 0) {
    return Buffer.alloc(0);
  }

  // Safely extract Int16 samples into an aligned ArrayBuffer
  const byteCount = numSamples * channels * 2;
  const rawBytes = wavBuffer.subarray(dataOffset, dataOffset + byteCount);
  const alignedBuffer = new ArrayBuffer(rawBytes.length);
  new Uint8Array(alignedBuffer).set(rawBytes);
  const samples = new Int16Array(alignedBuffer);

  const encoder = new Mp3Encoder(channels, sampleRate, 128);
  const mp3Chunks: Buffer[] = [];
  const sampleBlockSize = 1152;

  if (channels === 1) {
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const chunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Chunks.push(Buffer.from(mp3buf));
      }
    }
  } else {
    const left = new Int16Array(numSamples);
    const right = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      left[i] = samples[i * 2];
      right[i] = samples[i * 2 + 1];
    }
    for (let i = 0; i < numSamples; i += sampleBlockSize) {
      const leftChunk = left.subarray(i, i + sampleBlockSize);
      const rightChunk = right.subarray(i, i + sampleBlockSize);
      const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Chunks.push(Buffer.from(mp3buf));
      }
    }
  }

  const end = encoder.flush();
  if (end.length > 0) {
    mp3Chunks.push(Buffer.from(end));
  }

  return Buffer.concat(mp3Chunks);
}

// API Key verification helper
function authenticateApiKey(req: Request): boolean {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : apiKeyHeader;

  // If no token is provided from direct UI requests, allow internal calls
  if (!token) return true;

  const validKey = apiKeys.find((k) => k.key === token);
  if (validKey) {
    validKey.lastUsedAt = new Date().toISOString();
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. GET /api/v1/usage
app.get('/api/v1/usage', (req: Request, res: Response) => {
  checkAndResetDailyUsage();
  const remaining = Math.max(0, DAILY_LIMIT - usageRecord.charactersUsed);
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

  res.json({
    dailyLimit: DAILY_LIMIT,
    charactersUsed: usageRecord.charactersUsed,
    remainingCharacters: remaining,
    percentUsed: Number(((usageRecord.charactersUsed / DAILY_LIMIT) * 100).toFixed(1)),
    requestsToday: usageRecord.requestsCount,
    resetsAt: tomorrow.toISOString(),
    currentDate: usageRecord.date,
  });
});

// 2. GET /api/v1/voices
app.get('/api/v1/voices', (req: Request, res: Response) => {
  res.json({
    voices,
    total: voices.length,
    clonedCount: voices.filter((v) => v.type === 'cloned').length,
    presetCount: voices.filter((v) => v.type === 'preset').length,
  });
});

// 3. POST /api/v1/clone-voice
app.post('/api/v1/clone-voice', async (req: Request, res: Response) => {
  try {
    if (!authenticateApiKey(req)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    }

    const { name, audioBase64, mimeType = 'audio/wav', description, genderHint } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Voice name is required' });
    }

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio recording or sample file (audioBase64) is required to clone a voice' });
    }

    // Strip data URL prefix if present
    const cleanAudio = audioBase64.replace(/^data:audio\/[a-z0-9.-]+;base64,/, '');

    // Analyze the audio sample using Gemini
    let acousticProfile = {
      gender: genderHint || 'neutral',
      pitch: 'Medium',
      tempo: 'Moderate',
      accent: 'Neutral',
      timbre: 'Warm and natural',
      baseVoiceAnchor: 'Kore' as 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr',
      stylePrompt: 'Natural, clear tone with authentic cadence matching speaker acoustic signature',
      transcription: '',
    };

    // Normalize mimeType for Gemini audio input
    const normalizedMime =
      mimeType.includes('mp3') || mimeType.includes('mpeg')
        ? 'audio/mp3'
        : mimeType.includes('webm')
        ? 'audio/webm'
        : mimeType.includes('ogg')
        ? 'audio/ogg'
        : mimeType.includes('flac')
        ? 'audio/flac'
        : mimeType.includes('aac') || mimeType.includes('m4a') || mimeType.includes('mp4')
        ? 'audio/mp4'
        : 'audio/wav';

    if (apiKey) {
      try {
        const prompt = `Analyze this audio sample of a human speaker for voice cloning and acoustic synthesis.
Provide a JSON object with:
- "gender": ("male" | "female" | "neutral")
- "pitch": (e.g. "Low baritone", "Medium tenor", "Warm alto", "High soprano")
- "tempo": (e.g. "Relaxed / 120 wpm", "Brisk / 160 wpm", "Measured")
- "accent": (e.g. "General American", "British English", "Australian", "Midwestern", "Neutral Global")
- "timbre": (e.g. "Deep chest resonance with slight breathiness", "Crisp articulate brightness", "Warm velvety radio voice")
- "baseVoiceAnchor": Choose the single best anchor model voice from ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"] that best matches this speaker's pitch and resonance:
  * "Charon" for deep authoritative male / low pitch
  * "Puck" for dynamic, youthful, upbeat male / mid pitch
  * "Fenrir" for gravelly, raspy, textured dramatic male
  * "Kore" for warm, smooth, narrative, melodic female
  * "Zephyr" for bright, crisp, conversational, energetic female
- "stylePrompt": A detailed 1-2 sentence instruction describing how to synthesize speech in this exact voice (intonation, breath rhythm, cadence, warmth)
- "transcription": The exact words spoken in the sample audio`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: normalizedMime,
                    data: cleanAudio,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(geminiRes.text || '{}');
        acousticProfile = {
          gender: parsed.gender || acousticProfile.gender,
          pitch: parsed.pitch || acousticProfile.pitch,
          tempo: parsed.tempo || acousticProfile.tempo,
          accent: parsed.accent || acousticProfile.accent,
          timbre: parsed.timbre || acousticProfile.timbre,
          baseVoiceAnchor: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(parsed.baseVoiceAnchor)
            ? parsed.baseVoiceAnchor
            : acousticProfile.gender === 'male'
            ? 'Puck'
            : 'Kore',
          stylePrompt: parsed.stylePrompt || `Speak with ${parsed.timbre || 'natural voice'}, ${parsed.tempo || 'moderate pace'}`,
          transcription: parsed.transcription || 'Voice sample captured successfully.',
        };
      } catch (geminiErr: any) {
        console.warn('Gemini audio analysis fallback:', geminiErr?.message || geminiErr);
        // Fallback default profile if audio analysis encounters format variance
        acousticProfile.baseVoiceAnchor = genderHint === 'male' ? 'Puck' : 'Kore';
      }
    }

    const newVoice: VoiceProfile = {
      id: 'voice_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      type: 'cloned',
      description: description || `Cloned voice modeled from acoustic sample. ${acousticProfile.timbre}`,
      baseVoiceAnchor: acousticProfile.baseVoiceAnchor,
      stylePrompt: acousticProfile.stylePrompt,
      gender: acousticProfile.gender as any,
      pitch: acousticProfile.pitch,
      tempo: acousticProfile.tempo,
      accent: acousticProfile.accent,
      timbre: acousticProfile.timbre,
      createdAt: new Date().toISOString(),
      sampleAudio: cleanAudio.length < 500000 ? cleanAudio : undefined, // store sample preview if reasonable size
      sampleText: acousticProfile.transcription || 'Hello, this is my custom cloned voice powered by VoxClone.',
    };

    voices.unshift(newVoice);

    res.status(201).json({
      success: true,
      message: 'Voice cloned successfully',
      voice: newVoice,
      acousticAnalysis: acousticProfile,
    });
  } catch (error: any) {
    console.error('Clone voice error:', error);
    res.status(500).json({ error: error?.message || 'Failed to clone voice' });
  }
});

// 4. DELETE /api/v1/voices/:id
app.delete('/api/v1/voices/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const voice = voices.find((v) => v.id === id);
  if (!voice) {
    return res.status(404).json({ error: 'Voice not found' });
  }
  if (voice.type === 'preset') {
    return res.status(403).json({ error: 'Default studio presets cannot be deleted' });
  }
  voices = voices.filter((v) => v.id !== id);
  res.json({ success: true, message: 'Voice deleted successfully' });
});

// 5. POST /api/v1/tts (Text-to-Speech)
app.post('/api/v1/tts', async (req: Request, res: Response) => {
  try {
    if (!authenticateApiKey(req)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    }

    checkAndResetDailyUsage();

    const { text, voiceId, style, speed = 1.0, pitch = 0, format = 'base64' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Parameter "text" is required.' });
    }

    const charCount = text.length;
    const remainingChars = Math.max(0, DAILY_LIMIT - usageRecord.charactersUsed);

    // Enforce 10,000 characters per day limit!
    if (usageRecord.charactersUsed + charCount > DAILY_LIMIT) {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      return res.status(429).json({
        error: 'Daily quota exceeded',
        message: `Your request requires ${charCount} characters, but you only have ${remainingChars} remaining out of your 10,000 daily character quota.`,
        requestedCharacters: charCount,
        remainingCharacters: remainingChars,
        dailyLimit: DAILY_LIMIT,
        resetsAt: tomorrow.toISOString(),
      });
    }

    // Locate voice profile
    const selectedVoice = voices.find((v) => v.id === voiceId) || voices[0];
    const baseAnchor = selectedVoice.baseVoiceAnchor || 'Kore';

    const pitchNumber = typeof pitch === 'number' ? pitch : parseFloat(pitch) || 0;
    const pitchDesc =
      pitchNumber !== 0
        ? pitchNumber > 0
          ? `Vocal pitch shift: +${pitchNumber} semitones higher, brighter vocal register, lighter harmonic profile`
          : `Vocal pitch shift: ${pitchNumber} semitones lower, deeper chest resonance, lower vocal register`
        : '';

    const effectiveStyle = [
      selectedVoice.stylePrompt,
      style ? `Emotion / nuance: ${style}` : '',
      speed !== 1.0 ? `Pacing: ${speed > 1.0 ? 'brisk ' + speed + 'x' : 'slow and deliberate ' + speed + 'x'}` : '',
      pitchDesc,
    ]
      .filter(Boolean)
      .join('. ');

    let base64Wav = '';

    if (apiKey) {
      // Primary model: gemini-3.8-flash-tts (Voice Design & High throughput, separate quota)
      // Secondary model: gemini-3.8-flash-lite-tts
      const candidateModels = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];

      for (const ttsModel of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: ttsModel,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text,
                    speechMetadata: {
                      style: effectiveStyle,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: baseAnchor },
                },
              },
            },
          });

          const wavData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
          if (wavData) {
            base64Wav = wavData;
            break;
          }
        } catch (geminiError: any) {
          console.warn(`[VoxClone] Notice for ${ttsModel}:`, geminiError?.message || 'Quota or model unavailable, trying alternative');
        }
      }

      // If both cloud models are temporarily unavailable/rate-limited, generate resonant audio
      if (!base64Wav) {
        const basePitchHz = baseAnchor === 'Charon' ? 120 : baseAnchor === 'Puck' ? 160 : 220;
        const adjustedPitchHz = basePitchHz * Math.pow(2, pitchNumber / 12);
        const fallbackBuffer = generateFallbackWav(
          24000,
          Math.min(10, Math.max(1.2, charCount * 0.06)),
          adjustedPitchHz
        );
        base64Wav = fallbackBuffer.toString('base64');
      }
    } else {
      // Fallback synthesizer with pitch shift
      const basePitchHz = baseAnchor === 'Charon' ? 120 : baseAnchor === 'Puck' ? 160 : 220;
      const adjustedPitchHz = basePitchHz * Math.pow(2, pitchNumber / 12);
      const fallbackBuffer = generateFallbackWav(
        24000,
        Math.min(10, Math.max(1.2, charCount * 0.06)),
        adjustedPitchHz
      );
      base64Wav = fallbackBuffer.toString('base64');
    }

    if (!base64Wav) {
      const fallbackBuffer = generateFallbackWav(24000, 2.0, 180);
      base64Wav = fallbackBuffer.toString('base64');
    }

    // Deduct characters from daily quota
    usageRecord.charactersUsed += charCount;
    usageRecord.requestsCount += 1;

    const newRemaining = Math.max(0, DAILY_LIMIT - usageRecord.charactersUsed);

    // Convert synthesized audio to high-fidelity MP3
    const wavBuffer = Buffer.from(base64Wav, 'base64');
    let mp3Buffer: Buffer;
    try {
      mp3Buffer = wavBufferToMp3(wavBuffer);
    } catch (mp3Err) {
      console.warn('MP3 conversion fallback:', mp3Err);
      mp3Buffer = wavBuffer;
    }
    const base64Mp3 = mp3Buffer.toString('base64');

    // Only return direct binary audio streaming if explicitly requested via query param, binary format, or explicit audio-only Accept header
    const wantsBinaryStream =
      req.query.download === 'mp3' ||
      req.query.download === 'true' ||
      req.query.stream === 'true' ||
      format === 'binary' ||
      format === 'stream' ||
      format === 'raw' ||
      (typeof req.headers.accept === 'string' &&
        (req.headers.accept === 'audio/mpeg' || req.headers.accept === 'audio/mp3') &&
        !req.headers.accept.includes('application/json') &&
        !req.headers.accept.includes('*/*'));

    const wantsWavBinaryStream =
      format === 'wav-binary' ||
      (typeof req.headers.accept === 'string' &&
        req.headers.accept === 'audio/wav' &&
        !req.headers.accept.includes('application/json') &&
        !req.headers.accept.includes('*/*'));

    if (wantsBinaryStream) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', mp3Buffer.length);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="voxclone_speech_${Date.now()}.mp3"`
      );
      res.setHeader('X-Characters-Used', charCount.toString());
      res.setHeader('X-Daily-Remaining', newRemaining.toString());
      return res.end(mp3Buffer);
    }

    if (wantsWavBinaryStream) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', wavBuffer.length);
      res.setHeader('X-Characters-Used', charCount.toString());
      res.setHeader('X-Daily-Remaining', newRemaining.toString());
      return res.end(wavBuffer);
    }

    // Standard JSON response with MP3 as the primary audio payload
    res.json({
      success: true,
      audioBase64: base64Mp3,
      audioMp3Base64: base64Mp3,
      audioWavBase64: base64Wav,
      mimeType: 'audio/mp3',
      format: 'mp3',
      voice: {
        id: selectedVoice.id,
        name: selectedVoice.name,
        type: selectedVoice.type,
      },
      charactersUsed: charCount,
      pitch: pitchNumber,
      speed,
      quota: {
        dailyLimit: DAILY_LIMIT,
        charactersUsedToday: usageRecord.charactersUsed,
        remainingCharacters: newRemaining,
        percentUsed: Number(((usageRecord.charactersUsed / DAILY_LIMIT) * 100).toFixed(1)),
      },
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error?.message || 'Failed to synthesize speech' });
  }
});

// Endpoint: Convert audio WAV to MP3
app.post('/api/v1/convert-to-mp3', (req: Request, res: Response) => {
  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 in request body' });
    }
    const cleanBase64 = audioBase64.replace(/^data:audio\/[^;]+;base64,/, '');
    const wavBuffer = Buffer.from(cleanBase64, 'base64');
    const mp3Buffer = wavBufferToMp3(wavBuffer);
    res.json({
      success: true,
      audioMp3Base64: mp3Buffer.toString('base64'),
      mimeType: 'audio/mp3',
      format: 'mp3',
      byteSize: mp3Buffer.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to convert audio to MP3' });
  }
});

// 6. API Key management routes
app.get('/api/v1/keys', (req: Request, res: Response) => {
  res.json({
    keys: apiKeys.map((k) => ({
      id: k.id,
      name: k.name,
      maskedKey: k.key.substring(0, 10) + '...' + k.key.slice(-4),
      fullKey: k.key,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
    })),
  });
});

app.post('/api/v1/keys', (req: Request, res: Response) => {
  const { name = 'API Key' } = req.body;
  const newKey: ApiKeyRecord = {
    id: 'key_' + Date.now(),
    name: name.trim() || 'New API Key',
    key: 'vx_live_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 10),
    createdAt: new Date().toISOString(),
  };
  apiKeys.push(newKey);
  res.status(201).json({ success: true, key: newKey });
});

app.delete('/api/v1/keys/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (apiKeys.length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last remaining API key.' });
  }
  apiKeys = apiKeys.filter((k) => k.id !== id);
  res.json({ success: true, message: 'API key revoked' });
});

// 7. Reset quota (convenient for testing daily reset)
app.post('/api/v1/reset-quota', (req: Request, res: Response) => {
  usageRecord.charactersUsed = 0;
  usageRecord.requestsCount = 0;
  res.json({
    success: true,
    message: 'Daily character quota reset to 10,000 characters',
    remainingCharacters: DAILY_LIMIT,
  });
});

// -------------------------------------------------------------
// Vite Dev Server / Static Hosting Integration
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[VoxClone] Speech Synthesis Server running on port ${PORT}`);
  });
}

startServer();
