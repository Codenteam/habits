/**
 * N8N Credential Types
 * 
 * Types for credential management, authentication, and OAuth.
 */

import {
    IDataObject,
    Workflow,
    WorkflowExecuteMode,
    IRunExecutionData,
} from './utility-types';
import type { INode, INodeCredentialsDetails, INodeProperties } from './node-types';
import type { IExecuteData, IWorkflowExecuteAdditionalData, INodeExecutionData, IAllExecuteFunctions } from './execution-types';

// OAuth types
export interface IOAuth2Options {
    includeCredentialsOnRefreshOnBody?: boolean;
    property?: string;
    tokenType?: string;
    keepBearer?: boolean;
    tokenExpiredStatusCode?: number;
    keyToIncludeInAccessTokenHeader?: string;
}

export interface IAdditionalCredentialOptions {
    oauth2?: IOAuth2Options;
    credentialsDecrypted?: ICredentialsDecrypted;
}

// Binary data types
export type BinaryFileType = 'text' | 'json' | 'image' | 'audio' | 'video' | 'pdf' | 'html';

export interface IBinaryData {
    [key: string]: string | number | undefined;
    data: string;
    mimeType: string;
    fileType?: BinaryFileType;
    fileName?: string;
    directory?: string;
    fileExtension?: string;
    fileSize?: string;
    id?: string;
}

// Credential data types
export interface ICredentialDataDecryptedObject {
    [key: string]: CredentialInformation;
}

export type CredentialInformation = string | string[] | number | boolean | IDataObject | IDataObject[];

export interface ICredentialData {
    id?: string;
    name: string;
    data: string;
}

export interface ICredentialsDecrypted<T extends object = ICredentialDataDecryptedObject> {
    id: string;
    name: string;
    type: string;
    data?: T;
    homeProject?: import('./utility-types').ProjectSharingData;
    sharedWithProjects?: import('./utility-types').ProjectSharingData[];
    isGlobal?: boolean;
}

export interface ICredentialsEncrypted {
    id?: string;
    name: string;
    type: string;
    data?: string;
}

export interface ICredentialsExpressionResolveValues {
    connectionInputData: INodeExecutionData[];
    itemIndex: number;
    node: INode;
    runExecutionData: IRunExecutionData | null;
    runIndex: number;
    workflow: Workflow;
}

// Credential retrieval
export interface IGetCredentials {
    get(type: string, id: string | null): Promise<ICredentialsEncrypted>;
}

export declare abstract class ICredentials<T extends object = ICredentialDataDecryptedObject> {
    id?: string;
    name: string;
    type: string;
    data: string | undefined;
    constructor(nodeCredentials: INodeCredentialsDetails, type: string, data?: string);
    abstract getData(nodeType?: string): T;
    abstract getDataToSave(): ICredentialsEncrypted;
    abstract setData(data: T): void;
}

// HTTP request types for credentials
export interface IRequestOptionsSimplified {
    auth?: {
        username: string;
        password: string;
        sendImmediately?: boolean;
    };
    body: IDataObject;
    headers: IDataObject;
    qs: IDataObject;
}

export interface IRequestOptionsSimplifiedAuth {
    auth?: {
        username: string;
        password: string;
        sendImmediately?: boolean;
    };
    body?: IDataObject;
    headers?: IDataObject;
    qs?: IDataObject;
    url?: string;
    skipSslCertificateValidation?: boolean | string;
}

export interface IHttpRequestHelper {
    helpers: {
        httpRequest: IAllExecuteFunctions['helpers']['httpRequest'];
    };
}

