/**
 * N8N Execution Types
 * 
 * Types for execution functions, helpers, and execution context.
 */

import {
    IDataObject,
    GenericValue,
    CloseFunction,
    Workflow,
    WorkflowExecuteMode,
    IRunExecutionData,
    IDeferredPromise,
    AxiosProxyConfig,
    SecureContextOptions,
    Readable,
    PathLike,
    Buffer,
    BufferEncoding,
    SSHClient,
    AbortController as GenericAbortController,
    GenericAbortSignal,
    IExecutionContext,
    IDataTableProjectAggregateService,
    IDataTableProjectService,
    Result,
    IncomingHttpHeaders,
    ExecutionStatus,
    Logger,
    CallbackManager,
    express,
} from './utility-types';

import type {
    INode,
    INodeParameters,
    NodeParameterValueType,
    INodeProperties,
    INodeExecutionData,
    IPairedItemData,
    NodeConnectionType,
    AINodeConnectionType,
    INodeInputConfiguration,
    INodeOutputConfiguration,
    IWebhookDescription,
    WebhookType,
    NodeExecutionHint,
} from './node-types';

// Re-export for consumers
export type { INodeExecutionData };

import type {
    IOAuth2Options,
    IAdditionalCredentialOptions,
    ICredentialDataDecryptedObject,
    IBinaryData,
    IRequestOptionsSimplified,
    IRequestOptionsSimplifiedAuth,
} from './credential-types';

// Connection types
export interface IConnection {
    node: string;
    type: NodeConnectionType;
    index: number;
}

export type NodeInputConnections = Array<IConnection[] | null>;

export interface INodeConnection {
    sourceIndex: number;
    destinationIndex: number;
}

export interface INodeConnections {
    [key: string]: NodeInputConnections;
}

export interface IConnections {
    [key: string]: INodeConnections;
}

// Execute data types
export type IExecuteResponsePromiseData = IDataObject | IN8nHttpFullResponse;

export interface IRunNodeResponse {
    data: INodeExecutionData[][] | null | undefined;
    hints?: NodeExecutionHint[];
    closeFunction?: CloseFunction;
}

export interface ISourceDataConnections {
    [key: string]: Array<ISourceData[] | null>;
}

export interface IExecuteData {
    data: ITaskDataConnections;
    metadata?: ITaskMetadata;
    node: INode;
    source: ITaskDataConnectionsSource | null;
    runIndex?: number;
}

export type IContextObject = {
    [key: string]: any;
};

export interface IExecuteContextData {
    [key: string]: IContextObject;
}

// HTTP request types
export type IHttpRequestMethods = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';

export interface IHttpRequestOptions {
    url: string;
    baseURL?: string;
    headers?: IDataObject;
    method?: IHttpRequestMethods;
    body?: FormData | GenericValue | GenericValue[] | Buffer | URLSearchParams;
    qs?: IDataObject;
    arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
    auth?: {
        username: string;
        password: string;
        sendImmediately?: boolean;
    };
    disableFollowRedirect?: boolean;
    encoding?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
    skipSslCertificateValidation?: boolean;
    returnFullResponse?: boolean;
    ignoreHttpStatusErrors?: boolean;
    proxy?: {
        host: string;
        port: number;
        auth?: {
            username: string;
            password: string;
        };
        protocol?: string;
    };
    timeout?: number;
    json?: boolean;
    abortSignal?: GenericAbortSignal;
}

/** @deprecated Prefer using IHttpRequestOptions */
export interface IRequestOptions {
    baseURL?: string;
    uri?: string;
    url?: string;
    method?: IHttpRequestMethods;
    qs?: IDataObject;
    qsStringifyOptions?: {
        arrayFormat: 'repeat' | 'brackets' | 'indices';
    };
    useQuerystring?: boolean;
    headers?: IDataObject;
    auth?: Partial<{
        sendImmediately: boolean;
        bearer: string;
        user: string;
        username: string;
        password: string;
        pass: string;
    }>;
    body?: any;
    formData?: IDataObject | FormData;
    form?: IDataObject | FormData;
    json?: boolean;
    useStream?: boolean;
    encoding?: string | null;
    timeout?: number;
    rejectUnauthorized?: boolean;
    proxy?: string | AxiosProxyConfig;
    simple?: boolean;
    gzip?: boolean;
    resolveWithFullResponse?: boolean;
    followRedirect?: boolean;
    followAllRedirects?: boolean;
    maxRedirects?: number;
    agentOptions?: SecureContextOptions;
}

export interface PaginationOptions {
    binaryResult?: boolean;
    continue: boolean | string;
    request: IRequestOptionsSimplifiedAuth;
    requestInterval: number;
    maxRequests?: number;
}

// HTTP response types
export type IN8nHttpResponse = IDataObject | Buffer | GenericValue | GenericValue[] | null;

export interface IN8nHttpFullResponse {
    body: IN8nHttpResponse | Readable;
    __bodyResolved?: boolean;
    headers: IDataObject;
    statusCode: number;
    statusMessage?: string;
}

