/**
 * @ha-bits/bit-tasks
 * 
 * Task management bit for Jira, Asana, and generic ticket systems.
 * Provides operations for creating, updating, and managing tasks/tickets.
 */

interface TasksContext {
  auth?: {
    apiKey?: string;
    baseUrl?: string;
    provider?: string;
  };
  propsValue: Record<string, any>;
}

interface Task {
  id: string;
  key?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: string;
  reporter?: string;
  project?: string;
  type: string;
  labels?: string[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  customFields?: Record<string, any>;
}

interface Ticket extends Task {
  ticketNumber?: string;
  category?: string;
  requester?: string;
  resolution?: string;
}

// In-memory storage for demo
const taskStore = new Map<string, Task>();
let taskCounter = 1;

const tasksBit = {
  displayName: 'Tasks / Tickets',
  description: 'Task and ticket management for Jira, Asana, and other systems',
  logoUrl: 'lucide:CheckSquare',
  runtime: 'all',
  
  auth: {
    type: 'CUSTOM',
    displayName: 'Task System Credentials',
    required: false,
    props: {
      provider: { 
        type: 'STATIC_DROPDOWN', 
        displayName: 'Provider',
        options: {
          options: [
            { label: 'Jira', value: 'jira' },
            { label: 'Asana', value: 'asana' },
            { label: 'Linear', value: 'linear' },
            { label: 'Generic', value: 'generic' },
          ],
        },
      },
      apiKey: { type: 'SECRET_TEXT', displayName: 'API Key/Token', required: true },
      baseUrl: { type: 'SHORT_TEXT', displayName: 'API Base URL', required: false },
    }
  },
  
  actions: {
    /**
     * Create a task/issue
     */
    createTask: {
      name: 'createTask',
      displayName: 'Create Task',
      description: 'Create a new task or issue',
      props: {
        title: {
          type: 'SHORT_TEXT',
          displayName: 'Title',
          description: 'Task title/summary',
          required: true,
        },
        description: {
          type: 'LONG_TEXT',
          displayName: 'Description',
          description: 'Task description',
          required: false,
        },
        project: {
          type: 'SHORT_TEXT',
          displayName: 'Project',
          description: 'Project key or ID',
          required: false,
        },
        type: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Type',
          description: 'Task type',
          required: false,
          defaultValue: 'task',
          options: {
            options: [
              { label: 'Task', value: 'task' },
              { label: 'Bug', value: 'bug' },
              { label: 'Story', value: 'story' },
              { label: 'Epic', value: 'epic' },
              { label: 'Subtask', value: 'subtask' },
            ],
          },
        },
        priority: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Priority',
          description: 'Task priority',
          required: false,
          defaultValue: 'medium',
          options: {
            options: [
              { label: 'Highest', value: 'highest' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' },
              { label: 'Lowest', value: 'lowest' },
            ],
          },
        },
        assignee: {
          type: 'SHORT_TEXT',
          displayName: 'Assignee',
          description: 'User to assign to',
          required: false,
        },
        labels: {
          type: 'SHORT_TEXT',
          displayName: 'Labels',
          description: 'Comma-separated labels',
          required: false,
        },
        dueDate: {
          type: 'SHORT_TEXT',
          displayName: 'Due Date',
          description: 'Due date (ISO format or relative like +7d)',
          required: false,
        },
        customFields: {
          type: 'JSON',
          displayName: 'Custom Fields',
          description: 'Additional custom fields as JSON',
          required: false,
          defaultValue: '{}',
        },
      },
      async run(context: TasksContext) {
        const { 
          title, description, project, type = 'task', 
          priority = 'medium', assignee, labels, dueDate, customFields 
        } = context.propsValue;
        
        if (!title) {
          throw new Error('Task title is required');
        }
        
        const id = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const key = `${(project || 'PROJ').toUpperCase()}-${taskCounter++}`;
        
        let custom = customFields;
        if (typeof customFields === 'string') {
          try {
            custom = JSON.parse(customFields);
          } catch {
            custom = {};
          }
        }
        
        // Parse due date
        let parsedDueDate = dueDate;
        if (dueDate && dueDate.startsWith('+')) {
          const days = parseInt(dueDate.replace(/\D/g, ''), 10);
          const date = new Date();
          date.setDate(date.getDate() + days);
          parsedDueDate = date.toISOString().split('T')[0];
        }
        
        const task: Task = {
          id,
          key,
          title,
          description,
          project,
          type,
          priority,
          status: 'todo',
          assignee,
          labels: labels ? labels.split(',').map((l: string) => l.trim()) : [],
          dueDate: parsedDueDate,
          customFields: custom,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        taskStore.set(id, task);
        
        console.log(`📋 Tasks: Created ${key} - ${title}`);
        
        return {
          success: true,
          task,
          taskId: id,
          taskKey: key,
        };
      },
    },
    
    /**
     * Create a ticket (support ticket style)
     */
    createTicket: {
      name: 'createTicket',
      displayName: 'Create Ticket',
      description: 'Create a support/ops ticket',
      props: {
        title: {
          type: 'SHORT_TEXT',
          displayName: 'Title',
          description: 'Ticket title',
          required: true,
        },
        description: {
          type: 'LONG_TEXT',
          displayName: 'Description',
          description: 'Ticket description',
          required: true,
        },
        category: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Category',
          description: 'Ticket category',
          required: false,
          defaultValue: 'general',
          options: {
            options: [
              { label: 'General', value: 'general' },
              { label: 'Technical', value: 'technical' },
              { label: 'Billing', value: 'billing' },
              { label: 'Feature Request', value: 'feature' },
              { label: 'Bug Report', value: 'bug' },
            ],
          },
        },
        priority: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Priority',
          description: 'Ticket priority',
          required: false,
          defaultValue: 'medium',
          options: {
            options: [
              { label: 'Urgent', value: 'urgent' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' },
            ],
          },
        },
        requester: {
          type: 'SHORT_TEXT',
          displayName: 'Requester',
          description: 'Person who submitted the ticket',
          required: false,
        },
        assignee: {
          type: 'SHORT_TEXT',
          displayName: 'Assignee',
          description: 'Agent to assign to',
          required: false,
        },
        customFields: {
          type: 'JSON',
          displayName: 'Custom Fields',
          description: 'Additional fields',
          required: false,
          defaultValue: '{}',
        },
      },
      async run(context: TasksContext) {
        const { 
          title, description, category = 'general', 
          priority = 'medium', requester, assignee, customFields 
        } = context.propsValue;
        
        if (!title || !description) {
          throw new Error('Title and description are required');
        }
        
        const id = `ticket_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const ticketNumber = `TKT-${String(taskCounter++).padStart(5, '0')}`;
        
        let custom = customFields;
        if (typeof customFields === 'string') {
          try {
            custom = JSON.parse(customFields);
          } catch {
            custom = {};
          }
        }
        
        const ticket: Ticket = {
          id,
          key: ticketNumber,
          ticketNumber,
          title,
          description,
          category,
          type: 'ticket',
          priority,
          status: 'open',
          requester,
          assignee,
          customFields: custom,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        taskStore.set(id, ticket);
        
        console.log(`🎫 Tasks: Created ticket ${ticketNumber} - ${title}`);
        
        return {
          success: true,
          ticket,
          ticketId: id,
          ticketNumber,
        };
      },
    },
    
    /**
     * Update a task/ticket status
     */
    updateStatus: {
      name: 'updateStatus',
      displayName: 'Update Status',
      description: 'Update task/ticket status',
      props: {
        taskId: {
          type: 'SHORT_TEXT',
          displayName: 'Task ID or Key',
          description: 'Task ID or key to update',
          required: true,
        },
        status: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Status',
          description: 'New status',
          required: true,
          options: {
            options: [
              { label: 'To Do', value: 'todo' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'In Review', value: 'in_review' },
              { label: 'Done', value: 'done' },
              { label: 'Open', value: 'open' },
              { label: 'Pending', value: 'pending' },
              { label: 'Resolved', value: 'resolved' },
              { label: 'Closed', value: 'closed' },
            ],
          },
        },
        comment: {
          type: 'LONG_TEXT',
          displayName: 'Comment',
          description: 'Status change comment',
          required: false,
        },
      },
      async run(context: TasksContext) {
        const { taskId, status, comment } = context.propsValue;
        
        // Find by ID or key
        let task = taskStore.get(taskId);
        if (!task) {
          task = Array.from(taskStore.values()).find(t => t.key === taskId);
        }
        
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
        
        const previousStatus = task.status;
        task.status = status;
        task.updatedAt = new Date().toISOString();
        
        if (comment) {
          task.customFields = {
            ...task.customFields,
            lastComment: comment,
            commentedAt: new Date().toISOString(),
          };
        }
        
        taskStore.set(task.id, task);
        
        console.log(`📋 Tasks: Updated ${task.key} status: ${previousStatus} → ${status}`);
        
        return {
          success: true,
          task,
          previousStatus,
          newStatus: status,
        };
      },
    },
    
    /**
     * Assign a task to a user
     */
    assignTask: {
      name: 'assignTask',
      displayName: 'Assign Task',
      description: 'Assign a task to a user',
      props: {
        taskId: {
          type: 'SHORT_TEXT',
          displayName: 'Task ID or Key',
          description: 'Task to assign',
          required: true,
        },
        assignee: {
          type: 'SHORT_TEXT',
          displayName: 'Assignee',
          description: 'User to assign to',
          required: true,
        },
      },
      async run(context: TasksContext) {
        const { taskId, assignee } = context.propsValue;
        
        let task = taskStore.get(taskId);
        if (!task) {
          task = Array.from(taskStore.values()).find(t => t.key === taskId);
        }
        
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
        
        const previousAssignee = task.assignee;
        task.assignee = assignee;
        task.updatedAt = new Date().toISOString();
        
        taskStore.set(task.id, task);
        
        console.log(`📋 Tasks: Assigned ${task.key} to ${assignee}`);
        
        return {
          success: true,
          task,
          previousAssignee,
          newAssignee: assignee,
        };
      },
    },
    
    /**
     * Add a comment to a task
     */
    addComment: {
      name: 'addComment',
      displayName: 'Add Comment',
      description: 'Add a comment to a task/ticket',
      props: {
        taskId: {
          type: 'SHORT_TEXT',
          displayName: 'Task ID or Key',
          description: 'Task to comment on',
          required: true,
        },
        comment: {
          type: 'LONG_TEXT',
          displayName: 'Comment',
          description: 'Comment text',
          required: true,
        },
        author: {
          type: 'SHORT_TEXT',
          displayName: 'Author',
          description: 'Comment author',
          required: false,
        },
      },
      async run(context: TasksContext) {
        const { taskId, comment, author } = context.propsValue;
        
        let task = taskStore.get(taskId);
        if (!task) {
          task = Array.from(taskStore.values()).find(t => t.key === taskId);
        }
        
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
        
        const commentId = `comment_${Date.now()}`;
        const commentData = {
          id: commentId,
          text: comment,
          author: author || 'system',
          createdAt: new Date().toISOString(),
        };
        
        task.customFields = {
          ...task.customFields,
          comments: [...(task.customFields?.comments || []), commentData],
        };
        task.updatedAt = new Date().toISOString();
        
        taskStore.set(task.id, task);
        
        console.log(`📋 Tasks: Added comment to ${task.key}`);
        
        return {
          success: true,
          taskKey: task.key,
          commentId,
          comment: commentData,
        };
      },
    },
    
    /**
     * Get task details
     */
    getTask: {
      name: 'getTask',
      displayName: 'Get Task',
      description: 'Get task details by ID or key',
      props: {
        taskId: {
          type: 'SHORT_TEXT',
          displayName: 'Task ID or Key',
          description: 'Task to retrieve',
          required: true,
        },
      },
      async run(context: TasksContext) {
        const { taskId } = context.propsValue;
        
        let task = taskStore.get(taskId);
        if (!task) {
          task = Array.from(taskStore.values()).find(t => t.key === taskId);
        }
        
        if (!task) {
          console.log(`📋 Tasks: Task ${taskId} not found`);
          return { found: false, task: null };
        }
        
        console.log(`📋 Tasks: Found ${task.key}`);
        
        return {
          found: true,
          task,
        };
      },
    },
    
    /**
     * List tasks with filters
     */
    listTasks: {
      name: 'listTasks',
      displayName: 'List Tasks',
      description: 'List tasks with optional filters',
      props: {
        project: {
          type: 'SHORT_TEXT',
          displayName: 'Project',
          description: 'Filter by project',
          required: false,
        },
        status: {
          type: 'SHORT_TEXT',
          displayName: 'Status',
          description: 'Filter by status',
          required: false,
        },
        assignee: {
          type: 'SHORT_TEXT',
          displayName: 'Assignee',
          description: 'Filter by assignee',
          required: false,
        },
        type: {
          type: 'SHORT_TEXT',
          displayName: 'Type',
          description: 'Filter by type',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum results',
          required: false,
          defaultValue: 50,
        },
      },
      async run(context: TasksContext) {
        const { project, status, assignee, type, limit = 50 } = context.propsValue;
        
        let tasks = Array.from(taskStore.values());
        
        if (project) {
          tasks = tasks.filter(t => t.project === project);
        }
        if (status) {
          tasks = tasks.filter(t => t.status === status);
        }
        if (assignee) {
          tasks = tasks.filter(t => t.assignee === assignee);
        }
        if (type) {
          tasks = tasks.filter(t => t.type === type);
        }
        
        tasks = tasks.slice(0, Number(limit));
        
        console.log(`📋 Tasks: Listed ${tasks.length} tasks`);
        
        return {
          tasks,
          count: tasks.length,
        };
      },
    },
    
    /**
     * Bulk create tasks from list
     */
    createBulkTasks: {
      name: 'createBulkTasks',
      displayName: 'Create Bulk Tasks',
      description: 'Create multiple tasks from a list',
      props: {
        tasks: {
          type: 'JSON',
          displayName: 'Tasks',
          description: 'Array of task objects [{title, description, ...}]',
          required: true,
        },
        project: {
          type: 'SHORT_TEXT',
          displayName: 'Project',
          description: 'Default project for all tasks',
          required: false,
        },
        assignee: {
          type: 'SHORT_TEXT',
          displayName: 'Default Assignee',
          description: 'Default assignee for all tasks',
          required: false,
        },
      },
      async run(context: TasksContext) {
        const { tasks, project, assignee } = context.propsValue;
        
        let taskList = tasks;
        if (typeof tasks === 'string') {
          taskList = JSON.parse(tasks);
        }
        
        if (!Array.isArray(taskList)) {
          throw new Error('Tasks must be an array');
        }
        
        const createdTasks: Task[] = [];
        
        for (const taskData of taskList) {
          const id = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const key = `${(taskData.project || project || 'PROJ').toUpperCase()}-${taskCounter++}`;
          
          const task: Task = {
            id,
            key,
            title: taskData.title || 'Untitled Task',
            description: taskData.description,
            project: taskData.project || project,
            type: taskData.type || 'task',
            priority: taskData.priority || 'medium',
            status: taskData.status || 'todo',
            assignee: taskData.assignee || assignee,
            labels: taskData.labels || [],
            dueDate: taskData.dueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          taskStore.set(id, task);
          createdTasks.push(task);
        }
        
        console.log(`📋 Tasks: Created ${createdTasks.length} tasks in bulk`);
        
        return {
          success: true,
          tasks: createdTasks,
          count: createdTasks.length,
        };
      },
    },
  },
  
  triggers: {},
};

export const tasks = tasksBit;
export default tasksBit;
