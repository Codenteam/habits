import { useState, useEffect } from 'react';
import { Server, FilePlus, Rocket, FolderOpen, ExternalLink, X, AlertTriangle, Play, RefreshCw, Settings, Link, Square, Pencil, Plus, Wand2, Info, AlertCircle, WaypointsIcon, WallpaperIcon } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { store } from '../store/store';
import { setWorkflowName, setStackDescription, setHabitEnvConnections, selectHabits, selectActiveHabit, selectActiveEnvConnections, selectStackDescription, selectHasValidationErrors, selectExportBundle } from '../store/slices/workflowSlice';
import { setViewMode } from '../store/slices/uiSlice';
import { api } from '../lib/api';
import { extractConnectionsFromHabitsWorkflow, type ExtractedConnection } from '../lib/workflowConverter';
import { habitToYaml, parseStackYaml } from '../lib/exportUtils';
import CodeViewModal from './CodeViewModal';
import OpenModal from './OpenModal';
import NewWorkflowModal from './NewWorkflowModal';
import ServePopup from './ServePopup';
import ShareLinkModal from './ShareLinkModal';
import GenerateModal from './GenerateModal';
import ValidationModal from './ValidationModal';
import Dialog from './Dialog';
import { FrontendWorkflow } from '@ha-bits/core';
import { validateHabit, type ValidatableHabit } from '../store/validation/habitValidation';