// Request operations
export interface IN8nRequestOperations {
    pagination?: IN8nRequestOperationPaginationGeneric | IN8nRequestOperationPaginationOffset | ((this: IExecutePaginationFunctions, requestOptions: DeclarativeRestApiSettings.ResultOptions) => Promise<INodeExecutionData[]>);
}

export interface IN8nRequestOperationPaginationBase {
    type: string;
    properties: {
        [key: string]: unknown;
    };
}

export interface IN8nRequestOperationPaginationGeneric extends IN8nRequestOperationPaginationBase {
    type: 'generic';
    properties: {
        continue: boolean | string;
        request: IRequestOptionsSimplifiedAuth;
    };
}

export interface IN8nRequestOperationPaginationOffset extends IN8nRequestOperationPaginationBase {
    type: 'offset';
    properties: {
        limitParameter: string;
        offsetParameter: string;
        pageSize: number;
        rootProperty?: string;
        type: 'body' | 'query';
    };
}

// Declarative REST API settings
type Override<A extends object, B extends object> = Omit<A, keyof B> & B;

export declare namespace DeclarativeRestApiSettings {
    type HttpRequestOptions = Override<IHttpRequestOptions, {
        skipSslCertificateValidation?: string | boolean;
        url?: string;
    }>;
    type ResultOptions = {
        maxResults?: number | string;
        options: HttpRequestOptions;
        paginate?: boolean | string;
        preSend: PreSendAction[];
        postReceive: Array<{
            data: {
                parameterValue: string | IDataObject | undefined;
            };
            actions: PostReceiveAction[];
        }>;
        requestOperations?: IN8nRequestOperations;
    };
}

// Parameter options
export type EnsureTypeOptions = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'json';

export interface IGetNodeParameterOptions {
    contextNode?: INode;
    ensureType?: EnsureTypeOptions;
    extractValue?: boolean;
    rawExpressions?: boolean;
    skipValidation?: boolean;
}

// Execute functions namespace
declare namespace ExecuteFunctions {
    namespace StringReturning {
        type NodeParameter = 'binaryProperty' | 'binaryPropertyName' | 'binaryPropertyOutput' | 'dataPropertyName' | 'dataBinaryProperty' | 'resource' | 'operation' | 'filePath' | 'encodingType';
    }
    namespace NumberReturning {
        type NodeParameter = 'limit';
    }
    namespace BooleanReturning {
        type NodeParameter = 'binaryData' | 'download' | 'jsonParameters' | 'returnAll' | 'rawData' | 'resolveData';
    }
    namespace RecordReturning {
        type NodeParameter = 'additionalFields' | 'filters' | 'options' | 'updateFields';
    }
    export type GetNodeParameterFn = {
        getNodeParameter<T extends { resource: string }>(parameterName: 'resource', itemIndex?: number): T['resource'];
        getNodeParameter(parameterName: StringReturning.NodeParameter, itemIndex: number, fallbackValue?: string, options?: IGetNodeParameterOptions): string;
        getNodeParameter(parameterName: RecordReturning.NodeParameter, itemIndex: number, fallbackValue?: IDataObject, options?: IGetNodeParameterOptions): IDataObject;
        getNodeParameter(parameterName: BooleanReturning.NodeParameter, itemIndex: number, fallbackValue?: boolean, options?: IGetNodeParameterOptions): boolean;
        getNodeParameter(parameterName: NumberReturning.NodeParameter, itemIndex: number, fallbackValue?: number, options?: IGetNodeParameterOptions): number;
        getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: any, options?: IGetNodeParameterOptions): NodeParameterValueType | object;
    };
    export {};
}

// Workflow execution info
export interface IExecuteWorkflowInfo {
    code?: IWorkflowBase;
    id?: string;
}

// Helper functions
export interface BaseHelperFunctions {
    createDeferredPromise: <T = void>() => IDeferredPromise<T>;
    returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
}

export interface FileSystemHelperFunctions {
    isFilePathBlocked(filePath: string): Promise<boolean>;
    createReadStream(path: PathLike): Promise<Readable>;
    getStoragePath(): string;
    writeContentToFile(path: PathLike, content: string | Buffer | Readable, flag?: string): Promise<void>;
}

export interface BinaryHelperFunctions {
    prepareBinaryData(binaryData: Buffer | Readable, filePath?: string, mimeType?: string): Promise<IBinaryData>;
    setBinaryDataBuffer(data: IBinaryData, binaryData: Buffer): Promise<IBinaryData>;
    /** @deprecated */
    copyBinaryFile(): Promise<never>;
    binaryToBuffer(body: Buffer | Readable): Promise<Buffer>;
    binaryToString(body: Buffer | Readable, encoding?: BufferEncoding): Promise<string>;
    getBinaryPath(binaryDataId: string): string;
    getBinaryStream(binaryDataId: string, chunkSize?: number): Promise<Readable>;
    createBinarySignedUrl(binaryData: IBinaryData, expiresIn?: string): string;
    getBinaryMetadata(binaryDataId: string): Promise<{
        fileName?: string;
        mimeType?: string;
        fileSize: number;
    }>;
}

