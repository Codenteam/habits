import { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Loader2, 
  AlertTriangle, 
  FileCode, 
  Monitor, 
  Smartphone, 
  Download,
  CheckCircle2,
  Info,
  ExternalLink,
  Globe,
  ArchiveIcon,
  ImageIcon,
  Upload,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import JSZip from 'jszip';
import { ExportBundle } from '@ha-bits/core';

// Types
type PackFormat = 'full-stack' | 'desktop' | 'mobile';
type FullStackOption = 'export' | 'docker' | 'executable';
type SeaPlatform = 'darwin-arm64' | 'darwin-x64' | 'linux-x64' | 'win32-x64' | 'current';
type DesktopPlatform = 'dmg' | 'exe' | 'appimage' | 'deb' | 'rpm' | 'msi' | 'all';
type DesktopFramework = 'electron' | 'tauri';
type MobileTarget = 'ios' | 'android' | 'both';
type MobileFramework = 'capacitor' | 'cordova' | 'tauri';
type AppMode = 'client' | 'full';

interface PackCapabilities {
  singleExecutable: boolean;
  desktop: boolean;
  mobile: boolean;
  nodeVersion: string;
  currentPlatform: string;
  desktopPlatforms: DesktopPlatform[];
  mobilePlatforms: MobileTarget[];
  seaPlatforms: SeaPlatform[];
  desktopDependencies?: {
    electron: boolean;
    electronBuilder: boolean;
  };
  mobileDependencies?: {
    cordova: boolean;
    ios: boolean;
    android: boolean;
  };
  // Desktop build tool versions
  electronVersion?: string;
  electronBuilderVersion?: string;
  // Tauri build tool versions
  tauriVersion?: string;
  cargoVersion?: string;
  rustcVersion?: string;
  // Mobile build tool versions
  gradleVersion?: string;
  javaVersion?: string;
  cordovaVersion?: string;
  androidSdkVersion?: string;
  xcodeVersion?: string;
  xcodebuildVersion?: string;
  // Android environment variables
  androidHome?: string;
  androidSdkRoot?: string;
  // Gradle-Java compatibility
  compatibility?: {
    compatible: boolean;
    javaVersion: number;
    gradleVersion: string;
    minJava?: number;
    maxJava?: number;
    recommended?: number;
    message: string;
  };
}
// End of PackCapabilities interface

interface HabitData {
  id: string;
  name: string;
  nodes: any[];
  edges?: any[];
}

interface ServerConfig {
  port: number;
  openapi?: boolean;
  webhookTimeout?: number;
}

interface BinaryExportTabProps {
  habits: HabitData[];
  serverConfig: ServerConfig;
  envContent: string;
  frontendHtml?: string;
  exportBundle: ExportBundle;
  stackName?: string;
}

// Platform display info - using devicon classes
const SEA_PLATFORM_INFO: Record<string, { name: string; iconClass: string; description: string }> = {
  'darwin-arm64': { name: 'macOS (Apple Silicon)', iconClass: 'devicon-apple-original', description: 'M1/M2/M3 Macs' },
  'darwin-x64': { name: 'macOS (Intel)', iconClass: 'devicon-apple-original', description: 'Intel-based Macs' },
  'linux-x64': { name: 'Linux (x64)', iconClass: 'devicon-linux-plain', description: 'Most Linux distributions' },
  'win32-x64': { name: 'Windows (x64)', iconClass: 'devicon-windows11-original', description: '64-bit Windows' },
  'current': { name: 'Current Platform', iconClass: 'devicon-nodejs-plain', description: 'Your current system' },
};

const DESKTOP_PLATFORM_INFO: Record<DesktopPlatform, { name: string; iconClass: string; description: string; os: string }> = {
  'dmg': { name: 'DMG', iconClass: 'devicon-apple-original', description: 'macOS Disk Image', os: 'macOS' },
  'exe': { name: 'EXE', iconClass: 'devicon-windows11-original', description: 'Windows Installer', os: 'Windows' },
  'msi': { name: 'MSI', iconClass: 'devicon-windows11-original', description: 'Windows MSI Package', os: 'Windows' },
  'appimage': { name: 'AppImage', iconClass: 'devicon-linux-plain', description: 'Portable Linux App', os: 'Linux' },
  'deb': { name: 'DEB', iconClass: 'devicon-debian-plain', description: 'Debian/Ubuntu Package', os: 'Linux' },
  'rpm': { name: 'RPM', iconClass: 'devicon-redhat-plain', description: 'Red Hat/Fedora Package', os: 'Linux' },
  'all': { name: 'All Platforms', iconClass: 'devicon-electron-original', description: 'Build for all platforms', os: 'All' },
};

const MOBILE_TARGET_INFO: Record<MobileTarget, { name: string; iconClass: string; description: string; requirements: string }> = {
  'ios': { name: 'iOS App', iconClass: 'devicon-apple-original', description: 'iPhone & iPad', requirements: 'Requires macOS with Xcode' },
  'android': { name: 'Android App', iconClass: 'devicon-android-plain', description: 'Android Devices', requirements: 'Requires Android SDK' },
  'both': { name: 'Both Platforms', iconClass: 'devicon-devicon-plain', description: 'iOS & Android', requirements: 'Requires both Xcode & Android SDK' },
};

const MOBILE_FRAMEWORK_INFO: Record<MobileFramework, { name: string; iconClass: string; description: string; deprecated?: boolean; experimental?: boolean }> = {
  'tauri': { name: 'Tauri', iconClass: 'devicon-rust-plain', description: 'Rust-based framework with desktop & mobile support', experimental: true },
  'capacitor': { name: 'Capacitor', iconClass: 'devicon-ionic-original', description: 'Modern framework by Ionic', deprecated: true },
  'cordova': { name: 'Cordova', iconClass: 'devicon-apache-plain', description: 'Legacy Apache Cordova framework', deprecated: true },
};

const DESKTOP_FRAMEWORK_INFO: Record<DesktopFramework, { name: string; iconClass: string; description: string; deprecated?: boolean; experimental?: boolean }> = {
  'tauri': { name: 'Tauri', iconClass: 'devicon-rust-plain', description: 'Rust-based, smaller & faster', experimental: true },
  'electron': { name: 'Electron', iconClass: 'devicon-electron-original', description: 'Chromium-based, larger bundles', deprecated: true },
};

export default function BinaryExportTab({ habits, serverConfig, envContent, frontendHtml, exportBundle, stackName }: BinaryExportTabProps) {
  // Helper to sanitize stack name for use in filenames
  const sanitizeStackName = (name: string | undefined): string => {
    if (!name || name.trim() === '' || name === 'Stack Name') {
      // TODO: This is the default, think of something better lol. 
      // Human needs to handle this. 
      return 'Stack Name';
    }
    // Convert to lowercase, replace spaces and special chars with hyphens
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  const sanitizedStackName = sanitizeStackName(stackName);

  // Tab state
  const [activeFormat, setActiveFormat] = useState<PackFormat>('full-stack');
  const [activeFullStackOption, setActiveFullStackOption] = useState<FullStackOption>('export');
  
  // Capabilities state
  const [capabilities, setCapabilities] = useState<PackCapabilities | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null);
  
  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  
  // Selection state
  const [selectedSeaPlatform, setSelectedSeaPlatform] = useState<SeaPlatform>('current');
  const [selectedDesktopPlatform, setSelectedDesktopPlatform] = useState<DesktopPlatform>('dmg');
  const [selectedDesktopFramework, setSelectedDesktopFramework] = useState<DesktopFramework>('tauri');
  const [selectedMobileTarget, setSelectedMobileTarget] = useState<MobileTarget>('both');
  const [selectedMobileFramework, setSelectedMobileFramework] = useState<MobileFramework>('tauri');
  const [backendUrl, setBackendUrl] = useState('');
  const [desktopMode, setDesktopMode] = useState<AppMode>('client');
  const [mobileMode, setMobileMode] = useState<AppMode>('client');
  const [buildDesktopBinary, setBuildDesktopBinary] = useState(true);
  const [buildMobileBinary, setBuildMobileBinary] = useState(true);
  
  // App customization state
  const [appName, setAppName] = useState(stackName || 'Habits App');
  const [appIcon, setAppIcon] = useState<string | null>(null); // base64 encoded image
  const [appIconPreview, setAppIconPreview] = useState<string | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // Handle icon file selection
  const handleIconSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setGenerationError('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setGenerationError('Icon image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      
      // Validate that image is square
      const img = new Image();
      img.onload = () => {
        if (img.width !== img.height) {
          setGenerationError(`Icon must be square. Selected image is ${img.width}×${img.height}. Please use a square image (e.g., 512×512).`);
          if (iconInputRef.current) {
            iconInputRef.current.value = '';
          }
          return;
        }
        
        // Image is square, proceed
        setAppIcon(base64);
        setAppIconPreview(base64);
        setGenerationError(null);
      };
      img.onerror = () => {
        setGenerationError('Failed to load image');
        if (iconInputRef.current) {
          iconInputRef.current.value = '';
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveIcon = () => {
    setAppIcon(null);
    setAppIconPreview(null);
    if (iconInputRef.current) {
      iconInputRef.current.value = '';
    }
  };

  // Fetch capabilities on mount
  useEffect(() => {
    fetchCapabilities();
  }, []);

  const fetchCapabilities = async () => {
    if (capabilitiesLoading) return;
    setCapabilitiesLoading(true);
    setCapabilitiesError(null);

    try {
      const support = await api.checkBinarySupport();
      
      // Construct full capabilities from binary support
      const caps: PackCapabilities = {
        singleExecutable: support.supported,
        desktop: true, // Always available (just needs dependencies)
        mobile: true, // Always available (just needs dependencies)
        nodeVersion: support.version,
        currentPlatform: support.currentPlatform,
        seaPlatforms: support.supportedPlatforms as SeaPlatform[],
        desktopPlatforms: ['dmg', 'exe', 'appimage', 'deb', 'rpm', 'msi', 'all'],
        mobilePlatforms: ['ios', 'android', 'both'],
        // Desktop tool versions from support response
        electronVersion: support.desktop?.electronVersion || undefined,
        electronBuilderVersion: support.desktop?.electronBuilderVersion || undefined,
        // Mobile tool versions from support response
        gradleVersion: support.mobile?.gradleVersion || undefined,
        javaVersion: support.mobile?.javaVersion || undefined,
        cordovaVersion: support.mobile?.cordovaVersion || undefined,
        androidSdkVersion: support.mobile?.androidSdkVersion || undefined,
        xcodeVersion: support.mobile?.xcodeVersion || undefined,
        xcodebuildVersion: support.mobile?.xcodebuildVersion || undefined,
        androidHome: support.mobile?.androidHome || undefined,
        androidSdkRoot: support.mobile?.androidSdkRoot || undefined,
        compatibility: support.mobile?.compatibility || undefined,
        // Tauri tool versions from support response
        tauriVersion: support.desktop?.tauriVersion || undefined,
        cargoVersion: support.desktop?.cargoVersion || undefined,
        rustcVersion: support.desktop?.rustcVersion || undefined,
      };
      
      setCapabilities(caps);
    } catch (error: any) {
      setCapabilitiesError(error.message || 'Failed to check pack capabilities');
    } finally {
      setCapabilitiesLoading(false);
    }
  };

  const handleGenerateSingleExecutable = async () => {
    if (generating || habits.length === 0) return;
    
    setGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      const blob = await api.exportBinary({
        habits: habits.map(h => ({
          name: h.name,
          nodes: h.nodes,
          edges: h.edges,
        })),
        serverConfig: {
          port: serverConfig.port,
          openapi: serverConfig.openapi,
          webhookTimeout: serverConfig.webhookTimeout,
        },
        envContent,
        frontendHtml,
        platform: selectedSeaPlatform,
      });

      // Download the binary
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedSeaPlatform.startsWith('win') ? `${sanitizedStackName}.exe` : sanitizedStackName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setGenerationSuccess('Binary generated and downloaded successfully!');
    } catch (error: any) {
      setGenerationError(error.response?.data?.error || error.message || 'Failed to generate binary');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateDocker = async () => {
    if (generating || habits.length === 0) return;
    
    setGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      const blob = await api.exportDocker({
        habits: habits.map(h => ({
          name: h.name,
          nodes: h.nodes,
          edges: h.edges,
        })),
        serverConfig: {
          port: serverConfig.port,
          openapi: serverConfig.openapi,
          webhookTimeout: serverConfig.webhookTimeout,
        },
        envContent,
        frontendHtml,
        stackYaml: exportBundle.stackYaml,
        habitFiles: exportBundle.habitFiles,
        stackName,
      });

      // Download the Docker package
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizedStackName}.docker.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setGenerationSuccess('Docker package generated and downloaded successfully!');
    } catch (error: any) {
      setGenerationError(error.response?.data?.error || error.message || 'Failed to generate Docker package');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateDesktop = async () => {
    if (generating || habits.length === 0 || !backendUrl) return;
    
    setGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      const response = await fetch('/habits/base/api/export/pack/desktop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habits: habits.map(h => ({
            name: h.name,
            nodes: h.nodes,
            edges: h.edges,
          })),
          serverConfig,
          frontendHtml,
          backendUrl,
          desktopPlatform: selectedDesktopPlatform,
          framework: selectedDesktopFramework,
          buildBinary: buildDesktopBinary,
          stackName,
          appName: appName || 'Habits App',
          appIcon: appIcon || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate desktop app');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set appropriate filename based on whether it's a binary or project files
      if (buildDesktopBinary) {
        // Binary build - use platform-specific extension
        const fileExtensions: Record<DesktopPlatform, string> = {
          dmg: '.dmg',
          exe: '.exe',
          msi: '.msi',
          appimage: '.AppImage',
          deb: '.deb',
          rpm: '.rpm',
          all: '.zip',
        };
        a.download = `${sanitizedStackName}.desktop${fileExtensions[selectedDesktopPlatform] || '.zip'}`;
      } else {
        // Project files - always zip
        a.download = `${sanitizedStackName}.desktop.zip`;
      }
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setGenerationSuccess('Desktop app generated and downloaded successfully!');
    } catch (error: any) {
      setGenerationError(error.message || 'Failed to generate desktop app');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMobile = async () => {
    if (generating || habits.length === 0 || !backendUrl) return;
    
    setGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      const response = await fetch('/habits/base/api/export/pack/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habits: habits.map(h => ({
            name: h.name,
            nodes: h.nodes,
            edges: h.edges,
          })),
          serverConfig,
          frontendHtml,
          backendUrl,
          mobileTarget: selectedMobileTarget,
          buildBinary: buildMobileBinary,
          framework: selectedMobileFramework,
          stackName,
          appName: appName || 'Habits App',
          appIcon: appIcon || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate mobile app');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Set appropriate filename based on whether it's a binary or project files
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('vnd.android.package-archive')) {
        a.download = `${sanitizedStackName}.apk`;
      } else {
        a.download = `${sanitizedStackName}.mobile-${selectedMobileFramework}-${selectedMobileTarget}.zip`;
      }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setGenerationSuccess('Mobile app generated and downloaded successfully!');
    } catch (error: any) {
      setGenerationError(error.message || 'Failed to generate mobile app');
    } finally {
      setGenerating(false);
    }
  };



  const handleDownloadZip = async () => {
    const zip = new JSZip();
    
    // Add stack.yaml
    zip.file('stack.yaml', exportBundle.stackYaml);
    
    // Add habit files
    for (const habit of exportBundle.habitFiles) {
      zip.file(habit.filename, habit.content);
    }
    
    // Add .env
    zip.file('.env', envContent);
    
    // Add frontend if exists
    if (exportBundle.frontendHtml) {
      zip.file('frontend/index.html', exportBundle.frontendHtml);
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedStackName}.stack.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const hasFrontend = !!frontendHtml;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400" />
            Pack & Distribute
          </h4>
          <p className="text-xs text-slate-400">
            Package your habits as standalone applications: server binaries, desktop apps, or mobile apps.
          </p>
        </div>

        {/* Format Tabs */}
        <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => setActiveFormat('full-stack')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeFormat === 'full-stack'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Full-Stack</span>
          </button>
          <button
            onClick={() => setActiveFormat('desktop')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeFormat === 'desktop'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <div className="flex flex-col items-center">
              <span>Desktop</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-amber-600/40 text-amber-200 rounded mt-0.5 uppercase font-semibold">Experimental</span>
            </div>
          </button>
          <button
            onClick={() => setActiveFormat('mobile')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeFormat === 'mobile'
                ? 'bg-green-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <div className="flex flex-col items-center">
              <span>Mobile</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-amber-600/40 text-amber-200 rounded mt-0.5 uppercase font-semibold">Experimental</span>
            </div>
          </button>
        </div>

        {/* Loading State */}
        {capabilitiesLoading && (
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <span className="text-sm text-slate-300">Checking pack capabilities...</span>
          </div>
        )}

        {/* Error State */}
        {capabilitiesError && !capabilitiesLoading && (
          <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-700/50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-yellow-300 mb-1">Unable to Check Capabilities</h5>
                <p className="text-xs text-yellow-200/80">{capabilitiesError}</p>
                <button
                  onClick={fetchCapabilities}
                  className="mt-2 text-xs text-yellow-300 hover:text-yellow-200 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full-Stack Section */}
        {activeFormat === 'full-stack' && capabilities && (
          <div className="space-y-4">
            {/* Sub-option Selector */}
            <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setActiveFullStackOption('export')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFullStackOption === 'export'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                <ArchiveIcon className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => setActiveFullStackOption('docker')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFullStackOption === 'docker'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Package className="w-4 h-4" />
                <div className="flex flex-col items-center">
                  <span>Docker</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-600/40 text-amber-200 rounded mt-0.5 uppercase font-semibold">Experimental</span>
                </div>
              </button>
              <button
                onClick={() => setActiveFullStackOption('executable')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFullStackOption === 'executable'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <div className="flex flex-col items-center">
                  <span>Executable</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-600/40 text-amber-200 rounded mt-0.5 uppercase font-semibold">Experimental</span>
                </div>
              </button>
            </div>

            {/* Export Option Content */}
            {activeFullStackOption === 'export' && (
              <>
                {/* Habits Summary */}
                <div className="p-4 bg-emerald-900/30 rounded-lg border border-emerald-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-300">
                      {habits.length} Habit{habits.length !== 1 ? 's' : ''} to Export
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {habits.map(habit => (
                      <span 
                        key={habit.id} 
                        className="px-2 py-1 bg-emerald-800/50 text-emerald-200 text-xs rounded-full"
                      >
                        {habit.name} ({habit.nodes.length} nodes)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Download All as ZIP */}
                <button
                  onClick={handleDownloadZip}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  <ArchiveIcon className="w-5 h-5" />
                  Download All as ZIP ({habits.length} habit{habits.length !== 1 ? 's' : ''})
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Downloads habits/, stack.yaml, .env{hasFrontend ? ', and frontend/index.html' : ''} in a compressed archive
                </p>
              </>
            )}

            {/* Docker Option Content */}
            {activeFullStackOption === 'docker' && (
              <>
                {/* Experimental Warning */}
                <div className="p-3 bg-amber-900/30 rounded-lg border border-amber-700/50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-semibold text-amber-300 mb-1 uppercase">⚠️ Experimental Feature</h5>
                      <p className="text-xs text-amber-200/90">
                        Docker export is currently in experimental stage. Some features may not work as expected. Please report any issues you encounter.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    Docker Compose Package
                  </h5>
                  <p className="text-xs text-slate-400 mb-3">
                    Generate a complete Docker Compose package that runs your habits using node:20-alpine. 
                    Runs <code className="px-1 py-0.5 bg-slate-800 rounded text-xs">npx @ha-bits/cortex server --config stack.yaml</code>
                  </p>
                  <ul className="text-xs text-slate-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      Containerized deployment - Consistent runtime environment
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      Volume bindings - Easy development and configuration updates
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      Production ready - Includes README with deployment instructions
                    </li>
                  </ul>
                </div>

                {/* Package Contents */}
                <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">Package Contents</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1">
                    <li>• <span className="font-mono">docker-compose.yml</span> - Uses node:20-alpine with volume bindings</li>
                    <li>• <span className="font-mono">stack.yaml</span> - Your habits workflow</li>
                    <li>• <span className="font-mono">habits/</span> - Habit definition files ({habits.length} file{habits.length !== 1 ? 's' : ''})</li>
                    <li>• <span className="font-mono">.env</span> - Environment variables</li>
                    {hasFrontend && <li>• <span className="font-mono">frontend/</span> - Frontend HTML</li>}
                    <li>• <span className="font-mono">README.md</span> - Usage instructions</li>
                  </ul>
                </div>

                {/* Habits Summary */}
                <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">
                      {habits.length} Habit{habits.length !== 1 ? 's' : ''} to Package
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {habits.map(habit => (
                      <span 
                        key={habit.id} 
                        className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-full"
                      >
                        {habit.name} ({habit.nodes.length} nodes)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateDocker}
                  disabled={generating || habits.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Docker Package...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Generate Docker Package
                    </>
                  )}
                </button>
                {(generating || habits.length === 0) && (
                  <p className="text-xs text-amber-400 text-center">
                    {generating && 'Generation in progress...'}
                    {!generating && habits.length === 0 && 'Cannot generate: No habits to package'}
                  </p>
                )}
                {!generating && habits.length > 0 && (
                  <p className="text-xs text-slate-500 text-center">
                    Package size: ~1-5MB • Includes docker-compose.yml and README
                  </p>
                )}
              </>
            )}

            {/* Executable Option Content */}
            {activeFullStackOption === 'executable' && (
              <>
                {/* Experimental Warning */}
                <div className="p-3 bg-amber-900/30 rounded-lg border border-amber-700/50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-semibold text-amber-300 mb-1 uppercase">⚠️ Experimental Feature</h5>
                      <p className="text-xs text-amber-200/90">
                        Single executable generation is currently in experimental stage. Some features may not work as expected. Please report any issues you encounter.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400" />
                    What is a Single Executable?
                  </h5>
                  <p className="text-xs text-slate-400 mb-3">
                    A standalone binary that bundles your habits, configuration, and the Node.js runtime. 
                    Runs without Node.js installation required.
                  </p>
                  <ul className="text-xs text-slate-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      Embedded configuration - All habits, stack.yaml, and .env bundled
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      Environment override - Place .env beside binary to override settings
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      Cross-platform - macOS, Linux, and Windows supported
                    </li>
                  </ul>
                </div>

                {/* Support Status */}
                {!capabilities.singleExecutable ? (
                  <div className="p-4 bg-red-900/30 rounded-lg border border-red-700/50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium text-red-300 mb-1">Node.js SEA Not Supported</h5>
                        <p className="text-xs text-red-200/80 mb-2">
                          Node.js 20+ is required for Single Executable Application support.
                        </p>
                        <p className="text-xs text-slate-400">
                          Current version: {capabilities.nodeVersion}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-green-900/30 rounded-lg border border-green-700/50">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium text-green-300 mb-1">Ready to Generate</h5>
                        <p className="text-xs text-green-200/80">
                          Node.js {capabilities.nodeVersion} • Current platform: {capabilities.currentPlatform}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Platform Selection */}
                {capabilities.singleExecutable && (
                  <div className="space-y-4 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-3 block">
                        Target Platform
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {capabilities.seaPlatforms.map((platform) => {
                          const info = SEA_PLATFORM_INFO[platform] || { name: platform, iconClass: 'devicon-nodejs-plain', description: '' };
                          const isSelected = selectedSeaPlatform === platform;
                          return (
                            <button
                              key={platform}
                              onClick={() => setSelectedSeaPlatform(platform)}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                                isSelected
                                  ? 'bg-purple-600/20 border-purple-500'
                                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                              }`}
                            >
                              <i className={`${info.iconClass} text-xl ${isSelected ? 'text-purple-300' : 'text-slate-400'}`}></i>
                              <div>
                                <span className={`text-sm font-medium ${isSelected ? 'text-purple-300' : 'text-slate-300'}`}>
                                  {info.name}
                                </span>
                                <p className="text-xs text-slate-500">{info.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Habits Summary */}
                <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">
                      {habits.length} Habit{habits.length !== 1 ? 's' : ''} to Bundle
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {habits.map(habit => (
                      <span 
                        key={habit.id} 
                        className="px-2 py-1 bg-purple-800/50 text-purple-200 text-xs rounded-full"
                      >
                        {habit.name} ({habit.nodes.length} nodes)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                {capabilities.singleExecutable && (
                  <>
                    <button
                      onClick={handleGenerateSingleExecutable}
                      disabled={generating || habits.length === 0}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating Binary...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Generate Standalone Binary
                        </>
                      )}
                    </button>
                    {(generating || habits.length === 0) && (
                      <p className="text-xs text-amber-400 text-center">
                        {generating && 'Generation in progress...'}
                        {!generating && habits.length === 0 && 'Cannot generate: No habits to bundle'}
                      </p>
                    )}
                    {!generating && habits.length > 0 && (
                      <p className="text-xs text-slate-500 text-center">
                        This may take 30-60 seconds. Binary size: ~80-100MB
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}


        {/* Desktop Section */}
        {activeFormat === 'desktop' && capabilities && (
          <div className="space-y-4">
            {/* Experimental Warning */}
            <div className="p-3 bg-amber-900/30 rounded-lg border border-amber-700/50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-semibold text-amber-300 mb-1 uppercase">⚠️ Experimental Feature</h5>
                  <p className="text-xs text-amber-200/90">
                    Desktop app generation is currently in experimental stage. Some features may not work as expected. Please report any issues you encounter.
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-400" />
                Desktop Application (Electron)
              </h5>
              <p className="text-xs text-slate-400 mb-3">
                Package your habits frontend as a native desktop application using Electron.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Native desktop app with system integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Build for macOS, Windows, and Linux
                </li>
              </ul>
              {/* Desktop Build Tools Version Info */}
              <div className="mt-4">
                <div className="text-xs text-slate-400 font-semibold mb-1">Desktop Build Tools</div>
                <div className="grid grid-cols-2 gap-4">
                                    <div>
                    <div className="text-xs text-slate-500 mb-0.5">Tauri</div>
                    <ul className="text-xs text-slate-300 space-y-0.5">
                      <li>Cargo: <span className="font-mono">{capabilities.cargoVersion || 'Not installed'}</span></li>
                      <li>Rustc: <span className="font-mono">{capabilities.rustcVersion || 'Not installed'}</span></li>
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Electron</div>
                    <ul className="text-xs text-slate-300 space-y-0.5">
                      <li>Electron: <span className="font-mono">{capabilities.electronVersion || 'Not installed'}</span></li>
                      <li>Builder: <span className="font-mono">{capabilities.electronBuilderVersion || 'Not installed'}</span></li>
                    </ul>
                  </div>

                </div>
              </div>
            </div>

            {/* Framework Selection */}
            <div className="space-y-3 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <label className="text-sm font-medium text-slate-300 block">Framework</label>
              <div className="grid grid-cols-2 gap-3">
                {(['tauri', 'electron'] as DesktopFramework[]).map((fw) => {
                  const info = DESKTOP_FRAMEWORK_INFO[fw];
                  const colorScheme = fw === 'tauri' ? 'orange' : 'blue';
                  const isSelected = selectedDesktopFramework === fw;
                  return (
                    <button
                      key={fw}
                      onClick={() => setSelectedDesktopFramework(fw)}
                      className={`flex flex-col items-start p-3 rounded-lg border transition-colors text-left ${
                        isSelected
                          ? `bg-${colorScheme}-600/20 border-${colorScheme}-500`
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      } ${info.deprecated ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`${info.iconClass} text-lg`} />
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? `border-${colorScheme}-400` : 'border-slate-500'
                        }`}>
                          {isSelected && <div className={`w-1.5 h-1.5 rounded-full bg-${colorScheme}-400`} />}
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? `text-${colorScheme}-300` : 'text-slate-300'}`}>
                          {info.name}
                        </span>
                        {info.experimental && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-orange-600/30 text-orange-300 rounded">Experimental</span>
                        )}
                        {info.deprecated && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-600/30 text-amber-300 rounded">Deprecated</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 ml-8">{info.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* App Mode Selection */}
            <div className="space-y-3 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <label className="text-sm font-medium text-slate-300 block">App Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDesktopMode('client')}
                  className={`flex flex-col items-start p-3 rounded-lg border transition-colors text-left ${
                    desktopMode === 'client'
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                      desktopMode === 'client' ? 'border-blue-400' : 'border-slate-500'
                    }`}>
                      {desktopMode === 'client' && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                    </div>
                    <span className={`text-sm font-medium ${desktopMode === 'client' ? 'text-blue-300' : 'text-slate-300'}`}>
                      Client Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 ml-5">Requires a deployed backend server</p>
                </button>
                <button
                  onClick={() => setDesktopMode('full')}
                  disabled
                  className="flex flex-col items-start p-3 rounded-lg border border-slate-700 bg-slate-800/30 opacity-60 cursor-not-allowed text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full border-2 border-slate-600 flex items-center justify-center">
                      {desktopMode === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                    </div>
                    <span className="text-sm font-medium text-slate-500">Full App</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded">Coming Soon</span>
                  </div>
                  <p className="text-xs text-slate-600 ml-5">Embedded backend, doesn't require a serverside</p>
                </button>
              </div>
            </div>

            {/* Frontend Required Notice */}
            {!hasFrontend && (
              <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-700/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-yellow-300 mb-1">Frontend Required</h5>
                    <p className="text-xs text-yellow-200/80">
                      Desktop app generation requires a frontend. Add custom frontend HTML in the Frontend tab first.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* App Customization */}
            <div className="space-y-4 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                App Customization
              </h5>
              
              {/* App Name */}
              <div>
                <label htmlFor="desktop-app-name" className="text-sm font-medium text-slate-300 mb-2 block">
                  App Name
                </label>
                <input
                  id="desktop-app-name"
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="My Habits App"
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  The name that will appear in the app title bar and system menus.
                </p>
              </div>

              {/* App Icon */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  App Icon
                </label>
                <div className="flex items-start gap-4">
                  {/* Icon Preview */}
                  <div className="w-16 h-16 rounded-lg border border-slate-600 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {appIconPreview ? (
                      <img src={appIconPreview} alt="App icon" className="w-full h-full object-cover" />
                    ) : (
                      <img src="/habits/base/assets/logo.png" alt="Default icon" className="w-12 h-12 object-contain opacity-50" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept="image/png"
                      onChange={handleIconSelect}
                      className="hidden"
                      id="desktop-icon-upload"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => iconInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Icon
                      </button>
                      {appIconPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveIcon}
                          className="flex items-center gap-1 px-2 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {appIconPreview ? 'Custom icon selected' : 'Default Habits logo will be used'}. Required: Square image (e.g., 512×512 PNG).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Backend URL */}
            <div className="space-y-4 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div>
                <label htmlFor="desktop-backend-url" className="text-sm font-medium text-slate-300 mb-2 block">
                  Backend URL <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  The URL where your habits server is deployed. The desktop app will connect to this.
                </p>
                <div className="flex gap-2">
                  <Globe className="w-5 h-5 text-slate-500 mt-1.5" />
                  <input
                    id="desktop-backend-url"
                    type="url"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    placeholder="https://api.example.com"
                    className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Platform Selection */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-3 block">
                  Target Platform
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {capabilities.desktopPlatforms.map((platform) => {
                    const info = DESKTOP_PLATFORM_INFO[platform];
                    const isSelected = selectedDesktopPlatform === platform;
                    return (
                      <button
                        key={platform}
                        onClick={() => setSelectedDesktopPlatform(platform)}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <i className={`${info.iconClass} text-xl ${isSelected ? 'text-blue-300' : 'text-slate-400'}`}></i>
                        <div>
                          <span className={`text-sm font-medium ${isSelected ? 'text-blue-300' : 'text-slate-300'}`}>
                            {info.name}
                          </span>
                          <p className="text-xs text-slate-500">{info.description}</p>
                          {platform !== 'all' && (
                            <span className="text-[10px] text-slate-600">{info.os}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Build Binary Option */}
            <div className="space-y-3 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="build-desktop-binary"
                  checked={buildDesktopBinary}
                  onChange={(e) => setBuildDesktopBinary(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="build-desktop-binary" className="text-sm font-medium text-slate-300 cursor-pointer">
                    Build final binary (DMG/EXE/AppImage/etc.)
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    {buildDesktopBinary 
                      ? 'Will build and download the final installable application. This takes longer and requires Electron Builder (or Tauri build tools like rust) to be properly configured. It is your responsibility to ensure all dependencies are set up correctly.' 
                      : 'Will download the project files only. You can build the binary manually later with npm commands.'}
                  </p>
                  {buildDesktopBinary && (
                    <div className="mt-2 p-2 bg-amber-900/20 rounded border border-amber-700/50">
                      <p className="text-xs text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Building may take 3-10 minutes. Ensure all build tools are installed and configured.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Requirements Notice (only show when building binary) */}
            {buildDesktopBinary && (
              <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-700/50">
                <h5 className="text-sm font-medium text-amber-300 mb-2">Build Requirements</h5>
                <ul className="text-xs text-slate-400 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <i className="devicon-nodejs-plain text-amber-400"></i>
                    <span>Node.js 18+ (for running Electron Builder)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="devicon-electron-original text-amber-400"></i>
                    <span>Electron Builder will be installed automatically if not present</span>
                  </li>
                  {selectedDesktopPlatform === 'dmg' && (
                    <li className="flex items-center gap-2">
                      <i className="devicon-apple-original text-amber-400"></i>
                      <span>macOS: Code signing may require Apple Developer Account</span>
                    </li>
                  )}
                  {(selectedDesktopPlatform === 'exe' || selectedDesktopPlatform === 'msi') && (
                    <li className="flex items-center gap-2">
                      <i className="devicon-windows11-original text-amber-400"></i>
                      <span>Windows: Build tools may be required for native modules</span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerateDesktop}
              disabled={generating || habits.length === 0 || !backendUrl || !hasFrontend}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {buildDesktopBinary ? 'Building Desktop App...' : 'Generating Project...'}
                </>
              ) : (
                <>
                  <Monitor className="w-5 h-5" />
                  {buildDesktopBinary ? 'Build Desktop App' : 'Generate Desktop Project'}
                </>
              )}
            </button>
            {(generating || habits.length === 0 || !backendUrl || !hasFrontend) && (
              <p className="text-xs text-amber-400 text-center">
                {generating && 'Generation in progress...'}
                {!generating && habits.length === 0 && 'Cannot generate: No habits to bundle'}
                {!generating && habits.length > 0 && !hasFrontend && 'Cannot generate: Frontend HTML required (add in Frontend tab)'}
                {!generating && habits.length > 0 && hasFrontend && !backendUrl && 'Cannot generate: Backend URL required'}
              </p>
            )}
            {!generating && habits.length > 0 && backendUrl && hasFrontend && (
              <p className="text-xs text-slate-500 text-center">
                {buildDesktopBinary 
                  ? 'Building binary requires Electron Builder (~3-10 mins)' 
                  : 'Downloads project files instantly, build later with npm commands'}
              </p>
            )}

            {/* CLI Alternative */}
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-slate-400" />
                CLI Alternative
              </h5>
              <pre className="text-xs font-mono text-slate-400 bg-slate-800 p-3 rounded overflow-x-auto">
{`npx habits pack \\
  --config ./stack.yaml \\
  --format desktop \\
  --backend-url ${backendUrl || 'https://api.example.com'} \\
  --desktop-platform ${selectedDesktopPlatform}`}
              </pre>
            </div>
          </div>
        )}


        {/* Mobile Section */}
        {activeFormat === 'mobile' && capabilities && (
          <div className="space-y-4">
            {/* Experimental Warning */}
            <div className="p-3 bg-amber-900/30 rounded-lg border border-amber-700/50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-semibold text-amber-300 mb-1 uppercase">⚠️ Experimental Feature</h5>
                  <p className="text-xs text-amber-200/90">
                    Mobile app generation is currently in experimental stage. Some features may not work as expected. Please report any issues you encounter.
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-green-400" />
                Mobile Application
              </h5>
              <p className="text-xs text-slate-400 mb-3">
                Package your habits frontend as a native mobile application using Capacitor (recommended), Cordova, or Tauri.
                Builds for iOS and Android with native device access.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Native mobile app for app stores
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Build for iOS (requires Mac) and Android
                </li>
              </ul>
              {/* Mobile Build Tools Version Info */}
              <div className="mt-4">
                <div className="text-xs text-slate-400 font-semibold mb-1">Mobile Build Tools</div>
                <div className="grid grid-cols-2 gap-4">
                                    <div>
                    <div className="text-xs text-slate-500 mb-0.5">Tauri Mobile</div>
                    <ul className="text-xs text-slate-300 space-y-0.5">
                      <li>Cargo: <span className="font-mono">{capabilities.cargoVersion || 'Not installed'}</span></li>
                      <li>Rustc: <span className="font-mono">{capabilities.rustcVersion || 'Not installed'}</span></li>
                    </ul>
                    <div className="text-xs text-slate-500 mt-2 mb-0.5">Environment</div>
                    <ul className="text-xs text-slate-300 space-y-0.5">
                      <li>ANDROID_HOME: <span className={`font-mono ${capabilities.androidHome === 'unset' ? 'text-amber-400' : 'text-green-400'}`}>{capabilities.androidHome || 'unset'}</span></li>
                      <li>ANDROID_SDK_ROOT: <span className={`font-mono ${capabilities.androidSdkRoot === 'unset' ? 'text-amber-400' : 'text-green-400'}`}>{capabilities.androidSdkRoot || 'unset'}</span></li>
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">General</div>
                    <ul className="text-xs text-slate-300 space-y-0.5">
                      <li>Gradle (Android): <span className="font-mono">{capabilities.gradleVersion || 'Not installed'}</span></li>
                      <li>Java (Android): <span className="font-mono">{capabilities.javaVersion || 'Not installed'}</span></li>
                      <li>Cordova: <span className="font-mono">{capabilities.cordovaVersion || 'Not installed'}</span></li>
                      <li>Android SDK: <span className="font-mono">{capabilities.androidSdkVersion || 'Not installed'}</span></li>
                      <li>Xcode (iOS): <span className="font-mono">{capabilities.xcodeVersion || 'Not installed'}</span></li>
                    </ul>
                  </div>

                </div>
                {capabilities.compatibility && (
                  <div className={`mt-3 p-2 rounded text-xs ${
                    capabilities.compatibility.compatible 
                      ? 'bg-green-500/10 border border-green-500/30' 
                      : 'bg-amber-500/10 border border-amber-500/30'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className={capabilities.compatibility.compatible ? 'text-green-400' : 'text-amber-400'}>
                        {capabilities.compatibility.compatible ? '✓' : '⚠'}
                      </span>
                      <div className="flex-1">
                        <div className={`font-semibold mb-1 ${
                          capabilities.compatibility.compatible ? 'text-green-300' : 'text-amber-300'
                        }`}>
                          {capabilities.compatibility.compatible ? 'Gradle-Java Compatible' : 'Compatibility Warning'}
                        </div>
                        <div className="text-slate-400 leading-relaxed">
                          {capabilities.compatibility.message}
                        </div>
                        {!capabilities.compatibility.compatible && capabilities.compatibility.recommended && (
                          <div className="mt-2 text-slate-300">
                            <strong>Recommended:</strong> Java {capabilities.compatibility.recommended}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* App Mode Selection */}
            <div className="space-y-3 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <label className="text-sm font-medium text-slate-300 block">App Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMobileMode('client')}
                  className={`flex flex-col items-start p-3 rounded-lg border transition-colors text-left ${
                    mobileMode === 'client'
                      ? 'bg-green-600/20 border-green-500'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                      mobileMode === 'client' ? 'border-green-400' : 'border-slate-500'
                    }`}>
                      {mobileMode === 'client' && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                    </div>
                    <span className={`text-sm font-medium ${mobileMode === 'client' ? 'text-green-300' : 'text-slate-300'}`}>
                      Client Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 ml-5">Requires a deployed backend server</p>
                </button>
                <button
                  onClick={() => setMobileMode('full')}
                  disabled
                  className="flex flex-col items-start p-3 rounded-lg border border-slate-700 bg-slate-800/30 opacity-60 cursor-not-allowed text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full border-2 border-slate-600 flex items-center justify-center">
                      {mobileMode === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                    </div>
                    <span className="text-sm font-medium text-slate-500">Full App</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded">Coming Soon</span>
                  </div>
                  <p className="text-xs text-slate-600 ml-5">Embedded backend, doesn't require a serverside</p>
                </button>
              </div>
            </div>

            {/* Framework Selection */}
            <div className="space-y-3 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <label className="text-sm font-medium text-slate-300 block">Mobile Framework</label>
              <div className="grid grid-cols-3 gap-3">
                {(['tauri', 'capacitor', 'cordova'] as MobileFramework[]).map((fw) => {
                  const info = MOBILE_FRAMEWORK_INFO[fw];
                  return (
                    <button
                      key={fw}
                      onClick={() => setSelectedMobileFramework(fw)}
                      className={`flex flex-col items-start p-3 rounded-lg border transition-colors text-left ${
                        selectedMobileFramework === fw
                          ? 'bg-green-600/20 border-green-500'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      } ${info.deprecated ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                          selectedMobileFramework === fw ? 'border-green-400' : 'border-slate-500'
                        }`}>
                          {selectedMobileFramework === fw && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                        </div>
                        <i className={`${info.iconClass} text-lg ${selectedMobileFramework === fw ? 'text-green-400' : 'text-slate-400'}`} />
                        <span className={`text-sm font-medium ${selectedMobileFramework === fw ? 'text-green-300' : 'text-slate-300'}`}>
                          {info.name}
                        </span>
                        {info.experimental && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-orange-600/30 text-orange-300 rounded">Experimental</span>
                        )}
                        {info.deprecated && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-600/30 text-amber-300 rounded">Deprecated</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 ml-5">{info.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frontend Required Notice */}
            {!hasFrontend && (
              <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-700/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-yellow-300 mb-1">Frontend Required</h5>
                    <p className="text-xs text-yellow-200/80">
                      Mobile app generation requires a frontend. Add custom frontend HTML in the Frontend tab first.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* App Customization */}
            <div className="space-y-4 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <h5 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-green-400" />
                App Customization
              </h5>
              
              {/* App Name */}
              <div>
                <label htmlFor="mobile-app-name" className="text-sm font-medium text-slate-300 mb-2 block">
                  App Name
                </label>
                <input
                  id="mobile-app-name"
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="My Habits App"
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  The name that will appear on the home screen and app stores.
                </p>
              </div>

              {/* App Icon */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  App Icon
                </label>
                <div className="flex items-start gap-4">
                  {/* Icon Preview */}
                  <div className="w-16 h-16 rounded-lg border border-slate-600 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {appIconPreview ? (
                      <img src={appIconPreview} alt="App icon" className="w-full h-full object-cover" />
                    ) : (
                      <img src="/habits/base/assets/logo.png" alt="Default icon" className="w-12 h-12 object-contain opacity-50" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIconSelect}
                      className="hidden"
                      id="mobile-icon-upload"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById('mobile-icon-upload')?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Icon
                      </button>
                      {appIconPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveIcon}
                          className="flex items-center gap-1 px-2 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {appIconPreview ? 'Custom icon selected' : 'Default Habits logo will be used'}. Required: Square image (e.g., 1024×1024 PNG).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Backend URL */}
            <div className="space-y-4 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div>
                <label htmlFor="mobile-backend-url" className="text-sm font-medium text-slate-300 mb-2 block">
                  Backend URL <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  The URL where your habits server is deployed. The mobile app will connect to this.
                </p>
                <div className="flex gap-2">
                  <Globe className="w-5 h-5 text-slate-500 mt-1.5" />
                  <input
                    id="mobile-backend-url"
                    type="url"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    placeholder="https://api.example.com"
                    className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Target Selection */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-3 block">
                  Target Platform
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {capabilities.mobilePlatforms.map((target) => {
                    const info = MOBILE_TARGET_INFO[target];
                    const isSelected = selectedMobileTarget === target;
                    return (
                      <button
                        key={target}
                        onClick={() => setSelectedMobileTarget(target)}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                          isSelected
                            ? 'bg-green-600/20 border-green-500'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <i className={`${info.iconClass} text-xl ${isSelected ? 'text-green-300' : 'text-slate-400'}`}></i>
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${isSelected ? 'text-green-300' : 'text-slate-300'}`}>
                            {info.name}
                          </span>
                          <p className="text-xs text-slate-500">{info.description}</p>
                          <p className="text-[10px] text-slate-600 mt-1">{info.requirements}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Build Binary Option */}
            <div className="space-y-3 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="build-mobile-binary"
                  checked={buildMobileBinary}
                  onChange={(e) => setBuildMobileBinary(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-green-600 bg-slate-800 border-slate-600 rounded focus:ring-green-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="build-mobile-binary" className="text-sm font-medium text-slate-300 cursor-pointer">
                    Build final binary (APK/IPA)
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    {buildMobileBinary 
                      ? 'Will build and download the final APK/IPA file. This takes longer and requires all build tools (Java, Gradle, Android SDK, Xcode, etc.) to be properly configured. It is your responsibility to ensure all dependencies are set up correctly.' 
                      : 'Will download the project files only. You can build the binary manually later.'}
                  </p>
                  {buildMobileBinary && (
                    <div className="mt-2 p-2 bg-amber-900/20 rounded border border-amber-700/50">
                      <p className="text-xs text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Building may take 5-15 minutes. Ensure Java, Gradle, Android SDK, Xcode (for iOS), and all build tools are installed and configured.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Requirements Notice */}
            <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-700/50">
              <h5 className="text-sm font-medium text-amber-300 mb-2">Build Requirements</h5>
              <ul className="text-xs text-slate-400 space-y-1.5">
                {(selectedMobileTarget === 'ios' || selectedMobileTarget === 'both') && (
                  <li className="flex items-center gap-2">
                    <i className="devicon-apple-original text-amber-400"></i>
                    <span>iOS: macOS with Xcode installed, ios-deploy, ios-sim, Apple Developer Account</span>
                  </li>
                )}
                {(selectedMobileTarget === 'android' || selectedMobileTarget === 'both') && (
                  <li className="flex items-center gap-2">
                    <i className="devicon-android-plain text-amber-400"></i>
                    <span>Android: Android SDK, Gradle, Java SDK, and build tools</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <i className="devicon-nodejs-plain text-amber-400"></i>
                  <span>Cordova CLI: <code className="text-xs bg-slate-800 px-1 rounded">npm install -g cordova</code></span>
                </li>
                <li className="flex items-center gap-2">
                  <i className="devicon-nodejs-plain text-amber-400"></i>
                  <span>If anything is missing, habits will fail without error message (WIP)</span>
                </li>
              </ul>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateMobile}
              disabled={generating || habits.length === 0 || !backendUrl || !hasFrontend}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Mobile App...
                </>
              ) : (
                <>
                  <Smartphone className="w-5 h-5" />
                  Generate Mobile App Project
                </>
              )}
            </button>
            {(generating || habits.length === 0 || !backendUrl || !hasFrontend) && (
              <p className="text-xs text-amber-400 text-center">
                {generating && 'Generation in progress...'}
                {!generating && habits.length === 0 && 'Cannot generate: No habits to bundle'}
                {!generating && habits.length > 0 && !hasFrontend && 'Cannot generate: Frontend HTML required (add in Frontend tab)'}
                {!generating && habits.length > 0 && hasFrontend && !backendUrl && 'Cannot generate: Backend URL required'}
              </p>
            )}
            {!generating && habits.length > 0 && backendUrl && hasFrontend && (
              <p className="text-xs text-slate-500 text-center">
                Generates a Cordova project ready to build with platform tools
              </p>
            )}

            {/* CLI Alternative */}
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-slate-400" />
                CLI Alternative
              </h5>
              <pre className="text-xs font-mono text-slate-400 bg-slate-800 p-3 rounded overflow-x-auto">
{`npx habits pack \\
  --config ./stack.yaml \\
  --format mobile \\
  --backend-url ${backendUrl || 'https://api.example.com'} \\
  --mobile-target ${selectedMobileTarget}`}
              </pre>
            </div>
          </div>
        )}

        {/* Generation Success */}
        {generationSuccess && (
          <div className="p-4 bg-green-900/30 rounded-lg border border-green-700/50">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-300">{generationSuccess}</span>
            </div>
          </div>
        )}

        {/* Generation Error */}
        {generationError && (
          <div className="p-4 bg-red-900/30 rounded-lg border border-red-700/50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-red-300 mb-1">Generation Failed</h5>
                <p className="text-xs text-red-200/80">{generationError}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
