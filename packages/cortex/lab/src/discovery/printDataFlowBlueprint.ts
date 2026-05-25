import type { DataFlowBlueprintFile } from './blueprintTypes';

export function printDataFlowBlueprint(blueprint: DataFlowBlueprintFile): void {
  console.log(`\n📋 [BLUEPRINT] Data-flow structure (no runtime values)`);
  if (blueprint.configPath) {
    console.log(`   config: ${blueprint.configPath}`);
  }
  console.log(`   workflows: ${Object.keys(blueprint.workflows).join(', ') || 'none'}\n`);

  for (const [workflowId, wf] of Object.entries(blueprint.workflows)) {
    console.log(`  ${workflowId} (${wf.workflowName})`);
    console.log(`    execution: ${wf.executionOrder.join(' → ') || '(none)'}`);

    const inputKeys = Object.keys(wf.habitInput);
    if (inputKeys.length > 0) {
      console.log(`    habitInput: ${inputKeys.join(', ')}`);
    }

    if (wf.env && Object.keys(wf.env).length > 0) {
      console.log(`    env: ${Object.keys(wf.env).join(', ')}`);
    }

    for (const node of wf.nodes) {
      const mod = node.module ? ` ${node.module}` : '';
      const op = node.operation ? `.${node.operation}` : '';
      console.log(`    node ${node.nodeId}: ${node.framework}${mod}${op} → ${node.output}`);
    }

    const outKeys = Object.keys(wf.workflowOutput);
    if (outKeys.length > 0) {
      console.log(`    workflowOutput: ${outKeys.join(', ')}`);
    }
    console.log('');
  }
}
