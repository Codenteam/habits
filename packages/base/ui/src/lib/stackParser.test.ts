import {
  isStackConfigFile,
  detectConfigFiles,
  parseStackConfig,
  parseHabitYaml,
  convertHabitYamlToHabit,
  resolvePath,
  parseStack,
  FileEntry,
  HabitYaml,
} from './stackParser';

describe('stackParser', () => {
  describe('isStackConfigFile', () => {
    it('should return true for valid config file names', () => {
      expect(isStackConfigFile('stack.yaml')).toBe(true);
      expect(isStackConfigFile('stack.yml')).toBe(true);
      expect(isStackConfigFile('config.json')).toBe(true);
      expect(isStackConfigFile('habits.json')).toBe(true);
      expect(isStackConfigFile('stack.json')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isStackConfigFile('STACK.YAML')).toBe(true);
      expect(isStackConfigFile('Config.JSON')).toBe(true);
    });

    it('should return false for non-config files', () => {
      expect(isStackConfigFile('habit.yaml')).toBe(false);
      expect(isStackConfigFile('workflow.json')).toBe(false);
      expect(isStackConfigFile('readme.md')).toBe(false);
    });
  });

  describe('detectConfigFiles', () => {
    it('should filter out config files from a list', () => {
      const files: FileEntry[] = [
        { name: 'stack.yaml', path: 'project/stack.yaml', content: '' },
        { name: 'habit.yaml', path: 'project/habit.yaml', content: '' },
        { name: 'config.json', path: 'project/config.json', content: '' },
        { name: 'readme.md', path: 'project/readme.md', content: '' },
      ];

      const result = detectConfigFiles(files);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('stack.yaml');
      expect(result[1].name).toBe('config.json');
    });

    it('should return empty array if no config files found', () => {
      const files: FileEntry[] = [
        { name: 'habit.yaml', path: 'project/habit.yaml', content: '' },
        { name: 'readme.md', path: 'project/readme.md', content: '' },
      ];

      const result = detectConfigFiles(files);
      expect(result).toHaveLength(0);
    });
  });

  describe('parseStackConfig', () => {
    it('should parse a valid YAML stack config', () => {
      const yamlContent = `
version: "1.0"
workflows:
  - id: my-workflow
    path: ./habit.yaml
    enabled: true
server:
  port: 3000
`;
      const result = parseStackConfig(yamlContent, 'stack.yaml');
      
      expect(result.version).toBe('1.0');
      expect(result.workflows).toHaveLength(1);
      expect(result.workflows[0].id).toBe('my-workflow');
      expect(result.workflows[0].path).toBe('./habit.yaml');
      expect(result.workflows[0].enabled).toBe(true);
      expect(result.server?.port).toBe(3000);
    });

    it('should parse a valid JSON stack config', () => {
      const jsonContent = JSON.stringify({
        version: '1.0',
        workflows: [
          { id: 'test-workflow', path: './workflow.json' }
        ],
        server: { port: 8080 }
      });
      
      const result = parseStackConfig(jsonContent, 'config.json');
      
      expect(result.version).toBe('1.0');
      expect(result.workflows).toHaveLength(1);
      expect(result.workflows[0].id).toBe('test-workflow');
    });

    it('should throw error for missing version', () => {
      const invalidConfig = JSON.stringify({
        workflows: [{ id: 'test', path: './test.yaml' }]
      });
      
      expect(() => parseStackConfig(invalidConfig, 'config.json'))
        .toThrow('Config must have a "version" string');
    });

    it('should throw error for missing workflows array', () => {
      const invalidConfig = JSON.stringify({
        version: '1.0'
      });
      
      expect(() => parseStackConfig(invalidConfig, 'config.json'))
        .toThrow('Config must have a "workflows" array');
    });

    it('should throw error for workflow without id', () => {
      const invalidConfig = JSON.stringify({
        version: '1.0',
        workflows: [{ path: './test.yaml' }]
      });
      
      expect(() => parseStackConfig(invalidConfig, 'config.json'))
        .toThrow('Each workflow must have an "id" string');
    });

    it('should throw error for workflow without path', () => {
      const invalidConfig = JSON.stringify({
        version: '1.0',
        workflows: [{ id: 'test' }]
      });
      
      expect(() => parseStackConfig(invalidConfig, 'config.json'))
        .toThrow('Each workflow must have a "path" string');
    });
  });

  describe('parseHabitYaml', () => {
    it('should parse a valid habit YAML', () => {
      const habitYaml = `
id: my-habit
name: My Test Habit
description: A test habit
nodes:
  - id: node-1
    type: bits
    data:
      framework: bits
      module: "bit-openai"
      operation: ask_chatgpt
      params:
        prompt: Hello
edges:
  - source: node-1
    target: node-2
`;
      const result = parseHabitYaml(habitYaml, 'habit.yaml');
      
      expect(result.id).toBe('my-habit');
      expect(result.name).toBe('My Test Habit');
      expect(result.description).toBe('A test habit');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('node-1');
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].source).toBe('node-1');
    });

    it('should throw error for missing id', () => {
      const invalidHabit = `
name: Test
nodes: []
edges: []
`;
      expect(() => parseHabitYaml(invalidHabit, 'habit.yaml'))
        .toThrow('Habit must have an "id" string');
    });

    it('should throw error for missing name', () => {
      const invalidHabit = `
id: test
nodes: []
edges: []
`;
      expect(() => parseHabitYaml(invalidHabit, 'habit.yaml'))
        .toThrow('Habit must have a "name" string');
    });

    it('should throw error for missing nodes', () => {
      const invalidHabit = `
id: test
name: Test
edges: []
`;
      expect(() => parseHabitYaml(invalidHabit, 'habit.yaml'))
        .toThrow('Habit must have a "nodes" array');
    });
  });

  describe('convertHabitYamlToHabit', () => {
    it('should convert HabitYaml to ParsedHabit', () => {
      const habitYaml: HabitYaml = {
        id: 'test-habit',
        name: 'Test Habit',
        description: 'A test',
        nodes: [
          {
            id: 'node-1',
            type: 'bits',
            data: {
              framework: 'bits',
              module: 'bit-openai',
              operation: 'ask_chatgpt',
              params: { prompt: 'Hello' },
              credentials: { apiKey: 'secret' },
            }
          }
        ],
        edges: [
          { source: 'node-1', target: 'node-2' }
        ]
      };

      const result = convertHabitYamlToHabit(habitYaml);

      expect(result.id).toBe('test-habit');
      expect(result.name).toBe('Test Habit');
      expect(result.description).toBe('A test');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('node-1');
      expect(result.nodes[0].type).toBe('custom');
      expect(result.nodes[0].data.framework).toBe('bits');
      expect(result.nodes[0].data.module).toBe('bit-openai');
      expect(result.nodes[0].position).toEqual({ x: 100, y: 100 });
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].source).toBe('node-1');
      expect(result.edges[0].target).toBe('node-2');
      expect(result.version).toBe('1.0.0');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should use node id as label if label not provided', () => {
      const habitYaml: HabitYaml = {
        id: 'test',
        name: 'Test',
        nodes: [{ id: 'my-node', type: 'script', data: {} }],
        edges: []
      };

      const result = convertHabitYamlToHabit(habitYaml);
      expect(result.nodes[0].data.label).toBe('my-node');
    });

    it('should use provided label when available', () => {
      const habitYaml: HabitYaml = {
        id: 'test',
        name: 'Test',
        nodes: [{ id: 'my-node', type: 'script', data: { label: 'Custom Label' } }],
        edges: []
      };

      const result = convertHabitYamlToHabit(habitYaml);
      expect(result.nodes[0].data.label).toBe('Custom Label');
    });
  });

  describe('resolvePath', () => {
    it('should resolve relative path from base path', () => {
      expect(resolvePath('project/stack.yaml', './habit.yaml'))
        .toBe('project/habit.yaml');
    });

    it('should handle nested directories', () => {
      expect(resolvePath('project/config/stack.yaml', './workflows/habit.yaml'))
        .toBe('project/config/workflows/habit.yaml');
    });

    it('should handle base path without directory', () => {
      expect(resolvePath('stack.yaml', './habit.yaml'))
        .toBe('habit.yaml');
    });

    it('should handle path without leading ./', () => {
      expect(resolvePath('project/stack.yaml', 'habit.yaml'))
        .toBe('project/habit.yaml');
    });
  });

  describe('parseStack', () => {
    it('should parse a complete stack with config and habits', async () => {
      const files: FileEntry[] = [
        {
          name: 'stack.yaml',
          path: 'project/stack.yaml',
          content: `
version: "1.0"
workflows:
  - id: habit-1
    path: ./habit1.yaml
    enabled: true
  - id: habit-2
    path: ./habit2.yaml
    enabled: true
`
        },
        {
          name: 'habit1.yaml',
          path: 'project/habit1.yaml',
          content: `
id: habit-1
name: First Habit
nodes:
  - id: n1
    type: script
    data:
      label: Node 1
edges: []
`
        },
        {
          name: 'habit2.yaml',
          path: 'project/habit2.yaml',
          content: `
id: habit-2
name: Second Habit
nodes:
  - id: n2
    type: bits
    data:
      label: Node 2
edges: []
`
        }
      ];

      const result = await parseStack(files, 'project/stack.yaml');

      expect(result.config.version).toBe('1.0');
      expect(result.habits).toHaveLength(2);
      expect(result.habits[0].name).toBe('First Habit');
      expect(result.habits[1].name).toBe('Second Habit');
      expect(result.errors).toHaveLength(0);
    });

    it('should skip disabled workflows', async () => {
      const files: FileEntry[] = [
        {
          name: 'stack.yaml',
          path: 'stack.yaml',
          content: `
version: "1.0"
workflows:
  - id: enabled-habit
    path: ./enabled.yaml
    enabled: true
  - id: disabled-habit
    path: ./disabled.yaml
    enabled: false
`
        },
        {
          name: 'enabled.yaml',
          path: 'enabled.yaml',
          content: `
id: enabled
name: Enabled Habit
nodes: []
edges: []
`
        }
      ];

      const result = await parseStack(files, 'stack.yaml');

      expect(result.habits).toHaveLength(1);
      expect(result.habits[0].name).toBe('Enabled Habit');
    });

    it('should report missing workflow files as errors', async () => {
      const files: FileEntry[] = [
        {
          name: 'stack.yaml',
          path: 'stack.yaml',
          content: `
version: "1.0"
workflows:
  - id: missing
    path: ./missing.yaml
`
        }
      ];

      const result = await parseStack(files, 'stack.yaml');

      expect(result.habits).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('missing.yaml');
    });

    it('should throw if config file not found', async () => {
      const files: FileEntry[] = [
        { name: 'other.yaml', path: 'other.yaml', content: '' }
      ];

      await expect(parseStack(files, 'stack.yaml'))
        .rejects.toThrow('Config file not found: stack.yaml');
    });

    it('should load frontend HTML if specified', async () => {
      const files: FileEntry[] = [
        {
          name: 'stack.yaml',
          path: 'project/stack.yaml',
          content: `
version: "1.0"
workflows: []
server:
  frontend: ./frontend
`
        },
        {
          name: 'index.html',
          path: 'project/frontend/index.html',
          content: '<html><body>Hello</body></html>'
        }
      ];

      const result = await parseStack(files, 'project/stack.yaml');

      expect(result.frontendHtml).toBe('<html><body>Hello</body></html>');
    });

    it('should handle invalid habit YAML and report error', async () => {
      const files: FileEntry[] = [
        {
          name: 'stack.yaml',
          path: 'stack.yaml',
          content: `
version: "1.0"
workflows:
  - id: bad-habit
    path: ./bad.yaml
`
        },
        {
          name: 'bad.yaml',
          path: 'bad.yaml',
          content: `
invalid: yaml
without: required fields
`
        }
      ];

      const result = await parseStack(files, 'stack.yaml');

      expect(result.habits).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('bad.yaml');
    });
  });
});
