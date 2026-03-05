/**
 * N8N Node Types
 * 
 * Types for node definitions, properties, parameters, and descriptions.
 */

import type {
    IDataObject,
    GenericValue,
    Logger,
    IUser,
    WorkflowExecuteMode,
    ExecutionStatus,
    CloseFunction,
} from './utility-types';

import type {
    IConnection,
    IConnections,
    INodeConnections,
    NodeInputConnections,
    IHttpRequestMethods,
    IHttpRequestOptions,
    IRequestOptions,
    IN8nRequestOperations,
    DeclarativeRestApiSettings,
    IExecuteFunctions,
    IWebhookFunctions,
    IHookFunctions,
    ITriggerFunctions,
    IPollFunctions,
    ILoadOptionsFunctions,
    ILocalLoadOptionsFunctions,
    IExecuteSingleFunctions,
    ISupplyDataFunctions,
    IContextObject,
    PostReceiveAction,
    PreSendAction,
    IRunNodeResponse,
    FieldValueOption,
    ISourceData,
} from './execution-types';

import type {
    IOAuth2Options,
    ICredentialType,
    ICredentialTestRequest,
    ICredentialTestFunctions,
} from './credential-types';

// Node connection types
export type ConnectionTypes = NodeConnectionType;

export const enum NodeConnectionType {
    Main = 'main',
    AiAgent = 'ai_agent',
    AiChain = 'ai_chain',
    AiDocument = 'ai_document',
    AiEmbedding = 'ai_embedding',
    AiLanguageModel = 'ai_languageModel',
    AiMemory = 'ai_memory',
    AiOutputParser = 'ai_outputParser',
    AiRetriever = 'ai_retriever',
    AiTextSplitter = 'ai_textSplitter',
    AiTool = 'ai_tool',
    AiVectorStore = 'ai_vectorStore',
    AiVectorRetriever = 'ai_vectorRetriever',
}

export type AINodeConnectionType = Exclude<NodeConnectionType, NodeConnectionType.Main>;

// Node interfaces
export interface INode {
    id: string;
    name: string;
    typeVersion: number;
    type: string;
    position: [number, number];
    disabled?: boolean;
    notes?: string;
    notesInFlow?: boolean;
    retryOnFail?: boolean;
    maxTries?: number;
    waitBetweenTries?: number;
    alwaysOutputData?: boolean;
    executeOnce?: boolean;
    onError?: 'continueErrorOutput' | 'continueRegularOutput' | 'stopWorkflow';
    continueOnFail?: boolean;
    parameters: INodeParameters;
    credentials?: INodeCredentials;
    webhookId?: string;
    extendsCredential?: string;
    pairedItem?: object;
}

export interface INodeParameters {
    [key: string]: NodeParameterValueType;
}

export type NodeParameterValue = string | number | boolean | undefined | null;

export type NodeParameterValueType = NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[];

export type MultiPartFormData = {
    body: IDataObject | FormData;
    headers: IDataObject;
};

export interface INodeCredentialsDetails {
    id: string | null;
    name: string;
}

export interface INodeCredentials {
    [key: string]: INodeCredentialsDetails;
}

// Field type
export type FieldType = 'string' | 'number' | 'boolean' | 'dateTime' | 'time' | 'object' | 'array' | 'options' | 'url' | 'jwt';

// Node property types
export type NodePropertyTypes = 'boolean' | 'collection' | 'color' | 'dateTime' | 'fixedCollection' | 'hidden' | 'json' | 'notice' | 'number' | 'options' | 'string' | 'button' | 'credentials' | 'resourceLocator' | 'curlImport' | 'resourceMapper' | 'filter' | 'assignmentCollection' | 'workflowSelector' | 'aiTransform' | 'credentialsSelect';

export type EditorTypes = 'codeNodeEditor' | 'htmlEditor' | 'sqlEditor' | 'jsonEditor' | 'aiTransformCode';

