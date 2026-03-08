/**
 * @ha-bits/bit-any-of
 * 
 * Any-of flow control bit - "race" gate that continues when ANY one incoming edge completes.
 * 
 * Unlike a standard join/merge node that waits for all inputs, any-of:
 * - Continues the flow immediately when the FIRST input arrives
 * - Does NOT wait for other incoming edges
 * - Acts as a "first-to-finish" race gate
 * - Has a single output handle
 * - Output value is configurable per input branch
 * 
 * Use cases:
 * - Racing multiple API calls (use first response)
 * - Timeout patterns (continue with first result OR timeout)
 * - Redundant processing (use first successful result)
 * - Mapping different input paths to specific output values
 */

export interface BranchConfig {
  name: string;   // Name of the input edge/branch
  output: any;    // Output value when this branch triggers the node
}

export interface AnyOfContext {
  propsValue: {
    sourceEdge?: string;
    branches?: BranchConfig[] | string;
    defaultOutput?: any;
    inputData?: any;       // Single input data (for passThrough mode)
    inputs?: any[];        // Array of potential input sources (first non-skipped wins)
    passThrough?: boolean; // If true, output inputData or first valid input directly
  };
}

/**
 * Check if a value represents a skipped node
 */
function isSkippedNode(value: any): boolean {
  return value && typeof value === 'object' && value._skipped === true;
}

/**
 * Check if a value is valid input data (not null, undefined, empty, or skipped)
 */
function isValidInputData(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (isSkippedNode(value)) return false;
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) return false; // Unresolved template
  return true;
}

