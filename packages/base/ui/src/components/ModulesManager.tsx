import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchModules, updateModuleStatus, selectModules, selectModulesFetchStatus } from '../store/slices/modulesSlice';
import { Download, CheckCircle, XCircle, Loader } from 'lucide-react';

interface ModulesManagerProps {
  className?: string;
}

export const ModulesManager: React.FC<ModulesManagerProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const modules = useAppSelector(selectModules);
  const modulesFetchStatus = useAppSelector(selectModulesFetchStatus);

  useEffect(() => {
    // Fetch modules on component mount if not already loading or recently fetched
    if (!modulesFetchStatus.isLoading && !modulesFetchStatus.lastFetched) {
      dispatch(fetchModules());
    }
  }, [dispatch, modulesFetchStatus.isLoading, modulesFetchStatus.lastFetched]);

  const handleRefreshModules = () => {
    dispatch(fetchModules());
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
      case 'not-installed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'loading':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'error':
        return 'Error';
      case 'not-installed':
        return 'Not Installed';
      case 'loading':
        return 'Loading...';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`modules-manager ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Available Modules</h3>
          <button
            onClick={handleRefreshModules}
            disabled={modulesFetchStatus.isLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {modulesFetchStatus.isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin inline mr-1" />
                Loading...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
        
        {modulesFetchStatus.error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-600">Error: {modulesFetchStatus.error}</p>
          </div>
        )}
        
        <div className="max-h-96 overflow-y-auto">
          {Object.keys(modules).length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              {modulesFetchStatus.isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader className="w-6 h-6 animate-spin mr-2" />
                  Loading modules...
                </div>
              ) : (
                <div>
                  <p>No modules found</p>
                  <button
                    onClick={handleRefreshModules}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Try refreshing
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {Object.entries(modules).map(([key, module]) => (
                <div key={key} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {module.displayName || module.name}
                        </h4>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {module.framework}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {module.source}
                      </p>
                      {module.error && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {module.error}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(module.status)}
                        <span className="text-xs text-gray-600">
                          {getStatusText(module.status)}
                        </span>
                      </div>
                      {module.status === 'not-installed' && (
                        <button
                          onClick={() => {
                            dispatch(updateModuleStatus({ moduleKey: key, status: 'loading' }));
                            setTimeout(() => {
                              dispatch(updateModuleStatus({ moduleKey: key, status: 'available' }));
                            }, 2000);
                          }}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          <Download className="w-3 h-3 inline mr-1" />
                          Install
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {modulesFetchStatus.lastFetched && (
          <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
            Last updated: {modulesFetchStatus.lastFetched.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};