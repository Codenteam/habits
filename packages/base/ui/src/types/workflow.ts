// Re-export all shared types from the root types folder
export * from '@habits/shared/types';

// Type aliases for backward compatibility with existing frontend code
export type { FrontendWorkflow as Workflow } from '@habits/shared/types';