const anyOfBit = {
  displayName: 'Any Of (Race)',
  description: 'Flow control gate that continues when ANY one incoming edge completes. Single output whose value is determined by which input branch triggered it.',
  logoUrl: 'lucide:CircleDot',
  
  actions: {
    /**
     * Race gate - continues on first input, output is configurable per branch
     * Single output handle - the output value depends on which input branch fired first
     */
    race: {
      name: 'race',
      displayName: 'Race (First to Finish)',
      description: 'Continue workflow when ANY one of the incoming edges completes. First input wins. Output value is determined by the triggering branch configuration.',
      props: {
        sourceEdge: {
          type: 'SHORT_TEXT',
          displayName: 'Source Edge',
          description: 'Identifier of the edge that triggered this node (automatically set by executor)',
          required: false,
        },
        inputData: {
          type: 'JSON',
          displayName: 'Input Data',
          description: 'Data from the incoming edge. In passThrough mode, this is output directly.',
          required: false,
        },
        inputs: {
          type: 'ARRAY',
          displayName: 'Input Sources',
          description: 'Array of potential input values. First non-skipped, non-empty value will be used as output in passThrough mode.',
          required: false,
          defaultValue: [],
        },
        passThrough: {
          type: 'CHECKBOX',
          displayName: 'Pass Through Mode',
          description: 'When enabled, outputs inputData directly instead of using branch mapping',
          required: false,
          defaultValue: false,
        },
        branches: {
          type: 'ARRAY',
          displayName: 'Branch Outputs',
          description: 'Configure the output value for each input branch. Example: [{"name": "approval", "output": "yes"}, {"name": "rejection", "output": "no"}]',
          required: false,
          defaultValue: [],
        },
        defaultOutput: {
          type: 'TEXT',
          displayName: 'Default Output',
          description: 'Output value when sourceEdge does not match any configured branch',
          required: false,
          defaultValue: null,
        },
      },
      async run(context: AnyOfContext) {
        const { sourceEdge, branches: rawBranches = [], defaultOutput = null, inputData, inputs = [], passThrough = false } = context.propsValue;
        
        // Parse branches if it's a string
        let branches: BranchConfig[] = [];
        if (typeof rawBranches === 'string') {
          try {
            const parsed = JSON.parse(rawBranches);
            branches = Array.isArray(parsed) ? parsed : [];
          } catch {
            branches = [];
          }
        } else if (Array.isArray(rawBranches)) {
          branches = rawBranches;
        }
        
        console.log(`🏁 Any-Of: First input received${sourceEdge ? ` from "${sourceEdge}"` : ''}${passThrough ? ' (passThrough mode)' : ''}`);
        
        // PassThrough mode: find first valid input and output it directly
        if (passThrough) {
          // First try inputData, then check inputs array for first valid value
          let selectedInput: any = undefined;
          let selectedSource: string = 'inputData';
          
          if (isValidInputData(inputData)) {
            selectedInput = inputData;
            selectedSource = 'inputData';
            console.log(`🏁 Any-Of: PassThrough mode - using inputData directly`);
          } else if (Array.isArray(inputs) && inputs.length > 0) {
            // Find first non-skipped input from the inputs array
            for (let i = 0; i < inputs.length; i++) {
              if (isValidInputData(inputs[i])) {
                selectedInput = inputs[i];
                selectedSource = `inputs[${i}]`;
                console.log(`🏁 Any-Of: PassThrough mode - using inputs[${i}]`);
                break;
              }
            }
          }
          
          if (selectedInput !== undefined) {
            return {
              // Spread selectedInput to make all its properties accessible at top level
              ...selectedInput,
              
              // Also keep it as 'output' for consistent access
              output: selectedInput,
              
              // Metadata about what triggered this
              _anyOf: {
                triggeredBy: sourceEdge || 'unknown',
                triggeredAt: new Date().toISOString(),
                passThrough: true,
                selectedSource,
                matchedBranch: null,
                configuredBranches: branches.map(b => b.name),
              },
              
              // Flow control metadata
              _flowControl: {
                controlsFlow: false,
                raceMode: true,
                waitForAll: false,
                continueOnFirst: true,
              },
              
              // Convenience properties
              raceMode: true,
              waitForAll: false,
              triggeredBy: sourceEdge || 'unknown',
            };
          }
          
          console.log(`🏁 Any-Of: PassThrough mode - no valid input found, falling back to branch mode`);
        }
        
        // Branch mapping mode: find matching branch based on sourceEdge
        let matchedBranch: BranchConfig | undefined;
        let outputValue: any = defaultOutput;
        
        if (sourceEdge && branches.length > 0) {
          matchedBranch = branches.find(b => b.name === sourceEdge);
          if (matchedBranch) {
            outputValue = matchedBranch.output;
            console.log(`🏁 Any-Of: Matched branch "${matchedBranch.name}" → output: ${JSON.stringify(outputValue)}`);
          } else {
            console.log(`🏁 Any-Of: No branch matched "${sourceEdge}", using default output`);
          }
        } else if (sourceEdge) {
          // No branches configured, use sourceEdge as output or default
          console.log(`🏁 Any-Of: No branches configured, using default output`);
        }
        
        return {
          // The output value - either from matched branch or default
          output: outputValue,
          
          // Metadata about what triggered this
          _anyOf: {
            triggeredBy: sourceEdge || 'unknown',
            triggeredAt: new Date().toISOString(),
            matchedBranch: matchedBranch ? { name: matchedBranch.name, output: matchedBranch.output } : null,
            configuredBranches: branches.map(b => b.name),
          },
          
          // Flow control metadata - single output, no branch routing
          _flowControl: {
            controlsFlow: false,
            raceMode: true,
            waitForAll: false,
            continueOnFirst: true,
          },
          
          // Convenience properties
          raceMode: true,
          waitForAll: false,
        };
      },
    },
    
    /**
     * Simple gate action - minimal configuration with branch outputs
     */
    gate: {
      name: 'gate',
      displayName: 'Any-Of Gate',
      description: 'Simple gate that opens on first input. Output determined by which branch triggered it.',
      props: {
        sourceEdge: {
          type: 'SHORT_TEXT',
          displayName: 'Source Edge',
          description: 'Identifier of the edge that triggered this node (automatically set by executor)',
          required: false,
        },
        inputData: {
          type: 'JSON',
          displayName: 'Input Data',
          description: 'Data from the incoming edge. In passThrough mode, this is output directly.',
          required: false,
        },
        inputs: {
          type: 'ARRAY',
          displayName: 'Input Sources',
          description: 'Array of potential input values. First non-skipped, non-empty value will be used as output in passThrough mode.',
          required: false,
          defaultValue: [],
        },
        passThrough: {
          type: 'CHECKBOX',
          displayName: 'Pass Through Mode',
          description: 'When enabled, outputs inputData directly instead of using branch mapping',
          required: false,
          defaultValue: false,
        },
        branches: {
          type: 'ARRAY',
          displayName: 'Branch Outputs',
          description: 'Configure the output value for each input branch',
          required: false,
          defaultValue: [],
        },
        defaultOutput: {
          type: 'JSON',
          displayName: 'Default Output',
          description: 'Output value when sourceEdge does not match any configured branch',
          required: false,
          defaultValue: null,
        },
      },
      async run(context: AnyOfContext) {
        const { sourceEdge, branches: rawBranches = [], defaultOutput = null, inputData, inputs = [], passThrough = false } = context.propsValue;
        
        // Parse branches if it's a string
        let branches: BranchConfig[] = [];
        if (typeof rawBranches === 'string') {
          try {
            const parsed = JSON.parse(rawBranches);
            branches = Array.isArray(parsed) ? parsed : [];
          } catch {
            branches = [];
          }
        } else if (Array.isArray(rawBranches)) {
          branches = rawBranches;
        }
        
        console.log(`🏁 Any-Of Gate: Activated (first input received${sourceEdge ? ` from "${sourceEdge}"` : ''}${passThrough ? ' passThrough' : ''})`);
        
        // PassThrough mode: find first valid input and output it directly
        if (passThrough) {
          let selectedInput: any = undefined;
          let selectedSource: string = 'inputData';
          
          if (isValidInputData(inputData)) {
            selectedInput = inputData;
            selectedSource = 'inputData';
            console.log(`🏁 Any-Of Gate: PassThrough mode - using inputData directly`);
          } else if (Array.isArray(inputs) && inputs.length > 0) {
            for (let i = 0; i < inputs.length; i++) {
              if (isValidInputData(inputs[i])) {
                selectedInput = inputs[i];
                selectedSource = `inputs[${i}]`;
                console.log(`🏁 Any-Of Gate: PassThrough mode - using inputs[${i}]`);
                break;
              }
            }
          }
          
          if (selectedInput !== undefined) {
            return {
              ...selectedInput,
              output: selectedInput,
              activated: true,
              activatedAt: new Date().toISOString(),
              triggeredBy: sourceEdge || 'unknown',
              
              _anyOf: {
                triggeredBy: sourceEdge || 'unknown',
                triggeredAt: new Date().toISOString(),
                passThrough: true,
                selectedSource,
                matchedBranch: null,
              },
              
              _flowControl: {
                controlsFlow: false,
                raceMode: true,
                waitForAll: false,
                continueOnFirst: true,
              },
              
              raceMode: true,
              waitForAll: false,
            };
          }
          
          console.log(`🏁 Any-Of Gate: PassThrough mode - no valid input found, falling back to branch mode`);
        }
        
        // Find the matching branch
        let matchedBranch: BranchConfig | undefined;
        let outputValue: any = defaultOutput;
        
        if (sourceEdge && branches.length > 0) {
          matchedBranch = branches.find(b => b.name === sourceEdge);
          if (matchedBranch) {
            outputValue = matchedBranch.output;
            console.log(`🏁 Any-Of Gate: Matched branch "${matchedBranch.name}" → output: ${JSON.stringify(outputValue)}`);
          }
        }
        
        return {
          output: outputValue,
          activated: true,
          activatedAt: new Date().toISOString(),
          
          _anyOf: {
            triggeredBy: sourceEdge || 'unknown',
            triggeredAt: new Date().toISOString(),
            matchedBranch: matchedBranch ? { name: matchedBranch.name, output: matchedBranch.output } : null,
          },
          
          _flowControl: {
            controlsFlow: false,
            raceMode: true,
            waitForAll: false,
            continueOnFirst: true,
          },
          
          raceMode: true,
          waitForAll: false,
        };
      },
    },
  },
  
  triggers: {},
};

// Export utilities for testing
export const anyOfUtils = {
  /**
   * Check if a result indicates race mode (for executor integration)
   */
  isRaceMode(result: any): boolean {
    return result?._flowControl?.raceMode === true || result?.raceMode === true;
  },
  
  /**
   * Check if should wait for all inputs
   */
  shouldWaitForAll(result: any): boolean {
    // any-of should NEVER wait for all - default to false
    return result?._flowControl?.waitForAll ?? result?.waitForAll ?? false;
  },
  
  /**
   * Get the triggering branch info from the result
   */
  getTriggeredBy(result: any): string | null {
    return result?._anyOf?.triggeredBy ?? null;
  },
  
  /**
   * Get the matched branch configuration from the result
   */
  getMatchedBranch(result: any): BranchConfig | null {
    return result?._anyOf?.matchedBranch ?? null;
  },
};

export default anyOfBit;
