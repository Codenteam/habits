import React from 'react';
import { useAppSelector } from '../store/hooks';
import { selectSelectedNodeFormState, selectNodeConfig } from '../store/slices/workflowSlice';
import { Bug } from 'lucide-react';

interface DebugPanelProps {
  showDebug?: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ showDebug = false }) => {
  const formState = useAppSelector(selectSelectedNodeFormState);
  const nodeConfig = useAppSelector(selectNodeConfig);

  const schema = formState?.schema;
  const selectedAction = formState?.selectedAction;
  const loadingSchema = formState?.loadingSchema ?? false;
  const formValues = formState?.formValues ?? {};

  // Get module info from node config if available
  const currentModule = nodeConfig?.module;
  const selectedPiece = currentModule; // Use module as piece name

  if (!showDebug) return null;

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
      <div className="flex items-center gap-2 mb-3">
        <Bug className="w-4 h-4 text-gray-600" />
        <h4 className="text-sm font-semibold text-gray-700">Debug Information</h4>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="grid grid-cols-2 gap-2">
          <div className="font-medium">Schema loaded:</div>
          <div className={schema ? 'text-green-600' : 'text-red-600'}>
            {schema ? 'Yes' : 'No'}
          </div>

          <div className="font-medium">Loading schema:</div>
          <div className={loadingSchema ? 'text-yellow-600' : 'text-gray-600'}>
            {loadingSchema ? 'Yes' : 'No'}
          </div>

          <div className="font-medium">Has actions:</div>
          <div className={schema?.actions ? 'text-green-600' : 'text-red-600'}>
            {schema?.actions ? 'Yes' : 'No'}
          </div>

          <div className="font-medium">Actions count:</div>
          <div>{schema?.actions ? Object.keys(schema.actions).length : 0}</div>

          <div className="font-medium">Current module:</div>
          <div>{currentModule || 'None'}</div>

          <div className="font-medium">Selected piece:</div>
          <div>{selectedPiece || 'None'}</div>

          <div className="font-medium">Selected action:</div>
          <div>{selectedAction || 'None'}</div>

          <div className="font-medium">Form values:</div>
          <div>{Object.keys(formValues).length} fields</div>
        </div>

        {schema && (
          <details className="mt-3">
            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              Schema Details
            </summary>
            <pre className="mt-2 p-2 bg-white border border-gray-200 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(schema, null, 2)}
            </pre>
          </details>
        )}

        {Object.keys(formValues).length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              Form Values
            </summary>
            <pre className="mt-2 p-2 bg-white border border-gray-200 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(formValues, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};
