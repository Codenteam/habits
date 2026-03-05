import { useState } from 'react';
import { FileJson, Sparkles, FileText, X, Loader2, Wand2 } from 'lucide-react';
import { useAppDispatch } from '../store/hooks';
import { clearWorkflow, loadWorkflow, setEnvVariables } from '../store/slices/workflowSlice';
import { clearFrontendHtml, setFrontendHtml, clearEnvContent, setEnvContent } from '../store/slices/uiSlice';
import yaml from 'js-yaml';
import GenerateModal from './GenerateModal';
import Dialog from './Dialog';

// Helper to parse .env file content into key-value object
function parseEnvContent(content: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();
      
      // Handle quoted values
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      envVars[key] = value;
    }
  }
  
  return envVars;
}

interface NewWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  stackPath: string; // Path to stack.yaml
}

const TEMPLATES: Template[] = [
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    description: 'Generate marketing assets including images, vectors, and landing pages from a single prompt using Intersect AI.',
    icon: <Sparkles className="w-6 h-6" />,
    stackPath: '/habits/base/api/templates/business-intersect-standalone/stack.yaml',
  },
  {
    id: 'mixed-workflow',
    name: 'Mixed Framework',
    description: 'A mixed workflow example with text-to-voice processing, demonstrating multi-framework integration.',
    icon: <FileText className="w-6 h-6" />,
    stackPath: '/habits/base/api/templates/mixed/stack.yaml',
  },
];

export default function NewWorkflowModal({ isOpen, onClose }: NewWorkflowModalProps) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    message: string;
    type: 'confirm' | 'alert';
    onConfirm?: () => void;
  }>({ message: '', type: 'alert' });

  const handleStartFromScratch = () => {
    setDialogConfig({
      message: 'Are you sure you want to start a new workflow? This will clear the current workflow.',
      type: 'confirm',
      onConfirm: () => {
        dispatch(clearWorkflow());
        dispatch(clearFrontendHtml());
        dispatch(clearEnvContent());
        onClose();
      },
    });
    setDialogOpen(true);
  };

  const handleSelectTemplate = async (template: Template) => {
    setDialogConfig({
      message: `Load the "${template.name}" template? This will replace your current workflow.`,
      type: 'confirm',
      onConfirm: () => loadTemplate(template),
    });
    setDialogOpen(true);
  };

  const loadTemplate = async (template: Template) => {

    setLoading(template.id);
    setError(null);

    try {
      const templateDir = template.stackPath.substring(0, template.stackPath.lastIndexOf('/'));
      
      // 1. Load and parse the stack file (config)
      const stackResponse = await fetch(template.stackPath);
      if (!stackResponse.ok) {
        throw new Error(`Failed to fetch stack config: ${stackResponse.statusText}`);
      }
      
      const stackContent = await stackResponse.text();
      let stackConfig: any;
      
      // Try to parse as JSON first, then YAML (some .yaml files contain JSON)
      try {
        stackConfig = JSON.parse(stackContent);
      } catch {
        stackConfig = yaml.load(stackContent);
      }
      
      // 2. Load all workflows defined in the stack
      const workflows: any[] = [];
      const workflowConfigs = stackConfig.workflows || [];
      
      for (const wfConfig of workflowConfigs) {
        if (!wfConfig.path) continue;
        
        // Resolve workflow path relative to stack file
        const workflowPath = wfConfig.path.startsWith('./')
          ? `${templateDir}/${wfConfig.path.slice(2)}`
          : `${templateDir}/${wfConfig.path}`;
        
        const wfResponse = await fetch(workflowPath);
        if (!wfResponse.ok) {
          console.warn(`Could not load workflow: ${workflowPath}`);
          continue;
        }
        
        const wfContent = await wfResponse.text();
        let workflow: any;
        
        // Try to parse as JSON first, then YAML
        try {
          workflow = JSON.parse(wfContent);
        } catch {
          workflow = yaml.load(wfContent);
        }
        
        workflows.push(workflow);
      }
      
      if (workflows.length === 0) {
        throw new Error('No workflows found in stack configuration');
      }

      // Clear existing workflow and load the template
      dispatch(clearWorkflow());
      dispatch(clearFrontendHtml());
      dispatch(clearEnvContent());
      
      // Load the first workflow (or all of them if loadWorkflow supports it)
      dispatch(loadWorkflow(workflows[0]));
      
      // 3. Load frontend HTML if specified in stack config or exists in frontend folder
      const frontendConfigPath = stackConfig.server?.frontend;
      let frontendPath: string;
      
      if (frontendConfigPath) {
        // Use path from config, resolve relative to template dir
        const resolvedPath = frontendConfigPath.startsWith('./')
          ? `${templateDir}/${frontendConfigPath.slice(2)}`
          : `${templateDir}/${frontendConfigPath}`;
        frontendPath = resolvedPath.endsWith('/') || !resolvedPath.includes('.')
          ? `${resolvedPath}/index.html`
          : resolvedPath;
      } else {
        frontendPath = `${templateDir}/frontend/index.html`;
      }
      
      try {
        const frontendResponse = await fetch(frontendPath);
        if (frontendResponse.ok) {
          const frontendHtml = await frontendResponse.text();
          dispatch(setFrontendHtml(frontendHtml));
        }
      } catch (frontendErr) {
        console.warn('Could not load frontend for template:', frontendErr);
      }
      
      // 4. Load .env file
      const envPath = `${templateDir}/.env`;
      try {
        const envResponse = await fetch(envPath);
        if (envResponse.ok) {
          const envFileContent = await envResponse.text();
          dispatch(setEnvContent(envFileContent));
          
          // Parse and set env variables to habit state
          const envVars = parseEnvContent(envFileContent);
          if (Object.keys(envVars).length > 0) {
            dispatch(setEnvVariables(envVars));
          }
        }
      } catch (envErr) {
        console.warn('Could not load .env for template:', envErr);
      }
      
      onClose();
    } catch (err) {
      console.error('Failed to load template:', err);
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <FileJson className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">New Workflow</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Start from scratch */}
          <div>
            <button
              onClick={handleStartFromScratch}
              className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-green-500 rounded-lg transition-all group text-left"
            >
              <div className="p-3 bg-green-600/20 rounded-lg group-hover:bg-green-600/30 transition-colors">
                <FileJson className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-white font-medium">Start from Scratch</div>
                <div className="text-slate-400 text-sm mt-1">
                  Begin with an empty workflow canvas
                </div>
              </div>
            </button>
          </div>

          {/* Generate with AI */}
          <div>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-purple-500 rounded-lg transition-all group text-left"
            >
              <div className="p-3 bg-purple-600/20 rounded-lg group-hover:bg-purple-600/30 transition-colors">
                <Wand2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-white font-medium">Generate with AI</div>
                <div className="text-slate-400 text-sm mt-1">
                  Describe your workflow and let AI create it for you
                </div>
              </div>
            </button>
          </div>

          {/* Templates section */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
              Or choose a template
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  disabled={loading !== null}
                  className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-blue-500 rounded-lg transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="p-3 bg-blue-600/20 rounded-lg group-hover:bg-blue-600/30 transition-colors">
                    {loading === template.id ? (
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    ) : (
                      <div className="text-blue-400">{template.icon}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">{template.name}</div>
                    <div className="text-slate-400 text-sm mt-1 line-clamp-2">
                      {template.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
            <p>Templates provide pre-configured workflows to help you get started quickly.</p>
          </div>
        </div>
      </div>

      {/* Generate Modal */}
      <GenerateModal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false);
          onClose();
        }}
      />

      {/* Confirm Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={dialogConfig.onConfirm}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
}
