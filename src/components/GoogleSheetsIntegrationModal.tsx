import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  Plus,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  ChevronRight,
  ShieldCheck,
  Table,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import {
  listGoogleSheets,
  createVoxCloneSpreadsheet,
  appendSpeechLogsToSheet,
  readScriptsFromSheet,
  GoogleDriveSheet,
} from '../lib/googleSheetsService';
import { GeneratedAudioItem, VoiceProfile } from '../types';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioItems: GeneratedAudioItem[];
  onSelectScriptToSynthesize?: (text: string, voiceName?: string) => void;
  voices?: VoiceProfile[];
}

export const GoogleSheetsIntegrationModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  audioItems,
  onSelectScriptToSynthesize,
  voices = [],
}) => {
  const { isDark } = useTheme();
  const { user, accessToken, signInWithGoogle } = useAuth();

  const [sheets, setSheets] = useState<GoogleDriveSheet[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'browse'>('export');

  // Operation feedback states
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    sheetUrl?: string;
  } | null>(null);

  // Mandatory confirmation dialog state for mutating / appending operations
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'create_new' | 'append_existing';
    itemCount: number;
    sheetName?: string;
  } | null>(null);

  // Script import preview state
  const [importedScripts, setImportedScripts] = useState<
    Array<{ text: string; voiceName?: string; style?: string; speed?: number }>
  >([]);
  const [rangeInput, setRangeInput] = useState('A2:D50');

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveSheets();
    }
  }, [isOpen, accessToken]);

  const loadDriveSheets = async () => {
    if (!accessToken) return;
    setIsLoadingSheets(true);
    setFeedbackMessage(null);
    try {
      const driveSheets = await listGoogleSheets(accessToken);
      setSheets(driveSheets);
      if (driveSheets.length > 0 && !selectedSheetId) {
        setSelectedSheetId(driveSheets[0].id);
      }
    } catch (err: any) {
      console.warn('Failed to load drive sheets:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  if (!isOpen) return null;

  // Handler to prompt mandatory confirmation before writing data
  const handleInitiateExportNew = () => {
    if (audioItems.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'No audio generations in history to export. Generate speech first in Script Studio.',
      });
      return;
    }

    setConfirmationDialog({
      isOpen: true,
      title: 'Create Google Spreadsheet & Export Audio Logs?',
      description: `This will create a new Google Sheet titled "VoxClone Voice Lab - Speech Production Logs" in your Google Drive and populate it with ${audioItems.length} speech synthesis log record(s).`,
      actionType: 'create_new',
      itemCount: audioItems.length,
    });
  };

  const handleInitiateExportAppend = () => {
    if (!selectedSheetId) {
      setFeedbackMessage({
        type: 'error',
        text: 'Please select a destination spreadsheet from your Google Drive.',
      });
      return;
    }
    if (audioItems.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'No audio generations in history to export.',
      });
      return;
    }

    const targetSheet = sheets.find((s) => s.id === selectedSheetId);
    setConfirmationDialog({
      isOpen: true,
      title: `Append ${audioItems.length} Speech Records to Sheet?`,
      description: `This will append ${audioItems.length} row(s) to the spreadsheet "${
        targetSheet?.name || 'Selected Sheet'
      }". Existing spreadsheet content will not be removed.`,
      actionType: 'append_existing',
      itemCount: audioItems.length,
      sheetName: targetSheet?.name,
    });
  };

  // Execution after explicit user confirmation
  const handleConfirmAction = async () => {
    if (!confirmationDialog || !accessToken) return;
    setIsProcessing(true);
    setFeedbackMessage(null);

    const logsToExport = audioItems.map((item) => ({
      timestamp: new Date(item.timestamp).toLocaleString(),
      text: item.text,
      voiceName: item.voiceName,
      style: item.style || 'Default',
      speed: item.speed || 1.0,
      pitch: item.pitch || 0,
      charactersUsed: item.charactersUsed,
      format: (item.format || 'mp3').toUpperCase(),
    }));

    try {
      if (confirmationDialog.actionType === 'create_new') {
        const newSheet = await createVoxCloneSpreadsheet(
          accessToken,
          `VoxClone Production Logs (${new Date().toLocaleDateString()})`
        );
        await appendSpeechLogsToSheet(accessToken, newSheet.id, logsToExport);

        setFeedbackMessage({
          type: 'success',
          text: `Successfully created "${newSheet.title}" and saved ${logsToExport.length} speech logs!`,
          sheetUrl: newSheet.url,
        });
        loadDriveSheets();
      } else {
        await appendSpeechLogsToSheet(accessToken, selectedSheetId, logsToExport);
        const currentSheet = sheets.find((s) => s.id === selectedSheetId);
        setFeedbackMessage({
          type: 'success',
          text: `Appended ${logsToExport.length} speech logs to "${currentSheet?.name}"!`,
          sheetUrl: currentSheet?.webViewLink,
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Error occurred while saving to Google Sheets.',
      });
    } finally {
      setIsProcessing(false);
      setConfirmationDialog(null);
    }
  };

  const handleImportScripts = async () => {
    if (!accessToken || !selectedSheetId) return;
    setIsProcessing(true);
    setFeedbackMessage(null);
    try {
      const scripts = await readScriptsFromSheet(accessToken, selectedSheetId, rangeInput);
      setImportedScripts(scripts);
      if (scripts.length === 0) {
        setFeedbackMessage({
          type: 'error',
          text: 'No non-empty text rows found in the specified range.',
        });
      } else {
        setFeedbackMessage({
          type: 'success',
          text: `Loaded ${scripts.length} script(s) from spreadsheet. Select any to synthesize in Script Studio.`,
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Failed to import scripts from Google Sheet.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b ${
            isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Google Sheets Hub</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  WORKSPACE
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                Export speech generation logs & import voiceover scripts directly
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Barrier if no access token */}
        {!accessToken ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold mb-2">Connect Google Sheets</h4>
            <p className={`text-xs max-w-md mb-6 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
              Connect your Google Workspace account with permission from the user to browse your Drive
              spreadsheets, export audio synthesis logs, and import dialogue scripts.
            </p>
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 transition active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#fff"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#fff"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#fff"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#fff"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google to Connect Sheets</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Tabs */}
            <div
              className={`flex items-center gap-1 p-1 rounded-xl border ${
                isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => setActiveSubTab('export')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                  activeSubTab === 'export'
                    ? isDark
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                      : 'bg-white text-emerald-700 shadow-xs'
                    : isDark
                    ? 'text-neutral-400 hover:text-neutral-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Speech Logs ({audioItems.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('import')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                  activeSubTab === 'import'
                    ? isDark
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                      : 'bg-white text-emerald-700 shadow-xs'
                    : isDark
                    ? 'text-neutral-400 hover:text-neutral-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Scripts from Sheet</span>
              </button>

              <button
                onClick={() => setActiveSubTab('browse')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                  activeSubTab === 'browse'
                    ? isDark
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                      : 'bg-white text-emerald-700 shadow-xs'
                    : isDark
                    ? 'text-neutral-400 hover:text-neutral-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Drive Sheets ({sheets.length})</span>
              </button>
            </div>

            {/* Feedback Alert */}
            {feedbackMessage && (
              <div
                className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                  feedbackMessage.type === 'success'
                    ? isDark
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isDark
                    ? 'bg-red-950/40 border-red-800/60 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {feedbackMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">{feedbackMessage.text}</p>
                    {feedbackMessage.sheetUrl && (
                      <a
                        href={feedbackMessage.sheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1.5 font-bold underline hover:opacity-80"
                      >
                        <span>Open in Google Sheets</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={() => setFeedbackMessage(null)} className="opacity-60 hover:opacity-100">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB 1: EXPORT SPEECH LOGS */}
            {activeSubTab === 'export' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option A: Create New Sheet */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col justify-between ${
                      isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                          Option 1: New Spreadsheet
                        </h4>
                      </div>
                      <p className={`text-xs mb-3 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        Create a dedicated VoxClone speech production sheet in your Google Drive with formatted
                        columns and headers.
                      </p>
                    </div>

                    <button
                      onClick={handleInitiateExportNew}
                      disabled={isProcessing || audioItems.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition shadow-sm active:scale-95"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Create New Sheet & Export ({audioItems.length} logs)</span>
                    </button>
                  </div>

                  {/* Option B: Append to Existing Drive Sheet */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col justify-between ${
                      isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Download className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-500">
                          Option 2: Append to Existing
                        </h4>
                      </div>
                      <p className={`text-xs mb-2 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        Select an existing Google Sheet from your Drive to append rows:
                      </p>

                      <select
                        value={selectedSheetId}
                        onChange={(e) => setSelectedSheetId(e.target.value)}
                        className={`w-full p-2 mb-3 rounded-lg text-xs border outline-hidden transition ${
                          isDark
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        {sheets.length === 0 ? (
                          <option value="">No sheets found in Drive</option>
                        ) : (
                          sheets.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({new Date(s.modifiedTime).toLocaleDateString()})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <button
                      onClick={handleInitiateExportAppend}
                      disabled={isProcessing || !selectedSheetId || audioItems.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 transition shadow-sm active:scale-95"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Append to Selected Sheet</span>
                    </button>
                  </div>
                </div>

                {/* Preview of items to export */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-neutral-400">
                    Data Preview ({audioItems.length} records ready)
                  </h4>
                  <div
                    className={`max-h-48 overflow-y-auto rounded-xl border text-xs divide-y ${
                      isDark
                        ? 'border-neutral-800 divide-neutral-800/60 bg-neutral-950/40'
                        : 'border-slate-200 divide-slate-100 bg-slate-50'
                    }`}
                  >
                    {audioItems.length === 0 ? (
                      <p className="p-4 text-center text-xs opacity-60">No speech history available to export.</p>
                    ) : (
                      audioItems.map((item) => (
                        <div key={item.id} className="p-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.text}</p>
                            <p className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                              Voice: {item.voiceName} • {item.charactersUsed} chars • MP3
                            </p>
                          </div>
                          <span className="text-[10px] font-mono shrink-0 opacity-70">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: IMPORT SCRIPTS */}
            {activeSubTab === 'import' && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold">Select Spreadsheet</h4>
                      <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        Spreadsheet should contain script texts in Column A.
                      </p>
                    </div>
                    <button
                      onClick={loadDriveSheets}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
                      title="Refresh sheets list"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-mono uppercase mb-1 opacity-70">Google Sheet</label>
                      <select
                        value={selectedSheetId}
                        onChange={(e) => setSelectedSheetId(e.target.value)}
                        className={`w-full p-2 rounded-lg text-xs border outline-hidden ${
                          isDark
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        {sheets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase mb-1 opacity-70">Range</label>
                      <input
                        type="text"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="A2:D50"
                        className={`w-full p-2 rounded-lg text-xs font-mono border outline-hidden ${
                          isDark
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleImportScripts}
                    disabled={isProcessing || !selectedSheetId}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition shadow-sm"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Read Scripts from Sheet</span>
                  </button>
                </div>

                {/* Imported scripts preview & send to studio */}
                {importedScripts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-neutral-400">
                      Imported Script Rows ({importedScripts.length})
                    </h4>
                    <div
                      className={`max-h-60 overflow-y-auto rounded-xl border text-xs divide-y ${
                        isDark
                          ? 'border-neutral-800 divide-neutral-800/60 bg-neutral-950/40'
                          : 'border-slate-200 divide-slate-100 bg-slate-50'
                      }`}
                    >
                      {importedScripts.map((row, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-cyan-500/5">
                          <div className="min-w-0">
                            <p className="font-medium text-xs line-clamp-2">{row.text}</p>
                            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                              {row.voiceName ? `Voice: ${row.voiceName} • ` : ''}
                              {row.style ? `Style: ${row.style} • ` : ''}
                              Length: {row.text.length} chars
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (onSelectScriptToSynthesize) {
                                onSelectScriptToSynthesize(row.text, row.voiceName);
                                onClose();
                              }
                            }}
                            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs"
                          >
                            <span>Use in Studio</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BROWSE DRIVE SHEETS */}
            {activeSubTab === 'browse' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Recent Google Spreadsheets found in your Google Drive:
                  </p>
                  <button
                    onClick={loadDriveSheets}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
                    title="Refresh Drive sheets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div
                  className={`max-h-72 overflow-y-auto rounded-xl border text-xs divide-y ${
                    isDark
                      ? 'border-neutral-800 divide-neutral-800/60 bg-neutral-950/40'
                      : 'border-slate-200 divide-slate-100 bg-slate-50'
                  }`}
                >
                  {sheets.length === 0 ? (
                    <div className="p-8 text-center opacity-60">
                      {isLoadingSheets ? 'Loading sheets from Drive...' : 'No Google Spreadsheets found.'}
                    </div>
                  ) : (
                    sheets.map((sheet) => (
                      <div key={sheet.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{sheet.name}</p>
                            <p className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                              Modified: {new Date(sheet.modifiedTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {sheet.webViewLink && (
                          <a
                            href={sheet.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium hover:bg-neutral-800/60 transition"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3 text-emerald-400" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>OAuth Token cached safely in memory per Google Workspace security policy</span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition ${
              isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-slate-300 hover:bg-slate-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>

      {/* MANDATORY USER CONFIRMATION DIALOG */}
      {confirmationDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div
            className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border transition-all ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold mb-2">{confirmationDialog.title}</h3>
            <p className={`text-xs mb-6 leading-relaxed ${isDark ? 'text-neutral-300' : 'text-slate-600'}`}>
              {confirmationDialog.description}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmationDialog(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                  isDark ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-md shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Proceed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
