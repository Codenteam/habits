/**
 * @ha-bits/bit-if
 * 
 * Conditional branching bit with dynamic conditions.
 * 
 * Two execution modes:
 * - if: Simple If - single condition check
 * - switch: If/Else If/Else - multiple conditions evaluated in order (like a switch)
 * 
 * UI Labels:
 * - if mode: Just "If" for the single condition
 * - switch mode: "If" (first), "Else If" (subsequent), "Else" (default)
 */

export interface BranchCondition {
  label?: string;           // Optional custom label for the branch
  value1: any;              // Left side of comparison
  operator: string;         // Comparison operator
  value2?: any;             // Right side of comparison (optional for isEmpty/isNull)
  caseSensitive?: boolean;  // Case sensitivity for string comparisons
  output?: any;             // Output value when this branch matches
}

export interface BranchContext {
  propsValue: {
    mode: 'if' | 'switch';
    branches: BranchCondition[] | string;
    defaultOutput?: any;
    includeElse?: boolean;
  };
}

/**
 * Available comparison operators
 */
const OPERATORS = [
  { label: 'Equals (==)', value: 'equals' },
  { label: 'Not Equals (!=)', value: 'notEquals' },
  { label: 'Greater Than (>)', value: 'greaterThan' },
  { label: 'Greater Than or Equal (>=)', value: 'greaterThanOrEqual' },
  { label: 'Less Than (<)', value: 'lessThan' },
  { label: 'Less Than or Equal (<=)', value: 'lessThanOrEqual' },
  { label: 'Contains', value: 'contains' },
  { label: 'Does Not Contain', value: 'notContains' },
  { label: 'Starts With', value: 'startsWith' },
  { label: 'Ends With', value: 'endsWith' },
  { label: 'Is Empty', value: 'isEmpty' },
  { label: 'Is Not Empty', value: 'isNotEmpty' },
  { label: 'Is Null/Undefined', value: 'isNull' },
  { label: 'Is Not Null/Undefined', value: 'isNotNull' },
  { label: 'Regex Match', value: 'regex' },
  { label: 'Always True', value: 'always' },
];

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  value1: any,
  operator: string,
  value2: any,
  caseSensitive: boolean = false
): boolean {
  const normalizeString = (val: any): string => {
    const str = String(val ?? '');
    return caseSensitive ? str : str.toLowerCase();
  };

  switch (operator) {
    case 'equals':
      return normalizeString(value1) === normalizeString(value2);
    case 'notEquals':
      return normalizeString(value1) !== normalizeString(value2);
    case 'greaterThan':
      return Number(value1) > Number(value2);
    case 'greaterThanOrEqual':
      return Number(value1) >= Number(value2);
    case 'lessThan':
      return Number(value1) < Number(value2);
    case 'lessThanOrEqual':
      return Number(value1) <= Number(value2);
    case 'contains':
      return normalizeString(value1).includes(normalizeString(value2));
    case 'notContains':
      return !normalizeString(value1).includes(normalizeString(value2));
    case 'startsWith':
      return normalizeString(value1).startsWith(normalizeString(value2));
    case 'endsWith':
      return normalizeString(value1).endsWith(normalizeString(value2));
    case 'isEmpty':
      return value1 === '' || value1 === null || value1 === undefined || 
             (Array.isArray(value1) && value1.length === 0) ||
             (typeof value1 === 'object' && value1 !== null && Object.keys(value1).length === 0);
    case 'isNotEmpty':
      return !(value1 === '' || value1 === null || value1 === undefined || 
              (Array.isArray(value1) && value1.length === 0) ||
              (typeof value1 === 'object' && value1 !== null && Object.keys(value1).length === 0));
    case 'isNull':
      return value1 === null || value1 === undefined;
    case 'isNotNull':
      return value1 !== null && value1 !== undefined;
    case 'regex':
      try {
        const regex = new RegExp(String(value2), caseSensitive ? '' : 'i');
        return regex.test(String(value1));
      } catch {
        return false;
      }
    case 'always':
      return true;
    default:
      return false;
  }
}

/**
 * Generate branch label based on mode and index
 */
function getBranchLabel(mode: string, index: number, customLabel?: string, isElse: boolean = false): string {
  if (customLabel) return customLabel;
  if (isElse) return 'Else';
  if (mode === 'if') return 'If';
  // switch mode: If/Else If/Else
  return index === 0 ? 'If' : 'Else If';
}

