import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CanvasNode, CanvasEdge } from '@ha-bits/core';
import type { Workflow, AvailableModuleDefinition } from '@habits/shared/types';
import type { PieceSchema, FormValue, FormErrors } from '../../lib/formBuilder/types';
import type { ExtractedConnection } from '../../lib/workflowConverter';
import { extractSchemaHabit } from '../../lib/habitExtractor';
import { validateHabits, validateHabit, type HabitValidationError } from '../validation';
import { generateExportBundle, envVariablesToString, type ServerOptions } from '../../lib/exportUtils';
import { ExportBundle } from '@habits/shared/types';

// Polyfill for crypto.randomUUID (not available in non-secure contexts)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface ModuleSchema {
  displayName: string;
  name: string;
  description?: string;
  properties: Array<{
    displayName: string;
    name: string;
    type: string;
    required?: boolean;
    default?: any;
    options?: Array<{ name: string; value: any }>;
    description?: string;
  }>;
  credentials?: Array<{
    name: string;
    displayName: string;
    properties: any[];
  }>;
  resources?: Record<string, string[]>;
  actions: any;
}

// Field state for individual form fields within a node
interface FieldState {
  value: any;
  error?: string | string[];
  isDirty: boolean;
  isLoading: boolean;
  options?: Array<{ label: string; value: any }>;
}

// Form state attached to each node
interface NodeFormState {
  fields: Record<string, FieldState>;
  formValues: FormValue;
  formErrors: FormErrors;
  selectedAction: string | null;
  schema: PieceSchema | null;
  loadingSchema: boolean;
  isSubmitting: boolean;
  isValidating: boolean;
  optionsCache: Record<string, Array<{ label: string; value: any }>>;
  refreshingFields: string[];
}

// Default form state for new nodes
const createDefaultNodeFormState = (): NodeFormState => ({
  fields: {},
  formValues: {},
  formErrors: {},
  selectedAction: null,
  schema: null,
  loadingSchema: false,
  isSubmitting: false,
  isValidating: false,
  optionsCache: {},
  refreshingFields: [],
});

// NodeConfig type for form state
interface NodeConfig {
  label: string;
  module: string;
  credentials: Record<string, any>;
  params: Record<string, any>;
  // Form state is now part of the node data, accessed via node.data.formState
}

// Environment variable with reveal state for UI
export interface EnvVariable {
  value: string;
  revealed: boolean;
  comment?: string; // One or more lines of comments (without # prefix)
}