// Deduplication types
export type DeduplicationScope = 'node' | 'workflow';
export type DeduplicationItemTypes = string | number;
export type DeduplicationMode = 'entries' | 'latestIncrementalKey' | 'latestDate';

export interface IProcessedDataLatest {
    mode: DeduplicationMode;
    data: DeduplicationItemTypes;
}

export interface IProcessedDataEntries {
    mode: DeduplicationMode;
    data: DeduplicationItemTypes[];
}

export interface IDeduplicationOutput {
    new: DeduplicationItemTypes[];
    processed: DeduplicationItemTypes[];
}

export interface IDeduplicationOutputItems {
    new: IDataObject[];
    processed: IDataObject[];
}

export interface ICheckProcessedOptions {
    mode: DeduplicationMode;
    maxEntries?: number;
}

export interface DeduplicationHelperFunctions {
    checkProcessedAndRecord(items: DeduplicationItemTypes[], scope: DeduplicationScope, options: ICheckProcessedOptions): Promise<IDeduplicationOutput>;
    checkProcessedItemsAndRecord(propertyName: string, items: IDataObject[], scope: DeduplicationScope, options: ICheckProcessedOptions): Promise<IDeduplicationOutputItems>;
    removeProcessed(items: DeduplicationItemTypes[], scope: DeduplicationScope, options: ICheckProcessedOptions): Promise<void>;
    clearAllProcessedItems(scope: DeduplicationScope, options: ICheckProcessedOptions): Promise<void>;
    getProcessedDataCount(scope: DeduplicationScope, options: ICheckProcessedOptions): Promise<number>;
}

interface NodeHelperFunctions {
    copyBinaryFile(filePath: string, fileName: string, mimeType?: string): Promise<IBinaryData>;
}

// Request helper functions
export interface RequestHelperFunctions {
    httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
    httpRequestWithAuthentication(this: IAllExecuteFunctions, credentialsType: string, requestOptions: IHttpRequestOptions, additionalCredentialOptions?: IAdditionalCredentialOptions): Promise<any>;
    requestWithAuthenticationPaginated(this: IAllExecuteFunctions, requestOptions: IRequestOptions, itemIndex: number, paginationOptions: PaginationOptions, credentialsType?: string, additionalCredentialOptions?: IAdditionalCredentialOptions): Promise<any[]>;
    /** @deprecated Use .httpRequest instead */
    request(uriOrObject: string | IRequestOptions, options?: IRequestOptions): Promise<any>;
    /** @deprecated Use .httpRequestWithAuthentication instead */
    requestWithAuthentication(this: IAllExecuteFunctions, credentialsType: string, requestOptions: IRequestOptions, additionalCredentialOptions?: IAdditionalCredentialOptions, itemIndex?: number): Promise<any>;
    /** @deprecated Use .httpRequestWithAuthentication instead */
    requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: IRequestOptions): Promise<any>;
    /** @deprecated Use .httpRequestWithAuthentication instead */
    requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: IRequestOptions, oAuth2Options?: IOAuth2Options): Promise<any>;
    refreshOAuth2Token(this: IAllExecuteFunctions, credentialsType: string, oAuth2Options?: IOAuth2Options): Promise<any>;
}

// SSH types
export type SSHCredentials = {
    sshHost: string;
    sshPort: number;
    sshUser: string;
} & ({
    sshAuthenticateWith: 'password';
    sshPassword: string;
} | {
    sshAuthenticateWith: 'privateKey';
    privateKey: string;
    passphrase?: string;
});

export interface SSHTunnelFunctions {
    getSSHClient(credentials: SSHCredentials, abortController?: GenericAbortController): Promise<SSHClient>;
    updateLastUsed(client: SSHClient): void;
}

// Scheduling types
type CronUnit = number | '*' | `*/${number}`;
export type CronExpression = `${CronUnit} ${CronUnit} ${CronUnit} ${CronUnit} ${CronUnit} ${CronUnit}`;

type CronRecurrenceRule = {
    activated: false;
} | {
    activated: true;
    index: number;
    intervalSize: number;
    typeInterval: 'hours' | 'days' | 'weeks' | 'months';
};

export type CronContext = {
    nodeId: string;
    workflowId: string;
    timezone: string;
    expression: CronExpression;
    recurrence?: CronRecurrenceRule;
};

export type Cron = {
    expression: CronExpression;
    recurrence?: CronRecurrenceRule;
};

export interface SchedulingFunctions {
    registerCron(cron: Cron, onTick: () => void): void;
}

// Node type and version
export type NodeTypeAndVersion = {
    name: string;
    type: string;
    typeVersion: number;
    disabled: boolean;
    parameters?: INodeParameters;
};

