import { X, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateHabit, type ValidatableHabit } from '../store/validation/habitValidation';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: ValidatableHabit[];
}

// All validation checks with descriptions
const allValidationChecks = [
  { id: 'missing_name', name: 'Habit Name', description: 'Habit should have a meaningful name' },
  { id: 'missing_nodes', name: 'Workflow Nodes', description: 'Habit should contain at least one node' },
  { id: 'missing_output', name: 'Output Mappings', description: 'Habit should define output mappings' },
  { id: 'missing_input_params', name: 'Input Parameters', description: 'Habit should use input parameters ({{habits.input.*}})' },
];

export default function ValidationModal({
  isOpen,
  onClose,
  habits,
}: ValidationModalProps) {
  if (!isOpen) return null;

  // Calculate overall validation status
  const allValidationResults = habits.map(habit => ({
    habit,
    errors: validateHabit(habit),
  }));

  const totalErrors = allValidationResults.reduce((sum, result) => 
    sum + result.errors.filter(e => e.severity === 'error').length, 0
  );
  const totalWarnings = allValidationResults.reduce((sum, result) => 
    sum + result.errors.filter(e => e.severity === 'warning').length, 0
  );
  const worstSeverity = totalErrors > 0 ? 'error' : totalWarnings > 0 ? 'warning' : 'none';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            {worstSeverity === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : worstSeverity === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            )}
            Habit Validation Results
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {habits.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              No habits found
            </div>
          ) : (
            <div className="space-y-6">
              {allValidationResults.map(({ habit, errors }) => {
                const habitHasErrors = errors.some(e => e.severity === 'error');
                const habitHasWarnings = errors.some(e => e.severity === 'warning');
                const habitSeverity = habitHasErrors ? 'error' : habitHasWarnings ? 'warning' : 'none';
                
                return (
                  <div key={habit.id} className="border border-slate-700 rounded-lg overflow-hidden">
                    {/* Habit Header */}
                    <div className={`flex items-center justify-between p-3 ${
                      habitSeverity === 'error'
                        ? 'bg-red-900/20 border-b border-red-700/50'
                        : habitSeverity === 'warning'
                        ? 'bg-yellow-900/20 border-b border-yellow-700/50'
                        : 'bg-green-900/10 border-b border-green-700/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        {habitSeverity === 'error' ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : habitSeverity === 'warning' ? (
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        )}
                        <span className="font-medium text-white">{habit.name}</span>
                        <span className="text-xs text-slate-500">({habit.id})</span>
                      </div>
                      <div className="text-xs">
                        {errors.length === 0 ? (
                          <span className="text-green-400">All passed</span>
                        ) : (
                          <span className={habitSeverity === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                            {errors.filter(e => e.severity === 'error').length > 0 && `${errors.filter(e => e.severity === 'error').length} error(s)`}
                            {errors.filter(e => e.severity === 'error').length > 0 && errors.filter(e => e.severity === 'warning').length > 0 && ', '}
                            {errors.filter(e => e.severity === 'warning').length > 0 && `${errors.filter(e => e.severity === 'warning').length} warning(s)`}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Validation Checks */}
                    <div className="p-3 bg-slate-900/30 space-y-2">
                      {allValidationChecks.map((check) => {
                        const error = errors.find(e => e.errorType === check.id);
                        const passed = !error;
                        
                        return (
                          <div
                            key={check.id}
                            className={`flex items-start gap-2 p-2 rounded text-xs ${
                              passed
                                ? 'bg-green-900/10'
                                : error.severity === 'error'
                                ? 'bg-red-900/20'
                                : 'bg-yellow-900/20'
                            }`}
                          >
                            {passed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                            ) : error.severity === 'error' ? (
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">{check.name}</span>
                                {!passed && (
                                  <span
                                    className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded ${
                                      error.severity === 'error'
                                        ? 'bg-red-900/50 text-red-300'
                                        : 'bg-yellow-900/50 text-yellow-300'
                                    }`}
                                  >
                                    {error.severity}
                                  </span>
                                )}
                              </div>
                              <p
                                className={`mt-0.5 ${
                                  passed
                                    ? 'text-green-300/50'
                                    : error.severity === 'error'
                                    ? 'text-red-200/90'
                                    : 'text-yellow-200/90'
                                }`}
                              >
                                {passed ? check.description : error.message}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="text-xs text-slate-400">
            {habits.length === 0
              ? 'No habits found'
              : worstSeverity === 'none'
              ? `All ${habits.length} habit(s) passed all validations`
              : `${habits.length} habit(s) checked: ${totalErrors} error(s), ${totalWarnings} warning(s)`}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