// Habit represents a single habit/workflow in the stack
// Each habit contains its own nodes, edges, and editing state
interface Habit {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNode: CanvasNode | null;
  nodeConfig: NodeConfig | null;
  envConnections?: ExtractedConnection[]; // Environment variable connections for .env
  envVariables: Record<string, EnvVariable>; // Environment variables loaded from .env
  output?: Record<string, string>; // Habit-level output mappings (e.g., output: { recipes: "{{query.results}}" })
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowState {
  // Stack of habits (multiple workflows)
  habits: Habit[];
  activeHabitId: string | null;
  stackName: string;
  stackDescription: string;
  
  // Server/deploy configuration
  serverConfig: {
    port: number;
    openapi: boolean;
    webhookTimeout: number;
    // Security configuration
    security: {
      dlpEnabled: boolean;
      dlpIcapUrl: string;
      dlpIcapTimeout: number;
      piiProtection: '' | 'log' | 'eradicate' | 'replace';
      moderationEnabled: boolean;
      policyEnabled: boolean;
      capabilitiesEnabled: boolean;
    };
  };
  
  // Available modules (shared across all habits)
  availableModules: AvailableModuleDefinition[];
  
  // Module schemas and availability (shared across all habits)
  moduleSchemas: Record<string, ModuleSchema>;
  moduleAvailability: Record<string, boolean>;
  loadingStates: Record<string, boolean>;
  errors: Record<string, string>;
  
  itemType?: string;
  
  // Legacy: Keep workflow for backward compatibility
  workflow: Workflow;
}

const createDefaultHabit = (): Habit => ({
  id: generateUUID(),
  name: 'New Habit',
  description: '',
  nodes: [],
  edges: [],
  selectedNode: null,
  nodeConfig: null,
  envConnections: [],
  envVariables: {},
  output: {},
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const defaultWorkflow: Workflow = {
  id: generateUUID(),
  name: 'New Workflow',
  description: '',
  nodes: [],
  edges: [],
  version: '1.0.0',
};

const initialHabit = createDefaultHabit();

const initialState: WorkflowState = {
  // New habits stack
  habits: [initialHabit],
  activeHabitId: initialHabit.id,
  stackName: "Stack Name",
  stackDescription: "",
  // Server/deploy configuration
  serverConfig: {
    port: 15000,
    openapi: true,
    webhookTimeout: 30000,
    // Security configuration (all disabled by default)
    security: {
      dlpEnabled: false,
      dlpIcapUrl: '',
      dlpIcapTimeout: 5000,
      piiProtection: '',
      moderationEnabled: false,
      policyEnabled: false,
      capabilitiesEnabled: false,
    },
  },
  
  // Modules (shared across habits)
  availableModules: [],
  moduleSchemas: {},
  moduleAvailability: {},
  loadingStates: {},
  errors: {},
  
  // Legacy
  workflow: defaultWorkflow,
};

// Helper to get the active habit from state
const getActiveHabit = (state: WorkflowState): Habit | undefined => {
  return state.habits.find(h => h.id === state.activeHabitId);
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<CanvasNode[]>) => {
      const habit = getActiveHabit(state);
      if (habit) {
        habit.nodes = action.payload;
        habit.updatedAt = new Date().toISOString();
      }
    },
    
    setEdges: (state, action: PayloadAction<CanvasEdge[]>) => {
      const habit = getActiveHabit(state);
      if (habit) {
        habit.edges = action.payload;
        habit.updatedAt = new Date().toISOString();
      }
    },
    
    addNode: (state, action: PayloadAction<CanvasNode>) => {
      const habit = getActiveHabit(state);
      if (habit) {
        habit.nodes.push(action.payload);
        habit.updatedAt = new Date().toISOString();
      }
    },
    
    updateNode: (state, action: PayloadAction<{ nodeId: string; data: Partial<CanvasNode['data']> }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, data } = action.payload;
      const nodeIndex = habit.nodes.findIndex(node => node.id === nodeId);
      
      if (nodeIndex !== -1) {
        habit.nodes[nodeIndex] = {
          ...habit.nodes[nodeIndex],
          data: { ...habit.nodes[nodeIndex].data, ...data }
        };
        
        // If updating the selected node, also update nodeConfig and selectedNode
        if (habit.selectedNode?.id === nodeId) {
          if (habit.nodeConfig) {
            Object.assign(habit.nodeConfig, data);
          }
          // Also update selectedNode.data to keep it in sync
          habit.selectedNode = {
            ...habit.selectedNode,
            data: { ...habit.selectedNode.data, ...data }
          };
        }
        habit.updatedAt = new Date().toISOString();
      }
    },

    updateNodeId: (state, action: PayloadAction<{ oldId: string; newId: string }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { oldId, newId } = action.payload;
      
      // Check if new ID already exists
      if (habit.nodes.some(node => node.id === newId)) {
        console.warn(`Node ID "${newId}" already exists`);
        return;
      }
      
      // Update node ID
      const nodeIndex = habit.nodes.findIndex(node => node.id === oldId);
      if (nodeIndex !== -1) {
        habit.nodes[nodeIndex] = {
          ...habit.nodes[nodeIndex],
          id: newId,
        };
        
        // Update edges that reference this node
        habit.edges = habit.edges.map(edge => ({
          ...edge,
          id: edge.id.replace(oldId, newId),
          source: edge.source === oldId ? newId : edge.source,
          target: edge.target === oldId ? newId : edge.target,
        }));
        
        // Update selected node if it's the one being renamed
        if (habit.selectedNode?.id === oldId) {
          habit.selectedNode = { ...habit.selectedNode, id: newId };
        }
        
        habit.updatedAt = new Date().toISOString();
      }
    },
    
    deleteNode: (state, action: PayloadAction<string>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const nodeId = action.payload;
      habit.nodes = habit.nodes.filter(node => node.id !== nodeId);
      habit.edges = habit.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
      
      if (habit.selectedNode?.id === nodeId) {
        habit.selectedNode = null;
        habit.nodeConfig = null;
      }
      habit.updatedAt = new Date().toISOString();
    },
    
    setSelectedNode: (state, action: PayloadAction<CanvasNode | null>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const node = action.payload;
      habit.selectedNode = node;
      
      habit.nodeConfig = node ? {
        label: node.data.label || '',
        module: node.data.module || '',
        credentials: node.data.credentials || {},
        params: node.data.params || {},
      } : null;
    },
    
    setWorkflowName: (state, action: PayloadAction<string>) => {
      state.stackName = action.payload;
    },
    
    setStackDescription: (state, action: PayloadAction<string>) => {
      state.stackDescription = action.payload;
    },
    
    setWorkflowDescription: (state, action: PayloadAction<string>) => {
      state.workflow.description = action.payload;
    },
    
    loadWorkflow: (state, action: PayloadAction<Workflow>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const workflow = action.payload;
      const nodes = workflow.nodes.map((node, index) => ({
        id: node.id,
        type: 'custom',
        // Provide default position if missing (layout nodes vertically with spacing)
        position: node.position || { x: 100 + (index % 3) * 300, y: 100 + Math.floor(index / 3) * 200 },
        data: node.data,
      }));
      
      state.workflow = workflow;
      habit.nodes = nodes;
      habit.edges = workflow.edges || [];
      habit.selectedNode = null;
      habit.nodeConfig = null;
      // Use the workflow's original ID if available
      if (workflow.id) {
        habit.id = workflow.id;
        state.activeHabitId = workflow.id;
      }
      habit.name = workflow.name;
      habit.description = workflow.description || '';
      habit.updatedAt = new Date().toISOString();
    },
    
    clearWorkflow: (state) => {
      // Create a fresh habit and reset the entire habits list
      const newHabit = createDefaultHabit();
      state.habits = [newHabit];
      state.activeHabitId = newHabit.id;
      
      // Reset shared state
      state.workflow = { ...defaultWorkflow, id: generateUUID() };
      state.moduleSchemas = {};
      state.moduleAvailability = {};
      state.loadingStates = {};
      state.errors = {};
    },
    
    setAvailableModules: (state, action: PayloadAction<AvailableModuleDefinition[]>) => {
      state.availableModules = action.payload;
    },
    
    setModuleSchema: (state, action: PayloadAction<{ moduleKey: string; schema: ModuleSchema }>) => {
      const { moduleKey, schema } = action.payload;
      state.moduleSchemas[moduleKey] = schema;
    },
    
    setModuleAvailability: (state, action: PayloadAction<{ moduleKey: string; available: boolean }>) => {
      const { moduleKey, available } = action.payload;
      state.moduleAvailability[moduleKey] = available;
    },
    
    setLoadingState: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      const { key, loading } = action.payload;
      state.loadingStates[key] = loading;
    },
    
