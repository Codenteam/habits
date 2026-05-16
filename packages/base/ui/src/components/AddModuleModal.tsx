import { useState, useCallback, useRef } from 'react';
import { X, Plus, AlertCircle, Search, Loader2, Package, Info, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';
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
  keywords: string[];
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
      keywords?: string[];
      links: {
        npm: string;
        repository?: string;
      };
    };
  }>;
}

function isTrustedPackage(name: string, keywords: string[] = []): boolean {
  if (name.startsWith('@ha-bits/')) return true;
  const lower = keywords.map((k) => k.toLowerCase());
  return lower.includes('codenteam') || lower.includes('habits');
}

export default function AddModuleModal({ isOpen, onClose, onModuleAdded }: AddModuleModalProps) {
  const framework = 'bits';
  const [source, setSource] = useState<'github' | 'npm'>('npm');
  const [repository, setRepository] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // NPM search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<NpmPackage[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<NpmPackage | null>(null);

  // Trust confirmation state
  const [showUntrustedConfirm, setShowUntrustedConfirm] = useState<boolean>(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search npm: direct registry lookup for exact/scoped names, text search otherwise
  const searchNpm = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // If the query looks like an exact scoped or exact package name, fetch it directly
      const looksExact = query.startsWith('@') || query.includes('/');
      let packages: NpmPackage[] = [];

      if (looksExact) {
        // Direct registry fetch for scoped packages (much more reliable than search API)
        const directUrl = `https://registry.npmjs.org/${encodeURIComponent(query).replace('%40', '@').replace('%2F', '/')}`;
        const directRes = await fetch(directUrl);
        if (directRes.ok) {
          const pkg = await directRes.json();
          const latest = pkg['dist-tags']?.latest;
          const versionData = latest ? pkg.versions?.[latest] : null;
          packages = [{
            name: pkg.name,
            description: pkg.description || 'No description available',
            version: latest || '?',
            license: versionData?.license || pkg.license || 'Unknown',
            keywords: versionData?.keywords || pkg.keywords || [],
            links: {
              npm: `https://www.npmjs.com/package/${pkg.name}`,
              repository: versionData?.repository?.url,
            },
          }];
        }
        // Also run a text search to catch near-matches and merge results
        const searchRes = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`);
        if (searchRes.ok) {
          const data: NpmSearchResult = await searchRes.json();
          const searched: NpmPackage[] = data.objects.map((obj) => ({
            name: obj.package.name,
            description: obj.package.description || 'No description available',
            version: obj.package.version,
            license: obj.package.license || 'Unknown',
            keywords: obj.package.keywords || [],
            links: obj.package.links,
          }));
          // Merge: direct result first, then search results without duplicates
          const names = new Set(packages.map((p) => p.name));
          packages = [...packages, ...searched.filter((p) => !names.has(p.name))];
        }
      } else {
        const searchUrl = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=15`;
        const response = await fetch(searchUrl);
        const data: NpmSearchResult = await response.json();
        packages = data.objects.map((obj) => ({
          name: obj.package.name,
          description: obj.package.description || 'No description available',
          version: obj.package.version,
          license: obj.package.license || 'Unknown',
          keywords: obj.package.keywords || [],
          links: obj.package.links,
        }));
      }

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

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      searchNpm(query);
    }, 300);
  };

  const handlePackageSelect = (pkg: NpmPackage) => {
    setSelectedPackage(pkg);
    setRepository(pkg.name);
    setSearchQuery(pkg.name);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    // Trust check for npm packages: require @ha-bits prefix or codenteam/habits keyword
    if (source === 'npm') {
      const pkgKeywords = selectedPackage?.keywords ?? [];
      if (!isTrustedPackage(repository.trim(), pkgKeywords) && !showUntrustedConfirm) {
        setShowUntrustedConfirm(true);
        return;
      }
    }

    setIsSubmitting(true);
    setError('');
    setShowUntrustedConfirm(false);

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
    setSource('npm');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPackage(null);
    setShowUntrustedConfirm(false);
    setError('');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const renderBitsNpmSearch = () => (
    <div className="space-y-3">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-700">
            Search npm for bits packages. Trusted packages start with <code className="bg-emerald-100 px-1 rounded">@ha-bits/</code> or are tagged with <code className="bg-emerald-100 px-1 rounded">codenteam</code> or <code className="bg-emerald-100 px-1 rounded">habits</code>.
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
            {searchResults.map((pkg) => {
              const trusted = isTrustedPackage(pkg.name, pkg.keywords);
              return (
                <button
                  key={pkg.name}
                  type="button"
                  onClick={() => handlePackageSelect(pkg)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="font-medium text-gray-900 truncate">{pkg.name}</span>
                        <span className="text-xs text-gray-500">v{pkg.version}</span>
                        {trusted ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Trusted module" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Not a trusted module" />
                        )}
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
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Package Display */}
      {selectedPackage && (() => {
        const trusted = isTrustedPackage(selectedPackage.name, selectedPackage.keywords);
        return (
          <div className={`p-3 border rounded-md ${trusted ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Package className={`w-4 h-4 ${trusted ? 'text-green-600' : 'text-amber-600'}`} />
                  <span className={`font-medium ${trusted ? 'text-green-800' : 'text-amber-800'}`}>{selectedPackage.name}</span>
                  <span className={`text-xs ${trusted ? 'text-green-600' : 'text-amber-600'}`}>v{selectedPackage.version}</span>
                  {trusted ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-500" title="Trusted module" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-500" title="Not a trusted module" />
                  )}
                </div>
                <p className={`mt-1 text-sm ${trusted ? 'text-green-700' : 'text-amber-700'}`}>{selectedPackage.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${trusted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    License: {selectedPackage.license}
                  </span>
                  {selectedPackage.links.npm && (
                    <a
                      href={selectedPackage.links.npm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs flex items-center gap-1 ${trusted ? 'text-green-600 hover:text-green-800' : 'text-amber-600 hover:text-amber-800'}`}
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
                  setShowUntrustedConfirm(false);
                }}
                className={trusted ? 'text-green-600 hover:text-green-800' : 'text-amber-600 hover:text-amber-800'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}

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
          setShowUntrustedConfirm(false);
        }}
        disabled={isSubmitting}
        placeholder="@ha-bits/bit-package-name"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {/* Inline trust hint for manual entry */}
      {repository && !selectedPackage && !isTrustedPackage(repository) && (
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>This package name is not from a trusted source. You will be asked to confirm before adding.</span>
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
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* License Compliance Warning - Always visible */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-700">
                <strong>License Notice:</strong> Please ensure that your use case aligns with the license of the module you are adding.
                Review the license terms before using any third-party package.
              </p>
            </div>
          </div>

          {/* Source selector */}
          <div>
            <label htmlFor="bits-source" className="block text-sm font-medium text-gray-700 mb-2">
              Source
            </label>
            <select
              id="bits-source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value as 'github' | 'npm');
                setShowUntrustedConfirm(false);
              }}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="npm">npm Package</option>
              <option value="github">GitHub Repository</option>
            </select>
          </div>

          {source === 'npm' ? renderBitsNpmSearch() : renderGithubSource()}

          {/* Untrusted module confirmation */}
          {showUntrustedConfirm && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-md space-y-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Untrusted Module</p>
                  <p className="text-sm text-red-700 mt-1">
                    <strong>{repository.trim()}</strong> is not a verified Habits module. It does not start with <code className="bg-red-100 px-1 rounded">@ha-bits/</code> and has no <code className="bg-red-100 px-1 rounded">codenteam</code> or <code className="bg-red-100 px-1 rounded">habits</code> tag.
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    This could be malicious code, an incompatible package, or not a bit at all. Only proceed if you fully trust this source.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <ShieldAlert className="w-4 h-4" />
                  {isSubmitting ? 'Adding...' : 'I understand, add anyway'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUntrustedConfirm(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showUntrustedConfirm && (
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
          )}
        </form>
      </div>
    </div>
  );
}

