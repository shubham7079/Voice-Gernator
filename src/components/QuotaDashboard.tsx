import React, { useState, useEffect } from 'react';
import { Gauge, Zap, RefreshCw, Clock, BarChart3, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { QuotaData } from '../types';
import { useTheme } from '../ThemeContext';

interface QuotaDashboardProps {
  quota: QuotaData;
  onRefreshQuota: () => void;
  onResetQuota: () => void;
}

export const QuotaDashboard: React.FC<QuotaDashboardProps> = ({
  quota,
  onRefreshQuota,
  onResetQuota,
}) => {
  const { isDark } = useTheme();
  const [timeLeft, setTimeLeft] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Calculate live countdown to UTC midnight reset
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextReset = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
      );
      const diff = nextReset.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('Resetting now...');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}h ${minutes
          .toString()
          .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    await onResetQuota();
    setIsResetting(false);
  };

  const estimatedMinutesSpoken = Math.round((quota.charactersUsed / 800) * 10) / 10;
  const estimatedTotalCapacityMinutes = Math.round((quota.dailyLimit / 800) * 10) / 10;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div
        className={`border rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden transition-colors ${
          isDark
            ? 'bg-gradient-to-r from-neutral-900 via-neutral-900 to-cyan-950/40 border-neutral-800 text-white'
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
              <Gauge className="w-3.5 h-3.5" />
              <span>Daily Allocation Tier</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">10,000 Characters Per Day Quota</h2>
            <p className={`text-sm mt-1 max-w-xl ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
              Every day your account receives a clean slate of 10,000 characters for high-fidelity speech synthesis
              across both the Web Studio and REST API endpoints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshQuota}
              className={`p-2.5 rounded-xl border transition ${
                isDark ? 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Refresh Quota Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl border transition active:scale-95 flex items-center gap-2 ${
                isDark
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border-cyan-800/40'
                  : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300 shadow-xs'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isResetting ? 'Resetting...' : 'Test Reset to 10k'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Quota Radial & Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Characters Gauge */}
        <div
          className={`border rounded-2xl p-6 shadow-sm md:col-span-2 space-y-6 transition-colors ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className={`font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <BarChart3 className="w-5 h-5 text-cyan-500" />
              <span>Character Consumption Meter</span>
            </h3>
            <span className={`text-xs font-mono ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
              Date: {quota.currentDate}
            </span>
          </div>

          {/* Large Progress Bar with Markers */}
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {quota.charactersUsed.toLocaleString()}
                </span>
                <span className={`text-sm font-mono ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                  / 10,000 chars used
                </span>
              </div>
              <span className={`text-base font-bold font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                {quota.remainingCharacters.toLocaleString()} Remaining
              </span>
            </div>

            <div
              className={`w-full h-5 rounded-full overflow-hidden border p-0.5 ${
                isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  quota.percentUsed > 90
                    ? 'bg-gradient-to-r from-red-600 to-orange-500'
                    : quota.percentUsed > 70
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(3, quota.percentUsed))}%` }}
              />
            </div>

            <div className={`flex justify-between text-xs font-mono ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
              <span>0 (0%)</span>
              <span>2,500 (25%)</span>
              <span>5,000 (50%)</span>
              <span>7,500 (75%)</span>
              <span>10,000 (100%)</span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className={`grid grid-cols-3 gap-4 pt-4 border-t text-center ${isDark ? 'border-neutral-800' : 'border-slate-100'}`}>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-xs block mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>Requests Today</span>
              <span className={`text-xl font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{quota.requestsToday}</span>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-xs block mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>Speech Generated</span>
              <span className={`text-xl font-bold font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>~{estimatedMinutesSpoken} min</span>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-xs block mb-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>Daily Cap Capacity</span>
              <span className={`text-xl font-bold font-mono ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>~{estimatedTotalCapacityMinutes} min</span>
            </div>
          </div>
        </div>

        {/* Card 2: Countdown & Reset Info */}
        <div
          className={`border rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between transition-colors ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-sm font-semibold mb-3">
              <Clock className="w-4 h-4" />
              <span>Next Quota Reset</span>
            </div>
            <div className={`text-3xl font-extrabold font-mono tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {timeLeft || 'Loading...'}
            </div>
            <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
              Quota resets automatically every 24 hours at 00:00:00 UTC ({new Date(quota.resetsAt).toLocaleTimeString()}
              {' '}local time).
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Included in Plan</span>
            </div>
            <ul className={`text-xs space-y-1.5 pt-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
              <li>• Unlimited custom voice clones</li>
              <li>• Full REST API programmatic access</li>
              <li>• High-quality 128kbps MP3 audio export & download</li>
              <li>• 10,000 characters renewed every 24h</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
