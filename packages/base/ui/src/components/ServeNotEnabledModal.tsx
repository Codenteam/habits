import { X, Server, ExternalLink, Package, Download } from 'lucide-react';

interface ServeNotEnabledModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ServeNotEnabledModal({ isOpen, onClose }: ServeNotEnabledModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>

        {/* Icon + Title */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-5 bg-slate-800 border border-slate-600 rounded-xl">
            <Server className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">
            Running on Public Server is Not Available
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            You can export your habit, but running it directly on this Base server is disabled.
            This can be enabled in several ways:
          </p>
          <ul className="mt-3 text-sm text-slate-400 text-left space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-slate-500 mt-0.5 shrink-0">•</span>
              <span><span className="text-slate-300 font-medium">habits command:</span> add <code className="text-amber-300 bg-slate-800 px-1 rounded text-xs">HABITS_ALLOW_SERVE=true</code> when starting Base, or put it in a <code className="text-amber-300 bg-slate-800 px-1 rounded text-xs">.env</code> file in the same directory.{' '}
                <a href="https://codenteam.com/intersect/habits/tools/base.html#environment-variables" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Learn more</a>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-500 mt-0.5 shrink-0">•</span>
              <span><span className="text-slate-300 font-medium">Admin panel:</span> open the service settings for this Base instance and add <code className="text-amber-300 bg-slate-800 px-1 rounded text-xs">HABITS_ALLOW_SERVE=true</code> to its environment variables.{' '}
                <a href="https://codenteam.com/intersect/habits/tools/admin.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Learn more</a>
              </span>
            </li>
          </ul>
        </div>

        {/* Divider */}
        <div className="mx-8 border-t border-slate-700" />

        {/* Primary CTA */}
        <div className="px-8 py-6">
          <a
            href="https://codenteam.com/intersect/habits/register"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Request a Private Instance
          </a>
          <p className="mt-2 text-xs text-slate-500 text-center">
            Get your own cloud Base instance to run habits privately.
          </p>
        </div>

        {/* Divider with label */}
        <div className="flex items-center gap-3 px-8">
          <div className="flex-1 border-t border-slate-700" />
          <span className="text-xs text-slate-500 uppercase tracking-widest">or run it yourself</span>
          <div className="flex-1 border-t border-slate-700" />
        </div>

        {/* Secondary options */}
        <div className="px-8 py-6 space-y-3">
          <a
            href="https://codenteam.com/intersect/habits/deep-dive/pack-distribute"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
          >
            <Package className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="text-left">
              <div className="text-sm font-medium text-white">Export the habit</div>
              <div className="text-xs text-slate-400 mt-0.5">Pack and distribute your habit to run anywhere</div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 ml-auto shrink-0" />
          </a>

          <a
            href="https://codenteam.com/intersect/habits/downloads.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="text-left">
              <div className="text-sm font-medium text-white">Download the app</div>
              <div className="text-xs text-slate-400 mt-0.5">Run habits locally on your own machine</div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 ml-auto shrink-0" />

          </a>
        </div>
      </div>
    </div>
  );
}
