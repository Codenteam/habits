/**
 * @ha-bits/bit-loop
 * 
 * Iterate over an array and invoke a sub-habit for each item.
 * Enables modular, reusable iteration patterns in workflows.
 * 
 * Uses the executor passed from cortex to invoke sub-workflows directly
 * without HTTP calls for maximum performance.
 */

/**
 * Workflow executor interface (passed from cortex)
 */
interface IWorkflowExecutor {
  executeWorkflow(workflowId: string, options?: {
    initialContext?: Record<string, any>;
  }): Promise<{
    id: string;
    workflowId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    results: Array<{ success: boolean; result?: any; error?: string }>;
    output?: any;
  }>;
}

interface ForEachContext {
  propsValue: {
    items: any;
    habitId: string;
    inputKey?: string;
    concurrency?: number;
    delayMs?: number;
    continueOnError?: boolean;
    collectResults?: boolean;
  };
  executor?: IWorkflowExecutor;
}

interface ForEachResult {
  totalItems: number;
  successCount: number;
  errorCount: number;
  results: any[];
  errors: Array<{ index: number; item: any; error: string }>;
}

/**
 * Invoke a habit via the executor (direct, no HTTP)
 */
async function invokeHabit(
  executor: IWorkflowExecutor,
  habitId: string,
  input: Record<string, any>
): Promise<any> {
  const execution = await executor.executeWorkflow(habitId, {
    initialContext: { 'habits.input': input, ...input },
  });
  
  if (execution.status === 'failed') {
    const errorResult = execution.results.find(r => !r.success);
    throw new Error(`Sub-workflow "${habitId}" failed: ${errorResult?.error || 'Unknown error'}`);
  }
  
  // Return the workflow output or the last successful result
  if (execution.output !== undefined) {
    return execution.output;
  }
  
  const successfulResults = execution.results.filter(r => r.success && r.result !== undefined);
  if (successfulResults.length > 0) {
    return successfulResults[successfulResults.length - 1].result;
  }
  
  return null;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse items from string or ensure array
 */
function parseItems(items: any): any[] {
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      return [items];
    }
  }
  
  if (!Array.isArray(items)) {
    return [items];
  }
  
  return items;
}

