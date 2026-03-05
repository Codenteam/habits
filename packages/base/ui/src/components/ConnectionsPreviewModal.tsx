import { X, Download, Key, FileText, AlertCircle } from 'lucide-react';
import type { ExtractedConnection } from '../lib/workflowConverter';
import { generateEnvContent } from '../lib/workflowConverter';

interface ConnectionsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  workflowName: string;
  connections: ExtractedConnection[];
}

export default function ConnectionsPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  workflowName,
  connections,
}: ConnectionsPreviewModalProps) {
  if (!isOpen) return null;

  // Group connections by node
  const connectionsByNode = new Map<string, ExtractedConnection[]>();
  for (const conn of connections) {
    const existing = connectionsByNode.get(conn.nodeLabel) || [];
    existing.push(conn);
    connectionsByNode.set(conn.nodeLabel, existing);
  }

  const envPreview = generateEnvContent(workflowName, connections);

  const handleDownloadEnvOnly = () => {
    const blob = new Blob([envPreview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '-')}.env`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Connections & Credentials
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No connections found</p>
              <p className="text-sm mt-1">
                This workflow doesn't have any connection references to extract.
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>{connections.length}</strong> connection reference(s) found across{' '}
                  <strong>{connectionsByNode.size}</strong> node(s). These will be exported as
                  environment variables in your <code className="bg-blue-100 px-1 rounded">.env</code> file.
                </p>
              </div>

              {/* Connections by Node */}
              <div className="space-y-4">
                {Array.from(connectionsByNode.entries()).map(([nodeLabel, conns]) => (
                  <div
                    key={nodeLabel}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900">{nodeLabel}</h4>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {conns.map((conn, idx) => (
                        <div key={idx} className="px-4 py-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {conn.paramName}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Original: <code className="bg-gray-100 px-1 rounded">{conn.originalValue}</code>
                              </p>
                            </div>
                            <div className="text-right">
                              <code className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                                {`{{habits.env.${conn.envVarName}}}`}
                              </code>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* .env Preview */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    .env File Preview
                  </h4>
                  <button
                    onClick={handleDownloadEnvOnly}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download .env only
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  {envPreview}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Publish Workflow + .env
          </button>
        </div>
      </div>
    </div>
  );
}