    setError: (state, action: PayloadAction<{ key: string; error: string }>) => {
      const { key, error } = action.payload;
      state.errors[key] = error;
    },
    
    clearError: (state, action: PayloadAction<string>) => {
      delete state.errors[action.payload];
    },
    
    setNodeConfig: (state, action: PayloadAction<NodeConfig | null>) => {
      const habit = getActiveHabit(state);
      if (habit) {
        habit.nodeConfig = action.payload;
      }
    },
    
    updateNodeConfig: (state, action: PayloadAction<Partial<NodeConfig>>) => {
      const habit = getActiveHabit(state);
      if (habit?.nodeConfig) {
        Object.assign(habit.nodeConfig, action.payload);
      }
    },
    
    clearNodeConfig: (state) => {
      const habit = getActiveHabit(state);
      if (habit) {
        habit.nodeConfig = null;
      }
    },
    
    // ===== NODE FORM STATE MANAGEMENT =====
    // These actions update form state on individual nodes
    
    // Initialize or get form state for a node
    initializeNodeFormState: (state, action: PayloadAction<string>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const nodeId = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node && !node.data.formState) {
        node.data.formState = createDefaultNodeFormState();
      }
    },
    
    // Set schema for a node
    setNodeSchema: (state, action: PayloadAction<{ nodeId: string; schema: PieceSchema | null }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, schema } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        node.data.formState.schema = schema;
      }
    },
    
    // Set loading schema state for a node
    setNodeLoadingSchema: (state, action: PayloadAction<{ nodeId: string; loading: boolean }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, loading } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        node.data.formState.loadingSchema = loading;
      }
    },
    
    // Set selected action for a node
    setNodeSelectedAction: (state, action: PayloadAction<{ nodeId: string; selectedAction: string | null }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, selectedAction } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        node.data.formState.selectedAction = selectedAction;
        
        // Sync to node.data.params
        if (!node.data.params) {
          node.data.params = {};
        }
        node.data.params._action = selectedAction;
      }
    },
    
    // Set form values for a node
    setNodeFormValues: (state, action: PayloadAction<{ nodeId: string; formValues: FormValue }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, formValues } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        node.data.formState.formValues = formValues;
        
        // Sync to node.data.params (exclude auth - stored separately as credential reference)
        if (!node.data.params) {
          node.data.params = {};
        }
        Object.entries(formValues).forEach(([key, value]) => {
          // Skip auth field - credentials should not be stored in params
          if (key === 'auth') return;
          node.data.params[key] = value;
        });
      }
    },
    
    // Set a single form value for a node
    setNodeFormValue: (state, action: PayloadAction<{ nodeId: string; key: string; value: any }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, key, value } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        node.data.formState.formValues[key] = value;
        
        // Sync to node.data.params (skip auth - stored separately as credential reference)
        if (key !== 'auth') {
          if (!node.data.params) {
            node.data.params = {};
          }
          node.data.params[key] = value;
        }
      }
    },
    
    // Set form errors for a node
    setNodeFormErrors: (state, action: PayloadAction<{ nodeId: string; formErrors: FormErrors }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, formErrors } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        node.data.formState.formErrors = formErrors;
      }
    },
    
    // Set field value for a node
    setNodeFieldValue: (state, action: PayloadAction<{ nodeId: string; fieldId: string; value: any }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, fieldId, value } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        if (!node.data.formState.fields[fieldId]) {
          node.data.formState.fields[fieldId] = { value: '', isDirty: false, isLoading: false };
        }
        node.data.formState.fields[fieldId].value = value;
        node.data.formState.fields[fieldId].isDirty = true;
        
        // Sync to node.data.params
        if (!node.data.params) {
          node.data.params = {};
        }
        node.data.params[fieldId] = value;
      }
    },
    
    // Set field loading state for a node
    setNodeFieldLoading: (state, action: PayloadAction<{ nodeId: string; fieldId: string; loading: boolean }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, fieldId, loading } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        if (!node.data.formState.fields[fieldId]) {
          node.data.formState.fields[fieldId] = { value: '', isDirty: false, isLoading: false };
        }
        node.data.formState.fields[fieldId].isLoading = loading;
      }
    },
    
    // Set field options for a node
    setNodeFieldOptions: (state, action: PayloadAction<{ nodeId: string; fieldId: string; options: Array<{ label: string; value: any }> }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, fieldId, options } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        if (!node.data.formState.fields[fieldId]) {
          node.data.formState.fields[fieldId] = { value: '', isDirty: false, isLoading: false };
        }
        node.data.formState.fields[fieldId].options = options;
      }
    },
    
    // Set cached options for a node
    setNodeCachedOptions: (state, action: PayloadAction<{ nodeId: string; key: string; options: Array<{ label: string; value: any }> }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, key, options } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        node.data.formState.optionsCache[key] = options;
      }
    },
    
    // Set field refreshing state for a node
    setNodeFieldRefreshing: (state, action: PayloadAction<{ nodeId: string; fieldId: string; refreshing: boolean }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, fieldId, refreshing } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        if (refreshing) {
          if (!node.data.formState.refreshingFields.includes(fieldId)) {
            node.data.formState.refreshingFields.push(fieldId);
          }
        } else {
          node.data.formState.refreshingFields = node.data.formState.refreshingFields.filter((id: string) => id !== fieldId);
        }
      }
    },
    
    // Reset form state for a node
    resetNodeFormState: (state, action: PayloadAction<string>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const nodeId = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        node.data.formState = createDefaultNodeFormState();
      }
    },
    
    // Set submitting state for a node
    setNodeSubmitting: (state, action: PayloadAction<{ nodeId: string; submitting: boolean }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, submitting } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        node.data.formState.isSubmitting = submitting;
      }
    },
    
    // Set validating state for a node
    setNodeValidating: (state, action: PayloadAction<{ nodeId: string; validating: boolean }>) => {
      const habit = getActiveHabit(state);
      if (!habit) return;
      
      const { nodeId, validating } = action.payload;
      const node = habit.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.data.formState) {
          node.data.formState = createDefaultNodeFormState();
        }
        node.data.formState.isValidating = validating;
      }
    },
    
    // ===== HABITS STACK MANAGEMENT =====
    
    // Add a new habit to the stack
    addHabit: (state, action: PayloadAction<Partial<Habit> | undefined>) => {
      const newHabit: Habit = {
        ...createDefaultHabit(),
        ...action.payload,
      };
      state.habits.push(newHabit);
      state.activeHabitId = newHabit.id;
    },
    
    // Remove a habit from the stack
    removeHabit: (state, action: PayloadAction<string>) => {
      const habitId = action.payload;
      state.habits = state.habits.filter(h => h.id !== habitId);
      
      // If we removed the active habit, switch to another one
      if (state.activeHabitId === habitId) {
        const firstHabit = state.habits[0];
        if (firstHabit) {
          state.activeHabitId = firstHabit.id;
        } else {
          // No habits left, create a new one
          const newHabit = createDefaultHabit();
          state.habits.push(newHabit);
          state.activeHabitId = newHabit.id;
        }
      }
    },
    
    // Switch to a different habit
    setActiveHabit: (state, action: PayloadAction<string>) => {
      const habitId = action.payload;
      const habit = state.habits.find(h => h.id === habitId);
      
      if (habit) {
        // Simply switch to new habit - no need to sync since state is inside habit
        state.activeHabitId = habitId;
      }
    },
    
    // Update habit metadata
    updateHabit: (state, action: PayloadAction<{ habitId: string; updates: Partial<Habit> }>) => {
      const { habitId, updates } = action.payload;
      const habit = state.habits.find(h => h.id === habitId);
      if (habit) {
        // If the ID is being changed and this is the active habit, update activeHabitId
        if (updates.id && updates.id !== habitId && state.activeHabitId === habitId) {
          state.activeHabitId = updates.id;
        }
        Object.assign(habit, updates, { updatedAt: new Date().toISOString() });
      }
    },
    
    // Set habit name (for active habit)
    setHabitName: (state, action: PayloadAction<string>) => {
      const habit = state.habits.find(h => h.id === state.activeHabitId);
      if (habit) {
        habit.name = action.payload;
        habit.updatedAt = new Date().toISOString();
      }
      // Also update legacy workflow
      state.workflow.name = action.payload;
    },
    
    // Set habit description (for active habit)
    setHabitDescription: (state, action: PayloadAction<string>) => {
      const habit = state.habits.find(h => h.id === state.activeHabitId);
      if (habit) {
        habit.description = action.payload;
        habit.updatedAt = new Date().toISOString();
      }
      // Also update legacy workflow
      state.workflow.description = action.payload;
    },
    
    // Save environment connections to active habit
    setHabitEnvConnections: (state, action: PayloadAction<ExtractedConnection[]>) => {
      const habit = getActiveHabit(state);
      if (habit) {
        habit.envConnections = action.payload;
        habit.updatedAt = new Date().toISOString();
      }
    },
    
    // Set habit output mappings (for active habit)
    setHabitOutput: (state, action: PayloadAction<Record<string, string>>) => {
      const habit = getActiveHabit(state);
      if (habit) {
        habit.output = action.payload;
        habit.updatedAt = new Date().toISOString();
      }
    },
    
    // Environment variables management
    setEnvVariables: (state, action: PayloadAction<Record<string, string | { value: string; comment?: string }>>) => {
      const habit = getActiveHabit(state);
      if (habit) {
        // Convert to EnvVariable objects, handling both string and object inputs
        habit.envVariables = Object.fromEntries(
          Object.entries(action.payload).map(([key, data]) => [
            key,
            typeof data === 'string'
              ? { value: data, revealed: false }
              : { value: data.value, revealed: false, comment: data.comment }
          ])
        );
        habit.updatedAt = new Date().toISOString();
      }
    },
    
    updateEnvVariable: (state, action: PayloadAction<{ key: string; value: string; comment?: string }>) => {
      const habit = getActiveHabit(state);
      if (habit) {
        // Initialize envVariables if it doesn't exist (for backward compatibility)
        if (!habit.envVariables) {
          habit.envVariables = {};
        }
        const existing = habit.envVariables[action.payload.key];
        habit.envVariables[action.payload.key] = {
          value: action.payload.value,
          revealed: existing?.revealed ?? false,
          comment: action.payload.comment ?? existing?.comment,
        };
        habit.updatedAt = new Date().toISOString();
      }
    },
    
    addEnvVariable: (state, action: PayloadAction<{ key: string; value: string; comment?: string }>) => {
      const habit = getActiveHabit(state);
      if (habit) {
        // Initialize envVariables if it doesn't exist (for backward compatibility)
        if (!habit.envVariables) {
          habit.envVariables = {};
        }
        habit.envVariables[action.payload.key] = {
          value: action.payload.value,
          revealed: false,
          comment: action.payload.comment,
        };
        habit.updatedAt = new Date().toISOString();
      }
    },
    
    removeEnvVariable: (state, action: PayloadAction<string>) => {
      const habit = getActiveHabit(state);
      if (habit && habit.envVariables) {
        delete habit.envVariables[action.payload];
        habit.updatedAt = new Date().toISOString();
      }
    },
    
    toggleEnvVariableReveal: (state, action: PayloadAction<string>) => {
      const habit = getActiveHabit(state);
      if (habit && habit.envVariables && habit.envVariables[action.payload]) {
        habit.envVariables[action.payload].revealed = !habit.envVariables[action.payload].revealed;
      }
    },
    
    // syncActiveHabit is no longer needed since state is now inside each habit
    // Keeping for backward compatibility but it's a no-op
    syncActiveHabit: (_state) => {
      // No-op: state is already inside the habit object
    },
    
    // Server config management
    setServerConfig: (state, action: PayloadAction<Partial<typeof initialState.serverConfig>>) => {
      // Deep merge for nested security object
      if (action.payload.security) {
        state.serverConfig.security = {
          ...state.serverConfig.security,
          ...action.payload.security,
        };
        const { security, ...rest } = action.payload;
        Object.assign(state.serverConfig, rest);
      } else {
        Object.assign(state.serverConfig, action.payload);
      }
    },
    
    // Restore entire workflow state from localStorage
    restoreWorkflowState: (state, action: PayloadAction<Partial<WorkflowState>>) => {
      const savedState = action.payload;
      if (savedState.habits) state.habits = savedState.habits;
      if (savedState.activeHabitId) state.activeHabitId = savedState.activeHabitId;
      if (savedState.workflow) state.workflow = savedState.workflow;
      if (savedState.availableModules) state.availableModules = savedState.availableModules;
      if (savedState.moduleSchemas) state.moduleSchemas = savedState.moduleSchemas;
      if (savedState.moduleAvailability) state.moduleAvailability = savedState.moduleAvailability;
      if (savedState.serverConfig) state.serverConfig = savedState.serverConfig;
    },
  },
});


