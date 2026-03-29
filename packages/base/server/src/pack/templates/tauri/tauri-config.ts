/**
 * Tauri Configuration Generator
 * Generates tauri.conf.json for Tauri applications
 */

export interface TauriConfigOptions {
  appId: string;
  appName: string;
  version?: string;
  backendUrl: string;
  windowTitle?: string;
  windowWidth?: number;
  windowHeight?: number;
  /** Additional permissions for plugins */
  permissions?: string[];
  /** Custom URL scheme for deep links (e.g., "myapp" for myapp://callback) */
  deepLinkScheme?: string;
}

export function getTauriConfig(options: TauriConfigOptions): string {
  const {
    appId,
    appName,
    version = '1.0.0',
    backendUrl,
    windowTitle,
    windowWidth = 1200,
    windowHeight = 800,
    deepLinkScheme,
  } = options;

  // Extract domain from backend URL for CSP
  const backendDomain = backendUrl.replace(/^https?:\/\//, '').split('/')[0];

  // Build plugins configuration
  const plugins: Record<string, any> = {
    // http: {
    //   scope: [`${backendUrl}/*`, `${backendUrl.replace(/\/$/, '')}/*`],
    // },
  };

  // Add deep-link plugin configuration if scheme is provided
  if (deepLinkScheme) {
    plugins['deep-link'] = {
      desktop: {
        schemes: [deepLinkScheme],
      },
      mobile: {
        schemes: [deepLinkScheme],
      },
    };
  }

  // Tauri v2 configuration format
  const config = {
    $schema: '../node_modules/@tauri-apps/cli/schema.json',
    identifier: appId,
    productName: appName,
    version,
    build: {
      beforeDevCommand: '',
      beforeBuildCommand: '',
      frontendDist: '../www',
    },
    bundle: {
      active: true,
      publisher: 'Habits',
      icon: [
        'icons/32x32.png',
        'icons/128x128.png',
        'icons/128x128@2x.png',
        'icons/icon.icns',
        'icons/icon.ico',
      ],
      resources: [],
      copyright: '',
      category: 'DeveloperTool',
      shortDescription: `${appName} - powered by Habits`,
      longDescription: `${appName} - powered by Habits`,
      targets: 'all',
      macOS: {
        frameworks: [],
        minimumSystemVersion: '10.13',
      },
      windows: {
        certificateThumbprint: null,
        digestAlgorithm: 'sha256',
        timestampUrl: '',
      },
      iOS: {
        minimumSystemVersion: '13.0',
      },
      android: {
        minSdkVersion: 24,
      },
    },
    app: {
      windows: [
        {
          title: windowTitle || appName,
          width: windowWidth,
          height: windowHeight,
          resizable: true,
          fullscreen: false,
          decorations: true,
          transparent: false,
        },
      ],
      security: {
        // csp: `default-src 'self'; connect-src 'self' ${backendUrl} https://${backendDomain} ws://${backendDomain} wss://${backendDomain}; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;`,
        csp: null,
        assetProtocol: {
          enable: true,
          scope: ['**'],
        },
      },
    },
    plugins,
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generate Tauri capabilities JSON
 * This is required for Tauri v2 plugin permissions
 */
export function getTauriCapabilities(appId: string, additionalPermissions: string[] = []): string {
  const capabilities = {
    $schema: '../gen/schemas/desktop-schema.json',
    identifier: 'default',
    description: 'Capability for the main window',
    windows: ['main'],
    permissions: [
      'core:default',
      'shell:allow-open',
      'http:default',
      'log:default',
      'keyring:default',
      'keyring:allow-get-password',
      'keyring:allow-set-password',
      'keyring:allow-delete-password',
      'dialog:default',
      'dialog:allow-ask',
      'dialog:allow-message',
      ...additionalPermissions,
    ],
  };
  
  return JSON.stringify(capabilities, null, 2);
}
