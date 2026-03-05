import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PieceSchema } from '../../lib/formBuilder/types';
import { ModulesAPI } from '../../lib/modulesAPI';

export interface Module {
  framework: string;
  name: string;
  displayName?: string;
  source: string;
  repository: string;
  status?: 'available' | 'loading' | 'error' | 'not-installed';
  schema?: PieceSchema;
  error?: string;
}

interface ModuleFetchStatus {
  isLoading: boolean;
  error?: string;
  lastFetched?: Date;
}

interface ModulesState {
  modules: Record<string, Module>; // key: framework/name
  modulesFetchStatus: ModuleFetchStatus;
}

// Async thunk for fetching modules
export const fetchModules = createAsyncThunk(
  'modules/fetchModules',
  async (_, { rejectWithValue }) => {
    try {
      const backendModules = await ModulesAPI.fetchAvailableModules();
      
      // Transform backend modules to store modules
      const modulesMap: Record<string, Module> = backendModules.reduce((acc: Record<string, Module>, backendModule: any) => {
        const key = `${backendModule.framework}/${backendModule.name}`;
        acc[key] = ModulesAPI.transformToStoreModule(backendModule);
        return acc;
      }, {});
      
      return modulesMap;
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch modules');
    }
  }
);

const initialState: ModulesState = {
  modules: {},
  modulesFetchStatus: { isLoading: false },
};

export const modulesSlice = createSlice({
  name: 'modules',
  initialState,
  reducers: {
    setModules: (state, action: PayloadAction<Module[]>) => {
      const modules = action.payload;
      state.modules = {};
      modules.forEach(module => {
        const key = `${module.framework}/${module.name}`;
        state.modules[key] = module;
      });
    },
    
    updateModuleStatus: (state, action: PayloadAction<{ moduleKey: string; status: Module['status']; error?: string }>) => {
      const { moduleKey, status, error } = action.payload;
      if (state.modules[moduleKey]) {
        state.modules[moduleKey].status = status;
        if (error) {
          state.modules[moduleKey].error = error;
        }
      }
    },
    
    addModule: (state, action: PayloadAction<Module>) => {
      const module = action.payload;
      const key = `${module.framework}/${module.name}`;
      state.modules[key] = module;
    },
    
    clearModules: (state) => {
      state.modules = {};
      state.modulesFetchStatus = { isLoading: false };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModules.pending, (state) => {
        state.modulesFetchStatus.isLoading = true;
        state.modulesFetchStatus.error = undefined;
      })
      .addCase(fetchModules.fulfilled, (state, action) => {
        state.modules = action.payload;
        state.modulesFetchStatus.isLoading = false;
        state.modulesFetchStatus.lastFetched = new Date();
      })
      .addCase(fetchModules.rejected, (state, action) => {
        state.modulesFetchStatus.isLoading = false;
        state.modulesFetchStatus.error = action.payload as string;
      });
  },
});

// Selectors
export const selectModules = (state: { modules: ModulesState }) => state.modules.modules;
export const selectModulesFetchStatus = (state: { modules: ModulesState }) => state.modules.modulesFetchStatus;
export const selectModuleByKey = (moduleKey: string) => (state: { modules: ModulesState }) => 
  state.modules.modules[moduleKey];

export const { setModules, updateModuleStatus, addModule, clearModules } = modulesSlice.actions;
export default modulesSlice.reducer;
