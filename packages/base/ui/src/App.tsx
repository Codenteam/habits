import { useEffect } from 'react';
import WorkflowEditor from './components/WorkflowEditor';
import DevStackLoader from './components/DevStackLoader';
import { setupStatePersistence } from './store/persistence';
import { loadState } from './store/middleware/persistenceMiddleware';
import { store } from './store/store';
import { restoreWorkflowState } from './store/slices/workflowSlice';
import { restoreUIState } from './store/slices/uiSlice';
import { fetchServerFlags } from './store/slices/serverFlagsSlice';

function App() {
  useEffect(() => {
    // Load initial state from localStorage if it exists
    const loadParam = new URLSearchParams(window.location.search).get('load');
    const savedState = loadParam ? null : loadState();
    if (savedState) {
      // Dispatch actions to restore state for each slice
      if (savedState.workflow) {
        store.dispatch(restoreWorkflowState(savedState.workflow));
      }
      if (savedState.ui) {
        store.dispatch(restoreUIState(savedState.ui));
      }
      // Form field state is now stored within each node, so it's restored with workflow state
    }

    // Setup automatic state persistence
    setupStatePersistence();

    // Fetch server feature flags so the UI can disable guarded controls
    store.dispatch(fetchServerFlags());
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <DevStackLoader />
      <WorkflowEditor />
    </div>
  );
}

export default App;