export const { 
  setNodes, 
  setEdges, 
  addNode, 
  updateNode,
  updateNodeId,
  deleteNode, 
  setSelectedNode,
  setWorkflowName,
  setStackDescription,
  restoreWorkflowState, 
  setWorkflowDescription, 
  loadWorkflow, 
  clearWorkflow,
  setAvailableModules, 
  setModuleSchema, 
  setModuleAvailability, 
  setLoadingState, 
  setError, 
  clearError,
  setNodeConfig, 
  updateNodeConfig, 
  clearNodeConfig,
  // Node form state management
  initializeNodeFormState,
  setNodeSchema,
  setNodeLoadingSchema,
  setNodeSelectedAction,
  setNodeFormValues,
  setNodeFormValue,
  setNodeFormErrors,
  setNodeFieldValue,
  setNodeFieldLoading,
  setNodeFieldOptions,
  setNodeCachedOptions,
  setNodeFieldRefreshing,
  resetNodeFormState,
  setNodeSubmitting,
  setNodeValidating,
  // Habits stack management
  addHabit,
  removeHabit,
  setActiveHabit,
  updateHabit,
  setHabitName,
  setHabitDescription,
  setHabitEnvConnections,
  setHabitOutput,
  // Environment variables
  setEnvVariables,
  updateEnvVariable,
  addEnvVariable,
  removeEnvVariable,
  toggleEnvVariableReveal,
  syncActiveHabit,
  // Server config
  setServerConfig,
} = workflowSlice.actions;

