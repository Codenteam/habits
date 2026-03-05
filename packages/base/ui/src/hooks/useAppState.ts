import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectSelectedNodeFormState } from '../store/slices/workflowSlice';

/**
 * Custom hook that combines commonly used state from multiple stores
 * for components that need workflow, form, and UI state
 */
export const useAppState = () => {
  const dispatch = useAppDispatch();
  const workflow = useAppSelector(state => state.workflow);
  const nodeFormState = useAppSelector(selectSelectedNodeFormState);
  const ui = useAppSelector(state => state.ui);

  return {
    // Redux state
    workflow,
    form: nodeFormState, // Form state now comes from the selected node
    ui,
    dispatch,
    
    // Combined convenience methods (these would now need to use dispatch)
    // Note: Individual components should ideally use dispatch directly
    // This is maintained for backward compatibility during migration
    actions: {
      // Node actions
      selectNode: (_node: any) => {
        // These would need to be implemented with specific Redux actions
        console.warn('selectNode: Use dispatch with specific Redux actions instead');
      },
      
      closeNodeConfig: () => {
        console.warn('closeNodeConfig: Use dispatch with specific Redux actions instead');
      },
      
      // Form actions
      initializeNodeForm: (_fields: any[], _initialValues?: Record<string, any>) => {
        console.warn('initializeNodeForm: Use dispatch with specific Redux actions instead');
      },
      
      saveNodeConfiguration: (_nodeId: string) => {
        console.warn('saveNodeConfiguration: Use dispatch with specific Redux actions instead');
      },
    }
  };
};