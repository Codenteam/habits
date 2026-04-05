/**
 * Usage examples for NodeDTO and NodeFactory classes
 * These examples show how to create and manipulate nodes in a type-safe way
 */

import { NodeDTO } from './NodeDTO';
import { NodeFactory } from './NodeFactory';

// Example 1: Creating a basic bits node
export function createBasicBitsNode() {
  const node = NodeDTO.createNew({
    framework: 'bits',
    module: '@ha-bits/bit-http',
    label: 'HTTP Request',
    position: { x: 100, y: 100 },
    resource: 'http',
    operation: 'request',
  });

  console.log('Created node:', node.getSummary());
  return node;
}

// Example 2: Creating a script node
export function createScriptNode() {
  const node = NodeDTO.createNew({
    framework: 'script',
    module: 'script',
    label: 'Process Data',
    position: { x: 300, y: 100 },
    language: 'typescript',
    content: 'export default function process(input: any) { return input; }',
  });

  return node;
}

// Example 3: Using NodeFactory for specific node types
export function createHttpWorkflow() {
  // Create a schedule trigger
  const trigger = NodeFactory.createScheduleTriggerNode({
    interval: 'daily',
    label: 'Daily Check',
    position: { x: 0, y: 100 },
  });

  // Create an HTTP request node
  const httpRequest = NodeFactory.createHttpRequestNode({
    method: 'GET',
    url: 'https://api.example.com/data',
    label: 'Fetch Data',
    position: { x: 200, y: 100 },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Create an IF condition node
  const condition = NodeFactory.createIfNode({
    condition: 'status == 200',
    label: 'Check Status',
    position: { x: 400, y: 100 },
  });

  // Create another HTTP request node
  const notify = NodeFactory.createHttpRequestNode({
    method: 'POST',
    url: 'https://api.example.com/webhook',
    label: 'Send Notification',
    position: { x: 600, y: 100 },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token',
    },
  });

  return [trigger, httpRequest, condition, notify];
}

// Example 4: Node validation and error checking
export function validateNodeExample() {
  const node = NodeDTO.createNew({
    framework: 'bits',
    module: '', // Invalid - empty module
    label: '',  // Invalid - empty label
  });

  const validation = node.validate();
  
  if (!validation.valid) {
    console.log('Validation errors:', validation.errors);
    // Output: ['Module is required', 'Label is required']
  }

  return validation;
}

// Example 5: Node connection validation
export function testNodeConnections() {
  const trigger = NodeFactory.createScheduleTriggerNode({
    label: 'Schedule',
    position: { x: 0, y: 0 },
  });

  const action = NodeFactory.createHttpRequestNode({
    label: 'HTTP Request',
    position: { x: 200, y: 0 },
  });

  const anotherTrigger = NodeFactory.createWebhookTriggerNode({
    label: 'Webhook',
    position: { x: 400, y: 0 },
  });

  // These should work
  console.log('Trigger -> Action:', trigger.canConnectTo(action)); // true
  
  // These should not work
  console.log('Action -> Trigger:', action.canConnectTo(anotherTrigger)); // false (triggers can't have inputs)
  console.log('Node -> Self:', trigger.canConnectTo(trigger)); // false (can't connect to self)

  return { trigger, action, anotherTrigger };
}

// Example 6: Cloning and updating nodes
export function nodeManipulationExample() {
  const originalNode = NodeFactory.createHttpRequestNode({
    method: 'GET',
    url: 'https://api.example.com',
    label: 'Original Node',
    position: { x: 0, y: 0 },
  });

  // Clone the node
  const clonedNode = originalNode.clone({
    position: { x: 200, y: 0 },
  });

  // Update the cloned node
  const updatedNode = clonedNode.update({
    label: 'Updated Node',
    params: {
      method: 'POST',
    },
  });

  console.log('Original:', originalNode.getSummary());
  console.log('Updated:', updatedNode.getSummary());

  return { originalNode, clonedNode, updatedNode };
}

// Example 7: Creating a complete workflow chain
export function createCompleteWorkflow() {
  const workflowNodes = NodeFactory.createNodeChain([
    {
      type: 'trigger',
      framework: 'bits',
      module: '@ha-bits/bit-schedule',
      label: 'Daily Schedule',
      params: { interval: 'daily' },
    },
    {
      type: 'action',
      framework: 'bits',
      module: '@ha-bits/bit-http',
      resource: 'http',
      operation: 'request',
      label: 'Fetch Data',
    },
    {
      type: 'action',
      framework: 'bits',
      module: '@ha-bits/bit-logic',
      resource: 'logic',
      operation: 'if',
      label: 'Filter Results',
    },
    {
      type: 'action',
      framework: 'bits',
      module: '@ha-bits/bit-http',
      resource: 'http',
      operation: 'request',
      label: 'Send Notification',
      params: {
        method: 'POST',
        url: 'https://hooks.slack.com/webhook',
      },
    },
  ]);

  // Convert all nodes to WorkflowNode format for storage
  const workflowData = workflowNodes.map(node => node.toWorkflowNode());
  
  console.log('Created workflow with', workflowNodes.length, 'nodes');
  return workflowData;
}

// Example 8: Working with existing workflow data
export function loadAndManipulateWorkflow(workflowData: any) {
  // Load existing nodes
  const nodes = workflowData.nodes.map((nodeData: any) => 
    NodeDTO.fromWorkflowNode(nodeData)
  );

  // Find trigger nodes
  const triggers = nodes.filter((node: NodeDTO) => node.isTrigger());
  console.log('Found', triggers.length, 'trigger nodes');

  // Find bits nodes
  const bitsNodes = nodes.filter((node: NodeDTO) => node.isBits());
  console.log('Found', bitsNodes.length, 'bits nodes');

  // Find nodes with multiple outputs
  const multiOutputNodes = nodes.filter((node: NodeDTO) => node.hasMultipleOutputs());
  console.log('Found', multiOutputNodes.length, 'nodes with multiple outputs');

  // Get execution configs for all nodes
  const executionConfigs = nodes.map((node: NodeDTO) => ({
    id: node.id,
    config: node.getExecutionConfig(),
  }));

  return {
    nodes,
    triggers,
    bitsNodes,
    multiOutputNodes,
    executionConfigs,
  };
}