// Functions base
export interface FunctionsBase {
    logger: Logger;
    getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string, itemIndex?: number): Promise<T>;
    getCredentialsProperties(type: string): INodeProperties[];
    getExecutionId(): string;
    getNode(): INode;
    getWorkflow(): IWorkflowMetadata;
    getWorkflowStaticData(type: string): IDataObject;
    getTimezone(): string;
    getRestApiUrl(): string;
    getInstanceBaseUrl(): string;
    getInstanceId(): string;
    getSignedResumeUrl(parameters?: Record<string, string>): string;
    setSignatureValidationRequired(): void;
    getChildNodes(nodeName: string, options?: { includeNodeParameters?: boolean }): NodeTypeAndVersion[];
    getParentNodes(nodeName: string, options?: { includeNodeParameters?: boolean; connectionType?: NodeConnectionType; depth?: number }): NodeTypeAndVersion[];
    getKnownNodeTypes(): IDataObject;
    getMode?: () => WorkflowExecuteMode;
    getActivationMode?: () => WorkflowActivateMode;
    getChatTrigger: () => INode | null;
    getExecutionContext: () => IExecutionContext | undefined;
    /** @deprecated */
    prepareOutputData(outputData: INodeExecutionData[]): Promise<INodeExecutionData[][]>;
}

type FunctionsBaseWithRequiredKeys<Keys extends keyof FunctionsBase> = FunctionsBase & {
    [K in Keys]: NonNullable<FunctionsBase[K]>;
};

// Context types
export type ContextType = 'flow' | 'node';

export type DataTableProxyProvider = {
    getDataTableAggregateProxy(workflow: Workflow, node: INode, projectId?: string): Promise<IDataTableProjectAggregateService>;
    getDataTableProxy(workflow: Workflow, node: INode, dataTableId: string, projectId?: string): Promise<IDataTableProjectService>;
};

export type DataTableProxyFunctions = {
    getDataTableAggregateProxy?(): Promise<IDataTableProjectAggregateService>;
    getDataTableProxy?(dataTableId: string): Promise<IDataTableProjectService>;
};

type BaseExecutionFunctions = FunctionsBaseWithRequiredKeys<'getMode'> & {
    continueOnFail(): boolean;
    setMetadata(metadata: ITaskMetadata): void;
    evaluateExpression(expression: string, itemIndex: number): NodeParameterValueType;
    getContext(type: ContextType): IContextObject;
    getExecuteData(): IExecuteData;
    getWorkflowDataProxy(itemIndex: number): IWorkflowDataProxyData;
    getInputSourceData(inputIndex?: number, connectionType?: NodeConnectionType): ISourceData;
    getExecutionCancelSignal(): AbortSignal | undefined;
    onExecutionCancellation(handler: () => unknown): void;
    logAiEvent(eventName: AiEvent, msg?: string): void;
};

// Execute functions interface
export type IExecuteFunctions = ExecuteFunctions.GetNodeParameterFn & BaseExecutionFunctions & {
    executeWorkflow(workflowInfo: IExecuteWorkflowInfo, inputData?: INodeExecutionData[], parentCallbackManager?: CallbackManager, options?: { doNotWaitToFinish?: boolean; parentExecution?: RelatedExecution }): Promise<ExecuteWorkflowData>;
    getExecutionDataById(executionId: string): Promise<IRunExecutionData | undefined>;
    getInputConnectionData(connectionType: AINodeConnectionType, itemIndex: number, inputIndex?: number): Promise<unknown>;
    getInputData(inputIndex?: number, connectionType?: NodeConnectionType): INodeExecutionData[];
    getNodeInputs(): INodeInputConfiguration[];
    getNodeOutputs(): INodeOutputConfiguration[];
    putExecutionToWait(waitTill: Date): Promise<void>;
    sendMessageToUI(message: any): void;
    sendResponse(response: IExecuteResponsePromiseData): void;
    sendChunk(type: import('./utility-types').ChunkType, itemIndex: number, content?: IDataObject | string): void;
    isStreaming(): boolean;
    addInputData(connectionType: NodeConnectionType, data: INodeExecutionData[][] | import('./utility-types').ExecutionError, runIndex?: number): { index: number };
    addOutputData(connectionType: NodeConnectionType, currentNodeRunIndex: number, data: INodeExecutionData[][] | import('./utility-types').ExecutionError, metadata?: ITaskMetadata, sourceNodeRunIndex?: number): void;
    addExecutionHints(...hints: NodeExecutionHint[]): void;
    nodeHelpers: NodeHelperFunctions;
    helpers: RequestHelperFunctions & BaseHelperFunctions & BinaryHelperFunctions & DeduplicationHelperFunctions & FileSystemHelperFunctions & SSHTunnelFunctions & DataTableProxyFunctions & {
        normalizeItems(items: INodeExecutionData | INodeExecutionData[]): INodeExecutionData[];
        constructExecutionMetaData(inputData: INodeExecutionData[], options: { itemData: IPairedItemData | IPairedItemData[] }): NodeExecutionWithMetadata[];
        assertBinaryData(itemIndex: number, parameterData: string | IBinaryData): IBinaryData;
        getBinaryDataBuffer(itemIndex: number, parameterData: string | IBinaryData): Promise<Buffer>;
        detectBinaryEncoding(buffer: Buffer): string;
        copyInputItems(items: INodeExecutionData[], properties: string[]): IDataObject[];
    };
    getParentCallbackManager(): CallbackManager | undefined;
    startJob<T = unknown, E = unknown>(jobType: string, settings: unknown, itemIndex: number): Promise<Result<T, E>>;
    getRunnerStatus(taskType: string): { available: true } | { available: false; reason?: string };
};

