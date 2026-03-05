import { useState, useEffect, useMemo } from 'react';
import { X, Download, Copy, Check, FileCode, Settings, Key, FileText, ChevronDown, ChevronRight, Shield, AlertTriangle, Loader2, Sparkles, Package } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectHabits, selectServerConfig, setServerConfig, selectActiveEnvVariables, setEnvVariables, selectExportBundle } from '../store/slices/workflowSlice';
import { envVariablesToString } from '../lib/exportUtils';

import BinaryExportTab from './BinaryExportTab';

interface CodeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'config' | 'security' | 'binary' | 'files';
type FileSubTab = 'stack' | 'habits' | 'env' | 'frontend';

interface SecurityCapabilities {
  intersectAvailable: boolean;
  capabilities: {
    generateNodePolicy: boolean;
    dlpScanning: boolean;
    piiProtection: boolean;
    contentModeration: boolean;
    supplyChainIntegrity: boolean;
  };
  error?: string;
  registryInfo?: string;
}

// Helper to parse .env string back to envVariables format with comments
function parseEnvString(content: string): Record<string, { value: string; comment?: string }> {
  const result: Record<string, { value: string; comment?: string }> = {};
  const lines = content.split('\n');
  let pendingComments: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Accumulate comment lines
    if (trimmed.startsWith('#')) {
      const commentText = trimmed.slice(1).trimStart();
      pendingComments.push(commentText);
      continue;
    }
    
    // Skip empty lines
    if (!trimmed) {
      if (Object.keys(result).length > 0) {
        pendingComments = [];
      }
      continue;
    }
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[key] = {
        value,
        comment: pendingComments.length > 0 ? pendingComments.join('\n') : undefined,
      };
      pendingComments = [];
    }
  }
  return result;
}

