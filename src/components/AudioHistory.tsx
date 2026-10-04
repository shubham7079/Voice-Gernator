import React from 'react';
import { History, Trash2, Copy, Check, Music } from 'lucide-react';
import { GeneratedAudioItem } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { useTheme } from '../ThemeContext';

interface AudioHistoryProps {
  items: GeneratedAudioItem[];
  onClearHistory: () => void;
  onUseScript: (text: string, voiceId: string) => void;
}

export const AudioHistory: React.FC<AudioHistoryProps> = ({
  items,
  onClearHistory,
  onUseScript,
}) => {
  const { isDark } = useTheme();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <History className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span>Generation Library</span>
          </h2>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
            Review and playback your recently synthesized voiceovers and audio files.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearHistory}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              isDark
                ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 border-neutral-800'
                : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-red-600 border-slate-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Library</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div
          className={`rounded-2xl p-12 text-center border ${
            isDark
              ? 'bg-neutral-900/60 border-neutral-800 text-neutral-500'
              : 'bg-white border-slate-200 text-slate-400 shadow-sm'
          }`}
        >
          <Music className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-neutral-700' : 'text-slate-300'}`} />
          <p className={`text-sm font-medium ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
            No generated speech audio yet
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
            Synthesize audio from the Script Studio to populate your library.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl p-5 shadow-sm space-y-3 border transition ${
                isDark
                  ? 'bg-neutral-900 border-neutral-800 hover:border-cyan-500/40'
                  : 'bg-white border-slate-200 hover:border-cyan-400'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold text-sm ${isDark ? 'text-neutral-200' : 'text-slate-800'}`}
                    >
                      {item.voiceName}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        item.voiceType === 'cloned'
                          ? isDark
                            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-neutral-950'
                            : 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white'
                          : isDark
                          ? 'bg-neutral-800 text-neutral-400'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.voiceType}
                    </span>
                    <span className={isDark ? 'text-neutral-500 text-xs' : 'text-slate-400 text-xs'}>•</span>
                    <span
                      className={`text-xs font-mono ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}
                    >
                      {item.charactersUsed} characters
                    </span>
                  </div>
                  <p
                    className={`text-xs font-serif italic mt-2 line-clamp-2 p-2.5 rounded-lg border ${
                      isDark
                        ? 'bg-neutral-950 text-neutral-300 border-neutral-800/80'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    "{item.text}"
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(item.text, item.id)}
                    className={`p-1.5 rounded-lg text-xs border transition ${
                      isDark
                        ? 'text-neutral-400 hover:text-white bg-neutral-950 hover:bg-neutral-800 border-neutral-800'
                        : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-200'
                    }`}
                    title="Copy Script Text"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => onUseScript(item.text, item.voiceId)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                      isDark
                        ? 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-cyan-400 hover:text-cyan-300'
                        : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-800'
                    }`}
                  >
                    Re-open in Studio
                  </button>
                </div>
              </div>

              {/* Audio player */}
              <AudioWaveform
                audioBase64={item.audioBase64}
                title={item.voiceName}
                subtitle={`${new Date(item.timestamp).toLocaleTimeString()} • ${item.charactersUsed} chars${
                  item.speed ? ` • ${item.speed}x` : ''
                }${item.pitch && item.pitch !== 0 ? ` • ${item.pitch > 0 ? '+' : ''}${item.pitch} st pitch` : ''}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
