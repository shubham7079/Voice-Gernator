import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Key,
  Copy,
  Check,
  Play,
  Send,
  Code,
  Sparkles,
  Plus,
  Trash2,
  ExternalLink,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { ApiKeyItem, VoiceProfile } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { useTheme } from '../ThemeContext';

interface ApiDeveloperHubProps {
  voices: VoiceProfile[];
}

export const ApiDeveloperHub: React.FC<ApiDeveloperHubProps> = ({ voices }) => {
  const { isDark } = useTheme();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [activeKey, setActiveKey] = useState<string>('');
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Selected endpoint in Explorer
  const [endpoint, setEndpoint] = useState<
    '/api/v1/tts' | '/api/v1/voices' | '/api/v1/usage' | '/api/v1/clone-voice'
  >('/api/v1/tts');
  const [codeLang, setCodeLang] = useState<'curl' | 'python' | 'node' | 'fetch'>('curl');

  // Request sandbox state
  const [customRequestBody, setCustomRequestBody] = useState('');
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [testResponse, setTestResponse] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    data: any;
  } | null>(null);

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://api.voxclone.ai';

  // Fetch API keys on mount
  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/v1/keys');
      const data = await res.json();
      if (data.keys && data.keys.length > 0) {
        setKeys(data.keys);
        setActiveKey(data.keys[0].fullKey);
      }
    } catch (e) {
      console.error('Error fetching API keys:', e);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Production App Key' }),
      });
      const data = await res.json();
      if (data.key) {
        setNewKeyName('');
        fetchKeys();
      }
    } catch (e) {
      console.error('Error creating key:', e);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await fetch(`/api/v1/keys/${id}`, { method: 'DELETE' });
      fetchKeys();
    } catch (e) {
      console.error('Error deleting key:', e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Sync request template when endpoint or active key changes
  useEffect(() => {
    const firstVoice = voices[0]?.id || 'voice_kore';
    if (endpoint === '/api/v1/tts') {
      setCustomRequestBody(
        JSON.stringify(
          {
            text: 'Hello from VoxClone REST API. Synthesize speech programmatically with ease!',
            voiceId: firstVoice,
            style: 'Conversational & Engaging',
            speed: 1.0,
            pitch: 0,
            format: 'base64',
          },
          null,
          2
        )
      );
    } else if (endpoint === '/api/v1/clone-voice') {
      setCustomRequestBody(
        JSON.stringify(
          {
            name: 'API Cloned Voice',
            description: 'Voice created programmatically via REST API',
            audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', // sample base64 wav header
            mimeType: 'audio/wav',
            genderHint: 'neutral',
          },
          null,
          2
        )
      );
    } else {
      setCustomRequestBody('');
    }
  }, [endpoint, voices]);

  // Execute test request in live sandbox
  const handleExecuteRequest = async () => {
    setIsLoadingTest(true);
    setTestResponse(null);
    const startTime = performance.now();

    try {
      const isPost = endpoint === '/api/v1/tts' || endpoint === '/api/v1/clone-voice';
      const headers: Record<string, string> = {
        Authorization: `Bearer ${activeKey}`,
      };
      if (isPost) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(endpoint, {
        method: isPost ? 'POST' : 'GET',
        headers,
        body: isPost ? customRequestBody : undefined,
      });

      const endTime = performance.now();
      const data = await res.json();

      setTestResponse({
        status: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        durationMs: Math.round(endTime - startTime),
        data,
      });
    } catch (err: any) {
      const endTime = performance.now();
      setTestResponse({
        status: 500,
        statusText: 'Network / Client Error',
        durationMs: Math.round(endTime - startTime),
        data: { error: err.message },
      });
    } finally {
      setIsLoadingTest(false);
    }
  };

  // Generate dynamic code snippets
  const getSnippet = () => {
    const key = activeKey || 'YOUR_VOXCLONE_API_KEY';
    const voiceId = voices[0]?.id || 'voice_kore';

    if (codeLang === 'curl') {
      return `# Text to Speech Synthesis Request (with pitch shift & speed)
curl -X POST "${baseUrl}/api/v1/tts" \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Convert any script into speech with your cloned voice.",
    "voiceId": "${voiceId}",
    "speed": 1.0,
    "pitch": 0,
    "style": "Conversational"
  }'

# Or stream raw audio/wav directly:
# curl -X POST "${baseUrl}/api/v1/tts" \\
#   -H "Authorization: Bearer ${key}" \\
#   -H "Accept: audio/wav" \\
#   -d '{"text": "Direct audio stream.", "voiceId": "${voiceId}", "pitch": 2}' \\
#   --output speech.wav`;
    }

    if (codeLang === 'python') {
      return `import requests

url = "${baseUrl}/api/v1/tts"
headers = {
    "Authorization": "Bearer ${key}",
    "Content-Type": "application/json"
}

payload = {
    "text": "Convert any script into speech with your cloned voice.",
    "voiceId": "${voiceId}",
    "speed": 1.0,
    "pitch": 0,  # Semitone shift (-6 to +6)
    "style": "Conversational"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

print(f"Characters used: {data['charactersUsed']}")
print(f"Remaining quota: {data['quota']['remainingCharacters']}")

# Save audio WAV to disk
import base64
audio_bytes = base64.b64decode(data['audioBase64'])
with open("output.wav", "wb") as f:
    f.write(audio_bytes)
print("Saved output.wav successfully!")`;
    }

    if (codeLang === 'node') {
      return `import fs from 'fs';

async function generateSpeech() {
  const response = await fetch('${baseUrl}/api/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${key}',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: 'Convert any script into speech with your cloned voice.',
      voiceId: '${voiceId}',
      speed: 1.0,
      pitch: 0, // Semitone shift (-6 to +6)
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error);
  }

  // Save base64 audio to WAV file
  const buffer = Buffer.from(result.audioBase64, 'base64');
  fs.writeFileSync('speech.wav', buffer);
  console.log('Saved speech.wav! Quota remaining:', result.quota.remainingCharacters);
}

generateSpeech();`;
    }

    if (codeLang === 'fetch') {
      return `// Browser / Web Client Integration
async function playSpeech(text, voiceId, pitch = 0) {
  const response = await fetch('${baseUrl}/api/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${key}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      voiceId: voiceId,
      pitch: pitch
    })
  });

  const data = await response.json();
  const audio = new Audio(\`data:audio/wav;base64,\${data.audioBase64}\`);
  audio.play();
}`;
    }

    return '';
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getSnippet());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div
        className={`border rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden transition-colors ${
          isDark
            ? 'bg-gradient-to-r from-neutral-900 via-neutral-900 to-cyan-950/40 border-neutral-800'
            : 'bg-gradient-to-r from-white via-cyan-50/40 to-teal-50/40 border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 border ${
                isDark
                  ? 'bg-cyan-950/80 border-cyan-800/60 text-cyan-300'
                  : 'bg-cyan-100 border-cyan-200 text-cyan-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Developer REST API v1</span>
            </div>
            <h2
              className={`text-2xl font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Instant Integration via REST API
            </h2>
            <p
              className={`text-sm mt-1 max-w-xl ${
                isDark ? 'text-neutral-400' : 'text-slate-600'
              }`}
            >
              Integrate voice cloning, custom acoustic synthesis, and text-to-speech directly into your backend apps,
              Python pipelines, Discord bots, games, and web services.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border text-xs font-mono shadow-xs ${
              isDark
                ? 'bg-neutral-950 border-neutral-800 text-neutral-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <span
              className={`block text-[10px] font-sans font-semibold uppercase tracking-wider ${
                isDark ? 'text-neutral-500' : 'text-slate-400'
              }`}
            >
              API Base URL
            </span>
            <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
              {baseUrl}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: API Key Management */}
      <div
        className={`border rounded-2xl p-6 shadow-sm space-y-4 transition-colors ${
          isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3
              className={`font-bold text-base flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <Key className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <span>API Credentials</span>
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
              Authenticate all REST requests using the{' '}
              <code
                className={`font-mono px-1 py-0.5 rounded ${
                  isDark ? 'text-cyan-300 bg-neutral-950' : 'text-cyan-800 bg-slate-100'
                }`}
              >
                Authorization: Bearer &lt;key&gt;
              </code>{' '}
              header.
            </p>
          </div>

          {/* Create Key Form */}
          <form onSubmit={handleCreateKey} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Key label (e.g. My Next.js Backend)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className={`px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-cyan-500 w-52 transition ${
                isDark
                  ? 'bg-neutral-950 border-neutral-700 text-white placeholder-neutral-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-neutral-950 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Key</span>
            </button>
          </form>
        </div>

        {/* Keys List */}
        <div className="space-y-2 pt-2">
          {keys.map((k) => (
            <div
              key={k.id}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                activeKey === k.fullKey
                  ? isDark
                    ? 'bg-cyan-950/20 border-cyan-800/60'
                    : 'bg-cyan-50 border-cyan-300'
                  : isDark
                  ? 'bg-neutral-950 border-neutral-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveKey(k.fullKey)}
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                    activeKey === k.fullKey
                      ? 'border-cyan-500 bg-cyan-500'
                      : isDark
                      ? 'border-neutral-600 bg-neutral-900'
                      : 'border-slate-400 bg-white'
                  }`}
                  title="Set as active key for sandbox"
                >
                  {activeKey === k.fullKey && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </button>
                <div>
                  <span
                    className={`font-semibold text-xs ${
                      isDark ? 'text-neutral-200' : 'text-slate-800'
                    }`}
                  >
                    {k.name}
                  </span>
                  <div
                    className={`font-mono text-xs mt-0.5 flex items-center gap-2 ${
                      isDark ? 'text-neutral-400' : 'text-slate-500'
                    }`}
                  >
                    <span>{k.maskedKey}</span>
                    <span
                      className={`text-[10px] ${
                        isDark ? 'text-neutral-600' : 'text-slate-400'
                      }`}
                    >
                      Created: {new Date(k.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(k.fullKey, k.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition ${
                    isDark
                      ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                  title="Copy Full Secret Key"
                >
                  {copiedKeyId === k.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Key</span>
                    </>
                  )}
                </button>

                {keys.length > 1 && (
                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    className={`p-1.5 rounded-lg transition ${
                      isDark
                        ? 'text-neutral-500 hover:text-red-400 hover:bg-neutral-800'
                        : 'text-slate-400 hover:text-red-600 hover:bg-slate-200'
                    }`}
                    title="Revoke Key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Code Snippets in Multiple Languages */}
      <div
        className={`border rounded-2xl p-6 shadow-sm space-y-4 transition-colors ${
          isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <h3
              className={`font-bold text-base ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Quickstart Integration Snippets
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Language tabs */}
            <div
              className={`flex p-0.5 rounded-lg border text-xs ${
                isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              {(['curl', 'python', 'node', 'fetch'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setCodeLang(lang)}
                  className={`px-3 py-1 rounded-md capitalize font-medium transition ${
                    codeLang === lang
                      ? isDark
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'bg-white text-cyan-700 font-semibold shadow-xs'
                      : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'node' ? 'Node.js' : lang === 'fetch' ? 'Browser' : lang}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopySnippet}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                isDark
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {copiedSnippet ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="relative">
          <pre className="p-4 bg-slate-950 text-cyan-300 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto leading-relaxed shadow-inner">
            {getSnippet()}
          </pre>
        </div>
      </div>

      {/* Section 3: Interactive Sandbox & Live Tester */}
      <div
        className={`border rounded-2xl p-6 shadow-sm space-y-5 transition-colors ${
          isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <h3
            className={`font-bold text-base flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <Terminal className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span>Interactive REST API Sandbox</span>
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
            Test any endpoint live directly against the server. Responses and audio streams are rendered instantly.
          </p>
        </div>

        {/* Endpoint Selector Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { path: '/api/v1/tts', method: 'POST', label: 'Convert Text to Speech' },
            { path: '/api/v1/clone-voice', method: 'POST', label: 'Clone New Voice' },
            { path: '/api/v1/voices', method: 'GET', label: 'List All Voices' },
            { path: '/api/v1/usage', method: 'GET', label: 'Check 10k Quota' },
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => setEndpoint(item.path as any)}
              className={`p-3 rounded-xl border text-left transition ${
                endpoint === item.path
                  ? isDark
                    ? 'bg-cyan-950/40 border-cyan-500 text-white'
                    : 'bg-cyan-50 border-cyan-500 text-cyan-900 shadow-xs'
                  : isDark
                  ? 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    item.method === 'POST'
                      ? isDark
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : isDark
                      ? 'bg-blue-950 text-blue-400 border border-blue-800'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}
                >
                  {item.method}
                </span>
                <span className="text-xs font-mono truncate">{item.path}</span>
              </div>
              <p
                className={`text-[11px] truncate ${
                  isDark ? 'text-neutral-400' : 'text-slate-500'
                }`}
              >
                {item.label}
              </p>
            </button>
          ))}
        </div>

        {/* Sandbox Editor & Runner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Request Config (6 cols) */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-semibold ${
                  isDark ? 'text-neutral-300' : 'text-slate-700'
                }`}
              >
                Request Payload (JSON)
              </span>
              <span
                className={`font-mono text-xs ${
                  isDark ? 'text-cyan-400' : 'text-cyan-700 font-semibold'
                }`}
              >
                Auth: Bearer {activeKey.substring(0, 8)}...
              </span>
            </div>

            <textarea
              rows={9}
              disabled={endpoint === '/api/v1/voices' || endpoint === '/api/v1/usage'}
              value={
                customRequestBody ||
                (endpoint === '/api/v1/voices' || endpoint === '/api/v1/usage'
                  ? '// No request body required for GET'
                  : '')
              }
              onChange={(e) => setCustomRequestBody(e.target.value)}
              className={`w-full p-3 rounded-xl font-mono text-xs focus:outline-none focus:border-cyan-500 leading-relaxed border transition ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800 text-neutral-200'
                  : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            />

            <button
              onClick={handleExecuteRequest}
              disabled={isLoadingTest}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-neutral-950 font-bold rounded-xl shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 text-xs"
            >
              {isLoadingTest ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  <span>Sending Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute {endpoint}</span>
                </>
              )}
            </button>
          </div>

          {/* Response Viewer (6 cols) */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-semibold ${
                  isDark ? 'text-neutral-300' : 'text-slate-700'
                }`}
              >
                Live Response
              </span>
              {testResponse && (
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      testResponse.status < 300
                        ? isDark
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isDark
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {testResponse.status} {testResponse.statusText}
                  </span>
                  <span
                    className={`text-xs ${
                      isDark ? 'text-neutral-500' : 'text-slate-500'
                    }`}
                  >
                    {testResponse.durationMs}ms
                  </span>
                </div>
              )}
            </div>

            <div
              className={`border rounded-xl p-3 min-h-[224px] max-h-[360px] overflow-y-auto font-mono text-xs ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800 text-neutral-300'
                  : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}
            >
              {testResponse ? (
                <pre className="text-emerald-400 leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(testResponse.data, null, 2)}
                </pre>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Terminal className="w-6 h-6 mb-2 text-slate-600" />
                  <span>Press "Execute" to inspect the live HTTP response</span>
                </div>
              )}
            </div>

            {/* If response contains audio, display inline player */}
            {testResponse?.data?.audioBase64 && (
              <div className="pt-2">
                <AudioWaveform
                  audioBase64={testResponse.data.audioBase64}
                  title="Synthesized Audio Result"
                  subtitle={`Used ${testResponse.data.charactersUsed} chars • Daily remaining: ${testResponse.data.quota?.remainingCharacters}`}
                  autoPlay={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