// ===== SELECTORS =====
// These selectors get state from the active habit

export const selectActiveHabit = (state: { workflow: WorkflowState }): Habit | undefined => {
  return state.workflow.habits.find(h => h.id === state.workflow.activeHabitId);
};

export const selectNodes = (state: { workflow: WorkflowState }): CanvasNode[] => {
  const habit = selectActiveHabit(state);
  return habit?.nodes || [];
};

export const selectEdges = (state: { workflow: WorkflowState }): CanvasEdge[] => {
  const habit = selectActiveHabit(state);
  return habit?.edges || [];
};

export const selectSelectedNode = (state: { workflow: WorkflowState }): CanvasNode | null => {
  const habit = selectActiveHabit(state);
  return habit?.selectedNode || null;
};

export const selectNodeConfig = (state: { workflow: WorkflowState }): NodeConfig | null => {
  const habit = selectActiveHabit(state);
  return habit?.nodeConfig || null;
};

export const selectHabits = (state: { workflow: WorkflowState }): Habit[] => {
  return state.workflow.habits;
};

export const selectActiveHabitId = (state: { workflow: WorkflowState }): string | null => {
  return state.workflow.activeHabitId;
};

// Get environment connections from active habit
export const selectActiveEnvConnections = (state: { workflow: WorkflowState }): ExtractedConnection[] => {
  const habit = selectActiveHabit(state);
  return habit?.envConnections || [];
};

