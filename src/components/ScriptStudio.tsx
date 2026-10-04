import React, { useState } from 'react';
import {
  Play,
  Sparkles,
  Volume2,
  Wand2,
  Clock,
  AlertTriangle,
  FileText,
  Check,
  Music,
  Upload,
  Plus,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { VoiceProfile, QuotaData, GeneratedAudioItem } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { useTheme } from '../ThemeContext';

interface ScriptStudioProps {
  voices: VoiceProfile[];
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
  quota: QuotaData;
  onAudioGenerated: (item: GeneratedAudioItem, updatedQuota: QuotaData) => void;
  onOpenCloner?: () => void;
}

export const ScriptStudio: React.FC<ScriptStudioProps> = ({
  voices,
  selectedVoiceId,
  onSelectVoice,
  quota,
  onAudioGenerated,
  onOpenCloner,
}) => {
  const { isDark } = useTheme();
  const [scriptText, setScriptText] = useState(
    "Hello! Welcome to VoxClone. This voice was synthesized directly from acoustic cloning parameters and neural text-to-speech. You can type any script up to your 10,000 daily character quota!"
  );
  const [styleEmotion, setStyleEmotion] = useState('Conversational & Engaging');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0); // semitone shift: -6 to +6
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<GeneratedAudioItem | null>(null);

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId) || voices[0];

  const charCount = scriptText.length;
  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(1, Math.round(wordCount / 2.5));

  const isExceedingQuota = charCount > quota.remainingCharacters;

  // Expressive tag insertion
  const insertTag = (tag: string) => {
    setScriptText((prev) => prev + (prev.endsWith(' ') ? '' : ' ') + tag + ' ');
  };

  // Sample templates
  const templates = [
    {
      label: 'YouTube Intro',
      text: "What's going on everyone! Welcome back to the channel. Today we're testing revolutionary voice cloning and speech generation.",
    },
    {
      label: 'Audiobook Excerpt',
      text: "The morning mist hung low over the quiet valley. As the train rolled in, an unfamiliar passenger stepped out into the crisp autumn air.",
    },
    {
      label: 'Product Ad',
      text: "Experience sound redefined. With instantaneous voice cloning and lightning-fast REST API integration, power your voice apps at scale.",
    },
    {
      label: 'Podcast Monologue',
      text: "Have you ever wondered what makes a voice unmistakable? |yeah| It is all in the subtle cadence, the micro-pauses, and the authentic tone.",
    },
  ];

  const handleGenerate = async () => {
    if (!scriptText.trim()) {
      setErrorMsg('Please enter a script text to synthesize.');
      return;
    }

    if (isExceedingQuota) {
      setErrorMsg(
        `This script has ${charCount} characters, which exceeds your remaining daily quota of ${quota.remainingCharacters} characters.`
      );
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          voiceId: selectedVoice?.id,
          style: styleEmotion,
          speed,
          pitch,
          format: 'base64',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to synthesize speech');
      }

      const newItem: GeneratedAudioItem = {
        id: 'gen_' + Date.now(),
        text: scriptText,
        voiceName: selectedVoice?.name || 'Custom Voice',
        voiceId: selectedVoice?.id || '',
        voiceType: selectedVoice?.type || 'cloned',
        audioBase64: data.audioBase64,
        charactersUsed: data.charactersUsed,
        timestamp: new Date().toISOString(),
        style: styleEmotion,
        speed,
        pitch,
      };

      setCurrentAudio(newItem);

      // Update quota in parent
      const updatedQuota: QuotaData = {
        ...quota,
        charactersUsed: data.quota.charactersUsedToday,
        remainingCharacters: data.quota.remainingCharacters,
        percentUsed: data.quota.percentUsed,
        requestsToday: quota.requestsToday + 1,
      };
      onAudioGenerated(newItem, updatedQuota);
    } catch (err: any) {
      console.error('Speech synthesis error:', err);
      setErrorMsg(err.message || 'Error occurred while generating speech.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Studio Banner */}
      <div
        className={`border rounded-2xl p-6 shadow-sm relative overflow-hidden transition-colors ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 border ${
                isDark
                  ? 'bg-cyan-950/80 border-cyan-800/60 text-cyan-300'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio Text-to-Speech Engine</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Convert Script to Speech with Any Voice</h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
              Select your cloned voice or any studio preset, write or paste your script, and generate ultra-realistic
              speech.
            </p>
          </div>

          {/* Daily Quota Tracker Pill */}
          <div
            className={`border rounded-xl p-3 min-w-[240px] transition-colors ${
              isDark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className={`font-medium ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                Daily Quota (10,000 max)
              </span>
              <span className={`font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                {quota.remainingCharacters.toLocaleString()} left
              </span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  quota.percentUsed > 90 ? 'bg-red-500' : quota.percentUsed > 70 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, quota.percentUsed)}%` }}
              />
            </div>
            <div className={`flex items-center justify-between text-[11px] mt-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
              <span>{quota.charactersUsed.toLocaleString()} used today</span>
              <span>10,000 / day</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Script Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div
            className={`border rounded-2xl p-6 shadow-sm space-y-4 transition-colors ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Voice Selector Bar */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
                isDark ? 'border-neutral-800' : 'border-slate-100'
              }`}
            >
              <label className={`text-xs font-semibold flex items-center gap-2 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                <Volume2 className="w-4 h-4 text-cyan-500" />
                <span>Active Voice:</span>
              </label>

              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <select
                  value={selectedVoiceId}
                  onChange={(e) => onSelectVoice(e.target.value)}
                  className={`flex-1 px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:border-cyan-500 font-medium transition ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <optgroup label="✨ Your Cloned Voices">
                    {voices
                      .filter((v) => v.type === 'cloned')
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          ⭐ {v.name} (Cloned - {v.baseVoiceAnchor})
                        </option>
                      ))}
                    {voices.filter((v) => v.type === 'cloned').length === 0 && (
                      <option disabled>No cloned voices yet - upload recorded audio to clone</option>
                    )}
                  </optgroup>
                  <optgroup label="🎙️ Studio Prebuilt Presets">
                    {voices
                      .filter((v) => v.type === 'preset')
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                  </optgroup>
                </select>

                {onOpenCloner && (
                  <button
                    type="button"
                    onClick={onOpenCloner}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                      isDark
                        ? 'bg-neutral-950 hover:bg-cyan-950/40 text-cyan-400 hover:text-cyan-300 border-neutral-700'
                        : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200'
                    }`}
                    title="Upload recorded audio to clone a new voice"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Audio</span>
                  </button>
                )}
              </div>
            </div>

            {/* Template Inspiration Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className={`font-medium whitespace-nowrap mr-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                Templates:
              </span>
              {templates.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => setScriptText(tpl.text)}
                  className={`px-2.5 py-1 border rounded-lg whitespace-nowrap transition active:scale-95 ${
                    isDark
                      ? 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {/* Script Text Area */}
            <div className="relative">
              <textarea
                rows={7}
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Type or paste your script here..."
                className={`w-full p-4 border rounded-xl leading-relaxed text-sm font-sans focus:outline-none transition ${
                  isExceedingQuota
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : isDark
                    ? 'bg-neutral-950 border-neutral-800 text-neutral-100 placeholder-neutral-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600'
                }`}
              />

              {/* Expressive tags insert helper */}
              <div className={`mt-2 flex flex-wrap items-center gap-1.5 text-xs ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                <span className="font-mono text-[11px]">Insert audio tags:</span>
                {['<breath>', '<pause 1s>', '<laugh>', '<emphasis>', '|yeah|', '|mhm|'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertTag(tag)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] border transition ${
                      isDark
                        ? 'bg-neutral-950 hover:bg-cyan-950/40 hover:text-cyan-300 border-neutral-800'
                        : 'bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 border-slate-200'
                    }`}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Character & Duration Counter Bar */}
            <div
              className={`flex flex-wrap items-center justify-between text-xs pt-2 border-t gap-2 ${
                isDark ? 'border-neutral-800/80 text-neutral-400' : 'border-slate-100 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`font-mono ${isExceedingQuota ? 'text-red-500 font-bold' : isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {charCount.toLocaleString()} Characters
                </span>
                <span>•</span>
                <span>{wordCount} Words</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~{estimatedSeconds}s spoken
                </span>
              </div>

              <div>
                <span
                  className={`font-mono text-xs px-2.5 py-1 rounded-md border ${
                    isExceedingQuota
                      ? 'bg-red-950/80 border-red-800 text-red-300'
                      : isDark
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  Remaining Today: {quota.remainingCharacters.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Error or Quota warning */}
            {isExceedingQuota && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Exceeds Daily Quota Limit</p>
                  <p className="mt-0.5">
                    Your script needs {charCount} characters, but your remaining daily quota is{' '}
                    {quota.remainingCharacters} characters. Shorten your script or wait until midnight reset.
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            {/* Generate Action Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !scriptText.trim() || isExceedingQuota}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-cyan-600/20 transition active:scale-[0.99] flex items-center justify-center gap-2 text-sm"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Voice Audio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Speech Audio ({charCount} chars)</span>
                </>
              )}
            </button>
          </div>

          {/* Newly Generated Audio Player */}
          {currentAudio && (
            <div className="space-y-2">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                <Music className="w-4 h-4 text-cyan-500" />
                <span>Generated Audio Result</span>
              </h3>
              <AudioWaveform
                audioBase64={currentAudio.audioBase64}
                title={`Speech with "${currentAudio.voiceName}"`}
                subtitle={`${currentAudio.charactersUsed} characters • ${currentAudio.speed || 1}x speed • ${
                  currentAudio.pitch && currentAudio.pitch !== 0
                    ? (currentAudio.pitch > 0 ? '+' : '') + currentAudio.pitch + ' st pitch shift'
                    : 'Natural pitch'
                }`}
                autoPlay={true}
              />
            </div>
          )}
        </div>

        {/* Right Column: Voice Styling & Parameters (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div
            className={`border rounded-2xl p-5 shadow-sm space-y-5 transition-colors ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Wand2 className="w-4 h-4 text-cyan-500" />
              <span>Voice Nuance & Controls</span>
            </h3>

            {/* Selected Voice Card */}
            {selectedVoice && (
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-neutral-950 border-neutral-800/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className={`font-semibold text-sm ${isDark ? 'text-neutral-200' : 'text-slate-800'}`}>
                    {selectedVoice.name}
                  </h4>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      isDark
                        ? 'bg-cyan-950 border-cyan-800/60 text-cyan-300'
                        : 'bg-cyan-100 border-cyan-300 text-cyan-800'
                    }`}
                  >
                    {selectedVoice.type}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                  {selectedVoice.description}
                </p>
                <div className="flex flex-wrap gap-1 text-[10px] pt-1">
                  <span className={`px-2 py-0.5 rounded ${isDark ? 'bg-neutral-900 text-neutral-400' : 'bg-slate-200 text-slate-600'}`}>
                    Pitch: {selectedVoice.pitch}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${isDark ? 'bg-neutral-900 text-neutral-400' : 'bg-slate-200 text-slate-600'}`}>
                    Accent: {selectedVoice.accent}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-medium ${
                      isDark ? 'bg-neutral-900 text-cyan-400' : 'bg-cyan-50 text-cyan-700'
                    }`}
                  >
                    Anchor: {selectedVoice.baseVoiceAnchor}
                  </span>
                </div>
              </div>
            )}

            {/* Pitch Shift Slider */}
            <div
              className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-neutral-950 border-neutral-800/90' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-500" />
                  <span className={`text-xs font-semibold ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>
                    Pitch Shift
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                      pitch === 0
                        ? isDark
                          ? 'bg-neutral-900 border-neutral-700 text-neutral-300'
                          : 'bg-slate-200 border-slate-300 text-slate-700'
                        : pitch > 0
                        ? isDark
                          ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                          : 'bg-cyan-100 border-cyan-300 text-cyan-800'
                        : isDark
                        ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300'
                        : 'bg-indigo-100 border-indigo-300 text-indigo-800'
                    }`}
                  >
                    {pitch === 0 ? '0 st (Natural)' : `${pitch > 0 ? '+' : ''}${pitch} st`}
                  </span>

                  {pitch !== 0 && (
                    <button
                      type="button"
                      onClick={() => setPitch(0)}
                      className={`p-1 rounded transition ${
                        isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
                      }`}
                      title="Reset pitch to 0 (Natural)"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Slider element */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="1"
                  value={pitch}
                  onChange={(e) => setPitch(parseInt(e.target.value, 10))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${
                    isDark ? 'bg-neutral-800' : 'bg-slate-200'
                  }`}
                />
                <div className={`flex justify-between text-[10px] font-mono ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                  <span>-6 st (Deeper)</span>
                  <span className={pitch === 0 ? (isDark ? 'text-cyan-400 font-bold' : 'text-cyan-700 font-bold') : ''}>
                    0 (Original)
                  </span>
                  <span>+6 st (Higher)</span>
                </div>
              </div>

              {/* Pitch quick presets */}
              <div className="grid grid-cols-5 gap-1 pt-1">
                {[
                  { val: -4, label: '-4 Deep' },
                  { val: -2, label: '-2 Low' },
                  { val: 0, label: 'Default' },
                  { val: 2, label: '+2 High' },
                  { val: 4, label: '+4 Bright' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setPitch(item.val)}
                    className={`py-1 text-[10px] font-mono rounded border transition ${
                      pitch === item.val
                        ? isDark
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                          : 'bg-cyan-100 border-cyan-400 text-cyan-800 font-bold shadow-xs'
                        : isDark
                        ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pacing / Speed */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className={isDark ? 'text-neutral-300' : 'text-slate-700'}>Pacing / Speed</span>
                <span className={`font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>{speed}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${
                  isDark ? 'bg-neutral-800' : 'bg-slate-200'
                }`}
              />
              <div className={`flex justify-between text-[10px] mt-1 font-mono ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                <span>0.75x Deliberate</span>
                <span>1.0x Normal</span>
                <span>1.5x Brisk</span>
              </div>
            </div>

            {/* Emotion / Delivery Presets */}
            <div>
              <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                Delivery Emotion & Style
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  'Conversational & Engaging',
                  'Storyteller / Audiobook',
                  'Energetic Host / Podcast',
                  'Authoritative & Direct',
                  'Calm & Meditative',
                  'Dramatic & Emotional',
                ].map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => setStyleEmotion(emo)}
                    className={`px-3 py-2 text-xs rounded-xl border text-left transition flex items-center justify-between ${
                      styleEmotion === emo
                        ? isDark
                          ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200 font-medium'
                          : 'bg-cyan-50 border-cyan-500 text-cyan-800 font-semibold shadow-xs'
                        : isDark
                        ? 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{emo}</span>
                    {styleEmotion === emo && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