export default function CodeViewModal({ isOpen, onClose }: CodeViewModalProps) {
  const dispatch = useAppDispatch();
  const habits = useAppSelector(selectHabits);
  const frontendHtml = useAppSelector(state => state.ui.frontendHtml);
  const envVariables = useAppSelector(selectActiveEnvVariables);
  const serverConfig = useAppSelector(selectServerConfig);
  const stackName = useAppSelector(state => state.workflow.stackName);
  
  // Use the centralized export bundle selector
  const exportBundle = useAppSelector(selectExportBundle);
  
  // Construct env content string from state
  const envContent = useMemo(() => envVariablesToString(envVariables), [envVariables]);
  const [activeTab, setActiveTab] = useState<TabType>('config');
  const [activeFileTab, setActiveFileTab] = useState<FileSubTab>('stack');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedHabits, setExpandedHabits] = useState<Set<number>>(new Set([0]));
  // Local state for manageEndpoint (not persisted to Redux)
  const [manageEndpoint, setManageEndpoint] = useState(false);
  
  // Security capabilities state
  const [securityCapabilities, setSecurityCapabilities] = useState<SecurityCapabilities | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [generatingPolicy, setGeneratingPolicy] = useState(false);
  const [generatedPolicy, setGeneratedPolicy] = useState<string | null>(null);

  // Helper to update server config in Redux
  const handleConfigChange = (updates: Partial<typeof serverConfig>) => {
    dispatch(setServerConfig(updates));
  };

  // Create a combined config for local use (merging Redux state with local-only fields)
  const config = {
    port: serverConfig.port,
    openapi: serverConfig.openapi,
    manageEndpoint,
    webhookTimeout: serverConfig.webhookTimeout,
    security: serverConfig.security,
  };
  
  // Fetch security capabilities when modal opens or security tab is activated
  useEffect(() => {
    if (isOpen && (activeTab === 'security' || securityCapabilities === null)) {
      fetchSecurityCapabilities();
    }
  }, [isOpen, activeTab]);
  
  const fetchSecurityCapabilities = async () => {
    if (securityLoading) return;
    setSecurityLoading(true);
    setSecurityError(null);
    
    try {
      const response = await fetch('/habits/base/api/security/capabilities');
      const result = await response.json();
      
      if (result.success && result.data) {
        setSecurityCapabilities(result.data);
        // If intersect is not available, force policy off
        if (!result.data.intersectAvailable && config.security?.policyEnabled) {
          handleConfigChange({ security: { ...config.security, policyEnabled: false } });
        }
      } else {
        setSecurityError(result.error || 'Failed to fetch security capabilities');
      }
    } catch (error: any) {
      setSecurityError(error.message || 'Failed to connect to server');
    } finally {
      setSecurityLoading(false);
    }
  };
  
  const handleGeneratePolicy = async () => {
    if (!securityCapabilities?.intersectAvailable || generatingPolicy) return;
    
    setGeneratingPolicy(true);
    setGeneratedPolicy(null);
    
    try {
      const response = await fetch('/habits/base/api/security/generate-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habits: habits.map(h => ({ nodes: h.nodes, name: h.name })) })
      });
      const result = await response.json();
      
      if (result.success && result.data?.policy) {
        setGeneratedPolicy(JSON.stringify(result.data.policy, null, 2));
      } else {
        setSecurityError(result.error || 'Failed to generate policy');
      }
    } catch (error: any) {
      setSecurityError(error.message || 'Failed to generate policy');
    } finally {
      setGeneratingPolicy(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = async (content: string, field: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadFile = (content: string, filename: string, type: string = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const toggleHabitExpanded = (index: number) => {
    const newExpanded = new Set(expandedHabits);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedHabits(newExpanded);
  };

  const hasFrontend = !!frontendHtml;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <FileCode className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Export/Deploy</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'config'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Config
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'security'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Security
          </button>
            <button
            onClick={() => setActiveTab('binary')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors ${
              activeTab === 'binary'
              ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-700/50'
              : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            Pack/Export/Download
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'files'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Files
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Config Tab */}
          {activeTab === 'config' && (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-lg mx-auto space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-400" />
                    Server Configuration
                  </h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Configure deployment settings. These will be reflected in stack.yaml.
                  </p>
                </div>

                <div className="space-y-4 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  {/* Port */}
                  <div className="flex items-center justify-between">
                    <label htmlFor="port" className="text-sm font-medium text-slate-300">
                      Port
                    </label>
                    <input
                      id="port"
                      type="number"
                      value={config.port}
                      onChange={(e) => handleConfigChange({ port: parseInt(e.target.value) || 3000 })}
                      className="w-24 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={1}
                      max={65535}
                    />
                  </div>

                  {/* OpenAPI */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="openapi" className="text-sm font-medium text-slate-300">
                        Enable OpenAPI/Swagger
                      </label>
                      <p className="text-xs text-slate-500">HABITS_OPENAPI_ENABLED</p>
                    </div>
                    <input
                      id="openapi"
                      type="checkbox"
                      checked={config.openapi}
                      onChange={(e) => handleConfigChange({ openapi: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* Manage Endpoint */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="manage" className="text-sm font-medium text-slate-300">
                        Enable Manage Endpoint
                      </label>
                      <p className="text-xs text-slate-500">HABITS_MANAGE_ENABLED</p>
                    </div>
                    <input
                      id="manage"
                      type="checkbox"
                      checked={config.manageEndpoint}
                      onChange={(e) => setManageEndpoint(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* Webhook Timeout */}
                  <div className="flex items-center justify-between">
                    <label htmlFor="timeout" className="text-sm font-medium text-slate-300">
                      Webhook Timeout (ms)
                    </label>
                    <input
                      id="timeout"
                      type="number"
                      value={config.webhookTimeout}
                      onChange={(e) => handleConfigChange({ webhookTimeout: parseInt(e.target.value) || 30000 })}
                      className="w-28 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={1000}
                      step={1000}
                    />
                  </div>
                </div>


                {/* Quick Navigation */}
                <div className="pt-4 border-t border-slate-700">
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">View Files</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setActiveTab('files'); setActiveFileTab('stack'); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4 text-blue-400" />
                      stack.yaml
                    </button>
                    <button
                      onClick={() => { setActiveTab('files'); setActiveFileTab('habits'); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                    >
                      <FileCode className="w-4 h-4 text-purple-400" />
                      Habits ({habits.length})
                    </button>
                    <button
                      onClick={() => { setActiveTab('files'); setActiveFileTab('env'); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                    >
                      <Key className="w-4 h-4 text-yellow-400" />
                      .env
                    </button>
                    {hasFrontend && (
                      <button
                        onClick={() => { setActiveTab('files'); setActiveFileTab('frontend'); }}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                      >
                        <FileCode className="w-4 h-4 text-cyan-400" />
                        Frontend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-lg mx-auto space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    Security Configuration
                  </h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Configure security features. All disabled by default. Make sure to read and understand the implications of each setting as well as having access to @codenteam/intersect private registry before enabling any. For more information, check our documentation at <a href="https://docs.codenteam.com/intersect/security" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">https://docs.codenteam.com/intersect/security</a>.
                  </p>
                </div>

                {/* Security Package Status Notice */}
                {securityLoading ? (
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    <span className="text-sm text-slate-300">Checking security capabilities...</span>
                  </div>
                ) : securityCapabilities && !securityCapabilities.intersectAvailable ? (
                  <div className="p-4 bg-red-900/30 rounded-lg border border-red-700/50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium text-red-300 mb-1">Security Package Not Available</h5>
                        <p className="text-xs text-red-200/80 mb-2">
                          {securityCapabilities.error || 'The @codenteam/intersect package is not installed.'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {securityCapabilities.registryInfo || 'Security features require access to the private Codenteam registry.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : securityCapabilities?.intersectAvailable ? (
                  <div className="p-4 bg-green-900/30 rounded-lg border border-green-700/50">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium text-green-300 mb-1">Security Package Available</h5>
                        <p className="text-xs text-green-200/80">
                          @codenteam/intersect is installed. All security features are available.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : securityError ? (
                  <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-700/50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium text-yellow-300 mb-1">Unable to Check Security Status</h5>
                        <p className="text-xs text-yellow-200/80">{securityError}</p>
                        <button
                          onClick={fetchSecurityCapabilities}
                          className="mt-2 text-xs text-yellow-300 hover:text-yellow-200 underline"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  {/* DLP Enabled */}
                  <div className={`flex items-center justify-between ${!securityCapabilities?.intersectAvailable ? 'opacity-50' : ''}`}>
                    <div>
                      <label htmlFor="dlpEnabled" className="text-sm font-medium text-slate-300">
                        DLP Scanning
                      </label>
                      <p className="text-xs text-slate-500">HABITS_DLP_ENABLED</p>
                    </div>
                    <input
                      id="dlpEnabled"
                      type="checkbox"
                      checked={config.security?.dlpEnabled || false}
                      onChange={(e) => handleConfigChange({ security: { ...config.security, dlpEnabled: e.target.checked } })}
                      disabled={!securityCapabilities?.intersectAvailable}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* DLP ICAP URL */}
                  {config.security?.dlpEnabled && (
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="dlpIcapUrl" className="text-sm font-medium text-slate-300">
                          ICAP Server URL
                        </label>
                        <p className="text-xs text-slate-500">HABITS_DLP_ICAP_URL</p>
                      </div>
                      <input
                        id="dlpIcapUrl"
                        type="text"
                        value={config.security?.dlpIcapUrl || ''}
                        onChange={(e) => handleConfigChange({ security: { ...config.security, dlpIcapUrl: e.target.value } })}
                        placeholder="icap://server:1344/scan"
                        className="w-48 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* PII Protection */}
                  <div className={`flex items-center justify-between ${!securityCapabilities?.intersectAvailable ? 'opacity-50' : ''}`}>
                    <div>
                      <label htmlFor="piiProtection" className="text-sm font-medium text-slate-300">
                        PII Protection
                      </label>
                      <p className="text-xs text-slate-500">HABITS_PII_PROTECTION</p>
                    </div>
                    <select
                      id="piiProtection"
                      value={securityCapabilities?.intersectAvailable ? (config.security?.piiProtection || '') : ''}
                      onChange={(e) => handleConfigChange({ security: { ...config.security, piiProtection: e.target.value as '' | 'log' | 'eradicate' | 'replace' } })}
                      disabled={!securityCapabilities?.intersectAvailable}
                      className="w-32 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Disabled</option>
                      <option value="log">Log</option>
                      <option value="eradicate">Eradicate</option>
                      <option value="replace">Replace</option>
                    </select>
                  </div>

                  {/* Moderation Enabled */}
                  <div className={`flex items-center justify-between ${!securityCapabilities?.intersectAvailable ? 'opacity-50' : ''}`}>
                    <div>
                      <label htmlFor="moderationEnabled" className="text-sm font-medium text-slate-300">
                        Content Moderation
                      </label>
                      <p className="text-xs text-slate-500">HABITS_MODERATION_ENABLED</p>
                    </div>
                    <input
                      id="moderationEnabled"
                      type="checkbox"
                      checked={config.security?.moderationEnabled || false}
                      onChange={(e) => handleConfigChange({ security: { ...config.security, moderationEnabled: e.target.checked } })}
                      disabled={!securityCapabilities?.intersectAvailable}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Policy Enabled */}
                  <div className={`flex items-center justify-between ${!securityCapabilities?.intersectAvailable ? 'opacity-50' : ''}`}>
                    <div>
                      <label htmlFor="policyEnabled" className="text-sm font-medium text-slate-300">
                        Supply Chain Integrity
                      </label>
                      <p className="text-xs text-slate-500">HABITS_SECURITY_POLICY_ENABLED</p>
                    </div>
                    <input
                      id="policyEnabled"
                      type="checkbox"
                      checked={securityCapabilities?.intersectAvailable ? (config.security?.policyEnabled || false) : false}
                      onChange={(e) => handleConfigChange({ security: { ...config.security, policyEnabled: e.target.checked } })}
                      disabled={!securityCapabilities?.intersectAvailable}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Capabilities Enabled */}
                  <div className={`flex items-center justify-between ${!securityCapabilities?.intersectAvailable ? 'opacity-50' : ''}`}>
                    <div>
                      <label htmlFor="capabilitiesEnabled" className="text-sm font-medium text-slate-300">
                        Capabilities & Permissions
                      </label>
                      <p className="text-xs text-slate-500">HABITS_SECURITY_CAPABILITIES_ENABLED</p>
                    </div>
                    <input
                      id="capabilitiesEnabled"
                      type="checkbox"
                      checked={config.security?.capabilitiesEnabled || false}
                      onChange={(e) => handleConfigChange({ security: { ...config.security, capabilitiesEnabled: e.target.checked } })}
                      disabled={!securityCapabilities?.intersectAvailable}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Generate Policy Button */}
                {securityCapabilities?.intersectAvailable && (
                  <div className="space-y-3">
                    <button
                      onClick={handleGeneratePolicy}
                      disabled={generatingPolicy || habits.length === 0}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                    >
                      {generatingPolicy ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating Policy...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate Security Policy
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-500 text-center">
                      Analyzes your {habits.length} habit{habits.length !== 1 ? 's' : ''} and generates a security policy file
                    </p>
                    
                    {/* Generated Policy Display */}
                    {generatedPolicy && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-300">Generated Policy</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCopy(generatedPolicy, 'policy')}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                            >
                              {copiedField === 'policy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedField === 'policy' ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              onClick={() => handleDownloadFile(generatedPolicy, 'security-policy.json', 'application/json')}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Save
                            </button>
                          </div>
                        </div>
                        <pre className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 overflow-auto max-h-48">
                          {generatedPolicy}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Security Status Summary */}
                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-300">
                      Security Features Status
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${config.security?.dlpEnabled && securityCapabilities?.intersectAvailable ? 'bg-green-800/50 text-green-200' : 'bg-slate-700/50 text-slate-400'}`}>
                      DLP: {config.security?.dlpEnabled && securityCapabilities?.intersectAvailable ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${config.security?.piiProtection && securityCapabilities?.intersectAvailable ? 'bg-green-800/50 text-green-200' : 'bg-slate-700/50 text-slate-400'}`}>
                      PII: {config.security?.piiProtection && securityCapabilities?.intersectAvailable ? config.security.piiProtection : 'Disabled'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${config.security?.moderationEnabled && securityCapabilities?.intersectAvailable ? 'bg-green-800/50 text-green-200' : 'bg-slate-700/50 text-slate-400'}`}>
                      Moderation: {config.security?.moderationEnabled && securityCapabilities?.intersectAvailable ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${config.security?.policyEnabled && securityCapabilities?.intersectAvailable ? 'bg-green-800/50 text-green-200' : 'bg-slate-700/50 text-slate-400'}`}>
                      Policy: {config.security?.policyEnabled && securityCapabilities?.intersectAvailable ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${config.security?.capabilitiesEnabled && securityCapabilities?.intersectAvailable ? 'bg-green-800/50 text-green-200' : 'bg-slate-700/50 text-slate-400'}`}>
                      Capabilities: {config.security?.capabilitiesEnabled && securityCapabilities?.intersectAvailable ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Binary Tab */}
          {activeTab === 'binary' && (
            <BinaryExportTab
              habits={habits}
              exportBundle={exportBundle}
              serverConfig={{
                port: config.port,
                openapi: config.openapi,
                webhookTimeout: config.webhookTimeout,
              }}
              envContent={envContent}
              frontendHtml={frontendHtml || undefined}
              stackName={stackName}
            />
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* File Sub-Tabs */}
              <div className="flex border-b border-slate-700 bg-slate-900/30 px-2">
                <button
                  onClick={() => setActiveFileTab('stack')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                    activeFileTab === 'stack'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  stack.yaml
                </button>
                <button
                  onClick={() => setActiveFileTab('habits')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                    activeFileTab === 'habits'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3 h-3" />
                  Habits ({habits.length})
                </button>
                <button
                  onClick={() => setActiveFileTab('env')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                    activeFileTab === 'env'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Key className="w-3 h-3" />
                  .env
                </button>
                {hasFrontend && (
                  <button
                    onClick={() => setActiveFileTab('frontend')}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                      activeFileTab === 'frontend'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-3 h-3" />
                    Frontend
                  </button>
                )}
              </div>

              {/* Stack.yaml Sub-Tab */}
              {activeFileTab === 'stack' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50">
                    <span className="text-sm text-slate-400">stack.yaml</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(exportBundle.stackYaml, 'stack')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                      >
                        {copiedField === 'stack' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'stack' ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDownloadFile(exportBundle.stackYaml, 'stack.yaml')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap">{exportBundle.stackYaml}</pre>
                  </div>
                </div>
              )}

              {/* Habits Sub-Tab */}
              {activeFileTab === 'habits' && (
                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {exportBundle.habitFiles.map((file, index) => (
                    <div key={file.filename} className="border border-slate-700 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between px-4 py-2 bg-slate-700/50 cursor-pointer hover:bg-slate-700"
                        onClick={() => toggleHabitExpanded(index)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedHabits.has(index) ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-sm font-medium text-slate-200">{file.filename}</span>
                        </div>
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleCopy(file.content, `habit-${index}`)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded transition-colors"
                          >
                            {copiedField === `habit-${index}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedField === `habit-${index}` ? 'Copied' : 'Copy'}
                          </button>
                          <button
                            onClick={() => handleDownloadFile(file.content, file.filename)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            Save
                          </button>
                        </div>
                      </div>
                      {expandedHabits.has(index) && (
                        <div className="p-4 bg-slate-900/50 max-h-64 overflow-auto">
                          <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap">{file.content}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Env Sub-Tab */}
              {activeFileTab === 'env' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50">
                    <span className="text-sm text-slate-400">.env (editable)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(envContent, 'env')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                      >
                        {copiedField === 'env' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'env' ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDownloadFile(envContent, '.env')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                    <textarea
                      value={envContent}
                      onChange={(e) => {
                        // Parse the edited content and update envVariables state
                        const parsed = parseEnvString(e.target.value);
                        dispatch(setEnvVariables(parsed));
                      }}
                      rows={50}
                      className="w-full h-full bg-slate-900 border border-slate-700 rounded p-3 text-sm font-mono text-slate-300 resize-none focus:border-blue-500 focus:outline-none"
                      placeholder="# Environment variables will be extracted from your habits..."
                    />
                  </div>
                </div>
              )}

              {/* Frontend Sub-Tab */}
              {activeFileTab === 'frontend' && exportBundle.frontendHtml && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50">
                    <span className="text-sm text-slate-400">frontend/index.html</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(exportBundle.frontendHtml!, 'frontend')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                      >
                        {copiedField === 'frontend' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'frontend' ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDownloadFile(exportBundle.frontendHtml!, 'index.html', 'text/html')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap">{exportBundle.frontendHtml}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{habits.length} habit{habits.length !== 1 ? 's' : ''} • YAML format</span>
            <span>Files will be saved with schema-compliant structure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
