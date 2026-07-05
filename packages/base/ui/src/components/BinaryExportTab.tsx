import { useState } from 'react';
import {
  Package,
  Loader2,
  AlertTriangle,
  ExternalLink,
  FileArchive,
  ChevronDown,
} from 'lucide-react';
import { api } from '../lib/api';
import { ExportBundle } from '@ha-bits/core';
import { useAppSelector } from '../store/hooks';
import { selectServerFlags } from '../store/slices/serverFlagsSlice';

interface HabitData {
  id: string;
  name: string;
  nodes: any[];
  edges?: any[];
}

interface BinaryExportTabProps {
  habits: HabitData[];
  envContent: string;
  frontendHtml?: string;
  exportBundle: ExportBundle;
  stackName?: string;
}

export default function BinaryExportTab({
  habits,
  envContent,
  frontendHtml,
  exportBundle,
  stackName,
}: BinaryExportTabProps) {
  const sanitizeStackName = (name: string | undefined): string => {
    if (!name || name.trim() === '' || name === 'Stack Name') {
      return 'habits';
    }
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const sanitizedStackName = sanitizeStackName(stackName);
  const [habitGenerating, setHabitGenerating] = useState(false);
  const [habitError, setHabitError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const serverFlags = useAppSelector(selectServerFlags);

  const handleGenerateHabit = async () => {
    setHabitGenerating(true);
    setHabitError(null);
    try {
      const blob = await api.exportHabit({
        habits: habits.map(h => ({ ...h })),
        stackYaml: exportBundle.stackYaml,
        habitFiles: exportBundle.habitFiles,
        stackName,
        envContent,
        frontendHtml,
        frontendYaml: exportBundle.frontendYaml,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      try {
        a.href = url;
        a.download = `${sanitizedStackName}.habit`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      console.error('Habit export error:', e);
      setHabitError(e.message || 'Failed to generate .habit file');
    } finally {
      setHabitGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      {!serverFlags.allowExport && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-amber-900/30 border border-amber-700/50 rounded-md text-amber-300 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Export is disabled on this instance. To enable it, set
            <code className="mx-1 px-1 py-0.5 bg-slate-800 rounded text-amber-200 text-xs">HABITS_ALLOW_EXPORT=true</code>
            on the server.
          </span>
        </div>
      )}
      <div className={!serverFlags.allowExport ? 'pointer-events-none opacity-40 select-none' : undefined}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              Export .habit File
            </h4>
            <p className="text-xs text-slate-400">
              Package your habits as a .habit file for import into Habits Cortex on desktop and mobile.
            </p>
          </div>

          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
            <h5 className="text-sm font-medium text-blue-300 mb-2">Recommended Distribution Method</h5>
            <p className="text-xs text-slate-300 mb-2">
              The .habit format creates a self-contained package that loads in the Habits Cortex app on iOS, Android, macOS, Windows, and Linux.
            </p>
            <p className="text-xs text-slate-300 mb-2">
              Download Habits Cortex from your app store, then import your .habit file — no build tools required.
            </p>
            <a
              href="https://codenteam.com/intersect/habits/dot-habit.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-300 hover:text-blue-200 underline flex items-center gap-1"
            >
              Learn more about the .habit format <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-300">
              {habits.length} habit{habits.length !== 1 ? 's' : ''} ready to export
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {habits.map(habit => (
                <span
                  key={habit.id}
                  className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-full"
                >
                  {habit.name}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === 'app' ? null : 'app')}
                className="w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-800 flex items-center justify-between text-left"
              >
                <span className="text-sm font-medium text-slate-200">How to run it in the app?</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === 'app' ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === 'app' && (
                <div className="px-4 py-3 bg-slate-900/50 text-xs text-slate-300 space-y-2">
                  <p>1. Download the <strong>Habits Cortex</strong> app from your platform&apos;s app store.</p>
                  <p>2. Open the app and click <strong>Add Habit</strong>.</p>
                  <p>3. Select your <code className="bg-slate-800 px-1 rounded">.habit</code> file to import it.</p>
                </div>
              )}
            </div>

            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === 'cli' ? null : 'cli')}
                className="w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-800 flex items-center justify-between text-left"
              >
                <span className="text-sm font-medium text-slate-200">How to run with Cortex CLI?</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === 'cli' ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === 'cli' && (
                <div className="px-4 py-3 bg-slate-900/50 text-xs text-slate-300 space-y-2">
                  <p>From your project directory with <code className="bg-slate-800 px-1 rounded">stack.yaml</code>:</p>
                  <pre className="bg-slate-800 p-3 rounded overflow-x-auto text-[11px]">{`npx habits cortex --config ./stack.yaml`}</pre>
                </div>
              )}
            </div>
          </div>

          {habitError && (
            <div className="p-3 bg-red-900/30 rounded-lg border border-red-700/50 text-xs text-red-200">
              {habitError}
            </div>
          )}

          <button
            onClick={handleGenerateHabit}
            disabled={habitGenerating || habits.length === 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {habitGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
            ) : (
              <><FileArchive className="w-4 h-4" />Generate .habit File</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
