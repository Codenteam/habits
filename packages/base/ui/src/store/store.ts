import { configureStore } from '@reduxjs/toolkit';
import { workflowSlice, selectExportBundle } from './slices/workflowSlice';
import { uiSlice } from './slices/uiSlice';
import { modulesSlice } from './slices/modulesSlice';
import { serverFlagsSlice } from './slices/serverFlagsSlice';
import { selectAllValidationIssues, selectHasValidationErrors } from './selectors/validationSelectors';

export const store = configureStore({
  reducer: {
    workflow: workflowSlice.reducer,
    ui: uiSlice.reducer,
    modules: modulesSlice.reducer,
    serverFlags: serverFlagsSlice.reducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

// Expose the store to end-to-end test drivers (e.g. base-email-demo.e2e.ts) so they can
// read the habit graph / UI spec that was built visually through the editor and assert on it.
// Read-only convenience handle; harmless in the shipped editor.
if (typeof window !== 'undefined') {
  const w = window as unknown as {
    __HABITS_STORE__?: typeof store;
    __HABITS_EXPORT_BUNDLE__?: () => unknown;
    __HABITS_VALIDATION__?: () => unknown;
  };
  w.__HABITS_STORE__ = store;
  // Returns the exact ExportBundle the editor would POST to /export/pack/habit, so e2e drivers
  // can export what they built visually without reconstructing the payload by hand.
  w.__HABITS_EXPORT_BUNDLE__ = () => selectExportBundle(store.getState() as never);
  // Surfaces the validation issues that gate the Export/Serve buttons, so e2e drivers can see
  // exactly what is blocking export instead of scraping the validation modal DOM.
  w.__HABITS_VALIDATION__ = () => ({
    hasErrors: selectHasValidationErrors(store.getState() as never),
    issues: selectAllValidationIssues(store.getState() as never),
  });
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;