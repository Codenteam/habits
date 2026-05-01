import { useState, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

interface SendHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  getHabitBlob: () => Promise<Blob>;
  habitName: string;
}

type Step = 'config' | 'sending';

export default function SendHabitModal({ isOpen, onClose, getHabitBlob, habitName }: SendHabitModalProps) {
  const [shareDomain, setShareDomain] = useState(() => localStorage.getItem('habitShareDomain') || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('config');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  // Build the full WebSocket URL from a bare domain: share.example.com → wss://share.example.com/ws
  const buildWsUrl = (domain: string): string => {
    const d = domain.trim().replace(/\/$/, '');
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${d}/ws`;
  };

  const handleClose = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStep('config');
    setProgress(0);
    setStatusText('');
    setError(null);
    onClose();
  };

  const loadHabitShareLib = (domain: string): Promise<void> => {
    if ((window as any).HabitShare) return Promise.resolve();
    return new Promise((resolve, reject) => {
      try {
        const proto = window.location.protocol === 'https:' ? 'https' : 'http';
        const scriptUrl = `${proto}://${domain.trim().replace(/\/$/, '')}/habit-share.js`;
        const existing = document.querySelector(`script[src="${scriptUrl}"]`);
        if (existing) { resolve(); return; }
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load habit-share.js from ${scriptUrl}`));
        document.head.appendChild(script);
      } catch {
        reject(new Error('Invalid share server domain'));
      }
    });
  };

  const handleSend = async () => {
    const domain = shareDomain.trim();
    const codeVal = code.trim().toUpperCase();
    if (!domain) { setError('Enter the share server domain (e.g. share.example.com)'); return; }
    if (codeVal.length !== 6) { setError('Enter the 6-character code shown on the receiver'); return; }

    try {
      await loadHabitShareLib(domain);
    } catch (err: any) {
      setError(err?.message || 'Could not load the share library');
      return;
    }

    const HabitShare = (window as any).HabitShare;
    if (!HabitShare) {
      setError('HabitShare library not loaded. Ensure the share service is running.');
      return;
    }

    const url = buildWsUrl(domain);
    localStorage.setItem('habitShareDomain', domain);
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setStep('sending');
    setProgress(0);
    setStatusText('Preparing habit…');
    setError(null);

    try {
      const blob = await getHabitBlob();
      if (signal.aborted) return;

      const file = new File([blob], `${habitName || 'habit'}.habit`, { type: 'application/zip' });

      setStatusText('Connecting…');
      await HabitShare.sendHabit(url, codeVal, file, {
        onProgress: (sent: number, total: number) => {
          if (signal.aborted) return;
          const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
          setProgress(pct);
          setStatusText(`Sending… ${pct}%`);
        },
      });

      if (signal.aborted) return;
      setProgress(100);
      setStatusText('Sent!');
      setTimeout(() => handleClose(), 1200);
    } catch (err: any) {
      if (signal.aborted) return;
      setError(err?.message || String(err));
      setStep('config');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">Send Habit via Share</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Share domain */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Share Server</label>
            <input
              type="text"
              value={shareDomain}
              onChange={e => setShareDomain(e.target.value)}
              placeholder="share.example.com"
              disabled={step === 'sending'}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">Domain of your share server (no https:// needed)</p>
          </div>

          {/* Receiver code */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Receiver Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              disabled={step === 'sending'}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 font-mono tracking-widest outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">6-character code shown on the receiving device</p>
          </div>

          {/* Progress */}
          {step === 'sending' && (
            <div className="flex flex-col gap-2">
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className="h-1.5 bg-blue-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{statusText}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={step === 'sending'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {step === 'sending' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4" /> Send</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