// Get environment variables from active habit
export const selectActiveEnvVariables = (state: { workflow: WorkflowState }): Record<string, EnvVariable> => {
  const habit = selectActiveHabit(state);
  return habit?.envVariables || {};
};

// Get output mappings from active habit
export const selectActiveHabitOutput = (state: { workflow: WorkflowState }): Record<string, string> => {
  const habit = selectActiveHabit(state);
  return habit?.output || {};
};

// Get description from active habit
export const selectActiveHabitDescription = (state: { workflow: WorkflowState }): string => {
  const habit = selectActiveHabit(state);
  return habit?.description || '';
};

// Get stack description
export const selectStackDescription = (state: { workflow: WorkflowState }): string => {
  return state.workflow.stackDescription;
};

// Get module schemas (shared across all habits)
export const selectModuleSchemas = (state: { workflow: WorkflowState }): Record<string, ModuleSchema> => {
  return state.workflow.moduleSchemas;
};

// Get form state for a specific node
export const selectNodeFormState = (nodeId: string) => (state: { workflow: WorkflowState }): NodeFormState | null => {
  const habit = selectActiveHabit(state);
  const node = habit?.nodes.find(n => n.id === nodeId);
  return node?.data?.formState || null;
};

// Get form state for the currently selected node
export const selectSelectedNodeFormState = (state: { workflow: WorkflowState }): NodeFormState | null => {
  const habit = selectActiveHabit(state);
  const node = habit?.selectedNode;
  if (!node) return null;
  const actualNode = habit?.nodes.find(n => n.id === node.id);
  return actualNode?.data?.formState || null;
};

