import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Sparkles,
  Volume2,
  Info,
  ArrowRight,
  Wand2,
  FileAudio,
  Radio,
  FileCheck,
  X,
  AudioWaveform as WaveformIcon,
} from 'lucide-react';
import { VoiceProfile } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { useTheme } from '../ThemeContext';

interface VoiceClonerProps {
  voices: VoiceProfile[];
  onVoiceCreated: (newVoice: VoiceProfile) => void;
  onVoiceDeleted: (id: string) => void;
  onSelectForTTS: (voiceId: string) => void;
}

export const VoiceCloner: React.FC<VoiceClonerProps> = ({
  voices,
  onVoiceCreated,
  onVoiceDeleted,
  onSelectForTTS,
}) => {
  const { isDark } = useTheme();
  // Default to 'upload' as requested by the user
  const [mode, setMode] = useState<'upload' | 'record' | 'demo'>('upload');
  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [genderHint, setGenderHint] = useState<'neutral' | 'male' | 'female'>('neutral');

  // File upload state
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedBase64, setRecordedBase64] = useState<string | null>(null);

  // Audio preview playback
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);

  // Status & loading
  const [isCloning, setIsCloning] = useState(false);
  const [cloneStage, setCloneStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastClonedReport, setLastClonedReport] = useState<any | null>(null);

  // Library filter
  const [filterType, setFilterType] = useState<'all' | 'cloned' | 'preset'>('all');

  // MediaRecorder & Audio visualizer refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sampleReadingScript =
    "The quick brown fox jumps over the lazy dog. Voice synthesis transforms natural human emotion and speech cadence into pristine digital audio.";

  // Clean up timers & audio context
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Format file size helper
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  // Process uploaded audio file
  const processAudioFile = (file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Audio file is too large. Please select a recorded sample under 25MB.');
      return;
    }

    const validTypes = [
      'audio/wav',
      'audio/x-wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/m4a',
      'audio/x-m4a',
      'audio/mp4',
      'audio/aac',
      'audio/ogg',
      'audio/webm',
      'audio/flac',
    ];

    const extension = file.name.split('.').pop()?.toLowerCase();
    const isAudioExt = ['wav', 'mp3', 'm4a', 'aac', 'ogg', 'webm', 'flac', 'opus', 'wma'].includes(extension || '');

    if (!file.type.startsWith('audio/') && !isAudioExt) {
      setErrorMsg('Please select a valid recorded audio file (e.g. .mp3, .wav, .m4a, .aac, .ogg, .webm).');
      return;
    }

    setErrorMsg(null);
    setUploadedFileName(file.name);
    setUploadedFileSize(formatBytes(file.size));
    setUploadedFileType(extension?.toUpperCase() || 'AUDIO');

    // Auto-suggest voice name from file name if user hasn't set one yet
    if (!voiceName.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setVoiceName(`${cleanName} Voice`);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setUploadedBase64(b64);
      setPreviewAudio(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAudioFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAudioFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClearUploadedFile = () => {
    setUploadedBase64(null);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setUploadedFileType(null);
    setPreviewAudio(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Demo Voice Samples for instant 1-click test cloning
  const loadDemoSample = (type: 'cinematic_male' | 'warm_female' | 'podcast_host') => {
    let name = '';
    let gender: 'male' | 'female' = 'male';
    let desc = '';

    if (type === 'cinematic_male') {
      name = 'Alexander - Deep Cinematic Voice';
      gender = 'male';
      desc = 'Uploaded studio recording with deep, commanding resonant chest timbre.';
    } else if (type === 'warm_female') {
      name = 'Elena - Warm Narrative Voice';
      gender = 'female';
      desc = 'Uploaded voice note with silky, melodic storytelling tone.';
    } else {
      name = 'Marcus - Modern Tech Podcast';
      gender = 'male';
      desc = 'Uploaded phone interview with upbeat, crisp conversational cadence.';
    }

    setVoiceName(name);
    setGenderHint(gender);
    setDescription(desc);
    setUploadedFileName(`${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_sample.wav`);
    setUploadedFileSize('1.2 MB');
    setUploadedFileType('WAV');

    // Create synthetic demo audio wav for immediate preview
    const sampleRate = 24000;
    const durationSec = 2.5;
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new Uint8Array(44 + numSamples * 2);
    const view = new DataView(buffer.buffer);

    // RIFF header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    const pitchHz = gender === 'male' ? (type === 'cinematic_male' ? 115 : 155) : 230;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.sin((Math.PI * i) / numSamples);
      const val =
        env *
        (0.6 * Math.sin(2 * Math.PI * pitchHz * t) +
          0.3 * Math.sin(4 * Math.PI * pitchHz * t) +
          0.1 * Math.sin(6 * Math.PI * pitchHz * t));
      view.setInt16(44 + i * 2, Math.floor(val * 32767), true);
    }

    let binary = '';
    const bytes = new Uint8Array(buffer.buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = `data:audio/wav;base64,${btoa(binary)}`;
    setUploadedBase64(b64);
    setPreviewAudio(b64);
    setMode('upload');
  };

  // Visualizer loop for microphone input
  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#06b6d4'); // cyan
        grad.addColorStop(1, '#3b82f6'); // blue

        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth + 1;
      }
    };
    render();
  };

  const startRecording = async () => {
    try {
      setErrorMsg(null);
      setRecordedBlob(null);
      setRecordedBase64(null);
      setPreviewAudio(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setRecordedBase64(base64data);
          setPreviewAudio(base64data);
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach((track) => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      drawVisualizer();

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setErrorMsg('Microphone access was denied or is unavailable. Please use the "Upload Recorded Audio" option above.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceName.trim()) {
      setErrorMsg('Please give your cloned voice a name.');
      return;
    }

    const audioToUse = mode === 'record' ? recordedBase64 : uploadedBase64;
    if (!audioToUse) {
      setErrorMsg(
        mode === 'upload'
          ? 'Please select or drop a recorded audio file (.mp3, .wav, .m4a) to clone.'
          : 'Please record at least 4-5 seconds of speech first.'
      );
      return;
    }

    setIsCloning(true);
    setErrorMsg(null);
    setCloneStage('Step 1/3: Ingesting recorded audio spectrum & waveforms...');

    setTimeout(() => {
      setCloneStage('Step 2/3: Analyzing vocal pitch, timbre resonance & speech cadence...');
    }, 1200);

    setTimeout(() => {
      setCloneStage('Step 3/3: Mapping neural anchor model & generating voice profile...');
    }, 2400);

    try {
      const res = await fetch('/api/v1/clone-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: voiceName,
          description: description || undefined,
          audioBase64: audioToUse,
          mimeType: mode === 'record' ? 'audio/webm' : uploadedFileType?.toLowerCase() || 'audio/wav',
          genderHint,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clone voice');
      }

      setLastClonedReport(data.acousticAnalysis);
      onVoiceCreated(data.voice);

      // Reset form
      setVoiceName('');
      setDescription('');
      setRecordedBase64(null);
      setRecordedBlob(null);
      setUploadedBase64(null);
      setUploadedFileName(null);
      setUploadedFileSize(null);
      setUploadedFileType(null);
      setPreviewAudio(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Cloning failed:', err);
      setErrorMsg(err.message || 'Error occurred while cloning voice');
    } finally {
      setIsCloning(false);
      setCloneStage('');
    }
  };

  const filteredVoices = voices.filter((v) => {
    if (filterType === 'cloned') return v.type === 'cloned';
    if (filterType === 'preset') return v.type === 'preset';
    return true;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Studio Header Card */}
      <div
        className={`border rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden transition-colors ${
          isDark
            ? 'bg-gradient-to-r from-neutral-900 via-neutral-900 to-cyan-950/40 border-neutral-800 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 border ${
                isDark
                  ? 'bg-cyan-950/80 border-cyan-800/60 text-cyan-300'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Acoustic Neural Cloning Engine</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Upload Recorded Audio to Clone Voice
            </h2>
            <p className={`text-sm mt-1.5 max-w-2xl leading-relaxed ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
              Upload any recorded voice note, audio file (<span className="text-cyan-600 dark:text-cyan-300 font-medium">.mp3, .wav, .m4a, .aac, .ogg, .webm</span>), or
              record directly using your microphone. Our AI extracts your voice's pitch, timbre, rhythm, and acoustic frequencies to create a cloned voice for text-to-speech.
            </p>
          </div>

          <div
            className={`flex items-center gap-3 border rounded-xl p-3 text-xs shrink-0 transition-colors ${
              isDark ? 'bg-neutral-950/70 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold">
              {voices.filter((v) => v.type === 'cloned').length}
            </div>
            <div>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Your Cloned Voices</p>
              <p className={isDark ? 'text-neutral-400' : 'text-slate-500'}>{voices.length} Total Voices in Deck</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Cloning Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Studio (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className={`border rounded-2xl p-6 shadow-sm transition-colors ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Input Mode Selector Tabs */}
            <div
              className={`flex p-1 rounded-xl border mb-6 ${
                isDark ? 'bg-neutral-950 border-neutral-800/80' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
                  mode === 'upload'
                    ? isDark
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md'
                      : 'bg-white text-cyan-800 shadow-xs'
                    : isDark
                    ? 'text-neutral-400 hover:text-neutral-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Recorded Audio</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('record')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
                  mode === 'record'
                    ? isDark
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md'
                      : 'bg-white text-cyan-800 shadow-xs'
                    : isDark
                    ? 'text-neutral-400 hover:text-neutral-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Record with Mic</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('demo')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
                  mode === 'demo'
                    ? isDark
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md'
                      : 'bg-white text-cyan-800 shadow-xs'
                    : isDark
                    ? 'text-neutral-400 hover:text-neutral-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-cyan-500" />
                <span>Try Voice Samples</span>
              </button>
            </div>

            {/* Mode 1: UPLOAD RECORDED AUDIO (Primary Focus) */}
            {mode === 'upload' && (
              <div className="space-y-4">
                {!uploadedBase64 ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition text-center group ${
                      isDragOver
                        ? 'border-cyan-500 bg-cyan-50/50 scale-[1.01]'
                        : isDark
                        ? 'border-neutral-700 hover:border-cyan-500/80 bg-neutral-950/60 hover:bg-cyan-950/10'
                        : 'border-slate-300 hover:border-cyan-500 bg-slate-50 hover:bg-cyan-50/40'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac,.opus,.wma"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 text-cyan-500 flex items-center justify-center mb-3 group-hover:scale-110 transition duration-200">
                      <Upload className="w-7 h-7" />
                    </div>

                    <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Drop your recorded audio file here
                    </h4>
                    <p className={`text-xs max-w-sm ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      or <span className="text-cyan-500 font-semibold underline underline-offset-2">browse files</span> on your computer or phone
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 text-[11px] font-mono">
                      {['MP3', 'WAV', 'M4A', 'AAC', 'WEBM', 'OGG'].map((fmt) => (
                        <span
                          key={fmt}
                          className={`px-2 py-0.5 rounded border ${
                            isDark
                              ? 'bg-neutral-900 border-neutral-800 text-neutral-400'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {fmt}
                        </span>
                      ))}
                      <span className={isDark ? 'text-neutral-500' : 'text-slate-400'}>up to 25MB</span>
                    </div>

                    <p className={`text-[11px] mt-3 italic ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                      💡 Tip: Voice notes from iPhone/Android, WhatsApp voice memos, podcast tracks, or audio recorder clips all work great!
                    </p>
                  </div>
                ) : (
                  /* Uploaded File Summary & Inspection Box */
                  <div
                    className={`border rounded-2xl p-4 space-y-3 ${
                      isDark ? 'bg-neutral-950/80 border-cyan-800/40' : 'bg-slate-50 border-cyan-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-500 flex items-center justify-center">
                          <FileAudio className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm truncate max-w-[220px] sm:max-w-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {uploadedFileName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                isDark ? 'bg-cyan-950 border-cyan-800 text-cyan-300' : 'bg-cyan-100 border-cyan-200 text-cyan-800'
                              }`}
                            >
                              {uploadedFileType}
                            </span>
                          </div>
                          <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                            {uploadedFileSize} • Ready for acoustic analysis
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleClearUploadedFile}
                        className={`p-1.5 rounded-lg transition ${
                          isDark ? 'text-neutral-400 hover:text-red-400 hover:bg-neutral-900' : 'text-slate-400 hover:text-red-500 hover:bg-slate-200'
                        }`}
                        title="Remove file and choose another"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Waveform Preview Player */}
                    {previewAudio && (
                      <div className="pt-2">
                        <AudioWaveform
                          audioBase64={previewAudio}
                          title="Uploaded Voice Sample Preview"
                          subtitle="Verify your recording clarity before cloning"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: RECORD WITH MICROPHONE */}
            {mode === 'record' && (
              <div className="space-y-4">
                <div
                  className={`border rounded-xl p-4 ${
                    isDark ? 'bg-neutral-950/70 border-neutral-800/80' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`flex items-center justify-between text-xs mb-2 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    <span className="font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Suggested Reading Passage:
                    </span>
                    <span>5–15 sec recommended</span>
                  </div>
                  <p
                    className={`text-sm italic font-serif leading-relaxed p-3 rounded-lg border ${
                      isDark ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    "{sampleReadingScript}"
                  </p>
                </div>

                {/* Visualizer canvas */}
                <div
                  className={`relative h-28 rounded-xl border overflow-hidden flex flex-col items-center justify-center ${
                    isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <canvas ref={canvasRef} width={500} height={112} className="w-full h-full" />
                  {!isRecording && !recordedBase64 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-neutral-500">
                      <Mic className="w-6 h-6 mb-1 text-neutral-400 animate-pulse" />
                      <span>Press Start Recording and speak into your microphone</span>
                    </div>
                  )}

                  {isRecording && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-950/80 border border-red-800 px-3 py-1 rounded-full">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-red-400 text-xs font-mono font-bold">
                        0:{recordingSeconds < 10 ? '0' : ''}
                        {recordingSeconds} / 0:30
                      </span>
                    </div>
                  )}
                </div>

                {/* Record Button Bar */}
                <div className="flex items-center justify-center gap-4 py-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl shadow-md transition active:scale-95 text-sm"
                    >
                      <Mic className="w-4 h-4" />
                      <span>{recordedBase64 ? 'Re-record Sample' : 'Start Recording'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-medium rounded-xl border border-neutral-700 shadow-md transition active:scale-95 text-sm animate-pulse"
                    >
                      <Square className="w-4 h-4 fill-current text-red-400" />
                      <span>Stop Recording</span>
                    </button>
                  )}
                </div>

                {previewAudio && (
                  <div className="mt-3">
                    <AudioWaveform
                      audioBase64={previewAudio}
                      title="Recorded Audio Preview"
                      subtitle="Check audio quality before cloning"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Mode 3: DEMO VOICE SAMPLES */}
            {mode === 'demo' && (
              <div className="space-y-4">
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                  Don't have an audio file on hand? Click any sample below to load pre-recorded audio and test the cloning engine immediately:
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      key: 'cinematic_male' as const,
                      title: 'Deep Cinematic Voice',
                      tag: 'Male • Baritone',
                      desc: 'Authoritative, rich baritone suitable for trailers & documentaries',
                    },
                    {
                      key: 'warm_female' as const,
                      title: 'Warm Narrative Voice',
                      tag: 'Female • Alto',
                      desc: 'Silky, engaging melodic cadence for audiobooks and storytelling',
                    },
                    {
                      key: 'podcast_host' as const,
                      title: 'Tech Podcast Host',
                      tag: 'Male • Tenor',
                      desc: 'Dynamic, upbeat conversational energy for interviews & explainer videos',
                    },
                  ].map((demo) => (
                    <div
                      key={demo.key}
                      onClick={() => loadDemoSample(demo.key)}
                      className={`p-3.5 border rounded-xl cursor-pointer transition flex items-center justify-between group ${
                        isDark
                          ? 'bg-neutral-950 hover:bg-cyan-950/20 border-neutral-800 hover:border-cyan-500/60'
                          : 'bg-slate-50 hover:bg-cyan-50/60 border-slate-200 hover:border-cyan-400 shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{demo.title}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {demo.tag}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>{demo.desc}</p>
                      </div>
                      <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1">
                        <span>Load Audio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Profile Form */}
            <form onSubmit={handleCloneSubmit} className={`mt-6 space-y-4 pt-4 border-t ${isDark ? 'border-neutral-800' : 'border-slate-100'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                    Cloned Voice Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Phone Voice Memo"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition ${
                      isDark
                        ? 'bg-neutral-950 border-neutral-700 text-white placeholder-neutral-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                    Vocal Register / Pitch Hint
                  </label>
                  <select
                    value={genderHint}
                    onChange={(e) => setGenderHint(e.target.value as any)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition ${
                      isDark ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="neutral">Auto-Detect from Recorded Audio</option>
                    <option value="male">Masculine (Baritone / Tenor)</option>
                    <option value="female">Feminine (Alto / Soprano)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                  Voice Description / Tags (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cloned from phone voice memo recorded on Oct 4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-700 text-white placeholder-neutral-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2">
                  <span className="font-bold">Error:</span> {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isCloning || (!recordedBase64 && !uploadedBase64)}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-cyan-600/20 transition active:scale-[0.99] flex items-center justify-center gap-2 text-sm"
              >
                {isCloning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{cloneStage || 'Extracting Voice Model...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Clone Voice from Audio ({uploadedFileName || (recordedBase64 ? 'Recorded Mic Clip' : 'No Audio Selected')})</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Last Cloned Acoustic Analysis Card */}
          {lastClonedReport && (
            <div
              className={`border rounded-2xl p-5 shadow-sm space-y-3 ${
                isDark ? 'bg-neutral-900 border-cyan-800/40' : 'bg-white border-cyan-300'
              }`}
            >
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Voice Cloned Successfully from Recorded Audio!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`block ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Pitch</span>
                  <span className={`font-semibold ${isDark ? 'text-neutral-200' : 'text-slate-800'}`}>{lastClonedReport.pitch || 'Medium'}</span>
                </div>
                <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`block ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Tempo</span>
                  <span className={`font-semibold ${isDark ? 'text-neutral-200' : 'text-slate-800'}`}>{lastClonedReport.tempo || 'Moderate'}</span>
                </div>
                <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`block ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Accent</span>
                  <span className={`font-semibold ${isDark ? 'text-neutral-200' : 'text-slate-800'}`}>{lastClonedReport.accent || 'Neutral'}</span>
                </div>
                <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`block ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Anchor Model</span>
                  <span className="font-semibold text-cyan-600 dark:text-cyan-300">{lastClonedReport.baseVoiceAnchor}</span>
                </div>
              </div>
              {lastClonedReport.timbre && (
                <p className={`text-xs p-2.5 rounded-lg border ${isDark ? 'bg-neutral-950/70 border-neutral-800/80 text-neutral-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <span className="text-cyan-600 dark:text-cyan-400 font-medium">Timbre Resonance: </span>
                  {lastClonedReport.timbre}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Voice Deck & Library (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Volume2 className="w-5 h-5 text-cyan-500" />
              <span>Voice Library</span>
            </h3>

            {/* Filter Pills */}
            <div className={`flex p-0.5 rounded-lg border text-xs ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-100 border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterType === 'all'
                    ? isDark
                      ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                      : 'bg-white text-cyan-800 font-bold shadow-xs'
                    : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({voices.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('cloned')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterType === 'cloned'
                    ? isDark
                      ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                      : 'bg-white text-cyan-800 font-bold shadow-xs'
                    : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cloned ({voices.filter((v) => v.type === 'cloned').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('preset')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterType === 'preset'
                    ? isDark
                      ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                      : 'bg-white text-cyan-800 font-bold shadow-xs'
                    : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Presets ({voices.filter((v) => v.type === 'preset').length})
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {filteredVoices.map((voice) => (
              <div
                key={voice.id}
                className={`border rounded-xl p-4 shadow-xs transition hover:border-cyan-500/60 ${
                  voice.type === 'cloned'
                    ? isDark
                      ? 'border-cyan-800/40 bg-cyan-950/10'
                      : 'border-cyan-300 bg-cyan-50/30'
                    : isDark
                    ? 'border-neutral-800 bg-neutral-900/90'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`font-semibold text-sm ${isDark ? 'text-neutral-100' : 'text-slate-800'}`}>
                        {voice.name}
                      </h4>
                      {voice.type === 'cloned' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-full">
                          Cloned
                        </span>
                      ) : (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Studio Preset
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {voice.description}
                    </p>
                  </div>

                  {voice.type === 'cloned' && (
                    <button
                      type="button"
                      onClick={() => onVoiceDeleted(voice.id)}
                      className={`p-1.5 rounded transition ${
                        isDark ? 'text-neutral-500 hover:text-red-400 hover:bg-neutral-800' : 'text-slate-400 hover:text-red-500 hover:bg-slate-100'
                      }`}
                      title="Delete Cloned Voice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Acoustic traits pills */}
                <div className="flex flex-wrap gap-1.5 mt-3 text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded border ${
                      isDark ? 'bg-neutral-950 text-neutral-300 border-neutral-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {voice.pitch}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded border ${
                      isDark ? 'bg-neutral-950 text-neutral-300 border-neutral-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {voice.accent}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded border font-mono ${
                      isDark ? 'bg-neutral-950 text-cyan-400 border-neutral-800' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    }`}
                  >
                    Anchor: {voice.baseVoiceAnchor}
                  </span>
                </div>

                {/* Action buttons */}
                <div
                  className={`mt-3 pt-3 border-t flex items-center justify-between ${
                    isDark ? 'border-neutral-800/80' : 'border-slate-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectForTTS(voice.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline transition"
                  >
                    <span>Use in Script Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                    ID: {voice.id}
                  </span>
                </div>
              </div>
            ))}

            {filteredVoices.length === 0 && (
              <div
                className={`text-center py-12 border rounded-xl text-xs ${
                  isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-500' : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                No voices found matching this filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
