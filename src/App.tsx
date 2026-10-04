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
import { GoogleSheetsIntegrationModal } from './components/GoogleSheetsIntegrationModal';
import { VoiceProfile, QuotaData, GeneratedAudioItem } from './types';
import { Sparkles, Terminal, Mic, FileText, CheckCircle2 } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import {
  saveUserVoice,
  deleteUserVoice,
  subscribeUserVoices,
  saveUserAudioItem,
  clearUserAudioHistory,
  subscribeUserAudioHistory,
  saveUserQuota,
  subscribeUserQuota,
} from './lib/firestoreService';

export default function App() {
  const { isDark } = useTheme();
  const { user } = useAuth();
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
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [activeScriptText, setActiveScriptText] = useState<string | undefined>(undefined);

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

  // Sync with Firestore when user is authenticated
  useEffect(() => {
    if (!user) return;

    // 1. Sync custom voices from Firestore
    const unsubVoices = subscribeUserVoices(user.uid, (firestoreVoices) => {
      if (firestoreVoices.length > 0) {
        setVoices((prev) => {
          const presets = prev.filter((v) => v.type === 'preset');
          const clonedIds = new Set(firestoreVoices.map((v) => v.id));
          const existingNonFirestore = prev.filter(
            (v) => v.type === 'cloned' && !clonedIds.has(v.id)
          );
          return [...firestoreVoices, ...existingNonFirestore, ...presets];
        });
      }
    });

    // 2. Sync audio history from Firestore
    const unsubHistory = subscribeUserAudioHistory(user.uid, (firestoreHistory) => {
      if (firestoreHistory.length > 0) {
        setHistoryItems(firestoreHistory);
        try {
          localStorage.setItem('voxclone_history', JSON.stringify(firestoreHistory.slice(0, 30)));
        } catch (_) {}
      }
    });

    // 3. Sync quota from Firestore
    const unsubQuota = subscribeUserQuota(user.uid, (firestoreQuota) => {
      if (firestoreQuota) {
        setQuota(firestoreQuota);
      }
    });

    return () => {
      unsubVoices();
      unsubHistory();
      unsubQuota();
    };
  }, [user]);

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
        if (user) {
          saveUserQuota(user.uid, {
            ...quota,
            charactersUsed: 0,
            remainingCharacters: quota.dailyLimit,
            percentUsed: 0,
            requestsToday: 0,
          }).catch(console.warn);
        }
      }
    } catch (e) {
      console.error('Error resetting quota:', e);
    }
  };

  const handleVoiceCreated = (newVoice: VoiceProfile) => {
    setVoices((prev) => [newVoice, ...prev]);
    setSelectedVoiceId(newVoice.id);
    showToast(`Voice "${newVoice.name}" cloned successfully! You can now use it in Script Studio.`);

    if (user) {
      saveUserVoice(user.uid, newVoice).catch((err) => {
        console.warn('Failed to persist cloned voice to Firestore:', err);
      });
    }
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

        if (user) {
          deleteUserVoice(user.uid, id).catch((err) => {
            console.warn('Failed to delete voice from Firestore:', err);
          });
        }
      }
    } catch (e) {
      console.error('Error deleting voice:', e);
    }
  };

  const handleAudioGenerated = (item: GeneratedAudioItem, updatedQuota: QuotaData) => {
    setQuota(updatedQuota);
    const updatedHistory = [item, ...historyItems];
    saveHistory(updatedHistory);
    showToast(`Synthesized ${item.charactersUsed} characters with "${item.voiceName}".`);

    if (user) {
      saveUserAudioItem(user.uid, item).catch((err) => {
        console.warn('Failed to persist audio to Firestore:', err);
      });
      saveUserQuota(user.uid, updatedQuota).catch((err) => {
        console.warn('Failed to persist quota to Firestore:', err);
      });
    }
  };

  const handleClearHistory = () => {
    setHistoryItems([]);
    try {
      localStorage.removeItem('voxclone_history');
    } catch (_) {}
    showToast('Library cleared');

    if (user) {
      clearUserAudioHistory(user.uid).catch((err) => {
        console.warn('Failed to clear audio history in Firestore:', err);
      });
    }
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
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
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
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
            initialScriptText={activeScriptText}
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
            onClearHistory={handleClearHistory}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
            onUseScript={(text, voiceId) => {
              if (voiceId) setSelectedVoiceId(voiceId);
              setActiveTab('tts');
            }}
          />
        )}
      </main>

      {/* Google Sheets Workspace Integration Modal */}
      <GoogleSheetsIntegrationModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        audioItems={historyItems}
        voices={voices}
        onSelectScriptToSynthesize={(text, voiceName) => {
          setActiveScriptText(text);
          if (voiceName) {
            const matchedVoice = voices.find(
              (v) => v.name.toLowerCase() === voiceName.toLowerCase()
            );
            if (matchedVoice) {
              setSelectedVoiceId(matchedVoice.id);
            }
          }
          setActiveTab('tts');
          showToast('Loaded script from Google Sheets into Script Studio!');
        }}
      />

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
