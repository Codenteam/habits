/**
 * Pack Command Types
 * 
 * Shared types for all pack formats: single-executable, desktop, and mobile.
 */

export type PackFormat = 
  | 'single-executable'
  | 'desktop'
  | 'desktop-full'
  | 'mobile'
  | 'mobile-full'
  | 'docker'
  | 'bundle'
  | 'tauri';

export type DesktopPlatform = 
  | 'dmg'
  | 'exe'
  | 'appimage'
  | 'deb'
  | 'rpm'
  | 'msi'
  | 'all';

export type DesktopFramework = 'electron' | 'tauri';

export type MobileTarget = 'ios' | 'android' | 'both';

export type MobileFramework = 'capacitor' | 'cordova' | 'tauri';

export type SeaPlatform = 
  | 'darwin-arm64'
  | 'darwin-x64'
  | 'linux-x64'
  | 'win32-x64'
  | 'current';

export interface PackCommandOptions {
  /** Path to stack.yaml config file */
  config: string;
  /** Output path for the generated artifact */
  output?: string;
  /** Pack format */
  format: PackFormat;
  /** Target platform for single-executable (darwin-arm64, darwin-x64, linux-x64, win32-x64, or current) */
  platform?: SeaPlatform;
  /** Backend URL for frontend-only apps (desktop/mobile) */
  backendUrl?: string;
  /** Desktop platform output format */
  desktopPlatform?: DesktopPlatform;
  /** Desktop framework (electron or tauri) */
  desktopFramework?: DesktopFramework;
  /** Mobile target platform */
  mobileTarget?: MobileTarget;
  /** Mobile framework (capacitor, cordova, or tauri) */
  mobileFramework?: MobileFramework;
  /** Custom app name (overrides stack.yaml name) */
  appName?: string;
  /** Path to app icon (PNG file) */
  appIcon?: string;
  /** Build in debug mode */
  debug?: boolean;
}

export interface HabitData {
  name: string;
  slug: string;
  nodes: any[];
  edges?: any[];
  input?: any[];
  output?: Record<string, any>;
  description?: string;
  id?: string;
  [key: string]: any; // Allow additional habit properties
}

export interface ParsedConfig {
  workflows?: Array<{ id?: string; path: string; enabled?: boolean }>;
  server?: { 
    port?: number; 
    openapi?: boolean; 
    webhookTimeout?: number;
    frontend?: string;
  };
  habits?: string[];
  version?: string;
  name?: string;
}

export interface PackResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  format: PackFormat;
  size?: number;
  platform?: string;
}
