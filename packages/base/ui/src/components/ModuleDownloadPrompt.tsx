import { useState } from 'react';
import { Download, Github, Package, AlertCircle, Loader } from 'lucide-react';
import { api } from '../lib/api';

interface ModuleDownloadPromptProps {
  framework: string;
  moduleName: string;
  onModuleInstalled: () => void;
  onClose: () => void;
}



export default function ModuleDownloadPrompt({ 
  framework, 
  moduleName, 
  onModuleInstalled, 
  onClose 
}: ModuleDownloadPromptProps) {
  const [selectedSource, setSelectedSource] = useState<'npm' | 'github'>('npm');
  const [githubRepo, setGithubRepo] = useState<string>('');
  const [npmRepository, setNpmRepository] = useState<string>(moduleName);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleInstall = async () => {
    setIsInstalling(true);
    setError('');

    try {
      if (selectedSource === 'npm' && npmRepository.trim()) {
        // Add and install npm module
        await api.addModule({
          framework,
          source: 'npm',
          repository: npmRepository.trim(),
        });
      } else if (selectedSource === 'github' && githubRepo) {
        // Add and install GitHub module
        await api.addModule({
          framework,
          source: 'github',
          repository: githubRepo,
        });
      }

      // Install the module
      await api.installModule(framework, moduleName);
      
      onModuleInstalled();
    } catch (err: any) {
      setError(err.message || err.response?.data?.error || 'Failed to install module');
    } finally {
      setIsInstalling(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Module Not Found</h3>
              <p className="text-sm text-gray-600">
                Module "{moduleName}" is not available locally for {framework}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Source selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Choose installation source:</label>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedSource('npm')}
                className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                  selectedSource === 'npm'
                    ? 'border-orange-300 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="font-medium">npm Package</span>
              </button>
              
              <button
                onClick={() => setSelectedSource('github')}
                className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                  selectedSource === 'github'
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Github className="w-4 h-4" />
                <span className="font-medium">GitHub Repo</span>
              </button>
            </div>
          </div>

          {/* npm source */}
          {selectedSource === 'npm' && (
            <div className="space-y-3">
              <label htmlFor="npmRepository" className="block text-sm font-medium text-gray-700">
                npm Package Name
              </label>
              <input
                type="text"
                id="npmRepository"
                value={npmRepository}
                onChange={(e) => setNpmRepository(e.target.value)}
                placeholder={`package-name or @scope/package-name`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500">
                Enter the exact npm package name (e.g., "bit-custom" or "@my-org/bit-custom")
              </p>
            </div>
          )}

          {/* GitHub source */}
          {selectedSource === 'github' && (
            <div className="space-y-3">
              <label htmlFor="githubRepo" className="block text-sm font-medium text-gray-700">
                GitHub Repository URL
              </label>
              <input
                type="url"
                id="githubRepo"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder={`https://github.com/username/${moduleName}.git`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleInstall}
              disabled={
                isInstalling || 
                (selectedSource === 'npm' && !npmRepository.trim()) ||
                (selectedSource === 'github' && !githubRepo.trim())
              }
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {isInstalling ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isInstalling ? 'Installing...' : 'Install & Configure'}
            </button>
            <button
              onClick={onClose}
              // disabled={isInstalling}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}