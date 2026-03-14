/**
 * N8N Utility Types
 * 
 * Base type declarations and placeholder types for n8n integration.
 * These types are declared as 'any' to avoid pulling in unnecessary dependencies.
 */

// All undefined types declare as any
export type ExpressionError = any;
export type WorkflowActivationError = any;
export type WorkflowOperationError = any;
export type ExecutionCancelledError = any;
// NodeOperationError and NodeApiError are defined in node-types.ts
export type GenericAbortSignal = any;
export type Workflow = any;
export type WorkflowExecuteMode = any;
export type IRunExecutionData = any;
export type IDeferredPromise<T> = any;
export type AxiosProxyConfig = any;
export type SecureContextOptions = any;
export type Readable = any;
export type PathLike = any;
export type Buffer = any;
export type BufferEncoding = any;
export type SSHClient = any;
export type AbortController = any;
export type IExecutionContext = any;
export type IDataTableProjectAggregateService = any;
export type IDataTableProjectService = any;
export type Result<T, E> = any;
export type IncomingHttpHeaders = any;
export const CODE_LANGUAGES = [] as any;
export const CODE_EXECUTION_MODES = [] as any;
export type ExecutionStatus = any;
export type EnvProviderState = any;
export type RequestBodyMatcher = any;
export type RequestHeaderMatcher = any;
export type ReplyHeaders = any;
export const LOG_LEVELS = [] as any;
export type LogScope = any;
export type CallbackManagerLC = any;
export type File = any;
export type ExpressRequest<T> = any;

// Express namespace for request/response types
export namespace express {
    export type Request<T = {}, S = {}, B = {}> = any;
    export type Response<T = {}> = any;
}

// Generic value types
export type GenericValue = string | object | number | boolean | undefined | null;
export type CloseFunction = () => Promise<void>;

export interface IDataObject {
    [key: string]: GenericValue | IDataObject | GenericValue[] | IDataObject[];
}

// Error types - NodeOperationError and NodeApiError are imported from node-types
export type ExecutionError = ExpressionError | WorkflowActivationError | WorkflowOperationError | ExecutionCancelledError | any;

// Logging types
export type LogLevel = (typeof LOG_LEVELS)[number];
export type LogMetadata = {
    [key: string]: unknown;
    scopes?: LogScope[];
    file?: string;
    function?: string;
};
export type Logger = Record<Exclude<LogLevel, 'silent'>, (message: string, metadata?: LogMetadata) => void>;
export type LogLocationMetadata = Pick<LogMetadata, 'file' | 'function'>;

export interface IStatusCodeMessages {
    [key: string]: string;
}

// Entity types for generic operations
export type AllEntities<M> = M extends {
    [key: string]: string;
} ? Entity<M, keyof M> : never;

export type Entity<M, K> = K extends keyof M ? {
    resource: K;
    operation: M[K];
} : never;

// Telemetry types
export interface ITelemetryTrackProperties {
    user_id?: string;
    [key: string]: GenericValue;
}

// Feature flags
export interface FeatureFlags {
    [featureFlag: string]: string | boolean | undefined;
}

// User types
export interface IUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

export type ProjectSharingData = {
    id: string;
    name: string | null;
    icon: {
        type: 'emoji' | 'icon';
        value: string;
    } | null;
    type: 'personal' | 'team' | 'public';
    createdAt: string;
    updatedAt: string;
};

// User settings
export interface IUserSettings {
    isOnboarded?: boolean;
    firstSuccessfulWorkflowId?: string;
    userActivated?: boolean;
    userActivatedAt?: number;
    allowSSOManualLogin?: boolean;
    npsSurvey?: NpsSurveyState;
    easyAIWorkflowOnboarded?: boolean;
    userClaimedAiCredits?: boolean;
    dismissedCallouts?: Record<string, boolean>;
}

export type NpsSurveyRespondedState = {
    lastShownAt: number;
    responded: true;
};

export type NpsSurveyWaitingState = {
    lastShownAt: number;
    waitingForResponse: true;
    ignoredCount: number;
};

export type NpsSurveyState = NpsSurveyRespondedState | NpsSurveyWaitingState;

// Personalization survey
export type IPersonalizationSurveyAnswersV4 = {
    version: 'v4';
    personalization_survey_submitted_at: string;
    personalization_survey_n8n_version: string;
    automationGoalDevops?: string[] | null;
    automationGoalDevopsOther?: string | null;
    companyIndustryExtended?: string[] | null;
    otherCompanyIndustryExtended?: string[] | null;
    companySize?: string | null;
    companyType?: string | null;
    automationGoalSm?: string[] | null;
    automationGoalSmOther?: string | null;
    usageModes?: string[] | null;
    email?: string | null;
    role?: string | null;
    roleOther?: string | null;
    reportedSource?: string | null;
    reportedSourceOther?: string | null;
};

// AI types
export type N8nAIProviderType = 'openai' | 'unknown';
export type Functionality = 'regular' | 'configuration-node' | 'pairedItem';
export type CallbackManager = CallbackManagerLC;

// Streaming types
export type ChunkType = 'begin' | 'item' | 'end' | 'error';
export interface StructuredChunk {
    type: ChunkType;
    content?: string;
    metadata: {
        nodeId: string;
        nodeName: string;
        runIndex: number;
        itemIndex: number;
        timestamp: number;
    };
}

// API types
export type ApiKeyAudience = 'public-api' | 'mcp-server-api';