export interface IExecuteSingleFunctions extends BaseExecutionFunctions {
    getInputData(inputIndex?: number, connectionType?: NodeConnectionType): INodeExecutionData;
    getItemIndex(): number;
    getNodeParameter(parameterName: string, fallbackValue?: any, options?: IGetNodeParameterOptions): NodeParameterValueType | object;
    helpers: RequestHelperFunctions & BaseHelperFunctions & BinaryHelperFunctions & {
        assertBinaryData(propertyName: string, inputIndex?: number): IBinaryData;
        getBinaryDataBuffer(propertyName: string, inputIndex?: number): Promise<Buffer>;
        detectBinaryEncoding(buffer: Buffer): string;
    };
}

export type ISupplyDataFunctions = ExecuteFunctions.GetNodeParameterFn & FunctionsBaseWithRequiredKeys<'getMode'> & Pick<IExecuteFunctions, 'addInputData' | 'addOutputData' | 'getInputConnectionData' | 'getInputData' | 'getNodeOutputs' | 'executeWorkflow' | 'sendMessageToUI' | 'startJob' | 'helpers'> & {
    getNextRunIndex(): number;
    continueOnFail(): boolean;
    evaluateExpression(expression: string, itemIndex: number): NodeParameterValueType;
    getWorkflowDataProxy(itemIndex: number): IWorkflowDataProxyData;
    getExecutionCancelSignal(): AbortSignal | undefined;
    onExecutionCancellation(handler: () => unknown): void;
    logAiEvent(eventName: AiEvent, msg?: string): void;
    addExecutionHints(...hints: NodeExecutionHint[]): void;
    cloneWith(replacements: { runIndex: number; inputData: INodeExecutionData[][] }): ISupplyDataFunctions;
};

export interface IExecutePaginationFunctions extends IExecuteSingleFunctions {
    makeRoutingRequest(this: IAllExecuteFunctions, requestOptions: DeclarativeRestApiSettings.ResultOptions): Promise<INodeExecutionData[]>;
}

export interface ILoadOptionsFunctions extends FunctionsBase {
    getNodeParameter(parameterName: string, fallbackValue?: any, options?: IGetNodeParameterOptions): NodeParameterValueType | object;
    getCurrentNodeParameter(parameterName: string, options?: IGetNodeParameterOptions): NodeParameterValueType | object | undefined;
    getCurrentNodeParameters(): INodeParameters | undefined;
    helpers: RequestHelperFunctions & SSHTunnelFunctions & DataTableProxyFunctions;
}

export interface ILocalLoadOptionsFunctions {
    getWorkflowNodeContext(nodeType: string): Promise<IWorkflowNodeContext | null>;
}

export interface IWorkflowLoader {
    get(workflowId: string): Promise<IWorkflowBase>;
}

export interface IPollFunctions extends FunctionsBaseWithRequiredKeys<'getMode' | 'getActivationMode'> {
    __emit(data: INodeExecutionData[][], responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>, donePromise?: IDeferredPromise<IRun>): void;
    __emitError(error: Error, responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>): void;
    getNodeParameter(parameterName: string, fallbackValue?: any, options?: IGetNodeParameterOptions): NodeParameterValueType | object;
    helpers: RequestHelperFunctions & BaseHelperFunctions & BinaryHelperFunctions & SchedulingFunctions;
}

export interface ITriggerFunctions extends FunctionsBaseWithRequiredKeys<'getMode' | 'getActivationMode'> {
    emit(data: INodeExecutionData[][], responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>, donePromise?: IDeferredPromise<IRun>): void;
    emitError(error: Error, responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>): void;
    getNodeParameter(parameterName: string, fallbackValue?: any, options?: IGetNodeParameterOptions): NodeParameterValueType | object;
    helpers: RequestHelperFunctions & BaseHelperFunctions & BinaryHelperFunctions & SSHTunnelFunctions & SchedulingFunctions;
}

export interface IHookFunctions extends FunctionsBaseWithRequiredKeys<'getMode' | 'getActivationMode'> {
    getWebhookName(): string;
    getWebhookDescription(name: WebhookType): IWebhookDescription | undefined;
    getNodeWebhookUrl: (name: WebhookType) => string | undefined;
    getNodeParameter(parameterName: string, fallbackValue?: any, options?: IGetNodeParameterOptions): NodeParameterValueType | object;
    helpers: RequestHelperFunctions;
}

