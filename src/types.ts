export interface VoiceProfile {
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
  sampleAudio?: string;
  sampleText?: string;
}

export interface QuotaData {
  dailyLimit: number;
  charactersUsed: number;
  remainingCharacters: number;
  percentUsed: number;
  requestsToday: number;
  resetsAt: string;
  currentDate: string;
}

export interface GeneratedAudioItem {
  id: string;
  text: string;
  voiceName: string;
  voiceId: string;
  voiceType: 'cloned' | 'preset';
  audioBase64: string;
  charactersUsed: number;
  timestamp: string;
  style?: string;
  speed?: number;
  pitch?: number;
  format?: string;
  mimeType?: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  maskedKey: string;
  fullKey: string;
  createdAt: string;
  lastUsedAt?: string;
}