export type CodeAutocompleteTypes = 'function' | 'functionItem' | 'generatorFunction' | 'generatorFunctionItem';

export type CodeExecutionModes = 'runOnceForAllItems' | 'runOnceForEachItem';

// Node action type alias
export interface INodeActionTypeDescription extends INodeTypeDescription {
    displayOptions?: IDisplayOptions;
    values?: IDataObject;
    actionKey: string;
    codex?: {
        categories?: string[];
        subcategories?: {
            [subcategory: string]: string[];
        };
        resources?: {
            [resource: string]: string[];
        };
        alias?: string[];
    };
}

// Result of getNodeOutputs
export type GetNodeOutputsResult = Array<NodeConnectionType | INodeOutputConfiguration>;

// Node property interfaces
export interface INodePropertyOptions {
    name: string;
    value: string | number | boolean;
    action?: string;
    description?: string;
    routing?: INodePropertyRouting;
}

export interface INodePropertyOptionAction {
    type: 'multipleValues';
}

export interface INodePropertyCollection {
    displayName: string;
    name: string;
    values: INodeProperties[];
}

export type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends Array<infer I> ? Array<RecursivePartial<I>> : RecursivePartial<T[P]>;
};

export type DisplayConditionConditions = ['equals', NodeParameterValue] | ['notEquals', NodeParameterValue] | ['gt', NodeParameterValue] | ['gte', NodeParameterValue] | ['lt', NodeParameterValue] | ['lte', NodeParameterValue] | ['between', NodeParameterValue, NodeParameterValue] | ['includes', NodeParameterValue] | ['notIncludes', NodeParameterValue] | ['startsWith', NodeParameterValue] | ['notStartsWith', NodeParameterValue] | ['endsWith', NodeParameterValue] | ['notEndsWith', NodeParameterValue] | ['regex', NodeParameterValue];

export type DisplayCondition = {
    _cnd: {
        [key: string]: DisplayConditionConditions;
    };
};

export interface IDisplayOptions {
    hide?: {
        [key: string]: NodeParameterValue[] | undefined;
    };
    show?: {
        [key: string]: NodeParameterValue[] | DisplayCondition[] | undefined;
    };
    hideOnCloud?: boolean;
}

export interface ICredentialsDisplayOptions {
    hide?: {
        [key: string]: NodeParameterValue[] | undefined;
    };
    show?: {
        [key: string]: NodeParameterValue[] | undefined;
    };
    hideOnCloud?: boolean;
}

// Node input/output configuration
export interface INodeInputConfiguration {
    displayName?: string;
    maxConnections?: number;
    required?: boolean;
    type: NodeConnectionType;
    filter?: INodeInputFilter;
}

export interface INodeInputFilter {
    nodes: string[];
}

export interface INodeOutputConfiguration {
    category?: 'error';
    displayName?: string;
    maxConnections?: number;
    required?: boolean;
    type: NodeConnectionType;
}

// Node properties
export interface INodeProperties {
    displayName: string;
    name: string;
    type: NodePropertyTypes;
    typeOptions?: INodePropertyTypeOptions;
    default: NodeParameterValueType;
    description?: string;
    displayOptions?: IDisplayOptions;
    modes?: INodePropertyModeOption[];
    options?: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>;
    validateType?: FieldType;
    ignoreValidationDuringExecution?: boolean;
    placeholder?: string;
    hint?: string;
    isNodeSetting?: boolean;
    noDataExpression?: boolean;
    requiresDataPath?: 'single' | 'multiple';
    doNotInherit?: boolean;
    routing?: INodePropertyRouting;
    credentialTypes?: string[];
    extractValue?: INodePropertyValueExtractorBase & (INodePropertyValueExtractorFunction | INodePropertyValueExtractorRegex);
    disabledOptions?: INodePropertyDisabledOptions;
    singleSelectOptions?: INodePropertySingleSelectOptions;
}

