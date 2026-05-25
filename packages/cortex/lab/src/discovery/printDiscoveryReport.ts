import type { DataFlowDiscoveryReport } from './discoverDataFlow';

const LAYER_ORDER = ['source', 'state', 'ui', 'workflow', 'output', 'response'] as const;

export function printDiscoveryReport(report: DataFlowDiscoveryReport): void {
  const status = report.ok ? 'PASS' : 'FAIL';
  const icon = report.ok ? '✓' : '✗';

  console.log(`\n${icon} [DISCOVER] ${status} — ${report.summary.nodeCount} nodes, ${report.summary.edgeCount} edges`);
  if (report.configPath) {
    console.log(`   config: ${report.configPath}`);
  }
  console.log(`   errors: ${report.summary.errorCount}, warnings: ${report.summary.warningCount}\n`);

  if (report.errors.length > 0) {
    console.log('Errors:');
    for (const issue of report.errors) {
      console.log(`  ✗ [${issue.code}] ${issue.message}`);
      if (issue.suggestion) console.log(`    → ${issue.suggestion}`);
    }
    console.log('');
  }

  if (report.warnings.length > 0) {
    console.log('Warnings:');
    for (const issue of report.warnings) {
      console.log(`  ⚠ [${issue.code}] ${issue.message}`);
      if (issue.suggestion) console.log(`    → ${issue.suggestion}`);
    }
    console.log('');
  }

  console.log('Data flow paths:');
  for (const layer of LAYER_ORDER) {
    const layerNodes = report.graph.nodes.filter((n) => n.layer === layer);
    if (layerNodes.length === 0) continue;

    console.log(`\n  ${layer.toUpperCase()}`);
    for (const node of layerNodes) {
      const outgoing = report.graph.edges.filter((e) => e.source === node.id);
      const statusMark = node.status === 'ok' ? '·' : node.status === 'error' ? '✗' : node.status === 'warning' ? '⚠' : '○';
      console.log(`    ${statusMark} ${node.label} (${node.id})`);
      for (const edge of outgoing) {
        const target = report.graph.nodes.find((n) => n.id === edge.target);
        const label = edge.label ? ` [${edge.label}]` : '';
        console.log(`      →${label} ${target?.label ?? edge.target}`);
      }
    }
  }
  console.log('');
}
