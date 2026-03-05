import { configureStore } from '@reduxjs/toolkit';
import { workflowSlice } from './slices/workflowSlice';
import { uiSlice } from './slices/uiSlice';
import { modulesSlice } from './slices/modulesSlice';

export const store = configureStore({
  reducer: {
    workflow: workflowSlice.reducer,
    ui: uiSlice.reducer,
    modules: modulesSlice.reducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;