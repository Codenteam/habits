/**
 * @ha-bits/bit-scheduler
 * 
 * Native cron scheduling trigger for Habits workflows.
 * Use this as the first node in a workflow to execute it on a schedule.
 * 
 * Features:
 * - Cron expression support via croner library
 * - Timezone configuration
 * - Automatic re-registration on server restart
 * - Directly triggers workflow execution via executor
 */

import { Cron } from 'croner';

// ============================================================================
// Types
// ============================================================================

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

interface SchedulerTriggerContext {
  propsValue: {
    cronExpression: string;
    timezone?: string;
    enabled?: boolean;
    retryOnFailure?: boolean;
    maxRetries?: number;
    description?: string;
  };
  store: {
    get: <T>(key: string) => Promise<T | null>;
    put: <T>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  setSchedule: (options: { cronExpression: string; timezone?: string }) => void;
  payload?: unknown;
  executor?: IWorkflowExecutor;
  workflowId?: string;
  nodeId?: string;
}

interface ScheduleExecutionInfo {
  executionId: string;
  scheduledAt: string;
  executedAt: string;
  cronExpression: string;
  timezone: string;
  executionCount: number;
  lastExecution?: string;
  nextExecution?: string;
  description?: string;
}

// ============================================================================
// Active Cron Jobs Registry (module-level)
// ============================================================================

const activeCronJobs = new Map<string, Cron>();
const executionCounts = new Map<string, number>();

// ============================================================================
// Cron Utilities
// ============================================================================

/**
 * Get human-readable description of a cron expression
 */
function describeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Common patterns
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }
  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every ${minute.slice(2)} minutes`;
  }
  if (minute === '0' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every ${hour.slice(2)} hours`;
  }
  if (minute === '0' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${hour}:00`;
  }
  if (minute === '0' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    return `At ${hour}:00 on specific weekdays`;
  }
  
  return cron;
}

/**
 * Generate a unique execution ID
 */
function generateExecutionId(): string {
  return `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get the next scheduled execution time
 */
function getNextExecution(cronJob: Cron): string | undefined {
  const next = cronJob.nextRun();
  return next ? next.toISOString() : undefined;
}

// ============================================================================
// Scheduler Bit
// ============================================================================

const schedulerBit = {
  displayName: 'Scheduler',
  description: 'Native cron scheduling trigger for running workflows on a schedule',
  logoUrl: 'lucide:Clock',
  
  // No authentication required
  auth: undefined,
  
  // No actions - this is a trigger-only bit
  actions: {},
  
  triggers: {
    /**
     * Schedule trigger - runs workflow on a cron schedule
     */
    schedule: {
      name: 'schedule',
      displayName: 'Schedule',
      description: 'Trigger workflow execution on a cron schedule',
      type: 'POLLING',
      
      props: {
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Cron Expression',
          description: 'Standard 5-field cron expression (minute hour day month weekday). Examples: "*/5 * * * *" (every 5 min), "0 7 * * *" (daily at 7am), "0 9 * * 1-5" (weekdays at 9am)',
          required: true,
          defaultValue: '*/5 * * * *',
        },
        timezone: {
          type: 'SHORT_TEXT',
          displayName: 'Timezone',
          description: 'IANA timezone (e.g., "America/New_York", "Europe/London", "UTC")',
          required: false,
          defaultValue: 'UTC',
        },
        enabled: {
          type: 'CHECKBOX',
          displayName: 'Enabled',
          description: 'Enable or disable this schedule',
          required: false,
          defaultValue: true,
        },
        retryOnFailure: {
          type: 'CHECKBOX',
          displayName: 'Retry on Failure',
          description: 'Retry the scheduled execution if it fails',
          required: false,
          defaultValue: false,
        },
        maxRetries: {
          type: 'NUMBER',
          displayName: 'Max Retries',
          description: 'Maximum number of retry attempts (only if retry is enabled)',
          required: false,
          defaultValue: 3,
        },
        description: {
          type: 'LONG_TEXT',
          displayName: 'Description',
          description: 'Optional description for this schedule',
          required: false,
        },
      },
      
      /**
       * Called when the trigger is enabled (workflow is started)
       * Creates a croner job that triggers workflow execution
       */
      async onEnable(context: SchedulerTriggerContext): Promise<void> {
        const { cronExpression, timezone = 'UTC', enabled = true, description, retryOnFailure = false, maxRetries = 3 } = context.propsValue;
        const { executor, workflowId, nodeId } = context;
        
        if (!enabled) {
          console.log('📅 Scheduler: Schedule is disabled, not registering');
          return;
        }
        
        if (!workflowId) {
          console.log('📅 Scheduler: No workflowId provided, using legacy cortex scheduling');
          context.setSchedule({ cronExpression, timezone });
          return;
        }
        
        // Create unique key for this workflow's cron job
        const cronKey = `${workflowId}:${nodeId || 'scheduler'}`;
        
        // Stop existing cron job if any
        const existingJob = activeCronJobs.get(cronKey);
        if (existingJob) {
          existingJob.stop();
          console.log(`📅 Scheduler: Stopped existing cron job for ${cronKey}`);
        }
        
        // Initialize execution count
        if (!executionCounts.has(cronKey)) {
          executionCounts.set(cronKey, 0);
        }
        
        // Store schedule info
        await context.store.put('scheduleInfo', {
          cronExpression,
          timezone,
          description,
          createdAt: new Date().toISOString(),
          executionCount: executionCounts.get(cronKey) || 0,
          workflowId,
          nodeId,
        });
        
        const humanReadable = describeCron(cronExpression);
        console.log(`📅 Scheduler: Creating cron job "${humanReadable}" (${cronExpression}) in ${timezone} for workflow ${workflowId}`);
        
        // Create the cron job using croner
        try {
          const cronJob = new Cron(cronExpression, {
            timezone,
            name: cronKey,
          }, async () => {
            // This callback is called on each cron tick
            const count = (executionCounts.get(cronKey) || 0) + 1;
            executionCounts.set(cronKey, count);
            
            const executedAt = new Date().toISOString();
            console.log(`📅 Scheduler: Cron fired for ${workflowId} (execution #${count}) at ${executedAt}`);
            
            if (!executor) {
              console.error(`📅 Scheduler: No executor available, cannot trigger workflow ${workflowId}`);
              return;
            }
            
            // Build schedule info for this execution
            const scheduleInfo: ScheduleExecutionInfo = {
              executionId: generateExecutionId(),
              scheduledAt: executedAt,
              executedAt,
              cronExpression,
              timezone,
              executionCount: count,
              description,
              nextExecution: getNextExecution(cronJob),
            };
            
            // Execute the workflow with initial context
            try {
              console.log(`📅 Scheduler: Triggering workflow ${workflowId}...`);
              const execution = await executor.executeWorkflow(workflowId, {
                initialContext: {
                  __schedulerCronTrigger: true,
                  __schedulerNodeId: nodeId,
                  __schedulerData: scheduleInfo,
                  'habits.input': scheduleInfo,
                },
              });
              
              console.log(`📅 Scheduler: Workflow ${workflowId} completed with status: ${execution.status}`);
              
              // Handle retry on failure
              if (execution.status === 'failed' && retryOnFailure) {
                for (let retry = 1; retry <= maxRetries; retry++) {
                  console.log(`📅 Scheduler: Retrying workflow ${workflowId} (attempt ${retry}/${maxRetries})...`);
                  const retryExecution = await executor.executeWorkflow(workflowId, {
                    initialContext: {
                      __schedulerCronTrigger: true,
                      __schedulerNodeId: nodeId,
                      __schedulerData: { ...scheduleInfo, retryAttempt: retry },
                      'habits.input': { ...scheduleInfo, retryAttempt: retry },
                    },
                  });
                  if (retryExecution.status !== 'failed') {
                    console.log(`📅 Scheduler: Retry ${retry} succeeded for ${workflowId}`);
                    break;
                  }
                  if (retry === maxRetries) {
                    console.error(`📅 Scheduler: All ${maxRetries} retries failed for ${workflowId}`);
                  }
                }
              }
            } catch (error: any) {
              console.error(`📅 Scheduler: Error executing workflow ${workflowId}:`, error.message);
            }
          });
          
          // Store the cron job reference
          activeCronJobs.set(cronKey, cronJob);
          
          const nextRun = cronJob.nextRun();
          console.log(`📅 Scheduler: Cron job registered. Next execution: ${nextRun?.toISOString() || 'unknown'}`);
          
          // Also register with cortex's schedule system for backward compatibility
          context.setSchedule({ cronExpression, timezone });
          
        } catch (error: any) {
          console.error(`📅 Scheduler: Failed to create cron job: ${error.message}`);
          throw new Error(`Invalid cron expression or configuration: ${error.message}`);
        }
      },
      
      /**
       * Called when the trigger is disabled (workflow is stopped)
       */
      async onDisable(context: SchedulerTriggerContext): Promise<void> {
        const { workflowId, nodeId } = context;
        const cronKey = `${workflowId}:${nodeId || 'scheduler'}`;
        
        // Stop the cron job
        const cronJob = activeCronJobs.get(cronKey);
        if (cronJob) {
          cronJob.stop();
          activeCronJobs.delete(cronKey);
          console.log(`📅 Scheduler: Cron job stopped for ${cronKey}`);
        }
        
        // Clear stored schedule info
        await context.store.delete('scheduleInfo');
        console.log('📅 Scheduler: Schedule disabled and cleaned up');
      },
      
      /**
       * Called when the schedule fires (or workflow is triggered manually)
       * Returns execution information that flows to the next node
       */
      async run(context: SchedulerTriggerContext): Promise<ScheduleExecutionInfo[]> {
        const { cronExpression, timezone = 'UTC', description } = context.propsValue;
        const { workflowId, nodeId, payload } = context;
        
        // Check if this is a cron-triggered execution - use the pre-computed data
        const triggerPayload = payload as any;
        if (triggerPayload?.__schedulerCronTrigger && triggerPayload?.__schedulerData) {
          console.log(`📅 Scheduler: Using cron-provided data for ${workflowId}`);
          return [triggerPayload.__schedulerData];
        }
        
        const cronKey = `${workflowId}:${nodeId || 'scheduler'}`;
        
        // Increment execution count
        const count = (executionCounts.get(cronKey) || 0) + 1;
        executionCounts.set(cronKey, count);
        
        // Get stored info and update
        const storedInfo = await context.store.get<{ executionCount: number; lastExecution?: string }>('scheduleInfo');
        const lastExecution = storedInfo?.lastExecution;
        
        const executedAt = new Date().toISOString();
        
        // Update stored info
        await context.store.put('scheduleInfo', {
          ...storedInfo,
          executionCount: count,
          lastExecution: executedAt,
        });
        
        // Get next execution time from active cron job if available
        const cronJob = activeCronJobs.get(cronKey);
        const nextExecution = cronJob ? getNextExecution(cronJob) : undefined;
        
        const executionInfo: ScheduleExecutionInfo = {
          executionId: generateExecutionId(),
          scheduledAt: executedAt,
          executedAt,
          cronExpression,
          timezone,
          executionCount: count,
          lastExecution,
          nextExecution,
          description,
        };
        
        console.log(`📅 Scheduler: Execution #${count} triggered at ${executedAt}`);
        
        return [executionInfo];
      },
      
      /**
       * Test function - returns sample data for workflow testing
       */
      async test(context: SchedulerTriggerContext): Promise<ScheduleExecutionInfo[]> {
        const { cronExpression, timezone = 'UTC', description } = context.propsValue;
        
        // Validate cron expression using croner
        try {
          const testCron = new Cron(cronExpression, { timezone });
          const nextRun = testCron.nextRun();
          testCron.stop();
          
          const testExecution: ScheduleExecutionInfo = {
            executionId: generateExecutionId(),
            scheduledAt: new Date().toISOString(),
            executedAt: new Date().toISOString(),
            cronExpression,
            timezone,
            executionCount: 1,
            description: description || 'Test execution',
            nextExecution: nextRun?.toISOString(),
          };
          
          console.log(`📅 Scheduler: Test execution generated. Next scheduled run: ${nextRun?.toISOString() || 'unknown'}`);
          
          return [testExecution];
        } catch (error: any) {
          throw new Error(`Invalid cron expression "${cronExpression}": ${error.message}`);
        }
      },
    },
  },
};

// Export the bit
module.exports = { schedulerBit };
export { schedulerBit };