const ifBit = {
  displayName: 'If / Branch',
  description: 'Conditional branching with dynamic conditions. Supports simple If (single condition) or If/Else If/Else (multiple conditions like a switch).',
  logoUrl: 'lucide:GitBranch',
  
  actions: {
    /**
     * Main branching action with dynamic branches
     */
    branch: {
      name: 'branch',
      displayName: 'Branch',
      description: 'Evaluate conditions and branch workflow. Use "If" for single condition, or "If/Else If/Else" for multiple conditions (switch-like behavior).',
      props: {
        mode: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Mode',
          description: 'If: Single condition check. If/Else If/Else: Multiple conditions evaluated in order (like a switch).',
          required: true,
          defaultValue: 'if',
          options: {
            options: [
              { label: 'If (Single Condition)', value: 'if' },
              { label: 'If / Else If / Else (Switch)', value: 'switch' },
            ],
          },
        },
        branches: {
          type: 'BRANCH_CONDITIONS',
          displayName: 'Conditions',
          description: 'Define your conditions. In "If" mode, only the first condition is used. In "Switch" mode, conditions are evaluated in order until one matches.',
          required: true,
          defaultValue: [{ value1: '', operator: 'equals', value2: '', output: '' }],
        },
        includeElse: {
          type: 'CHECKBOX',
          displayName: 'Include Else Branch',
          description: 'Add an Else branch that executes when no condition matches',
          required: false,
          defaultValue: true,
        },
        defaultOutput: {
          type: 'SHORT_TEXT',
          displayName: 'Else Output',
          description: 'Output when no branch matches (singleBranch mode with Else enabled)',
          required: false,
          defaultValue: 'No match',
        },
      },
      async run(context: BranchContext) {
        let { mode, branches, defaultOutput, includeElse } = context.propsValue;
        
        // Parse branches if string
        if (typeof branches === 'string') {
          try {
            branches = JSON.parse(branches);
          } catch {
            branches = [];
          }
        }
        
        if (!Array.isArray(branches)) {
          branches = [];
        }

        // In 'if' mode, only use the first condition
        if (mode === 'if' && branches.length > 1) {
          branches = [branches[0]];
        }
        
        const results: Array<{
          branchIndex: number;
          label: string;
          matched: boolean;
          condition: { value1: any; operator: string; value2: any };
          output: any;
        }> = [];
        
        let firstMatchIndex: number | null = null;
        let hasAnyMatch = false;
        
        // Evaluate each branch
        for (let i = 0; i < branches.length; i++) {
          const branch = branches[i];
          const matched = evaluateCondition(
            branch.value1,
            branch.operator,
            branch.value2,
            branch.caseSensitive ?? false
          );
          
          const label = getBranchLabel(mode, i, branch.label);
          
          if (matched && firstMatchIndex === null) {
            firstMatchIndex = i;
          }
          if (matched) {
            hasAnyMatch = true;
          }
          
          results.push({
            branchIndex: i,
            label,
            matched,
            condition: {
              value1: branch.value1,
              operator: branch.operator,
              value2: branch.value2,
            },
            output: matched ? branch.output : undefined,
          });
          
          console.log(`🔀 ${label}: "${branch.value1}" ${branch.operator} "${branch.value2}" = ${matched}`);
        }
        
        // Both 'if' and 'switch' modes: first matching condition wins
        const executedBranch = firstMatchIndex !== null ? results[firstMatchIndex] : null;
        const elseExecuted = !hasAnyMatch && includeElse;
        
        if (elseExecuted) {
          console.log(`🔀 Else branch executed with output: "${defaultOutput}"`);
        }
        
        // Determine which branch handles should be activated for flow control
        // Branch handles follow the pattern "branch-0", "branch-1", etc.
        // Else branch is "branch-else" or the last branch index
        let activeBranches: string[] = [];
        if (firstMatchIndex !== null) {
          activeBranches = [`branch-${firstMatchIndex}`];
        } else if (elseExecuted) {
          // Else branch - typically after all defined branches
          activeBranches = [`branch-${branches.length}`];
        }
        
        return {
          mode,
          totalConditions: branches.length,
          executedConditionIndex: elseExecuted ? -1 : firstMatchIndex,
          executedConditionLabel: elseExecuted ? 'Else' : (executedBranch?.label ?? null),
          output: elseExecuted ? defaultOutput : (executedBranch?.output ?? null),
          matched: hasAnyMatch,
          elseExecuted,
          allConditions: results.map((r, i) => ({
            index: i,
            label: r.label,
            matched: r.matched,
            executed: i === firstMatchIndex,
          })),
          // Flow control metadata - allows the executor to skip non-activated branches
          _flowControl: {
            controlsFlow: true,
            activeBranches,
          },
          // Also expose at top level for easier access
          controlsFlow: true,
          activeBranches,
        };
      },
    },
  },
  
  triggers: {},
};

export const ifUtils = ifBit;
export default ifBit;