export interface INodePropertySingleSelectOptions {
    showViewMore?: boolean;
    style: 'radio' | 'card';
}

export interface INodePropertyDisabledOptions {
    disabledIf?: {
        workflowSettings?: {
            [key: string]: boolean | string | number;
        };
    };
}

export interface INodePropertyModeOption {
    displayName: string;
    name: string;
    description?: string;
}

export interface INodePropertyModeTypeOptions {
    searchListMethod?: string;
    searchFilterRequired?: boolean;
    searchable?: boolean;
}

export interface INodePropertyTypeOptions {
    alwaysOpenEditWindow?: boolean;
    codeAutocomplete?: CodeAutocompleteTypes;
    editor?: EditorTypes;
    sqlDialect?: 'mssql' | 'mysql' | 'postgres' | 'mariadb' | 'sqlite' | 'standard';
    loadOptionsMethod?: string;
    loadOptionsDependsOn?: string[];
    loadWorkflowMethod?: string;
    multipleValues?: boolean;
    multipleValueButtonText?: string;
    numberPrecision?: number;
    numberStepSize?: number;
    minValue?: number;
    maxValue?: number;
    rows?: number;
    showAlpha?: boolean;
    sortable?: boolean;
    expirable?: boolean;
    resourceMapper?: ResourceMapperTypeOptions;
    filter?: FilterTypeOptions;
    assignment?: AssignmentCollectionTypeOptions;
    workflowSelector?: WorkflowSelectorTypeOptions;
    password?: boolean;
    mode?: {
        modes?: ResourceLocatorModes[];
    };
    canBeUsedToMatch?: boolean;
    action?: INodePropertyOptionAction;
}

export type ResourceLocatorModes = 'id' | 'url' | 'list' | 'name';

export interface ResourceMapperTypeOptions {
    resourceMapperMethod: string;
    mode: 'add' | 'update' | 'upsert' | 'map';
    valuesLabel?: string;
    fieldWords?: {
        singular: string;
        plural: string;
    };
    addAllFields?: boolean;
    noFieldsError?: string;
    multiKeyMatch?: boolean;
    matchingFieldsLabels?: {
        title?: string;
        description?: string;
        hint?: string;
    };
    supportAutoMap?: boolean;
    matchAllRequired?: boolean;
    fetchAllFields?: boolean;
}

export interface FilterTypeOptions {
    multipleValues?: boolean;
    leftValue?: string;
    caseSensitive?: 'enabled' | 'disabled' | 'default';
    typeValidation?: 'strict' | 'loose' | 'none';
    version?: 1 | 2;
}

export interface AssignmentCollectionTypeOptions {
    multipleValues?: boolean;
    includeInputFields?: boolean;
    sortable?: boolean;
}

export interface WorkflowSelectorTypeOptions {
    createField?: boolean;
    placeholder?: string;
}

// Value extraction
export interface INodePropertyValueExtractorBase {
    type: string;
}

export interface INodePropertyValueExtractorFunction extends INodePropertyValueExtractorBase {
    type: 'function';
    fnName: string;
}

export interface INodePropertyValueExtractorRegex extends INodePropertyValueExtractorBase {
    type: 'regex';
    regex: string | RegExp;
}

// Routing
export interface INodePropertyRouting {
    operations?: IN8nRequestOperations;
    output?: INodeRequestOutput;
    request?: DeclarativeRestApiSettings.HttpRequestOptions;
    send?: INodeRequestSend;
}

export interface INodeRequestOutput {
    maxResults?: number | string;
    postReceive?: PostReceiveAction[];
}

export interface INodeRequestSend {
    preSend?: PreSendAction[];
    paginate?: boolean | string;
    property?: string;
    propertyInDotNotation?: boolean;
    type?: 'body' | 'query';
    value?: string;
}

// Node execution hint
export interface NodeExecutionHint {
    message: string;
    location?: 'outputPane' | 'ndv';
    type?: 'info' | 'warning';
}

