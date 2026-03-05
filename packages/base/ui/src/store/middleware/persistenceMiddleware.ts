import { Middleware } from '@reduxjs/toolkit';

const STORAGE_KEY = 'current-habit';

// Load state from localStorage
export const loadState = () => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.warn('Error loading state from localStorage:', err);
    return undefined;
  }
};

// Save state to localStorage
export const saveState = (state: any) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.warn('Error saving state to localStorage:', err);
  }
};

// Redux middleware that saves state on every action
export const persistenceMiddleware: Middleware = (store) => (next) => (action) => {
  // Call the next middleware/reducer first
  const result = next(action);
  
  // Save the updated state to localStorage
  const state = store.getState();
  saveState(state);
  
  return result;
};