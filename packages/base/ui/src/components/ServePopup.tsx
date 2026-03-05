import { useState, useEffect } from 'react';
import { X, Server, Skull, RefreshCw, AlertTriangle, CheckCircle, XCircle, PlayIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectServerConfig, setServerConfig } from '../store/slices/workflowSlice';

interface ServePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onServe: () => void;
  serverRunning: boolean;
}

interface ServeStatus {
  processRunning: boolean;
  portInUse: boolean;
  portPid: number | null;
  port: number;
  trackedProcessRunning: boolean;
}

export default function ServePopup({ isOpen, onClose, onServe, serverRunning }: ServePopupProps) {
  const dispatch = useAppDispatch();
  const serverConfig = useAppSelector(selectServerConfig);
  const [status, setStatus] = useState<ServeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [killingProcess, setKillingProcess] = useState(false);
  const [killingPort, setKillingPort] = useState(false);
  const [portInput, setPortInput] = useState(serverConfig.port.toString());

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const result = await api.checkServeStatus(serverConfig.port);
      setStatus(result);
    } catch (e) {
      console.error('Failed to check status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPortInput(serverConfig.port.toString());
      refreshStatus();
    }
  }, [isOpen, serverConfig.port]);

  const handleKillProcess = async () => {
    setKillingProcess(true);
    try {
      await api.killServeProcess();
      await refreshStatus();
    } catch (e) {
      console.error('Failed to kill process:', e);
    } finally {
      setKillingProcess(false);
    }
  };

  const handleKillPort = async () => {
    setKillingPort(true);
    try {
      await api.killPort(serverConfig.port);
      await refreshStatus();
    } catch (e) {
      console.error('Failed to kill port:', e);
    } finally {
      setKillingPort(false);
    }
  };

  const handlePortChange = (value: string) => {
    setPortInput(value);
    const portNum = parseInt(value, 10);
    if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
      dispatch(setServerConfig({ port: portNum }));
    }
  };

  const handleServeClick = () => {
    onServe();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Server Settings</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Port Setting */}
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Port</label>
          <input
            type="number"
            value={portInput}
            onChange={(e) => handlePortChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
            min="1"
            max="65535"
          />
          <p className="text-xs text-slate-500 mt-1.5">This will also update the port in stack.yaml configuration.</p>
        </div>

        {/* Status Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Status</span>
            <button
              onClick={refreshStatus}
              disabled={loading}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

    
          {
          // Disabled for now
          (status) && (
            <div className="space-y-2 text-xs ">
              {/* habits-cortex-serve process */}
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded hidden" >
                <div className="flex items-center gap-2">
                  {status.processRunning ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="text-slate-300">habits-cortex-serve</span>
                </div>
                {status.processRunning && (
                  <button
                    onClick={handleKillProcess}
                    disabled={killingProcess}
                    className="flex items-center gap-1 px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs transition-colors"
                  >
                    <Skull className="w-3 h-3" />
                    {killingProcess ? 'Killing...' : 'Kill'}
                  </button>
                )}
              </div>

              {/* Port status */}
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <div className="flex items-center gap-2">
                  {status.portInUse ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  )}
                  <span className="text-slate-300">
                    Port {serverConfig.port} {status.portInUse ? `(PID: ${status.portPid})` : '(available)'}
                  </span>
                </div>
                {status.portInUse && (
                  <button
                    onClick={handleKillPort}
                    disabled={killingPort}
                    className="flex items-center gap-1 px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs transition-colors"
                  >
                    <Skull className="w-3 h-3" />
                    {killingPort ? 'Killing...' : 'Kill'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Serve Button */}
      <div className="px-4 py-3 border-t border-slate-700">
        <button
          onClick={handleServeClick}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
            serverRunning
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {serverRunning ? (
            <>
              <RefreshCw className="w-4 h-4" />
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