// Get server configuration
export const selectServerConfig = (state: { workflow: WorkflowState }) => {
  return state.workflow.serverConfig;
};

// Get exported workflow (schema-compliant habit)
export const selectExportedWorkflow = (state: { workflow: WorkflowState }) => {
  const activeHabit = selectActiveHabit(state);
  const workflowState = state.workflow.workflow;
  
  if (!activeHabit) {
    return workflowState;
  }
  
  return extractSchemaHabit(
    activeHabit.nodes,
    activeHabit.edges,
    {
      id: activeHabit.id,
      name: activeHabit.name || workflowState.name,
      description: activeHabit.description || workflowState.description,
      version: workflowState.version,
      output: activeHabit.output,
    }
  );
};

// Get all habits exported in schema-compliant format
export const selectAllExportedHabits = (state: { workflow: WorkflowState }) => {
  return state.workflow.habits.map(habit => 
    extractSchemaHabit(
      habit.nodes,
      habit.edges,
      {
        id: habit.id,
        name: habit.name,
        description: habit.description,
        version: state.workflow.workflow.version,
        output: habit.output,
      }
    )
  );
};

// ===== HABIT VALIDATION SELECTORS =====

/**
 * Get all validation errors for all habits
 */
export const selectHabitValidationErrors = (state: { workflow: WorkflowState }): HabitValidationError[] => {
  return validateHabits(state.workflow.habits);
};

