import { store } from './store';
import { saveState } from './middleware/persistenceMiddleware';

// Function to save current Redux state to localStorage
export const persistState = () => {
  const state = store.getState();
  saveState(state);
};

// Function to subscribe to store changes and save state
export const setupStatePersistence = () => {
  store.subscribe(() => {
    persistState();
  });
};