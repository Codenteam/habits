// Script Executor Types

export interface ScriptDefinition {
  path?: string;
  type: 'script';
  language: 'deno' | 'python3' | 'go' | 'bash' | 'typescript' | 'javascript';
  content?: string;
  lock?: string | null;
  input_transforms?: Record<string, ScriptInputTransform>;
}

export interface ScriptInputTransform {
  type: 'javascript' | 'static';
  expr?: string;
  value?: any;
}

export interface ScriptModule {
  id: string;
  value: ScriptDefinition | ScriptFlowModule;
  summary?: string;
  stop_after_if?: {
    expr: string;
    skip_if_stopped?: boolean;
  } | null;
  input_transforms?: Record<string, ScriptInputTransform>;
}

export interface ScriptFlowModule {
  type: 'forloopflow' | 'branchall' | 'branchone';
  modules: ScriptModule[];
  iterator?: ScriptInputTransform;
  parallel?: boolean;
  skip_failures?: boolean;
  branches?: ScriptBranch[];
}

export interface ScriptBranch {
  summary?: string;
  expr: string;
  modules: ScriptModule[];
}

export interface ScriptWorkflow {
  summary?: string;
  description?: string;
  value: {
    modules: ScriptModule[];
    failure_module?: ScriptModule | null;
  };
  schema?: {
    type: string;
    $schema?: string;
    required?: string[];
    properties?: Record<string, any>;
  };
}

export interface ScriptExecutionParams {
  source: 'local' | 'hub' | 'inline';
  framework: 'script';
  moduleName: string;
  params: Record<string, any>;
  script?: ScriptDefinition;
}

export interface ScriptExecutionResult {
  success: boolean;
  module: string;
  result: any;
  executedAt: string;
  language: string;
  data: {
    message: string;
    status: 'completed' | 'failed';
    output: any;
    error?: string;
  };
}

export interface ScriptState {
  [key: string]: any;
}

export interface ScriptContext {
  flow_input: Record<string, any>;
  previous_result: any;
  result: any;
  iter?: {
    index: number;
    value: any;
  };
}

export interface DenoToNodeConversionResult {
  code: string;
  imports: string[];
  npmPackages: string[];
}