export interface IWebhookFunctions extends FunctionsBaseWithRequiredKeys<'getMode'> {
    getBodyData(): IDataObject;
    getHeaderData(): IncomingHttpHeaders;
    getInputConnectionData(connectionType: AINodeConnectionType, itemIndex: number, inputIndex?: number): Promise<unknown>;
    getNodeParameter(parameterName: string, fallbackValue?: any, options?: IGetNodeParameterOptions): NodeParameterValueType | object;
    getNodeWebhookUrl: (name: WebhookType) => string | undefined;
    evaluateExpression(expression: string, itemIndex?: number): NodeParameterValueType;
    getParamsData(): object;
    getQueryData(): object;
    getRequestObject(): express.Request;
    getResponseObject(): express.Response;
    getWebhookName(): string;
    nodeHelpers: NodeHelperFunctions;
    helpers: RequestHelperFunctions & BaseHelperFunctions & BinaryHelperFunctions;
}

// All execute functions union
export type IAllExecuteFunctions = IExecuteFunctions | IExecutePaginationFunctions | IExecuteSingleFunctions | ISupplyDataFunctions | IHookFunctions | ILoadOptionsFunctions | IPollFunctions | ITriggerFunctions | IWebhookFunctions;

// Field value option
export type FieldValueOption = {
    name: string;
    type: import('./node-types').FieldType | 'any';
};

export type IWorkflowNodeContext = ExecuteFunctions.GetNodeParameterFn & Pick<FunctionsBase, 'getNode' | 'getWorkflow'>;

// Post-receive actions
export interface IPostReceiveBase {
    type: string;
    enabled?: boolean | string;
    properties: {
        [key: string]: string | number | boolean | IDataObject;
    };
    errorMessage?: string;
}

export interface IPostReceiveBinaryData extends IPostReceiveBase {
    type: 'binaryData';
    properties: {
        destinationProperty: string;
    };
}

export interface IPostReceiveFilter extends IPostReceiveBase {
    type: 'filter';
    properties: {
        pass: boolean | string;
    };
}

export interface IPostReceiveLimit extends IPostReceiveBase {
    type: 'limit';
    properties: {
        maxResults: number | string;
    };
}

export interface IPostReceiveRootProperty extends IPostReceiveBase {
    type: 'rootProperty';
    properties: {
        property: string;
    };
}

export interface IPostReceiveSet extends IPostReceiveBase {
    type: 'set';
    properties: {
        value: string;
    };
}

export interface IPostReceiveSetKeyValue extends IPostReceiveBase {
    type: 'setKeyValue';
    properties: {
        [key: string]: string | number;
    };
}

export interface IPostReceiveSort extends IPostReceiveBase {
    type: 'sort';
    properties: {
        key: string;
    };
}

export type PostReceiveAction = ((this: IExecuteSingleFunctions, items: INodeExecutionData[], response: IN8nHttpFullResponse) => Promise<INodeExecutionData[]>) | IPostReceiveBinaryData | IPostReceiveFilter | IPostReceiveLimit | IPostReceiveRootProperty | IPostReceiveSet | IPostReceiveSetKeyValue | IPostReceiveSort;
export type PreSendAction = (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions) => Promise<IHttpRequestOptions>;

// Forward declarations for workflow types (to avoid circular deps)
export interface IWorkflowMetadata {
    id?: string;
    name?: string;
    active: boolean;
}

export type WorkflowActivateMode = 'init' | 'create' | 'update' | 'activate' | 'manual' | 'leadershipChange';

export interface IWorkflowBase {
    id: string;
    name: string;
    description?: string | null;
    active: boolean;
    isArchived: boolean;
    createdAt: Date;
    startedAt?: Date;
    updatedAt: Date;
    nodes: INode[];
    connections: IConnections;
    settings?: IWorkflowSettings;
    staticData?: IDataObject;
    pinData?: IPinData;
    versionId?: string;
    activeVersionId: string | null;
    versionCounter?: number;
    meta?: WorkflowFEMeta;
}

export interface IPinData {
    [nodeName: string]: INodeExecutionData[];
}

export interface IWorkflowSettings {
    timezone?: 'DEFAULT' | string;
    errorWorkflow?: string;
    callerIds?: string;
    callerPolicy?: WorkflowSettings.CallerPolicy;
    saveDataErrorExecution?: WorkflowSettings.SaveDataExecution;
    saveDataSuccessExecution?: WorkflowSettings.SaveDataExecution;
    saveManualExecutions?: 'DEFAULT' | boolean;
    saveExecutionProgress?: 'DEFAULT' | boolean;
    executionTimeout?: number;
    executionOrder?: 'v0' | 'v1';
    timeSavedPerExecution?: number;
    timeSavedMode?: 'fixed' | 'dynamic';
    availableInMCP?: boolean;
}