const foreachHabitBit = {
  displayName: 'For Each Habit',
  description: 'Iterate over items and invoke a sub-habit workflow for each one',
  logoUrl: 'lucide:GitBranch',
  runtime: 'all',
  
  actions: {
    /**
     * Sequential iteration - process one item at a time
     */
    forEach: {
      name: 'forEach',
      displayName: 'For Each (Sequential)',
      description: 'Invoke a sub-habit for each item in the array, one at a time',
      props: {
        items: {
          type: 'JSON',
          displayName: 'Items',
          description: 'Array of items to iterate over',
          required: true,
          defaultValue: '[]',
        },
        habitId: {
          type: 'SHORT_TEXT',
          displayName: 'Habit ID',
          description: 'ID of the habit workflow to invoke for each item',
          required: true,
        },
        inputKey: {
          type: 'SHORT_TEXT',
          displayName: 'Input Key',
          description: 'Key name to pass the item as (default: "item"). Use "spread" to spread object properties.',
          required: false,
          defaultValue: 'item',
        },
        delayMs: {
          type: 'NUMBER',
          displayName: 'Delay (ms)',
          description: 'Delay between iterations in milliseconds (for rate limiting)',
          required: false,
          defaultValue: 0,
        },
        continueOnError: {
          type: 'CHECKBOX',
          displayName: 'Continue on Error',
          description: 'Continue processing remaining items if one fails',
          required: false,
          defaultValue: true,
        },
        collectResults: {
          type: 'CHECKBOX',
          displayName: 'Collect Results',
          description: 'Collect and return results from all sub-habit executions',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: ForEachContext): Promise<ForEachResult> {
        if (!context.executor) {
          throw new Error('bit-loop requires executor to be passed from cortex. This bit cannot be used standalone.');
        }
        
        const {
          habitId,
          inputKey = 'item',
          delayMs = 0,
          continueOnError = true,
          collectResults = true,
        } = context.propsValue;
        
        const items = parseItems(context.propsValue.items);
        
        const results: any[] = [];
        const errors: Array<{ index: number; item: any; error: string }> = [];
        let successCount = 0;
        let errorCount = 0;
        
        console.log(`🔄 For Each: Starting iteration over ${items.length} items`);
        console.log(`   Habit: ${habitId}`);
        console.log(`   Input key: ${inputKey}`);
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          try {
            // Build input for sub-habit
            let input: Record<string, any>;
            if (inputKey === 'spread' && typeof item === 'object' && item !== null) {
              input = { ...item, _index: i };
            } else {
              input = { [inputKey]: item, _index: i };
            }
            
            console.log(`   [${i + 1}/${items.length}] Invoking ${habitId}...`);
            
            const result = await invokeHabit(context.executor, habitId, input);
            
            successCount++;
            if (collectResults) {
              results.push({ index: i, input: item, output: result });
            }
            
            console.log(`   [${i + 1}/${items.length}] ✓ Success`);
            
          } catch (error: any) {
            errorCount++;
            const errorMessage = error?.message || String(error);
            
            errors.push({
              index: i,
              item,
              error: errorMessage,
            });
            
            console.log(`   [${i + 1}/${items.length}] ✗ Error: ${errorMessage}`);
            
            if (!continueOnError) {
              throw new Error(`Iteration failed at index ${i}: ${errorMessage}`);
            }
          }
          
          // Apply delay between iterations (except after last item)
          if (delayMs > 0 && i < items.length - 1) {
            await sleep(delayMs);
          }
        }
        
        console.log(`🔄 For Each: Completed - ${successCount} succeeded, ${errorCount} failed`);
        
        return {
          totalItems: items.length,
          successCount,
          errorCount,
          results: collectResults ? results : [],
          errors,
        };
      },
    },
    
    /**
     * Parallel iteration - process multiple items concurrently
     */
    forEachParallel: {
      name: 'forEachParallel',
      displayName: 'For Each (Parallel)',
      description: 'Invoke a sub-habit for each item with controlled concurrency',
      props: {
        items: {
          type: 'JSON',
          displayName: 'Items',
          description: 'Array of items to iterate over',
          required: true,
          defaultValue: '[]',
        },
        habitId: {
          type: 'SHORT_TEXT',
          displayName: 'Habit ID',
          description: 'ID of the habit workflow to invoke for each item',
          required: true,
        },
        inputKey: {
          type: 'SHORT_TEXT',
          displayName: 'Input Key',
          description: 'Key name to pass the item as (default: "item"). Use "spread" to spread object properties.',
          required: false,
          defaultValue: 'item',
        },
        concurrency: {
          type: 'NUMBER',
          displayName: 'Concurrency',
          description: 'Maximum number of parallel executions (default: 3)',
          required: false,
          defaultValue: 3,
        },
        continueOnError: {
          type: 'CHECKBOX',
          displayName: 'Continue on Error',
          description: 'Continue processing remaining items if one fails',
          required: false,
          defaultValue: true,
        },
        collectResults: {
          type: 'CHECKBOX',
          displayName: 'Collect Results',
          description: 'Collect and return results from all sub-habit executions',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: ForEachContext): Promise<ForEachResult> {
        if (!context.executor) {
          throw new Error('bit-loop requires executor to be passed from cortex. This bit cannot be used standalone.');
        }
        
        const {
          habitId,
          inputKey = 'item',
          concurrency = 3,
          continueOnError = true,
          collectResults = true,
        } = context.propsValue;
        
        const items = parseItems(context.propsValue.items);
        const maxConcurrent = Math.max(1, concurrency || 3);
        
        const results: Array<{ index: number; input: any; output: any }> = [];
        const errors: Array<{ index: number; item: any; error: string }> = [];
        let successCount = 0;
        let errorCount = 0;
        
        console.log(`🔄 For Each Parallel: Starting with ${items.length} items, concurrency: ${maxConcurrent}`);
        
        // Process in batches based on concurrency
        for (let batchStart = 0; batchStart < items.length; batchStart += maxConcurrent) {
          const batch = items.slice(batchStart, batchStart + maxConcurrent);
          const batchPromises = batch.map(async (item, batchIndex) => {
            const globalIndex = batchStart + batchIndex;
            
            try {
              let input: Record<string, any>;
              if (inputKey === 'spread' && typeof item === 'object' && item !== null) {
                input = { ...item, _index: globalIndex };
              } else {
                input = { [inputKey]: item, _index: globalIndex };
              }
              
              const result = await invokeHabit(context.executor!, habitId, input);
              
              return { success: true, index: globalIndex, input: item, output: result };
            } catch (error: any) {
              return { 
                success: false, 
                index: globalIndex, 
                input: item, 
                error: error?.message || String(error) 
              };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          for (const result of batchResults) {
            if (result.success) {
              successCount++;
              if (collectResults) {
                results.push({ index: result.index, input: result.input, output: result.output });
              }
            } else {
              errorCount++;
              errors.push({ index: result.index, item: result.input, error: result.error! });
              
              if (!continueOnError) {
                throw new Error(`Parallel iteration failed at index ${result.index}: ${result.error}`);
              }
            }
          }
        }
        
        // Sort results by index to maintain order
        results.sort((a, b) => a.index - b.index);
        
        console.log(`🔄 For Each Parallel: Completed - ${successCount} succeeded, ${errorCount} failed`);
        
        return {
          totalItems: items.length,
          successCount,
          errorCount,
          results: collectResults ? results : [],
          errors,
        };
      },
    },
    
    /**
     * Batch iteration - process items in batches
     */
    forEachBatch: {
      name: 'forEachBatch',
      displayName: 'For Each (Batch)',
      description: 'Invoke a sub-habit with batches of items',
      props: {
        items: {
          type: 'JSON',
          displayName: 'Items',
          description: 'Array of items to batch and iterate over',
          required: true,
          defaultValue: '[]',
        },
        habitId: {
          type: 'SHORT_TEXT',
          displayName: 'Habit ID',
          description: 'ID of the habit workflow to invoke for each batch',
          required: true,
        },
        batchSize: {
          type: 'NUMBER',
          displayName: 'Batch Size',
          description: 'Number of items per batch (default: 10)',
          required: false,
          defaultValue: 10,
        },
        inputKey: {
          type: 'SHORT_TEXT',
          displayName: 'Input Key',
          description: 'Key name to pass the batch as (default: "items")',
          required: false,
          defaultValue: 'items',
        },
        delayMs: {
          type: 'NUMBER',
          displayName: 'Delay (ms)',
          description: 'Delay between batches in milliseconds',
          required: false,
          defaultValue: 0,
        },
        continueOnError: {
          type: 'CHECKBOX',
          displayName: 'Continue on Error',
          description: 'Continue processing remaining batches if one fails',
          required: false,
          defaultValue: true,
        },
        collectResults: {
          type: 'CHECKBOX',
          displayName: 'Collect Results',
          description: 'Collect and return results from all batch executions',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: ForEachContext & { propsValue: { batchSize?: number } }) {
        if (!context.executor) {
          throw new Error('bit-loop requires executor to be passed from cortex. This bit cannot be used standalone.');
        }
        
        const {
          habitId,
          batchSize = 10,
          inputKey = 'items',
          delayMs = 0,
          continueOnError = true,
          collectResults = true,
        } = context.propsValue;
        
        const items = parseItems(context.propsValue.items);
        const size = Math.max(1, batchSize || 10);
        
        // Split into batches
        const batches: any[][] = [];
        for (let i = 0; i < items.length; i += size) {
          batches.push(items.slice(i, i + size));
        }
        
        const results: any[] = [];
        const errors: Array<{ batchIndex: number; batch: any[]; error: string }> = [];
        let successCount = 0;
        let errorCount = 0;
        
        console.log(`🔄 For Each Batch: ${items.length} items in ${batches.length} batches of ${size}`);
        
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          
          try {
            const input = {
              [inputKey]: batch,
              _batchIndex: i,
              _batchSize: batch.length,
              _totalBatches: batches.length,
            };
            
            console.log(`   [Batch ${i + 1}/${batches.length}] Processing ${batch.length} items...`);
            
            const result = await invokeHabit(context.executor, habitId, input);
            
            successCount++;
            if (collectResults) {
              results.push({ batchIndex: i, items: batch, output: result });
            }
            
          } catch (error: any) {
            errorCount++;
            errors.push({
              batchIndex: i,
              batch,
              error: error?.message || String(error),
            });
            
            if (!continueOnError) {
              throw new Error(`Batch ${i} failed: ${error?.message || error}`);
            }
          }
          
          if (delayMs > 0 && i < batches.length - 1) {
            await sleep(delayMs);
          }
        }
        
        console.log(`🔄 For Each Batch: Completed - ${successCount} batches succeeded, ${errorCount} failed`);
        
        return {
          totalItems: items.length,
          totalBatches: batches.length,
          successCount,
          errorCount,
          results: collectResults ? results : [],
          errors,
        };
      },
    },
  },
  
  triggers: {},
};

export const foreachHabit = foreachHabitBit;
export default foreachHabitBit;
