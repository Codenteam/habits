#!/usr/bin/env npx tsx
/**
 * Habits Dev TUI - Multi-column interactive menu using Ink
 * Usage: npx tsx scripts/tui.tsx
 */

import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import * as actions from './actions.js';
import * as fs from 'fs';
import * as path from 'path';

const { discoverExamples, discoverBits, run, getShowcaseDefaults, getOutputExtension, buildPackShowcaseCommand } = actions;

// ============================================================================
// Types
// ============================================================================

type MenuItem = { label: string; value: string; desc?: string };
type Category = { id: string; label: string; items: MenuItem[] };

// ============================================================================
// Data
// ============================================================================

const CATEGORIES: Category[] = [
  {
    id: 'build',
    label: '🔨 Build',
    items: [
      { label: 'Build All', value: 'build-all', desc: 'habits + cortex + base' },
      { label: 'Build Habits', value: 'build-habits' },
      { label: 'Build Cortex', value: 'build-cortex' },
      { label: 'Build Base', value: 'build-base' },
    ],
  },
  {
    id: 'pack',
    label: '📦 Pack',
    items: [
      { label: 'Pack Showcase', value: 'pack-showcase', desc: 'interactive app builder' },
      { label: 'Pack All', value: 'pack-all', desc: 'habits + cortex + base' },
      { label: 'Pack Habits', value: 'pack-habits' },
      { label: 'Pack SEA Binary', value: 'pack-sea', desc: 'single executable' },
      { label: 'Pack Desktop', value: 'pack-desktop', desc: 'Electron dmg' },
      { label: 'Pack Mobile', value: 'pack-mobile', desc: 'Cordova android' },
    ],
  },
  {
    id: 'publish',
    label: '🚀 Publish',
    items: [
      { label: 'Publish All', value: 'publish-all' },
      { label: 'Publish All @next', value: 'publish-all-next', desc: 'pre-release' },
      { label: 'Publish Habits', value: 'publish-habits' },
      { label: 'Publish Cortex', value: 'publish-cortex' },
      { label: 'Publish Base', value: 'publish-base' },
    ],
  },
  {
    id: 'dev',
    label: '🛠️ Dev',
    items: [
      { label: 'Run Example', value: 'run-example' },
      { label: 'Dev Cortex', value: 'dev-cortex', desc: 'mixed/stack.yaml' },
      { label: 'Dev Base', value: 'dev-base' },
      { label: 'List Examples', value: 'list-examples' },
    ],
  },
  {
    id: 'test',
    label: '🧪 Test',
    items: [
      { label: 'Unit Tests', value: 'test-unit' },
      { label: 'HTTP Tests', value: 'test-http' },
      { label: 'Typecheck', value: 'typecheck' },
    ],
  },
  {
    id: 'bits',
    label: '🧩 Bits',
    items: [
      { label: 'Build All Bits', value: 'bits-build-all' },
      { label: 'Build One Bit', value: 'bits-build-one' },
      { label: 'Publish to Verdaccio', value: 'bits-publish-verdaccio' },
      { label: 'Publish to npm', value: 'bits-publish-npm' },
      { label: 'Link All Bits', value: 'bits-link-all' },
      { label: 'List Bits', value: 'bits-list' },
    ],
  },
  {
    id: 'utils',
    label: '⚙️ Utils',
    items: [
      { label: 'NPM Login', value: 'npm-login' },
      { label: 'NPM Whoami', value: 'npm-whoami' },
      { label: 'Clean All', value: 'clean-all', desc: 'dist + cache' },
      { label: 'Clean Dist', value: 'clean-dist' },
      { label: 'Kill Port 3000', value: 'kill-port' },
      { label: 'Link Cortex Core', value: 'link-cortex-core' },
    ],
  },
];

const FORMATS: MenuItem[] = [
  { label: 'Mobile Full', value: 'mobile-full', desc: 'standalone app with server' },
  { label: 'Desktop Full', value: 'desktop-full', desc: 'standalone app with server' },
  { label: 'Mobile', value: 'mobile', desc: 'needs backend' },
  { label: 'Desktop', value: 'desktop', desc: 'needs backend' },
];

const MOBILE_TARGETS: MenuItem[] = [
  { label: 'Android', value: 'android', desc: '.apk' },
  { label: 'iOS', value: 'ios', desc: '.ipa' },
];