/**
 * Get validation errors for a specific habit
 */
export const selectHabitValidationErrorsById = (habitId: string) => (state: { workflow: WorkflowState }): HabitValidationError[] => {
  const habit = state.workflow.habits.find(h => h.id === habitId);
  if (!habit) return [];
  
  return validateHabit(habit);
};

/**
 * Check if there are any errors (for quick validation checks)
 */
export const selectHasValidationErrors = (state: { workflow: WorkflowState }): boolean => {
  const hasErrors =  selectHabitValidationErrors(state).some(error => error.severity === 'error');
  return hasErrors;
};

/**
 * Check if there are any warnings
 */
export const selectHasValidationWarnings = (state: { workflow: WorkflowState }): boolean => {
  return selectHabitValidationErrors(state).some(error => error.severity === 'warning');
};

// ===== EXPORT BUNDLE SELECTOR =====

/**
 * Generate export bundle from current state
 * This selector generates all files needed for export/deploy/serve
 */
export const selectExportBundle = (state: { workflow: WorkflowState; ui: { frontendHtml: string | null; envContent: string } }): ExportBundle => {
  const habits = state.workflow.habits;
  const serverConfig = state.workflow.serverConfig;
  const frontendHtml = state.ui.frontendHtml;
  
  // Get env variables from all habits (prefer stored envContent if available)
  let envContent = state.ui.envContent;
  
  // If no stored env content, generate from active habit's env variables
  if (!envContent) {
    const activeHabit = selectActiveHabit({ workflow: state.workflow });
    if (activeHabit?.envVariables && Object.keys(activeHabit.envVariables).length > 0) {
      envContent = envVariablesToString(activeHabit.envVariables);
    }
  }
  
  // Build server options from config
  const serverOptions: ServerOptions = {
    port: serverConfig.port,
    host: '0.0.0.0',
    openapi: serverConfig.openapi,
    webhookTimeout: serverConfig.webhookTimeout,
    hasFrontend: !!frontendHtml,
    security: serverConfig.security,
  };
  
  // Generate and return the bundle
  return generateExportBundle(
    habits as any,
    envContent,
    serverOptions,
    frontendHtml || undefined
  );
};

export type { WorkflowState, ModuleSchema, Habit, NodeConfig, NodeFormState, FieldState, ExtractedConnection, HabitValidationError, ExportBundle };