// Node execution data
export interface INodeExecutionData {
    [key: string]: IDataObject | NodeApiError | NodeOperationError | number | undefined | GenericValue | GenericValue[] | IDataObject[] | IBinaryKeyData;
    json: IDataObject;
    binary?: IBinaryKeyData;
    error?: NodeApiError | NodeOperationError;
    pairedItem?: IPairedItemData | IPairedItemData[] | number;
    index?: number;
}

export interface IPairedItemData {
    item: number;
    input?: number;
    sourceOverwrite?: ISourceData;
}

export interface IBinaryKeyData {
    [key: string]: import('./credential-types').IBinaryData;
}

// Node errors
export abstract class NodeError extends Error {
    node: INode;
    constructor(node: INode, message: string) {
        super(message);
        this.node = node;
    }
}

export class NodeOperationError extends NodeError {
    type: string = 'NodeOperationError';
    itemIndex?: number;
    context?: IDataObject;
    lineNumber?: number;
    description?: string | null;
    cause?: Error | JsonObject;
    timestamp: number;
    functionality: 'configuration-node' | 'regular' | 'pairedItem';
    
    constructor(node: INode, message: string | Error, options?: {
        itemIndex?: number;
        description?: string;
        runIndex?: number;
        messageMapping?: { [key: string]: string };
        functionality?: NodeOperationError['functionality'];
        level?: 'warning' | 'error';
        context?: IDataObject;
    }) {
        super(node, typeof message === 'string' ? message : message.message);
        this.itemIndex = options?.itemIndex;
        this.description = options?.description;
        this.context = options?.context;
        this.functionality = options?.functionality ?? 'regular';
        this.timestamp = Date.now();
        if (message instanceof Error) {
            this.cause = message;
        }
    }
}

export interface JsonObject {
    [key: string]: JsonValue;
}

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export class NodeApiError extends NodeError {
    httpCode: string | null;
    message: string;
    description: string | null;
    timestamp: number;
    cause: JsonObject;
    
    constructor(node: INode, error: JsonObject, options?: {
        message?: string;
        description?: string;
        httpCode?: string;
        parseXml?: boolean;
        runIndex?: number;
        itemIndex?: number;
        level?: 'warning' | 'error';
    }) {
        super(node, options?.message ?? 'Unknown error');
        this.httpCode = options?.httpCode ?? null;
        this.description = options?.description ?? null;
        this.timestamp = Date.now();
        this.cause = error;
        this.message = options?.message ?? 'Unknown error';
    }
}

// Node type description
export interface INodeTypeDescription {
    hidden?: boolean;
    displayName: string;
    name: string;
    group: NodeCreatorTag[];
    version: number | number[];
    description: string;
    defaults: INodeParameters;
    inputs: Array<NodeConnectionType | INodeInputConfiguration> | string;
    inputNames?: string[];
    outputs: Array<NodeConnectionType | INodeOutputConfiguration> | string;
    outputNames?: string[];
    properties: INodeProperties[];
    credentials?: INodeCredentialDescription[];
    icon?: IconRef;
    iconColor?: ThemeIconColor;
    iconUrl?: IconFile;
    badgeIconUrl?: IconFile;
    subtitle?: string;
    maxNodes?: number;
    polling?: boolean;
    requestDefaults?: DeclarativeRestApiSettings.HttpRequestOptions;
    requestOperations?: IN8nRequestOperations;
    hooks?: { [key: string]: INodeHookDescription[] };
    webhooks?: IWebhookDescription[];
    codex?: CodexData;
    eventTriggerDescription?: string;
    activationMessage?: string;
    triggerPanel?: TriggerPanelDefinition;
    extendsCredential?: string;
    hints?: NodeHint[];
    __loadOptionsMethods?: string[];
    usableAsTool?: boolean;
    parameterPane?: 'wide';
    actions?: INodeActionTypeDescription[];
}

