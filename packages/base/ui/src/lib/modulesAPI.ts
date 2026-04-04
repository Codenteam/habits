import { api } from './api';

interface BackendModule {
  framework: string;
  name: string;
  displayName?: string;
  source: string;
  repository: string;
  version?: string;
  description?: string;
  isInstalled?: boolean;
  isAvailable?: boolean;
}

export class ModulesAPI {
  /**
   * Fetch all available modules from the backend
   */
  static async fetchAvailableModules(){
    try {
      // This would be a real API call to your backend
      const response = await api.getModules()
      return response || [];
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      // Return some mock data for development
      return [
        {
          framework: 'bits',
          name: 'bit-openai',
          displayName: 'OpenAI',
          source: 'bit-openai',
          repository: 'https://github.com/habits/bits',
          version: '0.1.0',
          description: 'OpenAI integration for chat, completions, and more',
          isInstalled: true,
          isAvailable: true
        },
        {
          framework: 'bits',
          name: 'bit-google-sheets',
          displayName: 'Google Sheets',
          source: 'bit-google-sheets',
          repository: 'https://github.com/habits/bits',
          version: '0.1.0',
          description: 'Google Sheets integration for reading and writing spreadsheets',
          isInstalled: false,
          isAvailable: true
        },
        {
          framework: 'bits',
          name: 'bit-http',
          displayName: 'HTTP Request',
          source: 'bit-http',
          repository: 'https://github.com/habits/bits',
          version: '1.0.0',
          description: 'Make HTTP requests to external APIs',
          isInstalled: true,
          isAvailable: true
        },
        {
          framework: 'script',
          name: 'matrix-message',
          displayName: 'Matrix Message',
          source: 'matrix-message.ts',
          repository: 'local',
          version: '1.0.0',
          description: 'Send messages to Matrix rooms',
          isInstalled: true,
          isAvailable: true
        }
      ];
    }
  }

  /**
   * Transform backend module to store module format
   */
  static transformToStoreModule(backendModule: BackendModule) {
    return {
      framework: backendModule.framework,
      name: backendModule.name,
      displayName: backendModule.displayName,
      source: backendModule.source,
      repository: backendModule.repository,
      status: backendModule.isInstalled 
        ? (backendModule.isAvailable ? 'available' : 'error')
        : (backendModule.isAvailable ? 'not-installed' : 'error'),
      error: !backendModule.isAvailable ? 'Module not available' : undefined,
    } as const;
  }
}