// Credentials helper abstract class
export declare abstract class ICredentialsHelper {
    abstract getParentTypes(name: string): string[];
    abstract authenticate(
        credentials: ICredentialDataDecryptedObject,
        typeName: string,
        requestOptions: import('./execution-types').IHttpRequestOptions | IRequestOptionsSimplified,
        workflow: Workflow,
        node: INode
    ): Promise<import('./execution-types').IHttpRequestOptions>;
    abstract preAuthentication(
        helpers: IHttpRequestHelper,
        credentials: ICredentialDataDecryptedObject,
        typeName: string,
        node: INode,
        credentialsExpired: boolean
    ): Promise<ICredentialDataDecryptedObject | undefined>;
    abstract getCredentials(nodeCredentials: INodeCredentialsDetails, type: string): Promise<ICredentials>;
    abstract getDecrypted(
        additionalData: IWorkflowExecuteAdditionalData,
        nodeCredentials: INodeCredentialsDetails,
        type: string,
        mode: WorkflowExecuteMode,
        executeData?: IExecuteData,
        raw?: boolean,
        expressionResolveValues?: ICredentialsExpressionResolveValues
    ): Promise<ICredentialDataDecryptedObject>;
    abstract updateCredentials(
        nodeCredentials: INodeCredentialsDetails,
        type: string,
        data: ICredentialDataDecryptedObject
    ): Promise<void>;
    abstract updateCredentialsOauthTokenData(
        nodeCredentials: INodeCredentialsDetails,
        type: string,
        data: ICredentialDataDecryptedObject
    ): Promise<void>;
    abstract getCredentialsProperties(type: string): INodeProperties[];
}

// Authentication types
export interface IAuthenticateBase {
    type: string;
    properties: {
        [key: string]: string;
    } | IRequestOptionsSimplifiedAuth;
}

export interface IAuthenticateGeneric extends IAuthenticateBase {
    type: 'generic';
    properties: IRequestOptionsSimplifiedAuth;
}

export type IAuthenticate = 
    | ((credentials: ICredentialDataDecryptedObject, requestOptions: import('./execution-types').IHttpRequestOptions) => Promise<import('./execution-types').IHttpRequestOptions>)
    | IAuthenticateGeneric;

export interface IAuthenticateRuleBase {
    type: string;
    properties: {
        [key: string]: string | number;
    };
    errorMessage?: string;
}

export interface IAuthenticateRuleResponseCode extends IAuthenticateRuleBase {
    type: 'responseCode';
    properties: {
        value: number;
        message: string;
    };
}

export interface IAuthenticateRuleResponseSuccessBody extends IAuthenticateRuleBase {
    type: 'responseSuccessBody';
    properties: {
        message: string;
        key: string;
        value: any;
    };
}

// Credential types registry
export interface ICredentialTypes {
    recognizes(credentialType: string): boolean;
    getByName(credentialType: string): ICredentialType;
    getSupportedNodes(type: string): string[];
    getParentTypes(typeName: string): string[];
}

// Credential type definition
type ICredentialHttpRequestNode = {
    name: string;
    docsUrl: string;
    hidden?: boolean;
} & ({
    apiBaseUrl: string;
} | {
    apiBaseUrlPlaceholder: string;
});

export interface ICredentialType {
    name: string;
    displayName: string;
    icon?: import('./node-types').Icon;
    iconColor?: import('./node-types').ThemeIconColor;
    iconUrl?: import('./node-types').Themed<string>;
    iconBasePath?: string;
    extends?: string[];
    properties: INodeProperties[];
    documentationUrl?: string;
    __overwrittenProperties?: string[];
    authenticate?: IAuthenticate;
    preAuthentication?: (
        this: IHttpRequestHelper,
        credentials: ICredentialDataDecryptedObject
    ) => Promise<IDataObject>;
    test?: ICredentialTestRequest;
    genericAuth?: boolean;
    httpRequestNode?: ICredentialHttpRequestNode;
    supportedNodes?: string[];
}

// Credential testing types
export interface ICredentialTestRequest {
    request: import('./execution-types').DeclarativeRestApiSettings.HttpRequestOptions;
    rules?: IAuthenticateRuleResponseCode[] | IAuthenticateRuleResponseSuccessBody[];
}

export interface ICredentialTestRequestData {
    nodeType?: import('./node-types').INodeType;
    testRequest: ICredentialTestRequest;
}

export type ICredentialTestFunction = (
    this: ICredentialTestFunctions,
    credential: ICredentialsDecrypted<ICredentialDataDecryptedObject>
) => Promise<import('./node-types').INodeCredentialTestResult>;

export interface ICredentialTestFunctions {
    logger: import('./utility-types').Logger;
    helpers: import('./execution-types').SSHTunnelFunctions & {
        request: (uriOrObject: string | object, options?: object) => Promise<any>;
    };
}

// Credential type data loading
export type CredentialLoadingDetails = import('./node-types').LoadingDetails & {
    supportedNodes?: string[];
    extends?: string[];
};

export type ICredentialTypeData = Record<string, import('./node-types').LoadedClass<ICredentialType>>;