export default function Toolbar() {
  const dispatch = useAppDispatch();
  const stackName = useAppSelector(state => state.workflow.stackName);
  const stackDescription = useAppSelector(selectStackDescription);
  const habits = useAppSelector(selectHabits);
  const activeHabit = useAppSelector(selectActiveHabit);
  const frontendHtml = useAppSelector(state => state.ui.frontendHtml);
  const viewMode = useAppSelector(state => state.ui.viewMode);
  const storedEnvConnections = useAppSelector(selectActiveEnvConnections);
  const hasValidationErrors = useAppSelector(selectHasValidationErrors);
  const [serving, setServing] = useState(false);
  const [serverRunning, setServerRunning] = useState(false);
  const [serverPort, setServerPort] = useState<number | null>(null);
  const [serverHost, setServerHost] = useState<string>('localhost');
  const [showPublishDeployModal, setShowPublishDeployModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [extractedConnections, setExtractedConnections] = useState<ExtractedConnection[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showServePopup, setShowServePopup] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [shareHabitYaml, setShareHabitYaml] = useState<string>('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    message: string;
    type: 'confirm' | 'alert' | 'success' | 'error';
    onConfirm?: () => void;
  }>({ message: '', type: 'alert' });
  
  // Stack description editing state
  const [isEditingStackDescription, setIsEditingStackDescription] = useState(false);
  const [editedStackDescription, setEditedStackDescription] = useState(stackDescription);
  
  // Sync edited stack description when it changes externally
  useEffect(() => {
    setEditedStackDescription(stackDescription);
  }, [stackDescription]);

  // Sync extractedConnections with Redux state when it changes
  useEffect(() => {
    if (storedEnvConnections.length > 0) {
      setExtractedConnections(storedEnvConnections);
    }
  }, [storedEnvConnections]);

  // Get the active habit name
  const activeHabitName = activeHabit?.name || 'No habit selected';

  // Run validations on all habits
  const allHabitsValidation = habits.map(habit => ({
    habit,
    errors: validateHabit(habit as ValidatableHabit),
  }));
  
  const totalErrors = allHabitsValidation.reduce((sum, { errors }) => 
    sum + errors.filter(e => e.severity === 'error').length, 0
  );
  const totalWarnings = allHabitsValidation.reduce((sum, { errors }) => 
    sum + errors.filter(e => e.severity === 'warning').length, 0
  );
  const worstSeverity = totalErrors > 0 ? 'error' : totalWarnings > 0 ? 'warning' : 'none';

  const handleServe = async (stopOnly = false) => {
    if (hasValidationErrors) {
      setServerError('Please fix validation errors before serving');
      return;
    }

    // Clear any previous error
    setServerError(null);

    // If server is already running, stop it first
    if (serverRunning) {
      try {
        await api.stopServer();
        setServerRunning(false);
        setServerPort(null);
      } catch (error: any) {
        console.error('Failed to stop server:', error);
        setServerError(`Failed to stop server: ${error.message}`);
        return;
      }
      // If stopOnly is true, just stop and don't restart
      if (stopOnly) {
        return;
      }
      // Small delay before restarting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setServing(true);
    try {
      
      // Use the centralized export bundle selector with current state
      const state = store.getState();
      const bundle = selectExportBundle(state);
      
      // Parse the generated stack.yaml back to JSON for the API
      const configData = parseStackYaml(bundle.stackYaml);
      if (!configData) {
        throw new Error('Failed to parse generated stack configuration');
      }
      
      // Start server with all config
      const result = await api.startServer(bundle);
      
      if (result.success) {
        setServerRunning(true);
        // Get port from the config we sent, and host from server response
        setServerPort(configData.server.port);
        setServerHost(result.data?.host || 'localhost');
        console.log('Server started:', result);
      } else {
        throw new Error(result.error || 'Failed to start server');
      }
    } catch (error: any) {
      console.error('Server error:', error);
      setServerError(error.message || 'Server failed to start. The port may be in use or there was a configuration error. Check the console for details.');
    } finally {
      setServing(false);
    }
  };

  const handleShareLink = () => {
    if (!activeHabit) {
      setDialogConfig({ message: 'No habit selected', type: 'alert' });
      setDialogOpen(true);
      return;
    }
    if (activeHabit.nodes.length === 0) {
      setDialogConfig({ message: 'Add nodes to the habit first', type: 'alert' });
      setDialogOpen(true);
      return;
    }
    
    // Convert habit to YAML (cast to any for compatibility between Redux Habit and exportUtils Habit types)
    const yamlContent = habitToYaml(activeHabit as any);
    
    // Store YAML and show modal
    setShareHabitYaml(yamlContent);
    setShowShareLinkModal(true);
  };

  const handlePublishDeploy = () => {
    // Check if any habit has nodes
    const habitsWithNodes = habits.filter(h => h.nodes.length > 0);
    if (habitsWithNodes.length === 0) {
      setDialogConfig({ message: 'Add nodes to at least one habit first', type: 'alert' });
      setDialogOpen(true);
      return;
    }

    // Extract connections from ALL habits
    const allConnections: ExtractedConnection[] = [...extractedConnections];
    
    for (const habit of habitsWithNodes) {
      // Convert habit to workflow format for connection extraction
      const habitWorkflowData: FrontendWorkflow = {
        id: habit.id,
        name: habit.name,
        nodes: habit.nodes.map((node: any) => ({
          id: node.id,
          type: node.data?.framework === 'n8n' ? 'n8n' : 'activepieces',
          position: node.position,
          data: node.data,
        })),
        edges: habit.edges?.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        })) || [],
        version: '1.0'
      };
      
      const connections = extractConnectionsFromHabitsWorkflow(habitWorkflowData);
      
      for (const conn of connections) {
        // Avoid duplicates
        if (!allConnections.find(c => c.envVarName === conn.envVarName)) {
          allConnections.push(conn);
        }
      }
    }
    
    setExtractedConnections(allConnections);
    // Save to Redux state for persistence
    dispatch(setHabitEnvConnections(allConnections));
    setShowPublishDeployModal(true);
  };

  return (
    <>
      {/* Server Error Banner */}
      {serverError && (
        <div className="absolute top-14 left-0 right-0 z-50 flex items-center justify-center px-4 py-2">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-900/90 border border-red-700 rounded-lg shadow-lg max-w-2xl">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-200">{serverError}</span>
            <button
              onClick={() => setServerError(null)}
              className="p-1 hover:bg-red-800 rounded transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      )}
      <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/habits/base/assets/logo.png" className="w-5 h-5"></img>
            
            <span className="text-white font-extralight">Habits Base </span>

              <span className="relative group font-light underline text-white decoration-1 cursor-pointer">
                            <span className=" ">Alpha <span
              className=" text-blue-300 cursor-pointer  "
            >
                {/* <span className="font-bold text-base cursor-pointer">i</span> */}
                <span className="absolute right-0 translate-x-full mt-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Although Habits is mature, the Base (UI builder) is experimental. Use with caution.
                </span>
              </span>
              <span className="sr-only">
              Although Habits is mature, the Base (UI builder) is experimental. Use with caution.
              </span>
            </span></span>
            
            <input
              type="text"
              value={stackName}
              onChange={(e) => dispatch(setWorkflowName(e.target.value))}
              className="font-semibold text-lg border-none outline-none bg-transparent text-white focus:bg-slate-700 px-2 py-1 rounded field-sizing-content"
              placeholder="Workflow Name"
            />
            
            {/* Stack Description */}
            <div className="flex items-center gap-1 ml-2">
              {isEditingStackDescription ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editedStackDescription}
                    onChange={(e) => setEditedStackDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        dispatch(setStackDescription(editedStackDescription));
                        setIsEditingStackDescription(false);
                      } else if (e.key === 'Escape') {
                        setEditedStackDescription(stackDescription);
                        setIsEditingStackDescription(false);
                      }
                    }}
                    className="text-sm border-none outline-none bg-slate-700 text-slate-300 px-2 py-1 rounded w-48"
                    placeholder="Enter stack description..."
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      dispatch(setStackDescription(editedStackDescription));
                      setIsEditingStackDescription(false);
                    }}
                    className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditedStackDescription(stackDescription);
                      setIsEditingStackDescription(false);
                    }}
                    className="text-xs px-2 py-1 rounded bg-slate-600 text-slate-300 hover:bg-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : stackDescription ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-400 italic truncate max-w-[200px]" title={stackDescription}>
                    {stackDescription}
                  </span>
                  <button
                    onClick={() => setIsEditingStackDescription(true)}
                    className="text-slate-400 hover:text-slate-200 p-1"
                    title="Edit description"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingStackDescription(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Description
                </button>
              )}
            </div>
        </div>
        
        {/* Active Habit Name */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-700/50 rounded-md border border-slate-600">
          <span className="text-xs text-slate-400">Habit:</span>
          <span className="text-sm font-medium text-blue-600 truncate max-w-[200px]" title={activeHabitName}>
            {activeHabitName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
                {/* Generate with AI */}
        <div className="relative group">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center justify-center w-9 h-9 text-purple-300 bg-purple-900/50 hover:bg-purple-800/50 rounded-md transition-colors cursor-pointer border border-purple-700/50"
          >
            <Wand2 className="w-4 h-4" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Generate with AI
          </div>
        </div>


        {/* New */}
        <div className="relative group">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center justify-center w-9 h-9 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            New
          </div>
        </div>

        {/* Open */}
        <div className="relative group">
          <button
            onClick={() => setShowOpenModal(true)}
            className="flex items-center justify-center w-9 h-9 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Open
          </div>
        </div>


        {/* Backend/Frontend Toggle */}
        <div className="flex items-center bg-slate-700 rounded-md overflow-hidden">
          <button
            onClick={() => dispatch(setViewMode('backend'))}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              viewMode === 'backend'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-600'
            }`}
          >
            <WaypointsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Logic</span>
          </button>
          <button
            onClick={() => dispatch(setViewMode('frontend'))}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              viewMode === 'frontend'
                ? 'bg-purple-600 text-white'
                : frontendHtml
                  ? 'text-purple-300 hover:bg-slate-600'
                  : 'text-slate-300 hover:bg-slate-600'
            }`}
          >
            <WallpaperIcon className="w-4 h-4" />
            <span className="hidden sm:inline">UI</span>
            {/* {frontendHtml && viewMode !== 'frontend' && (
              <span className="w-2 h-2 bg-purple-400 rounded-full" />
            )} */}
          </button>
        </div>

       

        {/* Share Link */}
        <div className="relative group">
          <button
            onClick={handleShareLink}
            className="flex items-center justify-center w-9 h-9 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <Link className="w-4 h-4" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Share Habit Link
          </div>
        </div>

        <div className="w-px h-8 bg-slate-600 mx-2" />

        {/* Server URL when running */}
        {serverRunning && serverPort && (
          <a
            href={`http://${serverHost}:${serverPort}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded-md transition-colors border border-green-700/50"
            title={`Open served workflow at http://${serverHost}:${serverPort}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">{serverHost}:{serverPort}</span>
          </a>
        )}

        {/* Serve Controls */}
        <div className="relative flex items-center">
          {/* Settings Button */}
          <button
            onClick={() => setShowServePopup(!showServePopup)}
            className="flex items-center justify-center w-9 h-9 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-l-md border-r border-slate-600 transition-colors cursor-pointer"
            title="Server settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Play/Restart Button */}
          <button
            onClick={() => handleServe()}
            disabled={hasValidationErrors}
            title={hasValidationErrors ? "Fix validation errors before serving" : serverRunning ? "Restart server" : "Start server"}
            className={`flex items-center h-9 gap-2 px-4 py-2 text-sm transition-colors cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed ${
              serverRunning 
                ? 'bg-orange-800 hover:bg-orange-900 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white rounded-r-md'
            }`}
          >
            {serverRunning ? (
              <>
                <RefreshCw className="w-4 h-4" />
              </>
            ) : serving ? (
              <>
                <Server className="w-4 h-4 animate-pulse" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Stop Button (only when server is running) */}
          {serverRunning && (
            <button
              onClick={() => handleServe(true)}
              className="flex items-center h-9 gap-2 px-4 py-2 text-sm rounded-r-md bg-red-800 hover:bg-red-900 text-white transition-colors cursor-pointer border-l border-red-900"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {/* Serve Popup */}
          <ServePopup
            isOpen={showServePopup}
            onClose={() => setShowServePopup(false)}
            onServe={handleServe}
            serverRunning={serverRunning}
          />
        </div>

         {/* Export */}
        <div className="relative group">
          <button
            onClick={handlePublishDeploy}
            disabled={hasValidationErrors}
            title={hasValidationErrors ? "Fix validation errors before exporting" : "Export / Deploy"}
            className={`flex items-center justify-center h-9 text-white rounded-md transition-colors gap-2 px-4 py-2 ${
              hasValidationErrors
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            }`}
          >
            <Rocket className="w-4 h-4" />
          </button>
          {!hasValidationErrors && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Export / Deploy
            </div>
          )}
        </div>

        {/* Validation Status */}
        <div className="relative group">
          <button
            onClick={() => setShowValidationModal(true)}
            className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors cursor-pointer ${
              worstSeverity === 'error'
                ? 'bg-red-900/50 text-red-400 hover:bg-red-800/50 border border-red-700/50'
                : worstSeverity === 'warning'
                ? 'bg-yellow-900/50 text-yellow-400 hover:bg-yellow-800/50 border border-yellow-700/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {worstSeverity === 'error' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : worstSeverity === 'warning' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Validation Status
          </div>
        </div>
      </div>

      {/* Publish & Deploy Modal (Code View) */}
      <CodeViewModal
        isOpen={showPublishDeployModal}
        onClose={() => setShowPublishDeployModal(false)}
      />

      {/* Open Folder Modal */}
      <OpenModal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
      />

      {/* New Workflow Modal */}
      <NewWorkflowModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
      />

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={showShareLinkModal}
        onClose={() => setShowShareLinkModal(false)}
        habitYaml={shareHabitYaml}
      />

      {/* Generate with AI Modal */}
      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
      />

      {/* Validation Modal */}
      <ValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        habits={habits as ValidatableHabit[]}
      />

      {/* Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={dialogConfig.onConfirm}
      />
    </div>
    </>
  );
}
