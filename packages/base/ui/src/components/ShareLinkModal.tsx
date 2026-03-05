import { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Check } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitYaml: string;
}

export default function ShareLinkModal({ isOpen, onClose, habitYaml }: ShareLinkModalProps) {
  const [format, setFormat] = useState<'interactive' | 'svg' | 'png' | 'html'>('interactive');
  const [hideControls, setHideControls] = useState(false);
  const [bgColor, setBgColor] = useState('#0f172a');
  const [fitView, setFitView] = useState(true);
  const [copied, setCopied] = useState(false);

  // Reset copied state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build the URL with all parameters
  const buildUrl = () => {
    const encodedYaml = encodeURIComponent(habitYaml);
    const params = new URLSearchParams();
    params.set('habit', encodedYaml);
    
    if (format !== 'interactive') {
      params.set('format', format);
    }
    if (hideControls) {
      params.set('hideControls', 'true');
    }
    if (bgColor !== '#0f172a') {
      params.set('bgColor', bgColor);
    }
    if (!fitView) {
      params.set('fitView', 'false');
    }
    
    return `https://codenteam.com/intersect/habits/viewer/?${params.toString()}`;
  };

  const shareUrl = buildUrl();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpen = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-800 rounded-lg shadow-xl border border-slate-700 w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Share Habit Link</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Render Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="interactive">Interactive (default)</option>
              <option value="svg">SVG Image</option>
              <option value="png">PNG Image</option>
              <option value="html">Standalone HTML</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Interactive allows pan, zoom, and node selection
            </p>
          </div>

          {/* Options row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Hide Controls */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideControls}
                onChange={(e) => setHideControls(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
              />
              <span className="text-sm text-slate-300">Hide Controls</span>
            </label>

            {/* Fit View */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fitView}
                onChange={(e) => setFitView(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
              />
              <span className="text-sm text-slate-300">Fit to View</span>
            </label>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Background Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-10 rounded border border-slate-600 bg-slate-700 cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#0f172a"
              />
              <button
                onClick={() => setBgColor('#0f172a')}
                className="px-2 py-2 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* URL Preview */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Share URL
            </label>
            <div className="p-3 bg-slate-900 border border-slate-700 rounded-md">
              <p className="text-xs text-slate-400 font-mono break-all line-clamp-3">
                {shareUrl.length > 200 ? shareUrl.substring(0, 200) + '...' : shareUrl}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                URL length: {shareUrl.length.toLocaleString()} characters
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy URL
              </>
            )}
          </button>
          <button
            onClick={handleOpen}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </button>
        </div>
      </div>
    </div>
  );
}
