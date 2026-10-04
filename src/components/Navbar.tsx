import React, { useState } from 'react';
import {
  Mic,
  FileText,
  Gauge,
  Terminal,
  History,
  Activity,
  Sparkles,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Cloud,
  ChevronDown,
  FileSpreadsheet,
} from 'lucide-react';
import { QuotaData } from '../types';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';

export type TabType = 'clone' | 'tts' | 'quota' | 'api' | 'history';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  quota: QuotaData;
  historyCount: number;
  onOpenSheetsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  quota,
  historyCount,
  onOpenSheetsModal,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, loading, signInWithGoogle, signInGuest, logOut } = useAuth();
  const [showAuthMenu, setShowAuthMenu] = useState(false);

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

            {/* Google Sheets Workspace Integration Button */}
            <button
              onClick={onOpenSheetsModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition shadow-xs ${
                isDark
                  ? 'bg-emerald-950/40 hover:bg-emerald-950/70 border-emerald-800/50 text-emerald-400'
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
              }`}
              title="Google Sheets Workspace Integration - Export speech logs and import scripts"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Sheets</span>
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

            {/* Firebase Auth User Profile / Sign In */}
            <div className="relative">
              {loading ? (
                <div className="w-8 h-8 rounded-xl bg-neutral-800/40 animate-pulse border border-neutral-700/50" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowAuthMenu(!showAuthMenu)}
                    className={`flex items-center gap-2 p-1 pl-2 rounded-xl border transition ${
                      isDark
                        ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
                    }`}
                    title={user.email || user.displayName || 'User Profile'}
                  >
                    <div className="flex items-center gap-1.5">
                      <Cloud className="w-3 h-3 text-emerald-400" />
                      <span className={`text-xs font-medium max-w-[80px] sm:max-w-[110px] truncate ${
                        isDark ? 'text-neutral-200' : 'text-slate-800'
                      }`}>
                        {user.displayName || (user.isAnonymous ? 'Guest' : user.email?.split('@')[0])}
                      </span>
                    </div>
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-6 h-6 rounded-lg object-cover border border-cyan-500/40"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <ChevronDown className={`w-3 h-3 transition ${showAuthMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showAuthMenu && (
                    <div
                      className={`absolute right-0 mt-2 w-56 rounded-2xl p-2 shadow-xl border z-50 transition-all ${
                        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
                      }`}
                    >
                      <div className="px-3 py-2 border-b border-neutral-800/50 mb-1">
                        <p className="text-xs font-semibold truncate">{user.displayName || 'VoxClone User'}</p>
                        <p className={`text-[11px] truncate ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                          {user.email || (user.isAnonymous ? 'Guest Account' : '')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Synced with Firestore</span>
                        </div>
                      </div>

                      {user.isAnonymous && (
                        <button
                          onClick={() => {
                            setShowAuthMenu(false);
                            signInWithGoogle();
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl transition ${
                            isDark ? 'hover:bg-neutral-800 text-cyan-400' : 'hover:bg-cyan-50 text-cyan-800'
                          }`}
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Link Google Account</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowAuthMenu(false);
                          logOut();
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl transition text-red-500 ${
                          isDark ? 'hover:bg-neutral-800/80' : 'hover:bg-red-50'
                        }`}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => signInWithGoogle()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-sm ${
                      isDark
                        ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700/80 text-white hover:border-cyan-500/50'
                        : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-xs'
                    }`}
                    title="Sign in with Google to sync voices and history across devices"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Sign In</span>
                  </button>
                  <button
                    onClick={() => signInGuest()}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-medium transition ${
                      isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Continue as Guest"
                  >
                    Guest
                  </button>
                </div>
              )}
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
