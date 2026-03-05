import { useState, useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

export type DialogType = 'confirm' | 'alert' | 'success' | 'error' | 'prompt';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (inputValue?: string) => void;
  title?: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  placeholder?: string;
}

export default function Dialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'alert',
  confirmText = 'OK',
  cancelText = 'Cancel',
  defaultValue = '',
  placeholder = '',
}: DialogProps) {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      if (type === 'prompt') {
        onConfirm(inputValue);
      } else {
        onConfirm();
      }
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'prompt') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-6 h-6 text-red-400" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'confirm':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'prompt':
        return <Info className="w-6 h-6 text-blue-400" />;
      default:
        return <Info className="w-6 h-6 text-blue-400" />;
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-900/20';
      case 'success':
        return 'bg-green-900/20';
      case 'confirm':
        return 'bg-yellow-900/20';
      default:
        return 'bg-blue-900/20';
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'confirm':
        return 'Confirm Action';
      case 'error':
        return 'Error';
      case 'success':
        return 'Success';
      case 'prompt':
        return 'Input Required';
      default:
        return 'Notice';
    }
  };

  const showCancelButton = type === 'confirm' || type === 'prompt';

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" 
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-slate-700" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-3 rounded-lg shrink-0 ${getIconBgColor()}`}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white mb-2">
                {getTitle()}
              </h3>
              <p className="text-slate-300 text-sm whitespace-pre-line">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded transition-colors shrink-0"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Input field for prompt type */}
          {type === 'prompt' && (
            <div className="mt-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            {showCancelButton && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-md transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-white text-sm rounded-md transition-colors ${
                type === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : type === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              autoFocus={type !== 'prompt'}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
