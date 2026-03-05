import { useState, useEffect } from 'react';
import { Activity, Zap, Plus, Code, Settings } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setAvailableModules } from '../store/slices/workflowSlice';
import { api } from '../lib/api';
import { BITS } from '../lib/bits';
import AddModuleModal from './AddModuleModal';
import ModuleIcon from './ModuleIcon';

interface NodePaletteProps {
  onAddNode: (template: { framework: 'n8n' | 'activepieces' | 'script' | 'bits'; module: string; label: string }) => void;
}

export default function NodePalette({ onAddNode }: NodePaletteProps) {
  const dispatch = useAppDispatch();
  const availableModules = useAppSelector(state => state.workflow.availableModules);
  const [selectedFrameworks, setSelectedFrameworks] = useState<('n8n' | 'activepieces' | 'script' | 'bits')[]>(['n8n', 'activepieces', 'script', 'bits']);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  const n8nModules = availableModules.filter((m) => m.framework === 'n8n');
  const activepiecesModules = availableModules.filter((m) => m.framework === 'activepieces');
  const scriptModules = availableModules.filter((m) => m.framework === 'script');

  const toggleFramework = (framework: 'n8n' | 'activepieces' | 'script' | 'bits') => {
    if (selectedFrameworks.includes(framework)) {
      // Don't allow deselecting if it's the only selected framework
      if (selectedFrameworks.length === 1) return;
      setSelectedFrameworks(selectedFrameworks.filter(f => f !== framework));
    } else {
      setSelectedFrameworks([...selectedFrameworks, framework]);
    }
  };

  const handleAddNode = (framework: 'n8n' | 'activepieces' | 'script' | 'bits', module: string, label: string) => {
    onAddNode({
      framework,
      module,
      label,
    });
  };

  const handleModuleAdded = () => {
    loadModules(); // Refresh the modules list
  };

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-semibold text-lg mb-3 text-white">Node Palette</h3>
        
        {/* Framework toggle buttons */}
        <div className="grid grid-cols-3 gap-1 mb-4">
          <button
            onClick={() => toggleFramework('activepieces')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-md transition-colors text-xs ${
              selectedFrameworks.includes('activepieces')
                ? 'bg-purple-600/20 text-purple-400 border-2 border-purple-500/50'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 border-2 border-transparent'
            }`}
          >
            <Zap className="w-4 h-4" />
            bits
          </button>
          <button
            onClick={() => toggleFramework('n8n')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-md transition-colors text-xs ${
              selectedFrameworks.includes('n8n')
                ? 'bg-red-600/20 text-red-400 border-2 border-red-500/50'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 border-2 border-transparent'
            }`}
          >
            <Activity className="w-4 h-4" />
            n8n
          </button>
          <button
            onClick={() => toggleFramework('script')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-md transition-colors text-xs ${
              selectedFrameworks.includes('script')
                ? 'bg-cyan-600/20 text-cyan-400 border-2 border-cyan-500/50'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 border-2 border-transparent'
            }`}
          >
            <Code className="w-4 h-4" />
            Script
          </button>
        </div>
        
        {/* Add Module Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
        >
          <Settings className="w-4 h-4" />
          Add Module
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Bits - Always visible when bits filter is active */}
        {selectedFrameworks.includes('activepieces') && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-emerald-400 border-b border-emerald-500/30 pb-1">Bits</h4>
            {BITS.map((bit) => {
              const IconComponent = bit.icon;
              return (
                <button
                  key={`bit-${bit.name}`}
                  onClick={() => handleAddNode('bits', bit.name, bit.displayName)}
                  className="w-full text-left px-3 py-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 rounded-md transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-emerald-400" />
                        <div className="font-medium text-sm text-emerald-400">
                          {bit.displayName}
                        </div>
                        <span className="px-1.5 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-400">
                          {bit.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {bit.description}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Bits modules */}
        {selectedFrameworks.includes('activepieces') && (
          <div className="space-y-2">
            {activepiecesModules.length > 0 && (
              <h4 className="text-sm font-medium text-purple-400 border-b border-purple-500/30 pb-1">Bits Modules</h4>
            )}
            {activepiecesModules.length === 0 && selectedFrameworks.length === 1 && (
              <div className="text-sm text-slate-500 text-center py-4">
                No bits modules available
              </div>
            )}
            {activepiecesModules.map((module) => (
              <button
                key={`activepieces-${module.name}`}
                onClick={() => handleAddNode('activepieces', module.name, module.name.replace('piece-', ''))}
                className="w-full text-left px-3 py-3 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 rounded-md transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ModuleIcon logoUrl={module.logoUrl} className="w-4 h-4 text-purple-400" fallbackIcon="Zap" />
                      <div className="font-medium text-sm text-purple-400">
                        {module.displayName || module.name.replace('piece-', '')}
                      </div>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        (module as any).source === 'npm' 
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {(module as any).source || 'github'}
                      </span>
                    </div>
                    {module.installed && (
                      <div className="text-xs text-green-400 mt-1">✓ Installed</div>
                    )}
                  </div>
                  <Plus className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* n8n modules */}
        {selectedFrameworks.includes('n8n') && (
          <div className="space-y-2">
            {n8nModules.length > 0 && (
              <h4 className="text-sm font-medium text-red-400 border-b border-red-500/30 pb-1">n8n Modules</h4>
            )}
            {n8nModules.length === 0 && selectedFrameworks.length === 1 && (
              <div className="text-sm text-slate-500 text-center py-4">
                No n8n modules available
              </div>
            )}
            {n8nModules.map((module) => (
              <button
                key={`n8n-${module.name}`}
                onClick={() => handleAddNode('n8n', module.name, module.name.replace('n8n-nodes-', ''))}
                className="w-full text-left px-3 py-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 rounded-md transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ModuleIcon logoUrl={module.logoUrl} className="w-4 h-4 text-red-400" fallbackIcon="Activity" />
                      <div className="font-medium text-sm text-red-400">
                        {module.displayName || module.name.replace('n8n-nodes-', '')}
                      </div>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        (module as any).source === 'npm' 
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {(module as any).source || 'github'}
                      </span>
                    </div>
                    {module.installed && (
                      <div className="text-xs text-green-400 mt-1">✓ Installed</div>
                    )}
                  </div>
                  <Plus className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Script modules */}
        {selectedFrameworks.includes('script') && (
          <div className="space-y-2">
            {scriptModules.length > 0 && (
              <h4 className="text-sm font-medium text-cyan-400 border-b border-cyan-500/30 pb-1">Script Modules</h4>
            )}
            {scriptModules.length === 0 && selectedFrameworks.length === 1 && (
              <div className="text-sm text-slate-500 text-center py-4">
                No script modules available
              </div>
            )}
            {scriptModules.map((module) => (
              <button
                key={`script-${module.name}`}
                onClick={() => handleAddNode('script', module.name, module.name.replace('script-', ''))}
                className="w-full text-left px-3 py-3 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 rounded-md transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ModuleIcon logoUrl={module.logoUrl} className="w-4 h-4 text-cyan-400" fallbackIcon="Code" />
                      <div className="font-medium text-sm text-cyan-400">
                        {module.displayName || module.name.replace('script-', '')}
                      </div>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        (module as any).source === 'npm' 
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {(module as any).source || 'github'}
                      </span>
                    </div>
                    {module.installed && (
                      <div className="text-xs text-green-400 mt-1">✓ Installed</div>
                    )}
                  </div>
                  <Plus className="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Show message when no frameworks selected (shouldn't happen due to minimum check) */}
        {selectedFrameworks.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-4">
            Select at least one framework to view modules
          </div>
        )}
      </div>

      <AddModuleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onModuleAdded={handleModuleAdded}
      />
    </div>
  );
}
