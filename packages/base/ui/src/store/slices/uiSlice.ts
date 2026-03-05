import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  // Panel states
  isNodeConfigPanelOpen: boolean;
  isNodePaletteOpen: boolean;
  showDownloadPrompt: boolean;
  
  // View mode (backend workflow editor or frontend builder)
  viewMode: 'backend' | 'frontend';
  
  // Loading states
  isLoadingWorkflow: boolean;
  isLoadingModule: boolean;
  isSavingWorkflow: boolean;
  
  // Form states
  formErrors: Record<string, string | string[]>;
  formValues: Record<string, any>;
  isDirty: boolean;
  
  // Dialog states
  showDeleteConfirmation: boolean;
  showUnsavedChangesDialog: boolean;
  
  // Frontend HTML state
  frontendHtml: string;
  
  // Env content state
  envContent: string;
}

const initialState: UIState = {
  // Initial state
  isNodeConfigPanelOpen: false,
  isNodePaletteOpen: true,
  showDownloadPrompt: false,
  
  // View mode
  viewMode: 'backend',
  
  isLoadingWorkflow: false,
  isLoadingModule: false,
  isSavingWorkflow: false,
  
  formErrors: {},
  formValues: {},
  isDirty: false,
  
  showDeleteConfirmation: false,
  showUnsavedChangesDialog: false,
  
  frontendHtml: '',
  
  envContent: '',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Panel actions
    setNodeConfigPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.isNodeConfigPanelOpen = action.payload;
    },
    
    setNodePaletteOpen: (state, action: PayloadAction<boolean>) => {
      state.isNodePaletteOpen = action.payload;
    },
    
    setShowDownloadPrompt: (state, action: PayloadAction<boolean>) => {
      state.showDownloadPrompt = action.payload;
    },
    
    // View mode actions
    setViewMode: (state, action: PayloadAction<'backend' | 'frontend'>) => {
      state.viewMode = action.payload;
    },
    
    // Loading actions
    setLoadingWorkflow: (state, action: PayloadAction<boolean>) => {
      state.isLoadingWorkflow = action.payload;
    },
    
    setLoadingModule: (state, action: PayloadAction<boolean>) => {
      state.isLoadingModule = action.payload;
    },
    
    setSavingWorkflow: (state, action: PayloadAction<boolean>) => {
      state.isSavingWorkflow = action.payload;
    },
    
    // Form error actions
    setFormError: (state, action: PayloadAction<{ field: string; error: string | string[] }>) => {
      const { field, error } = action.payload;
      state.formErrors[field] = error;
    },
    
    clearFormError: (state, action: PayloadAction<string>) => {
      delete state.formErrors[action.payload];
    },
    
    clearAllFormErrors: (state) => {
      state.formErrors = {};
    },
    
    // Form value actions
    setFormValue: (state, action: PayloadAction<{ field: string; value: any }>) => {
      const { field, value } = action.payload;
      state.formValues[field] = value;
      state.isDirty = true;
    },
    
    setFormValues: (state, action: PayloadAction<Record<string, any>>) => {
      state.formValues = action.payload;
      state.isDirty = true;
    },
    
    clearFormValues: (state) => {
      state.formValues = {};
      state.isDirty = false;
    },
    
    setIsDirty: (state, action: PayloadAction<boolean>) => {
      state.isDirty = action.payload;
    },
    
    // Dialog actions
    setShowDeleteConfirmation: (state, action: PayloadAction<boolean>) => {
      state.showDeleteConfirmation = action.payload;
    },
    
    setShowUnsavedChangesDialog: (state, action: PayloadAction<boolean>) => {
      state.showUnsavedChangesDialog = action.payload;
    },
    
    // Frontend HTML actions
    setFrontendHtml: (state, action: PayloadAction<string>) => {
      state.frontendHtml = action.payload;
    },
    
    clearFrontendHtml: (state) => {
      state.frontendHtml = '';
    },
    
    // Env content actions
    setEnvContent: (state, action: PayloadAction<string>) => {
      state.envContent = action.payload;
    },
    
    clearEnvContent: (state) => {
      state.envContent = '';
    },
    
    // Restore UI state from localStorage
    restoreUIState: (state, action: PayloadAction<Partial<UIState>>) => {
      const savedState = action.payload;
      if (typeof savedState.isNodeConfigPanelOpen === 'boolean') state.isNodeConfigPanelOpen = savedState.isNodeConfigPanelOpen;
      if (typeof savedState.isNodePaletteOpen === 'boolean') state.isNodePaletteOpen = savedState.isNodePaletteOpen;
      if (typeof savedState.showDownloadPrompt === 'boolean') state.showDownloadPrompt = savedState.showDownloadPrompt;
      if (savedState.viewMode) state.viewMode = savedState.viewMode;
      if (typeof savedState.isLoadingWorkflow === 'boolean') state.isLoadingWorkflow = savedState.isLoadingWorkflow;
      if (typeof savedState.isLoadingModule === 'boolean') state.isLoadingModule = savedState.isLoadingModule;
      if (typeof savedState.isSavingWorkflow === 'boolean') state.isSavingWorkflow = savedState.isSavingWorkflow;
      if (typeof savedState.isDirty === 'boolean') state.isDirty = savedState.isDirty;
      if (savedState.formErrors) state.formErrors = savedState.formErrors;
      if (savedState.formValues) state.formValues = savedState.formValues;
      if (savedState.frontendHtml) state.frontendHtml = savedState.frontendHtml;
      if (savedState.envContent) state.envContent = savedState.envContent;
      // Don't restore dialog states as they should start closed
    },
  },
});

export const {
  setNodeConfigPanelOpen,
  setNodePaletteOpen, 
  setShowDownloadPrompt,
  setViewMode,
  setLoadingWorkflow,
  setLoadingModule,
  setSavingWorkflow,
  setFormError,
  clearFormError,
  clearAllFormErrors,
  setFormValue,
  setFormValues,
  restoreUIState,
  clearFormValues,
  setIsDirty,
  setShowDeleteConfirmation,
  setShowUnsavedChangesDialog,
  setFrontendHtml,
  clearFrontendHtml,
  setEnvContent,
  clearEnvContent,
} = uiSlice.actions;

export type { UIState };