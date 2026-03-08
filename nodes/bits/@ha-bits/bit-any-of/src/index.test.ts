/**
 * Unit tests for @ha-bits/bit-any-of
 */

import anyOfBit, { anyOfUtils } from './index';

describe('@ha-bits/bit-any-of', () => {
  describe('race action', () => {
    it('should return configured output when branch matches sourceEdge', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'approval-path',
          branches: [
            { name: 'approval-path', output: 'yes' },
            { name: 'rejection-path', output: 'no' },
          ],
          defaultOutput: 'unknown',
        },
      };

      const result = await anyOfBit.actions.race.run(context);

      expect(result.output).toBe('yes');
      expect(result._anyOf.triggeredBy).toBe('approval-path');
      expect(result._anyOf.matchedBranch).toEqual({ name: 'approval-path', output: 'yes' });
    });

    it('should return second branch output when that branch triggers', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'rejection-path',
          branches: [
            { name: 'approval-path', output: 'yes' },
            { name: 'rejection-path', output: 'no' },
          ],
          defaultOutput: 'unknown',
        },
      };

      const result = await anyOfBit.actions.race.run(context);

      expect(result.output).toBe('no');
      expect(result._anyOf.triggeredBy).toBe('rejection-path');
      expect(result._anyOf.matchedBranch).toEqual({ name: 'rejection-path', output: 'no' });
    });

    it('should return default output when sourceEdge does not match any branch', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'unknown-edge',
          branches: [
            { name: 'approval-path', output: 'yes' },
            { name: 'rejection-path', output: 'no' },
          ],
          defaultOutput: 'fallback-value',
        },
      };

      const result = await anyOfBit.actions.race.run(context);

      expect(result.output).toBe('fallback-value');
      expect(result._anyOf.triggeredBy).toBe('unknown-edge');
      expect(result._anyOf.matchedBranch).toBeNull();
    });

    it('should support complex output values (objects)', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'data-path',
          branches: [
            { name: 'data-path', output: { status: 'success', data: { id: 123 } } },
          ],
          defaultOutput: null,
        },
      };

      const result = await anyOfBit.actions.race.run(context);

      expect(result.output).toEqual({ status: 'success', data: { id: 123 } });
    });

    it('should support template expressions in output (passed through as-is)', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'user-input',
          branches: [
            { name: 'user-input', output: '{{habits.input.message}}' },
          ],
          defaultOutput: null,
        },
      };

      const result = await anyOfBit.actions.race.run(context);

      // Template should pass through unchanged for executor to resolve
      expect(result.output).toBe('{{habits.input.message}}');
    });

    it('should include flow control metadata indicating race mode without branch routing', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'test-edge',
          branches: [],
          defaultOutput: 'default',
        },
      };

      const result = await anyOfBit.actions.race.run(context);

      // Check _flowControl metadata
      expect(result._flowControl).toBeDefined();
      expect(result._flowControl.controlsFlow).toBe(false); // Single output, no branch control
      expect(result._flowControl.raceMode).toBe(true);
      expect(result._flowControl.waitForAll).toBe(false);
      expect(result._flowControl.continueOnFirst).toBe(true);

      // Should NOT have activeBranches (single output)
      expect((result._flowControl as any).activeBranches).toBeUndefined();
      expect((result as any).activeBranches).toBeUndefined();

      // Check top-level convenience properties
      expect(result.raceMode).toBe(true);
      expect(result.waitForAll).toBe(false);
    });

    it('should return default output when no sourceEdge provided', async () => {
      const context = {
        propsValue: {
          branches: [
            { name: 'branch-1', output: 'value-1' },
          ],
          defaultOutput: 'no-source',
        },
      };

      const result = await anyOfBit.actions.race.run(context);

      expect(result.output).toBe('no-source');
      expect(result._anyOf.triggeredBy).toBe('unknown');
    });

    it('should include timestamp in _anyOf metadata', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'test',
          branches: [],
        },
      };

      const result = await anyOfBit.actions.race.run(context);

      expect(result._anyOf.triggeredAt).toBeDefined();
      expect(new Date(result._anyOf.triggeredAt).getTime()).not.toBeNaN();
    });

    it('should parse branches from JSON string', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'api-2',
          branches: '[{"name": "api-1", "output": "first"}, {"name": "api-2", "output": "second"}]',
          defaultOutput: null,
        },
      };

      const result = await anyOfBit.actions.race.run(context);

      expect(result.output).toBe('second');
      expect(result._anyOf.configuredBranches).toEqual(['api-1', 'api-2']);
    });

    it('should return null as default output when not configured', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'unknown',
          branches: [{ name: 'known', output: 'value' }],
        },
      };

      const result = await anyOfBit.actions.race.run(context);

      expect(result.output).toBeNull();
    });

    describe('passThrough mode', () => {
      it('should output inputData directly when passThrough is true', async () => {
        const testData = {
          emails: [{ from: 'test@example.com', subject: 'Test', body: 'Hello' }],
          count: 1,
        };
        
        const context = {
          propsValue: {
            sourceEdge: 'format-submission',
            inputData: testData,
            passThrough: true,
          },
        };

        const result = await anyOfBit.actions.race.run(context);

        // inputData should be spread at top level
        expect(result.emails).toEqual(testData.emails);
        expect(result.count).toBe(1);
        // Also available via output property
        expect(result.output).toEqual(testData);
        expect(result._anyOf.passThrough).toBe(true);
        expect(result._anyOf.triggeredBy).toBe('format-submission');
      });

      it('should include triggeredBy in passThrough result', async () => {
        const context = {
          propsValue: {
            sourceEdge: 'imap-path',
            inputData: { data: 'test' },
            passThrough: true,
          },
        };

        const result = await anyOfBit.actions.race.run(context);

        expect(result.triggeredBy).toBe('imap-path');
        expect(result._anyOf.triggeredBy).toBe('imap-path');
      });

      it('should fall back to branch mode when passThrough is false', async () => {
        const context = {
          propsValue: {
            sourceEdge: 'test-branch',
            inputData: { should: 'be-ignored' },
            passThrough: false,
            branches: [{ name: 'test-branch', output: 'branch-value' }],
          },
        };

        const result = await anyOfBit.actions.race.run(context);

        expect(result.output).toBe('branch-value');
        // inputData should NOT be spread when passThrough is false
        expect(result.should).toBeUndefined();
      });

      it('should fall back to branch mode when inputData is undefined', async () => {
        const context = {
          propsValue: {
            sourceEdge: 'test-branch',
            passThrough: true,
            branches: [{ name: 'test-branch', output: 'fallback-value' }],
          },
        };

        const result = await anyOfBit.actions.race.run(context);

        expect(result.output).toBe('fallback-value');
      });

      it('should use first valid input from inputs array when inputData is skipped', async () => {
        const skippedData = { _skipped: true, _reason: 'Branch not activated' };
        const validData = { emails: [{ from: 'imap@test.com', subject: 'IMAP Test' }], count: 1 };
        
        const context = {
          propsValue: {
            passThrough: true,
            inputData: skippedData,  // inputData is skipped
            inputs: [skippedData, validData],  // First is skipped, second is valid
          },
        };

        const result = await anyOfBit.actions.race.run(context);

        expect(result.output).toEqual(validData);
        expect(result.emails).toEqual(validData.emails);
        expect(result._anyOf.selectedSource).toBe('inputs[1]');
      });

      it('should use inputs array when inputData is undefined', async () => {
        const validData = { from: 'test@example.com', subject: 'Test' };
        
        const context = {
          propsValue: {
            passThrough: true,
            inputs: [validData],
          },
        };

        const result = await anyOfBit.actions.race.run(context);

        expect(result.output).toEqual(validData);
        expect(result._anyOf.selectedSource).toBe('inputs[0]');
      });

      it('should skip unresolved template strings in inputs', async () => {
        const validData = { data: 'real' };
        
        const context = {
          propsValue: {
            passThrough: true,
            inputs: ['{{unresolved.template}}', validData],  // First is unresolved, second is valid
          },
        };

        const result = await anyOfBit.actions.race.run(context);

        expect(result.output).toEqual(validData);
        expect(result._anyOf.selectedSource).toBe('inputs[1]');
      });
    });
  });

  describe('gate action', () => {
    it('should activate and return configured output for matching branch', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'gate-input',
          branches: [{ name: 'gate-input', output: 'gate-opened' }],
          defaultOutput: 'default-gate',
        },
      };

      const result = await anyOfBit.actions.gate.run(context);

      expect(result.activated).toBe(true);
      expect(result.activatedAt).toBeDefined();
      expect(result.output).toBe('gate-opened');
      expect(result._flowControl.raceMode).toBe(true);
      expect(result._flowControl.waitForAll).toBe(false);
      expect(result._flowControl.controlsFlow).toBe(false);
    });

    it('should return default output when no branches configured', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'any-edge',
          defaultOutput: 'default-value',
        },
      };

      const result = await anyOfBit.actions.gate.run(context);

      expect(result.output).toBe('default-value');
    });

    it('should include _anyOf metadata with trigger info', async () => {
      const context = {
        propsValue: {
          sourceEdge: 'input-2',
          branches: [
            { name: 'input-1', output: 'one' },
            { name: 'input-2', output: 'two' },
          ],
        },
      };

      const result = await anyOfBit.actions.gate.run(context);

      expect(result._anyOf.triggeredBy).toBe('input-2');
      expect(result._anyOf.matchedBranch).toEqual({ name: 'input-2', output: 'two' });
    });
  });

  describe('anyOfUtils', () => {
    describe('isRaceMode', () => {
      it('should return true for race mode results', () => {
        expect(anyOfUtils.isRaceMode({ _flowControl: { raceMode: true } })).toBe(true);
        expect(anyOfUtils.isRaceMode({ raceMode: true })).toBe(true);
      });

      it('should return false for non-race results', () => {
        expect(anyOfUtils.isRaceMode({ _flowControl: { raceMode: false } })).toBe(false);
        expect(anyOfUtils.isRaceMode({})).toBe(false);
        expect(anyOfUtils.isRaceMode(null)).toBe(false);
        expect(anyOfUtils.isRaceMode(undefined)).toBe(false);
      });
    });

    describe('shouldWaitForAll', () => {
      it('should return false for any-of results (never wait for all)', () => {
        expect(anyOfUtils.shouldWaitForAll({ _flowControl: { waitForAll: false } })).toBe(false);
        expect(anyOfUtils.shouldWaitForAll({ waitForAll: false })).toBe(false);
      });

      it('should default to false when not specified', () => {
        expect(anyOfUtils.shouldWaitForAll({})).toBe(false);
        expect(anyOfUtils.shouldWaitForAll(null)).toBe(false);
        expect(anyOfUtils.shouldWaitForAll(undefined)).toBe(false);
      });
    });

    describe('getTriggeredBy', () => {
      it('should return the triggering edge from _anyOf metadata', () => {
        expect(anyOfUtils.getTriggeredBy({ _anyOf: { triggeredBy: 'edge-1' } })).toBe('edge-1');
      });

      it('should return null when not present', () => {
        expect(anyOfUtils.getTriggeredBy({})).toBeNull();
        expect(anyOfUtils.getTriggeredBy(null)).toBeNull();
        expect(anyOfUtils.getTriggeredBy(undefined)).toBeNull();
      });
    });

    describe('getMatchedBranch', () => {
      it('should return the matched branch config', () => {
        const branch = { name: 'test', output: 'value' };
        expect(anyOfUtils.getMatchedBranch({ _anyOf: { matchedBranch: branch } })).toEqual(branch);
      });

      it('should return null when no branch matched', () => {
        expect(anyOfUtils.getMatchedBranch({ _anyOf: { matchedBranch: null } })).toBeNull();
        expect(anyOfUtils.getMatchedBranch({})).toBeNull();
      });
    });
  });

  describe('bit metadata', () => {
    it('should have correct display name and description', () => {
      expect(anyOfBit.displayName).toBe('Any Of (Race)');
      expect(anyOfBit.description).toContain('ANY one incoming edge');
      expect(anyOfBit.description).toContain('Single output');
    });

    it('should have both race and gate actions', () => {
      expect(anyOfBit.actions.race).toBeDefined();
      expect(anyOfBit.actions.gate).toBeDefined();
    });
  });
});