const DESKTOP_TARGETS: MenuItem[] = [
  { label: 'macOS', value: 'mac', desc: '.dmg' },
  { label: 'Windows', value: 'windows', desc: '.exe' },
  { label: 'Linux', value: 'linux', desc: '.AppImage' },
];

// ============================================================================
// Components
// ============================================================================

const Header = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold color="cyan">
      ╔═══════════════════════════════════════════════════════════════════════╗
    </Text>
    <Text bold color="cyan">
      ║                    🔧 Habits Development TUI 🔧                        ║
    </Text>
    <Text bold color="cyan">
      ╚═══════════════════════════════════════════════════════════════════════╝
    </Text>
  </Box>
);

// Flatten all actions into a single list with category headers
const ALL_ACTIONS: MenuItem[] = CATEGORIES.flatMap(cat => 
  cat.items.map(item => ({ ...item, label: `${item.label}`, category: cat.label }))
);

// Split actions into 3 columns
const COLUMN_SIZE = Math.ceil(ALL_ACTIONS.length / 3);
const COLUMNS = [
  ALL_ACTIONS.slice(0, COLUMN_SIZE),
  ALL_ACTIONS.slice(COLUMN_SIZE, COLUMN_SIZE * 2),
  ALL_ACTIONS.slice(COLUMN_SIZE * 2),
];

