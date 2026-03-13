import { listAvailableModules } from './moduleLoader';

interface ModuleInfo {
  framework: string;
  name: string;
  path: string;
  package: string;
  description: string;
  license: string;
  installed: boolean;
}

export async function listModules(framework?: string): Promise<ModuleInfo[]> {
  return await listAvailableModules(framework);
}