export type ThemeIconColor = 'light-purple' | 'purple' | 'light-pink' | 'pink' | 'light-red' | 'red' | 'light-orange' | 'orange' | 'light-yellow' | 'yellow' | 'light-green' | 'green' | 'light-teal' | 'teal' | 'light-cyan' | 'cyan' | 'light-blue' | 'blue' | 'dark-blue';

export type NodeCreatorTag = 'recommended' | 'transform' | 'output' | 'input' | 'trigger' | 'schedule';

export interface TriggerPanelDefinition {
    header?: string;
    executionsHelp?: string | { active?: string; inactive?: string };
    activationHint?: string | { active?: string; inactive?: string };
    hideContent?: boolean;
}

export interface NodeHint {
    message: string;
    type?: 'info' | 'warning' | 'danger';
    location?: 'inputPane' | 'outputPane' | 'ndv';
    displayCondition?: string;
    whenToDisplay?: 'always' | 'beforeExecution' | 'afterExecution';
}

// Icon types
export type IconRef = `fa:${string}` | `node:${string}` | `file:${string}`;
export type IconFile = `${string}.png` | `${string}.svg`;
export type Icon = IconRef | IconFile;
export type Themed<T> = T | { light: T; dark: T };

// Loading types
export interface LoadingDetails {
    className?: string;
    sourcePath?: string;
}

export interface LoadedClass<T> {
    type: T;
    sourcePath: string;
}

// Webhook description
export type WebhookHttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type WebhookResponseMode = 'onReceived' | 'lastNode' | 'responseNode' | 'noResponseBody';
export type WebhookType = 'default' | string;

export interface IWebhookDescription {
    name: WebhookType;
    httpMethod: WebhookHttpMethod | string;
    responseMode: WebhookResponseMode | string;
    responseContentType?: string;
    responseBinaryPropertyName?: string;
    responseData?: 'allEntries' | 'firstEntryJson' | 'firstEntryBinary' | 'noData';
    isFullPath?: boolean;
    path: string;
    hasLifecycleMethods?: boolean;
    isForm?: boolean;
    restartWebhook?: boolean;
    ndvHideMethod?: boolean;
    ndvHideUrl?: boolean;
}

// Node hook description
export interface INodeHookDescription {
    method: string;
}

// Credential description
export interface INodeCredentialDescription {
    name: string;
    required?: boolean;
    displayOptions?: ICredentialsDisplayOptions;
    testedBy?: string | ICredentialTestRequest;
}

// Codex data
export interface CodexData {
    categories?: string[];
    subcategories?: { [category: string]: string[] };
    resources?: {
        primaryDocumentation?: ResourceLink[];
        credentialDocumentation?: ResourceLink[];
    };
    alias?: string[];
}

export interface ResourceLink {
    url: string;
    name?: string;
}

