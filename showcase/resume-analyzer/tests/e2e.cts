#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const resume = readFileSync(join(__dirname, '../SampleResume.webp'), 'base64');
const input = JSON.stringify({ resume: `data:image/webp;base64,${resume}`, targetRole: 'Tester', jobDescription: 'Good QA Tester with background in Habits, Tauri, WebDriver, and other testing stuff.' });

execSync(`pnpm tsx scripts/e2e/test-browser-pack.cts --example resume-analyzer-sql --habit resume-analyzer --chrome --input '${input.replace(/'/g, "\\'")}'`, { cwd: join(__dirname, '../../..'), stdio: 'inherit' });
