import { useState, useCallback } from 'react';
import { X, Plus, AlertCircle, Search, Loader2, Package, Info, Code, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';

interface AddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModuleAdded: () => void;
}

interface NpmPackage {
  name: string;
  description: string;
  version: string;
  license: string;
  links: {
    npm: string;
    repository?: string;
  };
}

interface NpmSearchResult {
  objects: Array<{
    package: {
      name: string;
      description: string;
      version: string;
      license?: string;
      links: {
        npm: string;
        repository?: string;
      };
    };
  }>;
}

const SCRIPT_LANGUAGES = [
  { value: 'typescript', label: 'TypeScript (Deno)' },
  { value: 'python3', label: 'Python 3' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'go', label: 'Go' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
] as const;

export default function AddModuleModal({ isOpen, onClose, onModuleAdded }: AddModuleModalProps) {
  const [framework, setFramework] = useState<string>('bits');
  const [source, setSource] = useState<'github' | 'npm' | 'script'>('npm');
  const [repository, setRepository] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // NPM search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<NpmPackage[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<NpmPackage | null>(null);
  
  // Script state
  const [scriptName, setScriptName] = useState<string>('');
  const [scriptLanguage, setScriptLanguage] = useState<string>('typescript');
  const [scriptContent, setScriptContent] = useState<string>('');

  // Debounced search function
  const searchNpm = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchUrl = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=15`;
      
      const response = await fetch(searchUrl);
      const data: NpmSearchResult = await response.json();
      
      const packages: NpmPackage[] = data.objects.map((obj) => ({
        name: obj.package.name,
        description: obj.package.description || 'No description available',
        version: obj.package.version,
        license: obj.package.license || 'Unknown',
        links: obj.package.links,
      }));
      
      setSearchResults(packages);
    } catch (err) {
      console.error('NPM search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedPackage(null);
    
    // Debounce the search
    const timeoutId = setTimeout(() => {
      searchNpm(query);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const handlePackageSelect = (pkg: NpmPackage) => {
    setSelectedPackage(pkg);
    setRepository(pkg.name);
    setSearchQuery(pkg.name);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Script mode
    if (framework === 'script' && source === 'script') {
      if (!scriptName.trim()) {
        setError('Script name is required');
        return;
      }
      if (!scriptContent.trim()) {
        setError('Script content is required');
        return;
      }

      setIsSubmitting(true);
      setError('');

      try {
        await api.addModule({
          framework: 'script',
          source: 'script',
          repository: scriptName.trim(),
          scriptContent: scriptContent.trim(),
          scriptLanguage,
        });

        // Reset form
        resetForm();
        onModuleAdded();
        onClose();
      } catch (err: any) {
        setError(err.message || err.response?.data?.error || 'Failed to add script');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Regular npm/github mode
    if (!repository.trim()) {
      setError('Repository/Package is required');
      return;
    }

    if (source === 'github' && !repository.includes('github.com') && !repository.includes('gitlab.com') && !repository.includes('bitbucket.org')) {
      setError('Please provide a valid Git repository URL for GitHub source');
      return;
    }

    if (source === 'npm' && !repository.match(/^[@a-z0-9-~][a-z0-9-._~/]*$/)) {
      setError('Please provide a valid npm package name');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.addModule({
        framework,
        source,
        repository: repository.trim(),
      });

      // Reset form
      resetForm();
      onModuleAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || err.response?.data?.error || 'Failed to add module');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRepository('');
    setFramework('bits');
    setSource('npm');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPackage(null);
    setScriptName('');
    setScriptLanguage('typescript');
    setScriptContent('');
    setError('');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleFrameworkChange = (newFramework: string) => {
    setFramework(newFramework);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPackage(null);
    setRepository('');
    
    // Set default source based on framework
    if (newFramework === 'script') {
      setSource('script');
    } else {
      setSource('npm');
    }
  };

  if (!isOpen) return null;

  const renderBitsNpmSearch = () => (
    <div className="space-y-3">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-700">
            Search npm for bits packages. Look for packages starting with <code className="bg-emerald-100 px-1 rounded">bit-</code> or containing "bits" in the name.
          </p>
        </div>
      </div>
      
      <div className="relative">
        <label htmlFor="npm-search" className="block text-sm font-medium text-gray-700 mb-2">
          Search npm for Bits Packages
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            id="npm-search"
            value={searchQuery}
            onChange={handleSearchChange}
            disabled={isSubmitting}
            placeholder="Search for bits packages..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>
        
        {/* Search Results Dropdown */}
        {searchResults.length > 0 && !selectedPackage && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((pkg) => (
              <button
                key={pkg.name}
                type="button"
                onClick={() => handlePackageSelect(pkg)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate">{pkg.name}</span>
                      <span className="text-xs text-gray-500">v{pkg.version}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{pkg.description}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        License: {pkg.license}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Package Display */}
      {selectedPackage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">{selectedPackage.name}</span>
                <span className="text-xs text-green-600">v{selectedPackage.version}</span>
              </div>
              <p className="mt-1 text-sm text-green-700">{selectedPackage.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                  License: {selectedPackage.license}
                </span>
                {selectedPackage.links.npm && (
                  <a
                    href={selectedPackage.links.npm}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on npm
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPackage(null);
                setRepository('');
                setSearchQuery('');
              }}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Manual input fallback */}
      <div className="text-sm text-gray-500 flex items-center gap-1">
        <span>Or enter package name manually:</span>
      </div>
      <input
        type="text"
        value={repository}
        onChange={(e) => {
          setRepository(e.target.value);
          setSelectedPackage(null);
        }}
        disabled={isSubmitting}
        placeholder="bit-package-name"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );

  const renderScriptOptions = () => (
    <div className="space-y-4">
      {/* Source selector for Script */}
      <div>
        <label htmlFor="script-source" className="block text-sm font-medium text-gray-700 mb-2">
          Source Type
        </label>
        <select
          id="script-source"
          value={source}
          onChange={(e) => setSource(e.target.value as 'github' | 'npm' | 'script')}
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="script">Direct Script</option>
          <option value="github">GitHub Repository</option>
          <option value="npm">npm Package</option>
        </select>
      </div>

      {source === 'script' ? (
        <>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
            <div className="flex items-start gap-2">
              <Code className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-purple-700">
                Add a custom script directly. Choose the language and paste your script content below.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="script-name" className="block text-sm font-medium text-gray-700 mb-2">
              Script Name
            </label>
            <input
              type="text"
              id="script-name"
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              disabled={isSubmitting}
              placeholder="my-custom-script"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="script-language" className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              id="script-language"
              value={scriptLanguage}
              onChange={(e) => setScriptLanguage(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SCRIPT_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="script-content" className="block text-sm font-medium text-gray-700 mb-2">
              Script Content
            </label>
            <textarea
              id="script-content"
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              disabled={isSubmitting}
              placeholder={getScriptPlaceholder(scriptLanguage)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
        </>
      ) : source === 'github' ? (
        <div>
          <label htmlFor="github-repo" className="block text-sm font-medium text-gray-700 mb-2">
            Repository URL
          </label>
          <input
            type="url"
            id="github-repo"
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            disabled={isSubmitting}
            placeholder="https://github.com/username/repository.git"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      ) : (
        <div>
          <label htmlFor="npm-package" className="block text-sm font-medium text-gray-700 mb-2">
            npm Package Name
          </label>
          <input
            type="text"
            id="npm-package"
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            disabled={isSubmitting}
            placeholder="package-name or @scope/package-name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}
    </div>
  );

  const renderGithubSource = () => (
    <div>
      <label htmlFor="repository" className="block text-sm font-medium text-gray-700 mb-2">
        Repository URL
      </label>
      <input
        type="url"
        id="repository"
        value={repository}
        onChange={(e) => setRepository(e.target.value)}
        disabled={isSubmitting}
        placeholder="https://github.com/username/repository.git"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add New Module</h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* License Compliance Warning - Always visible */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-700">
                <strong>License Notice:</strong> Please ensure that your use case aligns with the license of the module you are adding. 
                Review the license terms before using any third-party package.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="framework" className="block text-sm font-medium text-gray-700 mb-2">
              Framework
            </label>
            <select
              id="framework"
              value={framework}
              onChange={(e) => handleFrameworkChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="bits">Bits</option>
              <option value="script">Script</option>
            </select>
          </div>

          {/* Framework-specific content */}
          {framework === 'bits' && (
            <>
              <div>
                <label htmlFor="bits-source" className="block text-sm font-medium text-gray-700 mb-2">
                  Source
                </label>
                <select
                  id="bits-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as 'github' | 'npm')}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="npm">npm Package</option>
                  <option value="github">GitHub Repository</option>
                </select>
              </div>
              {source === 'npm' ? renderBitsNpmSearch() : renderGithubSource()}
            </>
          )}

          {framework === 'script' && renderScriptOptions()}

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Adding...' : 'Add Module'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getScriptPlaceholder(language: string): string {
  switch (language) {
    case 'typescript':
      return `// TypeScript (Deno) script
export async function main(param1: string, param2: number) {
  // Your code here
  return { result: param1, value: param2 };
}`;
    case 'python3':
      return `# Python 3 script
def main(param1: str, param2: int):
    # Your code here
    return {"result": param1, "value": param2}`;
    case 'javascript':
      return `// JavaScript script
export async function main(param1, param2) {
  // Your code here
  return { result: param1, value: param2 };
}`;
    case 'go':
      return `// Go script
package main

func main(param1 string, param2 int) map[string]interface{} {
  // Your code here
  return map[string]interface{}{"result": param1, "value": param2}
}`;
    case 'bash':
      return `#!/bin/bash
# Bash script

# Access arguments with $1, $2, etc.
echo "Result: $1"`;
    case 'sql':
      return `-- SQL script
SELECT * FROM table_name
WHERE column = :param1;`;
    default:
      return '// Your code here';
  }
}