export declare namespace WorkflowSettings {
    type CallerPolicy = 'any' | 'none' | 'workflowsFromAList' | 'workflowsFromSameOwner';
    type SaveDataExecution = 'DEFAULT' | 'all' | 'none';
}

export interface WorkflowFEMeta {
    onboardingId?: string;
    templateId?: string;
    instanceId?: string;
    templateCredsSetupCompleted?: boolean;
}

// Task and run types
export interface IRun {
    data: IRunExecutionData;
    /** @deprecated Use status instead */
    finished?: boolean;
    mode: WorkflowExecuteMode;
    waitTill?: Date | null;
    startedAt: Date;
    stoppedAt?: Date;
    status: ExecutionStatus;
    jobId?: string;
}

export interface IRunData {
    [key: string]: ITaskData[];
}

export interface ITaskSubRunMetadata {
    node: string;
    runIndex: number;
}

export interface RelatedExecution {
    executionId: string;
    workflowId: string;
    shouldResume?: boolean;
    executionContext?: IExecutionContext;
}

type SubNodeExecutionDataAction = {
    nodeName: string;
    runIndex: number;
    action: any;
    response?: object;
};

export interface ITaskMetadata {
    subRun?: ITaskSubRunMetadata[];
    parentExecution?: RelatedExecution;
    subExecution?: RelatedExecution;
    subExecutionsCount?: number;
    subNodeExecutionData?: {
        actions: SubNodeExecutionDataAction[];
        metadata: object;
    };
    preserveSourceOverwrite?: boolean;
    nodeWasResumed?: boolean;
    timeSaved?: {
        minutes: number;
    };
}

export interface ITaskStartedData {
    startTime: number;
    executionIndex: number;
    source: Array<ISourceData | null>;
    hints?: NodeExecutionHint[];
}

export interface ITaskData extends ITaskStartedData {
    executionTime: number;
    executionStatus?: ExecutionStatus;
    data?: ITaskDataConnections;
    inputOverride?: ITaskDataConnections;
    error?: import('./utility-types').ExecutionError;
    metadata?: ITaskMetadata;
}

export interface ISourceData {
    previousNode: string;
    previousNodeOutput?: number;
    previousNodeRun?: number;
}

export interface StartNodeData {
    name: string;
    sourceData: ISourceData | null;
}

export interface ITaskDataConnections {
    [key: string]: Array<INodeExecutionData[] | null>;
}

export interface IWaitingForExecution {
    [key: string]: {
        [key: number]: ITaskDataConnections;
    };
}

export interface ITaskDataConnectionsSource {
    [key: string]: Array<ISourceData | null>;
}

export interface IWaitingForExecutionSource {
    [key: string]: {
        [key: number]: ITaskDataConnectionsSource;
    };
}

// Execute workflow data
export interface ExecuteWorkflowData {
    executionId: string;
    data: Array<INodeExecutionData[] | null>;
    waitTill?: Date | null;
}

// Node execution with metadata
export interface NodeExecutionWithMetadata extends INodeExecutionData {
    pairedItem: IPairedItemData | IPairedItemData[];
}

// AI events
export type AiEvent = 'ai-messages-retrieved-from-memory' | 'ai-message-added-to-memory' | 'ai-output-parsed' | 'ai-documents-retrieved' | 'ai-document-reranked' | 'ai-document-embedded' | 'ai-query-embedded' | 'ai-document-processed' | 'ai-text-split' | 'ai-tool-called' | 'ai-vector-store-searched' | 'ai-llm-generated-output' | 'ai-llm-errored' | 'ai-vector-store-populated' | 'ai-vector-store-updated';

// Workflow data proxy
export interface ProxyInput {
    all: () => INodeExecutionData[];
    context: any;
    first: () => INodeExecutionData | undefined;
    item: INodeExecutionData | undefined;
    last: () => INodeExecutionData | undefined;
    params?: INodeParameters;
}

export interface IWorkflowDataProxyData {
    [key: string]: any;
    $binary: INodeExecutionData['binary'];
    $data: any;
    $env: any;
    $evaluateExpression: (expression: string, itemIndex?: number) => NodeParameterValueType;
    $item: (itemIndex: number, runIndex?: number) => IWorkflowDataProxyData;
    $items: (nodeName?: string, outputIndex?: number, runIndex?: number) => INodeExecutionData[];
    $json: INodeExecutionData['json'];
    $node: any;
    $parameter: INodeParameters;
    $position: number;
    $workflow: any;
    $: any;
    $input: ProxyInput;
    $thisItem: any;
    $thisRunIndex: number;
    $thisItemIndex: number;
    $now: any;
    $today: any;
    $getPairedItem: (destinationNodeName: string, incomingSourceData: ISourceData | null, pairedItem: IPairedItemData) => INodeExecutionData | null;
    constructor: any;
}