const ActionColumn = ({ 
  items, 
  columnIndex,
  selectedIndex,
  activeColumn,
  globalOffset,
}: { 
  items: MenuItem[];
  columnIndex: number;
  selectedIndex: number;
  activeColumn: number;
  globalOffset: number;
}) => {
  const isActive = columnIndex === activeColumn;
  return (
    <Box flexDirection="column" width={30} borderStyle="round" borderColor={isActive ? 'cyan' : 'gray'} paddingX={1}>
      {items.map((item, idx) => {
        const globalIdx = globalOffset + idx;
        const isSelected = globalIdx === selectedIndex;
        return (
          <Box key={item.value} flexDirection="column">
            <Text 
              color={isSelected ? 'green' : undefined}
              bold={isSelected}
              inverse={isSelected}
            >
              {item.label}
            </Text>
            {item.desc && (
              <Text color="gray" dimColor> └ {item.desc}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

const StatusBar = ({ message, isError, isRunning }: { message: string; isError?: boolean; isRunning?: boolean }) => (
  <Box marginTop={1} paddingX={1}>
    {isRunning && <Text color="cyan"><Spinner type="dots" /> </Text>}
    <Text color={isError ? 'red' : 'gray'}>{message}</Text>
  </Box>
);

const HelpBar = () => (
  <Box marginTop={1} paddingX={1} justifyContent="space-between">
    <Text color="gray">
      <Text bold>↑↓←→</Text> Navigate  
      <Text bold> Enter</Text> Select  
      <Text bold> q</Text> Quit
    </Text>
  </Box>
);

// ============================================================================
// Showcase Builder Component
// ============================================================================

type ShowcaseStep = 'showcase' | 'format' | 'target' | 'name' | 'icon' | 'output' | 'confirm';

const ShowcaseBuilder = ({ onComplete, onCancel }: { onComplete: (cmd: string) => void; onCancel: () => void }) => {
  const [step, setStep] = useState<ShowcaseStep>('showcase');
  const [showcase, setShowcase] = useState<string>('');
  const [format, setFormat] = useState<string>('mobile-full');
  const [target, setTarget] = useState<string>('android');
  const [appName, setAppName] = useState<string>('');
  const [appIcon, setAppIcon] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [editingText, setEditingText] = useState('');
  
  // Showcase selection state
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const examples = discoverExamples();
  
  // Split showcases into 4 columns
  const SHOWCASE_COL_SIZE = Math.ceil(examples.length / 4);
  const showcaseCols = [
    examples.slice(0, SHOWCASE_COL_SIZE),
    examples.slice(SHOWCASE_COL_SIZE, SHOWCASE_COL_SIZE * 2),
    examples.slice(SHOWCASE_COL_SIZE * 2, SHOWCASE_COL_SIZE * 3),
    examples.slice(SHOWCASE_COL_SIZE * 3),
  ];
  
  const getShowcaseColForIndex = (idx: number) => {
    if (idx < SHOWCASE_COL_SIZE) return 0;
    if (idx < SHOWCASE_COL_SIZE * 2) return 1;
    if (idx < SHOWCASE_COL_SIZE * 3) return 2;
    return 3;
  };
  
  const isMobile = format.includes('mobile');
  const targetOptions = isMobile ? MOBILE_TARGETS : DESKTOP_TARGETS;
  
  const defaults = showcase ? getShowcaseDefaults(showcase) : { appName: '', appIcon: undefined };
  const ext = format && target ? getOutputExtension(format, target) : '.apk';
  
  const buildCommand = () => {
    const finalName = appName || defaults.appName;
    const finalIcon = appIcon || defaults.appIcon;
    const finalOutput = output || `/tmp/${showcase}${ext}`;
    
    return buildPackShowcaseCommand({
      showcase,
      format: format as any,
      target: target as any,
      appName: finalName,
      appIcon: finalIcon,
      output: finalOutput,
    });
  };
  
  useInput((input, key) => {
    if (key.escape) {
      if (step === 'showcase') {
        onCancel();
      } else if (step === 'format') {
        setStep('showcase');
        setShowcase('');
      } else if (step === 'target') {
        setStep('format');
      } else if (step === 'name') {
        setStep('target');
      } else if (step === 'icon') {
        setStep('name');
      } else if (step === 'output') {
        setStep('icon');
      } else if (step === 'confirm') {
        setStep('output');
      }
      return;
    }
    
    if (step === 'showcase') {
      // Navigate showcases in 4 columns
      if (key.upArrow) {
        setShowcaseIndex(i => Math.max(0, i - 1));
      }
      if (key.downArrow) {
        setShowcaseIndex(i => Math.min(examples.length - 1, i + 1));
      }
      if (key.leftArrow) {
        const currentCol = getShowcaseColForIndex(showcaseIndex);
        if (currentCol > 0) {
          const rowInCol = showcaseIndex - (currentCol * SHOWCASE_COL_SIZE);
          const newCol = currentCol - 1;
          const newColSize = showcaseCols[newCol].length;
          const newRow = Math.min(rowInCol, newColSize - 1);
          setShowcaseIndex(newCol * SHOWCASE_COL_SIZE + newRow);
        }
      }
      if (key.rightArrow) {
        const currentCol = getShowcaseColForIndex(showcaseIndex);
        if (currentCol < 3) {
          const rowInCol = showcaseIndex - (currentCol * SHOWCASE_COL_SIZE);
          const newCol = currentCol + 1;
          const newColSize = showcaseCols[newCol].length;
          const newRow = Math.min(rowInCol, newColSize - 1);
          setShowcaseIndex(newCol * SHOWCASE_COL_SIZE + newRow);
        }
      }
      if (key.return) {
        const selected = examples[showcaseIndex];
        setShowcase(selected);
        const d = getShowcaseDefaults(selected);
        setAppName(d.appName);
        setAppIcon(d.appIcon || '');
        setOutput(`/tmp/${selected}${ext}`);
        setStep('format');
      }
    } else if (step === 'confirm') {
      if (key.return || input === 'y') {
        onComplete(buildCommand());
      }
      if (input === 'n') {
        setStep('output');
      }
    }
  });
  
  const handleTextSubmit = () => {
    if (step === 'name') {
      if (editingText) setAppName(editingText);
      setEditingText('');
      setStep('icon');
    } else if (step === 'icon') {
      if (editingText) setAppIcon(editingText);
      setEditingText('');
      setStep('output');
    } else if (step === 'output') {
      if (editingText) setOutput(editingText);
      setEditingText('');
      setStep('confirm');
    }
  };
  
  const commandPreview = showcase ? buildCommand() : '';
  const activeShowcaseCol = getShowcaseColForIndex(showcaseIndex);
  
  // Progress bar component
  const ProgressBar = () => {
    const steps: ShowcaseStep[] = ['showcase', 'format', 'target', 'name', 'icon', 'output', 'confirm'];
    const labels = ['Showcase', 'Format', 'Target', 'Name', 'Icon', 'Output', 'Confirm'];
    const currentIdx = steps.indexOf(step);
    
    return (
      <Box marginBottom={1}>
        {steps.map((s, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <Text key={s} color={isCurrent ? 'green' : isDone ? 'cyan' : 'gray'}>
              {isDone ? '✓' : isCurrent ? '●' : '○'} {labels[idx]}
              {idx < steps.length - 1 ? ' → ' : ''}
            </Text>
          );
        })}
      </Box>
    );
  };
  
  // Summary panel
  const SummaryPanel = () => (
    <Box flexDirection="column" width={35} borderStyle="round" borderColor="magenta" padding={1} marginLeft={1}>
      <Text bold color="yellow">Configuration</Text>
      <Text> </Text>
      <Text>Showcase: <Text color={showcase ? 'green' : 'gray'}>{showcase || '...'}</Text></Text>
      <Text>Format: <Text color={format ? 'green' : 'gray'}>{format || '...'}</Text></Text>
      <Text>Target: <Text color={target ? 'green' : 'gray'}>{target || '...'}</Text></Text>
      <Text>Name: <Text color={appName ? 'green' : 'gray'}>{appName || defaults.appName || '...'}</Text></Text>
      <Text>Icon: <Text color={appIcon ? 'green' : 'gray'}>{appIcon || defaults.appIcon || '...'}</Text></Text>
      <Text>Output: <Text color={output ? 'green' : 'gray'}>{output || `...${ext}`}</Text></Text>
    </Box>
  );
  
  // Showcase selection screen with 4 columns
  if (step === 'showcase') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">📦 Pack Showcase App</Text>
        <Text color="gray">↑↓←→ navigate, Enter select, ESC cancel</Text>
        <Text> </Text>
        <ProgressBar />
        
        <Box flexDirection="row">
          {showcaseCols.map((col, colIdx) => (
            <Box key={colIdx} flexDirection="column" width={25} borderStyle="round" borderColor={colIdx === activeShowcaseCol ? 'cyan' : 'gray'} paddingX={1}>
              {col.map((name, rowIdx) => {
                const globalIdx = colIdx * SHOWCASE_COL_SIZE + rowIdx;
                const isSelected = globalIdx === showcaseIndex;
                return (
                  <Text 
                    key={name}
                    color={isSelected ? 'green' : undefined}
                    bold={isSelected}
                    inverse={isSelected}
                  >
                    {name}
                  </Text>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }
  
  // Format selection with radio buttons
  if (step === 'format') {
    const formatItems = FORMATS.map(f => ({ label: `${f.label} - ${f.desc}`, value: f.value }));
    
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">📦 Pack Showcase: <Text color="green">{showcase}</Text></Text>
        <Text color="gray">↑↓ select, Enter confirm, ESC back</Text>
        <Text> </Text>
        <ProgressBar />
        
        <Box flexDirection="row">
          <Box flexDirection="column" width={55} borderStyle="round" borderColor="cyan" padding={1}>
            <Text bold color="yellow">Select Format:</Text>
            <Text> </Text>
            <SelectInput 
              items={formatItems}
              initialIndex={FORMATS.findIndex(f => f.value === format)}
              onSelect={(item) => {
                setFormat(item.value);
                // Reset target when format changes
                const newTargets = item.value.includes('mobile') ? MOBILE_TARGETS : DESKTOP_TARGETS;
                setTarget(newTargets[0].value);
                setStep('target');
              }}
            />
          </Box>
          <SummaryPanel />
        </Box>
      </Box>
    );
  }
  
  // Target selection with radio buttons
  if (step === 'target') {
    const targetItems = targetOptions.map(t => ({ label: `${t.label} (${t.desc})`, value: t.value }));
    
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">📦 Pack Showcase: <Text color="green">{showcase}</Text></Text>
        <Text color="gray">↑↓ select, Enter confirm, ESC back</Text>
        <Text> </Text>
        <ProgressBar />
        
        <Box flexDirection="row">
          <Box flexDirection="column" width={55} borderStyle="round" borderColor="cyan" padding={1}>
            <Text bold color="yellow">Select Target ({isMobile ? 'Mobile' : 'Desktop'}):</Text>
            <Text> </Text>
            <SelectInput 
              items={targetItems}
              initialIndex={targetOptions.findIndex(t => t.value === target)}
              onSelect={(item) => {
                setTarget(item.value);
                setStep('name');
              }}
            />
          </Box>
          <SummaryPanel />
        </Box>
      </Box>
    );
  }
  
  // App Name input
  if (step === 'name') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">📦 Pack Showcase: <Text color="green">{showcase}</Text></Text>
        <Text color="gray">Type name, Enter to continue (or Enter for default), ESC back</Text>
        <Text> </Text>
        <ProgressBar />
        
        <Box flexDirection="row">
          <Box flexDirection="column" width={55} borderStyle="round" borderColor="cyan" padding={1}>
            <Text bold color="yellow">App Name:</Text>
            <Text color="gray">Default: {defaults.appName}</Text>
            <Box marginTop={1}>
              <Text color="green">→ </Text>
              <TextInput 
                value={editingText}
                onChange={setEditingText}
                onSubmit={handleTextSubmit}
                placeholder={defaults.appName}
              />
            </Box>
          </Box>
          <SummaryPanel />
        </Box>
      </Box>
    );
  }
  
  // App Icon input
  if (step === 'icon') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">📦 Pack Showcase: <Text color="green">{showcase}</Text></Text>
        <Text color="gray">Type icon path, Enter to continue (or Enter for default), ESC back</Text>
        <Text> </Text>
        <ProgressBar />
        
        <Box flexDirection="row">
          <Box flexDirection="column" width={55} borderStyle="round" borderColor="cyan" padding={1}>
            <Text bold color="yellow">App Icon:</Text>
            <Text color="gray">Default: {defaults.appIcon || '(none)'}</Text>
            <Box marginTop={1}>
              <Text color="green">→ </Text>
              <TextInput 
                value={editingText}
                onChange={setEditingText}
                onSubmit={handleTextSubmit}
                placeholder={defaults.appIcon || '(optional)'}
              />
            </Box>
          </Box>
          <SummaryPanel />
        </Box>
      </Box>
    );
  }
  
  // Output path input
  if (step === 'output') {
    const defaultOutput = `/tmp/${showcase}${ext}`;
    
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">📦 Pack Showcase: <Text color="green">{showcase}</Text></Text>
        <Text color="gray">Type output path, Enter to continue (or Enter for default), ESC back</Text>
        <Text> </Text>
        <ProgressBar />
        
        <Box flexDirection="row">
          <Box flexDirection="column" width={55} borderStyle="round" borderColor="cyan" padding={1}>
            <Text bold color="yellow">Output Path:</Text>
            <Text color="gray">Default: {defaultOutput}</Text>
            <Box marginTop={1}>
              <Text color="green">→ </Text>
              <TextInput 
                value={editingText}
                onChange={setEditingText}
                onSubmit={handleTextSubmit}
                placeholder={defaultOutput}
              />
            </Box>
          </Box>
          <SummaryPanel />
        </Box>
      </Box>
    );
  }
  
  // Confirm screen
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">📦 Ready to Pack!</Text>
      <Text> </Text>
      <ProgressBar />
      <Text> </Text>
      <Text>Showcase: <Text color="green">{showcase}</Text></Text>
      <Text>Format: <Text color="green">{format}</Text></Text>
      <Text>Target: <Text color="green">{target}</Text></Text>
      <Text>App Name: <Text color="green">{appName || defaults.appName}</Text></Text>
      <Text>App Icon: <Text color="green">{appIcon || defaults.appIcon || '(none)'}</Text></Text>
      <Text>Output: <Text color="green">{output || `/tmp/${showcase}${ext}`}</Text></Text>
      <Text> </Text>
      <Text bold color="yellow">Command:</Text>
      <Text color="gray" wrap="wrap">{commandPreview}</Text>
      <Text> </Text>
      <Text color="green" bold>Press Enter or 'y' to run, 'n' to go back, ESC to cancel</Text>
    </Box>
  );
};

// ============================================================================
// Main App
// ============================================================================

const App = () => {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [isRunning, setIsRunning] = useState(false);
  const [showShowcaseBuilder, setShowShowcaseBuilder] = useState(false);
  
  // Calculate which column the current selection is in
  const getColumnForIndex = (idx: number) => {
    if (idx < COLUMN_SIZE) return 0;
    if (idx < COLUMN_SIZE * 2) return 1;
    return 2;
  };
  
  const activeColumn = getColumnForIndex(selectedIndex);
  const currentAction = ALL_ACTIONS[selectedIndex];
  
  useInput((input, key) => {
    if (showShowcaseBuilder) return;
    
    if (input === 'q') {
      exit();
      return;
    }
    
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(i => Math.min(ALL_ACTIONS.length - 1, i + 1));
    }
    if (key.leftArrow) {
      // Move to previous column (same row position if possible)
      const currentCol = getColumnForIndex(selectedIndex);
      if (currentCol > 0) {
        const rowInCol = selectedIndex - (currentCol * COLUMN_SIZE);
        const newCol = currentCol - 1;
        const newColSize = COLUMNS[newCol].length;
        const newRow = Math.min(rowInCol, newColSize - 1);
        setSelectedIndex(newCol * COLUMN_SIZE + newRow);
      }
    }
    if (key.rightArrow) {
      // Move to next column (same row position if possible)
      const currentCol = getColumnForIndex(selectedIndex);
      if (currentCol < 2) {
        const rowInCol = selectedIndex - (currentCol * COLUMN_SIZE);
        const newCol = currentCol + 1;
        const newColSize = COLUMNS[newCol].length;
        const newRow = Math.min(rowInCol, newColSize - 1);
        setSelectedIndex(newCol * COLUMN_SIZE + newRow);
      }
    }
    
    if (key.return && currentAction) {
      executeAction(currentAction.value);
    }
  });
  
  const executeAction = async (action: string) => {
    if (action === 'pack-showcase') {
      setShowShowcaseBuilder(true);
      return;
    }
    
    setIsRunning(true);
    setStatus(`Running: ${action}...`);
    
    try {
      switch (action) {
        case 'build-all': actions.buildAll(); break;
        case 'build-habits': actions.buildHabits(); break;
        case 'build-cortex': actions.buildCortex(); break;
        case 'build-base': actions.buildBase(); break;
        case 'pack-all': actions.packAll(); break;
        case 'pack-habits': actions.packHabits(); break;
        case 'pack-sea': actions.packSea(); break;
        case 'pack-desktop': actions.packDesktop(); break;
        case 'pack-mobile': actions.packMobile(); break;
        case 'publish-all': actions.publishAll(); break;
        case 'publish-all-next': actions.publishAll('next'); break;
        case 'publish-habits': actions.publishHabits(); break;
        case 'publish-cortex': actions.publishCortex(); break;
        case 'publish-base': actions.publishBase(); break;
        case 'dev-cortex': actions.devCortex(); break;
        case 'dev-base': actions.devBase(); break;
        case 'test-unit': actions.testUnit(); break;
        case 'test-http': actions.testHttp(); break;
        case 'typecheck': actions.typecheck(); break;
        case 'clean-all': actions.cleanAll(); break;
        case 'clean-dist': actions.cleanDist(); break;
        case 'kill-port': actions.killPort(); break;
        case 'npm-login': actions.npmLogin(); break;
        case 'npm-whoami': actions.npmWhoami(); break;
        case 'list-examples': actions.listExamples(); break;
        case 'link-cortex-core': actions.linkCortexCore(); break;
        case 'bits-build-all': actions.buildAllBits(); break;
        case 'bits-publish-verdaccio': actions.publishAllBitsVerdaccio(); break;
        case 'bits-publish-npm': actions.publishAllBitsNpm(); break;
        case 'bits-link-all': actions.linkAllBits(); break;
        case 'bits-list': actions.listBits(); break;
        default: setStatus(`Unknown action: ${action}`);
      }
      setStatus(`✓ Completed: ${action}`);
    } catch (e: any) {
      setStatus(`✗ Failed: ${e.message}`);
    }
    
    setIsRunning(false);
  };
  
  const handleShowcaseComplete = (cmd: string) => {
    setShowShowcaseBuilder(false);
    setIsRunning(true);
    setStatus('Running showcase build...');
    
    try {
      run(cmd);
      setStatus('✓ Showcase build completed');
    } catch (e: any) {
      setStatus(`✗ Build failed: ${e.message}`);
    }
    
    setIsRunning(false);
  };
  
  if (showShowcaseBuilder) {
    return (
      <Box flexDirection="column">
        <Header />
        <ShowcaseBuilder 
          onComplete={handleShowcaseComplete} 
          onCancel={() => setShowShowcaseBuilder(false)} 
        />
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column">
      <Header />
      
      <Box flexDirection="row">
        <ActionColumn 
          items={COLUMNS[0]} 
          columnIndex={0}
          selectedIndex={selectedIndex}
          activeColumn={activeColumn}
          globalOffset={0}
        />
        
        <ActionColumn 
          items={COLUMNS[1]} 
          columnIndex={1}
          selectedIndex={selectedIndex}
          activeColumn={activeColumn}
          globalOffset={COLUMN_SIZE}
        />
        
        <ActionColumn 
          items={COLUMNS[2]} 
          columnIndex={2}
          selectedIndex={selectedIndex}
          activeColumn={activeColumn}
          globalOffset={COLUMN_SIZE * 2}
        />
      </Box>
      
      <StatusBar message={status} isRunning={isRunning} />
      <HelpBar />
    </Box>
  );
};

// ============================================================================
// Entry
// ============================================================================

render(<App />);