// Node type
export interface INodeType {
    description: INodeTypeDescription;
    supplyData?(this: ISupplyDataFunctions, itemIndex: number): Promise<IRunNodeResponse>;
    execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null>;
    poll?(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;
    trigger?(this: ITriggerFunctions): Promise<ITriggerResponse | undefined>;
    webhook?(this: IWebhookFunctions): Promise<IWebhookResponseData>;
    hooks?: {
        activate?(this: IHookFunctions): Promise<boolean>;
        deactivate?(this: IHookFunctions): Promise<boolean>;
    };
    methods?: {
        loadOptions?: { [key: string]: (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]> };
        listSearch?: { [key: string]: (this: ILoadOptionsFunctions, filter?: string, paginationToken?: string) => Promise<INodeListSearchResult> };
        resourceMapping?: { [key: string]: (this: ILoadOptionsFunctions) => Promise<ResourceMapperFields> };
        localResourceMapping?: { [key: string]: (this: ILocalLoadOptionsFunctions) => Promise<ResourceMapperFields> };
        credentialTest?: { [key: string]: (this: ICredentialTestFunctions, credential: import('./credential-types').ICredentialsDecrypted) => Promise<INodeCredentialTestResult> };
        actionHandler?: { [key: string]: (this: ILoadOptionsFunctions, payload: IDataObject | string) => Promise<INodePropertyOptions[]> };
    };
}

export interface IVersionedNodeType {
    nodeVersions: { [key: number]: INodeType };
    currentVersion: number;
    description: INodeTypeDescription;
    getNodeType: (version?: number) => INodeType;
}

// List search
export interface INodeListSearchResult {
    results: INodeListSearchItems[];
    paginationToken?: string;
}

export interface INodeListSearchItems {
    name: string;
    value: string;
    url?: string;
    icon?: string;
    breadcrumbs?: string[];
}

// Resource mapper
export interface ResourceMapperField {
    id: string;
    displayName: string;
    required?: boolean;
    defaultMatch: boolean;
    canBeUsedToMatch?: boolean;
    display: boolean;
    type?: FieldType | 'any';
    removed?: boolean;
    options?: INodePropertyOptions[];
    readOnly?: boolean;
}

export interface ResourceMapperFields {
    fields: ResourceMapperField[];
}

// Trigger response
export interface ITriggerResponse {
    closeFunction?: CloseFunction;
    manualTriggerFunction?: () => Promise<void>;
    manualTriggerResponse?: Promise<INodeExecutionData[][]>;
}

// Webhook response
export interface IWebhookResponseData {
    workflowData?: INodeExecutionData[][];
    webhookResponse?: IDataObject | IDataObject[] | string | number | Buffer | IncomingMessage;
    noWebhookResponse?: boolean;
}

declare class IncomingMessage {}

// Credential test
export interface INodeCredentialTestResult {
    status: 'OK' | 'Error';
    message: string;
}

// ICredentialTestFunctions is defined in credential-types.ts

// Filter types
export type FilterOperatorValue = 'exists' | 'notExists' | 'isTrue' | 'isFalse' | 'isEmpty' | 'isNotEmpty' | 'equals' | 'notEquals' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'contains' | 'notContains' | 'startsWith' | 'notStartsWith' | 'endsWith' | 'notEndsWith' | 'regex' | 'notRegex' | 'lengthEquals' | 'lengthGt' | 'lengthLt' | 'lengthGte' | 'lengthLte' | 'dateAfter' | 'dateBefore' | 'dateEquals';

export interface FilterOperator {
    type: FieldType | 'any';
    name: string;
    value: FilterOperatorValue;
    operation: (value: NodeParameterValue, filterValue: NodeParameterValue) => boolean;
    rightType?: FieldType;
    singleValue?: boolean;
    negatedOperation?: FilterOperatorValue;
}

export interface FilterConditionValue {
    leftValue: NodeParameterValue;
    rightValue?: NodeParameterValue | NodeParameterValue[];
    operator: FilterOperator;
}

export interface FilterValue {
    conditions: FilterConditionValue[];
    combinator: 'and' | 'or';
    options: {
        caseSensitive?: boolean;
        leftValue?: string;
        typeValidation?: 'strict' | 'loose' | 'none';
        version?: 1 | 2;
    };
}

// Execution summary
export interface ExecutionSummary {
    id: string;
    finished?: boolean;
    mode: WorkflowExecuteMode;
    retryOf?: string | null;
    retrySuccessId?: string | null;
    waitTill?: Date | null;
    startedAt: Date;
    stoppedAt?: Date;
    workflowId: string;
    workflowName?: string;
    status: ExecutionStatus;
    lastNodeExecuted?: string;
    executionError?: import('./utility-types').ExecutionError;
    nodeExecutionStatus?: {
        [key: string]: IExecutionSummaryNodeExecutionResult;
    };
}

export interface IExecutionSummaryNodeExecutionResult {
    executionStatus: ExecutionStatus;
    errors?: NodeError[];
    hints?: NodeExecutionHint[];
}
