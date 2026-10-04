/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { VoiceCloner } from './components/VoiceCloner';
import { ScriptStudio } from './components/ScriptStudio';
import { QuotaDashboard } from './components/QuotaDashboard';
import { ApiDeveloperHub } from './components/ApiDeveloperHub';
import { AudioHistory } from './components/AudioHistory';
import { VoiceProfile, QuotaData, GeneratedAudioItem } from './types';
import { Sparkles, Terminal, Mic, FileText, CheckCircle2 } from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function App() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('tts');
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [quota, setQuota] = useState<QuotaData>({
    dailyLimit: 10000,
    charactersUsed: 0,
    remainingCharacters: 10000,
    percentUsed: 0,
    requestsToday: 0,
    resetsAt: new Date(Date.now() + 86400000).toISOString(),
    currentDate: new Date().toISOString().slice(0, 10),
  });
  const [historyItems, setHistoryItems] = useState<GeneratedAudioItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load voices and quota on initial mount
  useEffect(() => {
    fetchVoices();
    fetchQuota();

    // Load history from localStorage if available
    try {
      const saved = localStorage.getItem('voxclone_history');
      if (saved) {
        setHistoryItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (items: GeneratedAudioItem[]) => {
    setHistoryItems(items);
    try {
      localStorage.setItem('voxclone_history', JSON.stringify(items.slice(0, 30)));
    } catch (e) {
      console.error('Error saving history:', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchVoices = async () => {
    try {
      const res = await fetch('/api/v1/voices');
      const data = await res.json();
      if (data.voices) {
        setVoices(data.voices);
        if (!selectedVoiceId && data.voices.length > 0) {
          setSelectedVoiceId(data.voices[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching voices:', e);
    }
  };

  const fetchQuota = async () => {
    try {
      const res = await fetch('/api/v1/usage');
      const data = await res.json();
      if (data.dailyLimit) {
        setQuota(data);
      }
    } catch (e) {
      console.error('Error fetching quota:', e);
    }
  };

  const handleResetQuota = async () => {
    try {
      const res = await fetch('/api/v1/reset-quota', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchQuota();
        showToast('Daily quota reset back to 10,000 characters!');
      }
    } catch (e) {
      console.error('Error resetting quota:', e);
    }
  };

  const handleVoiceCreated = (newVoice: VoiceProfile) => {
    setVoices((prev) => [newVoice, ...prev]);
    setSelectedVoiceId(newVoice.id);
    showToast(`Voice "${newVoice.name}" cloned successfully! You can now use it in Script Studio.`);
  };

  const handleVoiceDeleted = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/voices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVoices((prev) => prev.filter((v) => v.id !== id));
        if (selectedVoiceId === id) {
          const remaining = voices.filter((v) => v.id !== id);
          if (remaining.length > 0) {
            setSelectedVoiceId(remaining[0].id);
          }
        }
        showToast('Voice deleted successfully');
      }
    } catch (e) {
      console.error('Error deleting voice:', e);
    }
  };

  const handleAudioGenerated = (item: GeneratedAudioItem, updatedQuota: QuotaData) => {
    setQuota(updatedQuota);
    saveHistory([item, ...historyItems]);
    showToast(`Synthesized ${item.charactersUsed} characters with "${item.voiceName}".`);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-cyan-500/30 selection:text-cyan-600 ${
        isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        quota={quota}
        historyCount={historyItems.length}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-bounce border ${
            isDark ? 'bg-neutral-900 border-cyan-500/80 text-white' : 'bg-white border-cyan-600 text-slate-900 shadow-lg'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'tts' && (
          <ScriptStudio
            voices={voices}
            selectedVoiceId={selectedVoiceId}
            onSelectVoice={setSelectedVoiceId}
            quota={quota}
            onAudioGenerated={handleAudioGenerated}
            onOpenCloner={() => setActiveTab('clone')}
          />
        )}

        {activeTab === 'clone' && (
          <VoiceCloner
            voices={voices}
            onVoiceCreated={handleVoiceCreated}
            onVoiceDeleted={handleVoiceDeleted}
            onSelectForTTS={(voiceId) => {
              setSelectedVoiceId(voiceId);
              setActiveTab('tts');
              showToast('Switched to Script Studio with selected voice');
            }}
          />
        )}

        {activeTab === 'quota' && (
          <QuotaDashboard
            quota={quota}
            onRefreshQuota={fetchQuota}
            onResetQuota={handleResetQuota}
          />
        )}

        {activeTab === 'api' && <ApiDeveloperHub voices={voices} />}

        {activeTab === 'history' && (
          <AudioHistory
            items={historyItems}
            onClearHistory={() => saveHistory([])}
            onUseScript={(text, voiceId) => {
              if (voiceId) setSelectedVoiceId(voiceId);
              setActiveTab('tts');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-6 text-xs transition-colors ${
          isDark ? 'border-neutral-900 bg-neutral-950 text-neutral-400' : 'border-slate-200 bg-white text-slate-500'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>VoxClone Studio</span>
            <span>•</span>
            <span>Voice Cloning, Acoustic Neural Profiling & Speech Generation</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className={`font-mono font-semibold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
              10,000 Chars / Day Included
            </span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('api')}
              className={`transition hover:underline ${
                isDark ? 'text-neutral-400 hover:text-cyan-300' : 'text-slate-600 hover:text-cyan-700'
              }`}
            >
              REST API Docs
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
