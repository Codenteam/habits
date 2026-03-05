import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Layers,
  Activity, Zap, Code, Settings, Puzzle, FileCode,
  ArrowUpFromLineIcon,
  FolderOpen,
  AlertTriangle,
  SquareArrowRightExitIcon
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  addHabit, removeHabit, setActiveHabit, updateHabit, 
  setAvailableModules, selectHabits, selectActiveHabitId 
} from '../store/slices/workflowSlice';
import { convertWorkflowWithConnections, detectWorkflowType } from '../lib/workflowConverter';
import { slugify } from '../lib/exportUtils';
import { api } from '../lib/api';
import { BITS } from '../lib/bits';
import AddModuleModal from './AddModuleModal';
import CodeViewModal from './CodeViewModal';
import ModuleIcon from './ModuleIcon';
import OutputsModal from './OutputsModal';
import Dialog from './Dialog';
import yaml from 'js-yaml';

// Now using a Set to allow multiple sections to be visible
interface VisibleSections {
  habits: boolean;
  nodes: boolean;
}

interface LeftSidebarProps {
  onAddNode: (template: { framework: 'n8n' | 'activepieces' | 'script' | 'bits'; module: string; label: string }) => void;
}

export default function LeftSidebar({ onAddNode }: LeftSidebarProps) {
  const dispatch = useAppDispatch();
  
  // Habits state
  const habits = useAppSelector(selectHabits);
  const activeHabitId = useAppSelector(selectActiveHabitId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [converting, setConverting] = useState(false);
  const [showOutputsModal, setShowOutputsModal] = useState(false);
  const convertInputRef = useRef<HTMLInputElement>(null);
  const openInputRef = useRef<HTMLInputElement>(null);

  // Node palette state
  const availableModules = useAppSelector(state => state.workflow.availableModules);
  const [selectedFrameworks, setSelectedFrameworks] = useState<('n8n' | 'activepieces' | 'script' | 'bits')[]>(['n8n', 'activepieces', 'script', 'bits']);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showCodeViewModal, setShowCodeViewModal] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    message: string;
    type: 'confirm' | 'alert' | 'success' | 'error';
    onConfirm?: () => void;
  }>({ message: '', type: 'alert' });

  // Sidebar state - both sections can be visible independently
  const [visibleSections, setVisibleSections] = useState<VisibleSections>({
    habits: true,
    nodes: true,
  });

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const modules = await api.getModules();
      dispatch(setAvailableModules(modules));
    } catch (error) {
      console.error('Failed to load modules:', error);
    }
  };

  // Check if a string is a UUID (v4 format)
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // ===== HABITS HANDLERS =====
  const extractNodesAndEdges = (workflow: any) => {
    const nodes = (workflow.nodes || []).map((node: any) => ({
      id: node.id,
      type: 'custom',
      position: node.position || { x: 0, y: 0 },
      data: node.data || node,
    }));
    const edges = workflow.edges || [];
    return { nodes, edges };
  };

  const handleOpenFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Try to parse as JSON first
        let workflow;
        try {
          workflow = JSON.parse(e.target?.result as string);
        } catch {
          // If JSON fails, try YAML

          workflow = yaml.load(e.target?.result as string);
        }
        const { nodes, edges } = extractNodesAndEdges(workflow);
        dispatch(addHabit({ name: file.name.replace(/\.(json|ya?ml)$/i, ''), nodes, edges }));
      } catch (error: any) {
        setDialogConfig({ message: `Failed to load file: ${error.message}`, type: 'error' });
        setDialogOpen(true);
      }
    };
    reader.readAsText(file);
    if (openInputRef.current) openInputRef.current.value = '';
  };

  const handleConvert = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setConverting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflow = JSON.parse(e.target?.result as string);
        const workflowType = detectWorkflowType(workflow);
        
        if (workflowType === 'unknown') {
          setDialogConfig({ message: 'Unknown workflow format. Supported formats: n8n, Activepieces, or Habits native format.', type: 'error' });
          setDialogOpen(true);
          return;
        }

        if (workflowType === 'habits') {
          const { nodes, edges } = extractNodesAndEdges(workflow);
          dispatch(addHabit({ name: file.name.replace('.json', ''), nodes, edges }));
          return;
        }

        const result = convertWorkflowWithConnections(workflow);
        const { nodes, edges } = extractNodesAndEdges(result.workflow);
        dispatch(addHabit({ name: file.name.replace('.json', ''), nodes, edges }));
        
        if (result.connections.length > 0) {
          setDialogConfig({ message: `Converted ${workflowType} workflow and added as new habit!\n${result.connections.length} connection(s) found.`, type: 'success' });
          setDialogOpen(true);
        } else {
          setDialogConfig({ message: `Converted ${workflowType} workflow and added as new habit!`, type: 'success' });
          setDialogOpen(true);
        }
      } catch (error: any) {
        setDialogConfig({ message: `Failed to convert workflow: ${error.message}`, type: 'error' });
        setDialogOpen(true);
      } finally {
        setConverting(false);
      }
    };
    reader.readAsText(file);
    if (convertInputRef.current) convertInputRef.current.value = '';
  };

  const handleAddHabit = () => {
    dispatch(addHabit({ name: `Habit ${habits.length + 1}` }));
  };

  const handleSelectHabit = (habitId: string) => {
    if (habitId !== activeHabitId) {
      dispatch(setActiveHabit(habitId));
    }
  };

  const handleRemoveHabit = (e: React.MouseEvent, habitId: string) => {
    e.stopPropagation();
    if (habits.length > 1) {
      dispatch(removeHabit(habitId));
    }
  };

  const handleStartEdit = (e: React.MouseEvent, habitId: string, currentName: string) => {
    e.stopPropagation();
    setEditingId(habitId);
    setEditName(currentName);
  };

  const handleSaveEdit = (habitId: string) => {
    if (editName.trim()) {
      const trimmedName = editName.trim();
      const newId = slugify(trimmedName);
      dispatch(updateHabit({ habitId, updates: { name: trimmedName, id: newId } }));
    }
    setEditingId(null);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, habitId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(habitId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditName('');
    }
  };

  // ===== NODE PALETTE HANDLERS =====
  const n8nModules = availableModules.filter((m) => m.framework === 'n8n');
  const activepiecesModules = availableModules.filter((m) => m.framework === 'activepieces');
  const scriptModules = availableModules.filter((m) => m.framework === 'script');

  const toggleFramework = (framework: 'n8n' | 'activepieces' | 'script' | 'bits') => {
    if (selectedFrameworks.includes(framework)) {
      if (selectedFrameworks.length === 1) return;
      setSelectedFrameworks(selectedFrameworks.filter(f => f !== framework));
    } else {
      setSelectedFrameworks([...selectedFrameworks, framework]);
    }
  };

  const handleAddNode = (framework: 'n8n' | 'activepieces' | 'script' | 'bits', module: string, label: string) => {
    onAddNode({ framework, module, label });
  };

  const handleModuleAdded = () => {
    loadModules();
  };

  const toggleSection = (section: keyof VisibleSections) => {
    setVisibleSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // ===== RENDER =====
  const isAnySectionVisible = visibleSections.habits || visibleSections.nodes;

  return (
    <div className="flex h-full">
      {/* Icon bar - always visible */}
      <div className="w-12 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-3 gap-2">
        <button
          onClick={() => toggleSection('habits')}
          className={`p-2.5 rounded-lg transition-colors ${
            visibleSections.habits
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
          title="Habits Stack"
        >
          <Layers className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => toggleSection('nodes')}
          className={`p-2.5 rounded-lg transition-colors ${
            visibleSections.nodes
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
          title="Node Palette"
        >
          <Puzzle className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="w-6 border-t border-slate-700 my-1" />

        {/* Code View button */}
        <button
          onClick={() => setShowCodeViewModal(true)}
          className="p-2.5 rounded-lg transition-colors text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          title="View/Export Code (YAML)"
        >
          <FileCode className="w-5 h-5" />
        </button>

        {/* Quick stats when collapsed */}
        {!isAnySectionVisible && (
          <div className="mt-auto flex flex-col items-center gap-2 text-xs text-slate-500">
            <div className="flex flex-col items-center">
              <span className="font-medium">{habits.length}</span>
              <span>habits</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-medium">{availableModules.length}</span>
              <span>nodes</span>
            </div>
          </div>
        )}
      </div>

      {/* Expandable content panel */}
      {isAnySectionVisible && (
        <div className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
          {/* Habits Section - Collapsible */}
          {visibleSections.habits && (
            <div className={`flex flex-col ${visibleSections.nodes ? 'flex-1 min-h-0' : 'flex-1'}`}>
              {/* Header */}
              <div className="p-3 border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Layers className="w-4 h-4" />
                    <span className="text-sm font-medium">Habits Stack</span>
                  </div>
                  <button
                    onClick={handleAddHabit}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Add new empty habit"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={() => openInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                    title="Open a habit workflow file"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open
                  </button>
                  <input
                    ref={openInputRef}
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleOpenFile}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => convertInputRef.current?.click()}
                    disabled={converting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition-colors disabled:opacity-50"
                    title="Import & convert n8n/Activepieces workflow"
                  >
                    <ArrowUpFromLineIcon className={`w-3.5 h-3.5 ${converting ? 'animate-spin' : ''}`} />
                    Import
                  </button>
                  <input
                    ref={convertInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleConvert}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Habits List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {habits.map((habit, index) => {
                  const outputCount = Object.keys(habit.output || {}).length;
                  const hasUUIDId = isUUID(habit.id);
                  return (
                  <div
                    key={habit.id}
                    onClick={() => handleSelectHabit(habit.id)}
                    className={`
                      group flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors
                      ${habit.id === activeHabitId 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700'
                      }
                      ${hasUUIDId ? 'border-2 border-red-500' : ''}
                    `}
                  >
                    <span className={`
                      text-xs font-mono w-5 h-5 rounded flex items-center justify-center
                      ${habit.id === activeHabitId ? 'bg-blue-500' : 'bg-slate-600'}
                    `}>
                      {index + 1}
                    </span>
                    
                    {editingId === habit.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleSaveEdit(habit.id)}
                        onKeyDown={(e) => handleKeyDown(e, habit.id)}
                        className="flex-1 bg-slate-900 text-white text-sm px-2 py-0.5 rounded border border-slate-500 focus:border-blue-400 focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span 
                        className="flex-1 text-sm truncate"
                        onDoubleClick={(e) => handleStartEdit(e, habit.id, habit.name)}
                      >
                        {habit.name}
                      </span>
                    )}

                    {/* UUID Warning Icon */}
                    {hasUUIDId && editingId !== habit.id && (
                      <div 
                        className="relative group/tooltip"
                        title="Please give the habit a descriptive name representing what it does"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 border border-red-500">
                          Please give the habit a descriptive name representing what it does
                        </div>
                      </div>
                    )}

                    {/* Outputs button - only show for active habit */}
                    {habit.id === activeHabitId && editingId !== habit.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          
                          setShowOutputsModal(true);
                        }}
                        className={`
                          relative p-1 rounded transition-all cursor-pointer
                          ${outputCount > 0 
                            ? 'text-green-400 hover:bg-green-500/20' 
                            : 'text-slate-400 hover:bg-slate-600'
                          }
                        `}
                        title={outputCount > 0 ? `${outputCount} output${outputCount !== 1 ? 's' : ''} defined` : 'Define outputs'}
                      >
                        <SquareArrowRightExitIcon className="w-3.5 h-3.5" />
                        {/* <SquareArrowOutDownRightIcon className="w-3.5 h-3.5" /> */}
                        {/* <ArrowRightFromLineIcon className="w-3.5 h-3.5" /> */}
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {outputCount}
                          </span>
                      </button>
                    )}

                    {habits.length > 1 && editingId !== habit.id && (
                      <button
                        onClick={(e) => handleRemoveHabit(e, habit.id)}
                        className={`
                          p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                          ${habit.id === activeHabitId 
                            ? 'hover:bg-blue-500 text-blue-200' 
                            : 'hover:bg-slate-600 text-slate-400'
                          }
                        `}
                        title="Remove habit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )})}
              </div>

              {/* Footer info */}
              <div className="p-2 border-t border-slate-700 text-xs text-slate-500 flex-shrink-0">
                {habits.length} habit{habits.length !== 1 ? 's' : ''} • Double-click to rename
              </div>
            </div>
          )}

          {/* Nodes Section - Collapsible */}
          {visibleSections.nodes && (
            <div className={`flex flex-col ${visibleSections.habits ? 'flex-1 min-h-0 border-t border-slate-600' : 'flex-1'}`}>
              <div className="p-3 border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-2 text-slate-300 mb-3">
                  <Puzzle className="w-4 h-4" />
                  <span className="text-sm font-medium">Node Palette</span>
                </div>
                
                {/* Framework toggle buttons */}
                <div className="grid grid-cols-3 gap-1 mb-3">
                  <button
                    onClick={() => toggleFramework('activepieces')}
                    className={`flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded transition-colors text-xs ${
                      selectedFrameworks.includes('activepieces')
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/50'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 border border-transparent'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    bits
                  </button>
                  <button
                    onClick={() => toggleFramework('n8n')}
                    className={`flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded transition-colors text-xs ${
                      selectedFrameworks.includes('n8n')
                        ? 'bg-red-600/20 text-red-400 border border-red-500/50'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 border border-transparent'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    n8n
                  </button>
                  <button
                    onClick={() => handleAddNode('script', 'script', 'Script')}
                    className="flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded transition-colors text-xs bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-600/30"
                    title="Add Script node"
                  >
                    <Code className="w-3.5 h-3.5" />
                    + Script
                  </button>
                </div>
                
                {/* Add Module Button */}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-xs font-medium"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Add Module
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-100vh">
                {/* Bits - Always visible when bits filter is active */}
                {selectedFrameworks.includes('activepieces') && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-emerald-400 border-b border-emerald-500/30 pb-1 px-1">Bits</h4>
                    {BITS.map((bit) => {
                      const IconComponent = bit.icon;
                      return (
                        <button
                          key={`bit-${bit.name}`}
                          onClick={() => handleAddNode('bits', bit.name, bit.displayName)}
                          className="w-full text-left px-2 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 rounded transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <IconComponent className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-xs text-emerald-400 truncate">
                                {bit.displayName}
                              </span>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Bits modules */}
                {selectedFrameworks.includes('activepieces') && activepiecesModules.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-purple-400 border-b border-purple-500/30 pb-1 px-1">bits</h4>
                    {activepiecesModules.map((module) => (
                      <button
                        key={`activepieces-${module.name}`}
                        onClick={() => handleAddNode('activepieces', module.name, module.name.replace('piece-', ''))}
                        className="w-full text-left px-2 py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 rounded transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ModuleIcon logoUrl={module.logoUrl} className="w-3.5 h-3.5 text-purple-400 shrink-0" fallbackIcon="Zap" />
                            <span className="text-xs text-purple-400 truncate">
                              {module.displayName || module.name.replace('piece-', '')}
                            </span>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* n8n modules */}
                {selectedFrameworks.includes('n8n') && n8nModules.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-red-400 border-b border-red-500/30 pb-1 px-1">n8n</h4>
                    {n8nModules.map((module) => (
                      <button
                        key={`n8n-${module.name}`}
                        onClick={() => handleAddNode('n8n', module.name, module.name.replace('n8n-nodes-', ''))}
                        className="w-full text-left px-2 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 rounded transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ModuleIcon logoUrl={module.logoUrl} className="w-3.5 h-3.5 text-red-400 shrink-0" fallbackIcon="Activity" />
                            <span className="text-xs text-red-400 truncate">
                              {module.displayName || module.name.replace('n8n-nodes-', '')}
                            </span>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Script modules */}
                {selectedFrameworks.includes('script') && scriptModules.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-cyan-400 border-b border-cyan-500/30 pb-1 px-1">Script</h4>
                    {scriptModules.map((module) => (
                      <button
                        key={`script-${module.name}`}
                        onClick={() => handleAddNode('script', module.name, module.name.replace('script-', ''))}
                        className="w-full text-left px-2 py-2 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 rounded transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ModuleIcon logoUrl={module.logoUrl} className="w-3.5 h-3.5 text-cyan-400 shrink-0" fallbackIcon="Code" />
                            <span className="text-xs text-cyan-400 truncate">
                              {module.displayName || module.name.replace('script-', '')}
                            </span>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {availableModules.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-4">
                    No modules available
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-slate-700 text-xs text-slate-500 flex-shrink-0">
                {availableModules.length} module{availableModules.length !== 1 ? 's' : ''} available
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddModuleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onModuleAdded={handleModuleAdded}
      />

      <CodeViewModal
        isOpen={showCodeViewModal}
        onClose={() => setShowCodeViewModal(false)}
      />

      <OutputsModal
        isOpen={showOutputsModal}
        onClose={() => setShowOutputsModal(false)}
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
  );
}
