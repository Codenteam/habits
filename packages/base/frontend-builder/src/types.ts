/**
 * Configuration for connecting to Intersect WebCanvas API
 */
export interface WebCanvasConfig {
  /** Tenant URL (e.g., https://mytenant.intersect.site) */
  tenantUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** AI provider to use */
  provider?: 'auto' | 'openai' | 'anthropic';
  /** AI model to use */
  model?: string;
}

/**
 * Props for the FrontendBuilder component
 */
export interface FrontendBuilderProps {
  /** Initial HTML content to load in the editor */
  initialHtml?: string;
  /** Callback when HTML content changes */
  onChange: (html: string) => void;
  /** Callback when user saves */
  onSave?: (html: string) => void;
  /** Callback when user clicks Done/Close button */
  onDone?: () => void;
  /** WebCanvas configuration */
  config?: WebCanvasConfig;
  /** Height of the editor */
  height?: string | number;
  /** Custom class name */
  className?: string;
  /** Whether to automatically open the AI prompt modal on init (when HTML is empty) */
  showAIModalOnInit?: boolean;
  /** Raw habit data (JSON) for AI generation - will be converted to HabitContext when needed */
  habitData?: any;
}

/**
 * Response from the hosting detection check
 */
export interface HostingDetectionResult {
  /** Whether the app is hosted on intersect.site */
  isHosted: boolean;
  /** Tenant URL derived from the current origin when hosted */
  tenantUrl?: string;
  /** API key if available from the hosted environment */
  apiKey?: string;
  /** Error message if detection failed */
  error?: string;
}

/**
 * Habit definition for AI generation
 */
export interface HabitDefinition {
  /** Unique identifier for the habit */
  id: string;
  /** Human-readable name of the habit */
  name: string;
  /** Description of what the habit does */
  description?: string;
  /** The habit's node definitions (workflow nodes) */
  nodes?: any[];
  /** OpenAPI spec for this habit's endpoints */
  openApiSpec?: any;
  /** Output mappings defined for the habit */
  output?: Record<string, string>;
}

/**
 * Habit context for AI generation - provides workflow metadata and API docs
 */
export interface HabitContext {
  /** Array of habits to include in the generation */
  habits: HabitDefinition[];
  /** Human-readable description of the habits */
  description?: string;
}

/**
 * Callback for streaming progress updates
 */
export type AIStreamProgressCallback = (partialHtml: string, isDone: boolean) => void;

/**
 * AI generation request payload
 */
export interface AIGenerationRequest {
  prompt: string;
  provider?: string;
  model?: string;
  html?: string;
  apiToken?: string;
  /** Additional context about the habit for better AI generation */
  context?: HabitContext;
  /** Callback for streaming progress updates */
  onProgress?: AIStreamProgressCallback;
  /** If true, return mock HTML without calling AI */
  mock?: boolean;
}

/**
 * AI generation response
 */
export interface AIGenerationResponse {
  html?: string;
  result?: string;
  content?: string;
  output?: string;
  code?: string;
  error?: string;
}

/**
 * GrapesJS editor configuration
 */
export interface EditorConfig {
  container: HTMLElement | string;
  height?: string;
  width?: string;
  plugins?: any[];
  pluginsOpts?: Record<string, any>;
  storageManager?: boolean | object;
  blockManager?: object;
  styleManager?: object;
  deviceManager?: object;
}