export type IWorkflowDataProxyAdditionalKeys = IDataObject & {
    $execution?: {
        id: string;
        mode: 'test' | 'production';
        resumeUrl: string;
        resumeFormUrl: string;
        customData?: {
            set(key: string, value: string): void;
            setAll(obj: Record<string, string>): void;
            get(key: string): string;
            getAll(): Record<string, string>;
        };
    };
    $vars?: IDataObject;
    $secrets?: IDataObject;
    $pageCount?: number;
    /** @deprecated */
    $executionId?: string;
    /** @deprecated */
    $resumeWebhookUrl?: string;
};

// Workflow execute additional data
type AiEventPayload = {
    msg: string;
    workflowName: string;
    executionId: string;
    nodeName: string;
    workflowId?: string;
    nodeType?: string;
};

export interface AiAgentRequest {
    query: string | INodeParameters;
    tool: {
        name: string;
    };
}

export interface IWorkflowExecuteAdditionalData {
    credentialsHelper: import('./credential-types').ICredentialsHelper;
    executeWorkflow: (workflowInfo: IExecuteWorkflowInfo, additionalData: IWorkflowExecuteAdditionalData, options: ExecuteWorkflowOptions) => Promise<ExecuteWorkflowData>;
    getRunExecutionData: (executionId: string) => Promise<IRunExecutionData | undefined>;
    executionId?: string;
    restartExecutionId?: string;
    currentNodeExecutionIndex: number;
    httpResponse?: express.Response;
    httpRequest?: express.Request;
    streamingEnabled?: boolean;
    restApiUrl: string;
    instanceBaseUrl: string;
    setExecutionStatus?: (status: ExecutionStatus) => void;
    sendDataToUI?: (type: string, data: IDataObject | IDataObject[]) => void;
    formWaitingBaseUrl: string;
    webhookBaseUrl: string;
    webhookWaitingBaseUrl: string;
    webhookTestBaseUrl: string;
    currentNodeParameters?: INodeParameters;
    executionTimeoutTimestamp?: number;
    userId?: string;
    variables: IDataObject;
    logAiEvent: (eventName: AiEvent, payload: AiEventPayload) => void;
    parentCallbackManager?: CallbackManager;
    startRunnerTask<T, E = unknown>(additionalData: IWorkflowExecuteAdditionalData, jobType: string, settings: unknown, executeFunctions: IExecuteFunctions, inputData: ITaskDataConnections, node: INode, workflow: Workflow, runExecutionData: IRunExecutionData, runIndex: number, itemIndex: number, activeNodeName: string, connectionInputData: INodeExecutionData[], siblingParameters: INodeParameters, mode: WorkflowExecuteMode, envProviderState: import('./utility-types').EnvProviderState, executeData?: IExecuteData): Promise<Result<T, E>>;
    getRunnerStatus?(taskType: string): { available: true } | { available: false; reason?: string };
}

export interface ExecuteWorkflowOptions {
    node?: INode;
    parentWorkflowId: string;
    inputData?: INodeExecutionData[];
    loadedWorkflowData?: IWorkflowBase;
    loadedRunData?: IWorkflowExecutionDataProcess;
    parentWorkflowSettings?: IWorkflowSettings;
    parentCallbackManager?: CallbackManager;
    doNotWaitToFinish?: boolean;
    parentExecution?: RelatedExecution;
}

export interface IWorkflowExecutionDataProcess {
    destinationNode?: IDestinationNode;
    restartExecutionId?: string;
    executionMode: WorkflowExecuteMode;
    executionData?: IRunExecutionData;
    runData?: IRunData;
    pinData?: IPinData;
    retryOf?: string | null;
    pushRef?: string;
    startNodes?: StartNodeData[];
    workflowData: IWorkflowBase;
    userId?: string;
    projectId?: string;
    dirtyNodeNames?: string[];
    triggerToStartFrom?: {
        name: string;
        data?: ITaskData;
    };
    agentRequest?: AiAgentRequest;
    httpResponse?: express.Response;
    streamingEnabled?: boolean;
    startedAt?: Date;
}

export interface IDestinationNode {
    nodeName: string;
    mode: 'inclusive' | 'exclusive';
}

// Deduplication data
export interface IProcessedDataConfig {
    availableModes: string;
    mode: string;
}

export interface IDataDeduplicator {
    checkProcessedAndRecord(items: DeduplicationItemTypes[], context: DeduplicationScope, contextData: ICheckProcessedContextData, options: ICheckProcessedOptions): Promise<IDeduplicationOutput>;
    removeProcessed(items: DeduplicationItemTypes[], context: DeduplicationScope, contextData: ICheckProcessedContextData, options: ICheckProcessedOptions): Promise<void>;
    clearAllProcessedItems(context: DeduplicationScope, contextData: ICheckProcessedContextData, options: ICheckProcessedOptions): Promise<void>;
    getProcessedDataCount(context: DeduplicationScope, contextData: ICheckProcessedContextData, options: ICheckProcessedOptions): Promise<number>;
}

export interface ICheckProcessedContextData {
    node?: INode;
    workflow: {
        id: string;
        active: boolean;
    };
}
