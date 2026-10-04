import React from 'react';
import { Mic, FileText, Gauge, Terminal, History, Activity, Sparkles, Sun, Moon } from 'lucide-react';
import { QuotaData } from '../types';
import { useTheme } from '../ThemeContext';

export type TabType = 'clone' | 'tts' | 'quota' | 'api' | 'history';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  quota: QuotaData;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  quota,
  historyCount,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors ${
        isDark ? 'bg-neutral-950/85 border-neutral-800' : 'bg-white/95 border-slate-200/90 shadow-xs'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('tts')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <rect x="2" y="9" width="2.5" height="6" rx="1.25" />
                <rect x="6.5" y="5" width="2.5" height="14" rx="1.25" />
                <rect x="11" y="2" width="2.5" height="20" rx="1.25" />
                <rect x="15.5" y="7" width="2.5" height="10" rx="1.25" />
                <rect x="20" y="10" width="2.5" height="4" rx="1.25" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-extrabold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  VoxClone
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    isDark
                      ? 'bg-cyan-950/90 text-cyan-400 border-cyan-800/60'
                      : 'bg-cyan-50 text-cyan-700 border-cyan-200 font-semibold'
                  }`}
                >
                  VOICE LAB
                </span>
              </div>
              <p className={`text-[10px] -mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                Neural Voice Cloning & Speech API
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav
            className={`hidden md:flex items-center gap-1 p-1 rounded-xl border ${
              isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-100/90 border-slate-200'
            }`}
          >
            <button
              onClick={() => setActiveTab('tts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'tts'
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'bg-white text-cyan-700 font-semibold shadow-xs'
                  : isDark
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Script to Speech</span>
            </button>

            <button
              onClick={() => setActiveTab('clone')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'clone'
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'bg-white text-cyan-700 font-semibold shadow-xs'
                  : isDark
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Cloner</span>
            </button>

            <button
              onClick={() => setActiveTab('quota')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'quota'
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'bg-white text-cyan-700 font-semibold shadow-xs'
                  : isDark
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Daily Quota</span>
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'api'
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'bg-white text-cyan-700 font-semibold shadow-xs'
                  : isDark
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>REST API</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition relative ${
                activeTab === 'history'
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'bg-white text-cyan-700 font-semibold shadow-xs'
                  : isDark
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Library</span>
              {historyCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-neutral-950 font-bold text-[9px] flex items-center justify-center">
                  {historyCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Day / Night Theme Toggle Switch */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                isDark
                  ? 'bg-neutral-900 hover:bg-neutral-800 text-amber-300 border-neutral-800 hover:border-neutral-700 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border-slate-200 shadow-xs'
              }`}
              title={isDark ? 'Switch to Day (Light) Mode' : 'Switch to Night (Dark) Mode'}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition transform hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 transition transform hover:-rotate-12" />
              )}
            </button>

            {/* Right Quota Pill Indicator */}
            <div
              onClick={() => setActiveTab('quota')}
              className={`flex items-center gap-3 cursor-pointer p-1.5 pl-3 rounded-xl border transition ${
                isDark
                  ? 'bg-neutral-900 hover:bg-neutral-800/80 border-neutral-800'
                  : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200'
              }`}
              title="Click to view daily quota details"
            >
              <div className="flex flex-col text-right">
                <span className={`text-[10px] leading-none ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                  Daily Quota
                </span>
                <span
                  className={`text-xs font-mono font-bold leading-tight ${
                    isDark ? 'text-cyan-400' : 'text-cyan-700'
                  }`}
                >
                  {quota.remainingCharacters.toLocaleString()}
                  <span className={`font-normal ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}> / 10k left</span>
                </span>
              </div>

              {/* Mini Progress Indicator */}
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center relative ${
                  isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    quota.percentUsed > 90
                      ? 'bg-red-500 animate-ping'
                      : quota.percentUsed > 70
                      ? 'bg-amber-400'
                      : 'bg-cyan-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div
          className={`md:hidden flex items-center justify-between py-2 border-t overflow-x-auto text-xs ${
            isDark ? 'border-neutral-800/80' : 'border-slate-200'
          }`}
        >
          <button
            onClick={() => setActiveTab('tts')}
            className={`px-3 py-1 rounded-lg ${
              activeTab === 'tts'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'bg-cyan-100 text-cyan-800 font-bold'
                : isDark
                ? 'text-neutral-400'
                : 'text-slate-600'
            }`}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveTab('clone')}
            className={`px-3 py-1 rounded-lg ${
              activeTab === 'clone'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'bg-cyan-100 text-cyan-800 font-bold'
                : isDark
                ? 'text-neutral-400'
                : 'text-slate-600'
            }`}
          >
            Clone Voice
          </button>
          <button
            onClick={() => setActiveTab('quota')}
            className={`px-3 py-1 rounded-lg ${
              activeTab === 'quota'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'bg-cyan-100 text-cyan-800 font-bold'
                : isDark
                ? 'text-neutral-400'
                : 'text-slate-600'
            }`}
          >
            10k Quota
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-1 rounded-lg ${
              activeTab === 'api'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'bg-cyan-100 text-cyan-800 font-bold'
                : isDark
                ? 'text-neutral-400'
                : 'text-slate-600'
            }`}
          >
            REST API
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-lg ${
              activeTab === 'history'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'bg-cyan-100 text-cyan-800 font-bold'
                : isDark
                ? 'text-neutral-400'
                : 'text-slate-600'
            }`}
          >
            History ({historyCount})
          </button>
        </div>
      </div>
    </header>
  );
};
