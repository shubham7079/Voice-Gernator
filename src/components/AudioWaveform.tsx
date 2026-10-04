import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { downloadAudioAsMp3 } from '../utils/audioMp3';

interface AudioWaveformProps {
  audioBase64: string;
  title?: string;
  subtitle?: string;
  autoPlay?: boolean;
  className?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioBase64,
  title,
  subtitle,
  autoPlay = false,
  className = '',
}) => {
  const { isDark } = useTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Construct audio data URL safely
  const audioSrc = audioBase64.startsWith('data:')
    ? audioBase64
    : audioBase64.startsWith('http://') || audioBase64.startsWith('https://') || audioBase64.startsWith('blob:')
    ? audioBase64
    : audioBase64.startsWith('UklGR')
    ? `data:audio/wav;base64,${audioBase64}`
    : `data:audio/mpeg;base64,${audioBase64}`;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (autoPlay) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [audioBase64, autoPlay]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn('Audio playback notice:', err?.message || err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  // Downloads in MP3 format only
  const handleDownload = () => {
    const rawFilename = `${title?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'voxclone_audio'}_${Date.now()}.mp3`;
    downloadAudioAsMp3(audioSrc, rawFilename);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Generate static pseudo waveform bars for visual richness
  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const barCount = 36;

  return (
    <div
      className={`rounded-xl p-4 shadow-md transition-colors ${
        isDark
          ? 'bg-neutral-900/90 border border-neutral-800 text-neutral-100'
          : 'bg-white border border-slate-200 text-slate-800'
      } ${className}`}
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={(e) => {
          console.warn('Audio element source status:', e.currentTarget.error?.code || 'empty source');
        }}
      />

      {(title || subtitle) && (
        <div className="flex items-center justify-between mb-3">
          <div>
            {title && (
              <h4 className={`text-sm font-semibold ${isDark ? 'text-neutral-100' : 'text-slate-800'}`}>
                {title}
              </h4>
            )}
            {subtitle && (
              <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                {subtitle}
              </p>
            )}
          </div>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded border ${
              isDark
                ? 'text-cyan-400 bg-cyan-950/60 border-cyan-800/40'
                : 'text-cyan-700 bg-cyan-50 border-cyan-200'
            }`}
          >
            MP3 Audio
          </span>
        </div>
      )}

      {/* Waveform graphic */}
      <div
        className={`h-10 flex items-center justify-between gap-1 my-2 px-1 rounded-lg border overflow-hidden cursor-pointer ${
          isDark
            ? 'bg-neutral-950/70 border-neutral-800/60'
            : 'bg-slate-100 border-slate-200'
        }`}
      >
        {Array.from({ length: barCount }).map((_, i) => {
          const barProgress = i / barCount;
          const isPassed = barProgress <= progressRatio;
          const height = 20 + Math.sin(i * 0.7) * 45 + Math.cos(i * 1.3) * 25;
          const clampedHeight = Math.max(15, Math.min(95, height));

          return (
            <div
              key={i}
              onClick={() => {
                if (audioRef.current && duration > 0) {
                  const targetTime = (i / barCount) * duration;
                  audioRef.current.currentTime = targetTime;
                  setCurrentTime(targetTime);
                }
              }}
              style={{ height: `${clampedHeight}%` }}
              className={`w-full rounded-full transition-colors duration-150 ${
                isPassed
                  ? isPlaying
                    ? 'bg-gradient-to-t from-cyan-500 to-teal-400'
                    : 'bg-cyan-500'
                  : isDark
                  ? 'bg-neutral-700/60 hover:bg-neutral-600'
                  : 'bg-slate-300 hover:bg-slate-400'
              }`}
            />
          );
        })}
      </div>

      {/* Scrubber slider */}
      <div className="relative flex items-center mt-1">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none ${
            isDark ? 'bg-neutral-800' : 'bg-slate-200'
          }`}
        />
      </div>

      {/* Control bar */}
      <div
        className={`flex items-center justify-between mt-3 text-xs ${
          isDark ? 'text-neutral-300' : 'text-slate-600'
        }`}
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold flex items-center justify-center transition-all shadow-md shadow-cyan-500/20 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className={`p-1.5 rounded transition ${
              isDark ? 'hover:text-white hover:bg-neutral-800' : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <span className={`font-mono ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Speed selector */}
          <div
            className={`flex items-center rounded-md p-0.5 border ${
              isDark ? 'bg-neutral-800/80 border-neutral-700/50' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {[0.8, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition ${
                  playbackRate === rate
                    ? isDark
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'bg-white text-cyan-700 shadow-sm font-semibold'
                    : isDark
                    ? 'text-neutral-400 hover:text-neutral-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Mute button */}
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className={`p-1.5 rounded transition ${
              isDark ? 'hover:text-white hover:bg-neutral-800' : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition active:scale-95 text-xs font-medium ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Download Audio (.mp3)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-500" />
            <span>Download MP3</span>
          </button>
        </div>
      </div>
    </div>
  );
};
