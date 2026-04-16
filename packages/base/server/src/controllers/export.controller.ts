/**
 * Export Controller
 * Handles: GET /api/export/binary/support, POST /api/export/binary, 
 *          POST /api/export/pack/desktop, POST /api/export/pack/mobile
 */

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { createResponse } from '../helpers';
import {
  generateSeaBinary,
  checkSeaSupport,
  getSupportedPlatforms,
  getCurrentPlatform,
} from '../sea-generator';
import { packMobileForWeb } from '../pack/mobile';
import { packDesktopForWeb } from '../pack/desktop';
import { packDockerForWeb } from '../pack/docker';
import { generateBundle } from '../pack/bundle-generator-wrapper';
import {
  checkCompatibility,
  parseJavaVersion,
  parseGradleVersion,
} from '../pack/gradle-java-compatibility';

const execAsync = promisify(exec);

export class ExportController {
  /**
   * GET /api/export/binary/support
   * Check binary export support and available build tools
   */
  checkSupport = async (req: Request, res: Response): Promise<void> => {
    try {
      const support = checkSeaSupport();
      const currentPlatform = getCurrentPlatform();
      const supportedPlatforms = getSupportedPlatforms();

      // Helper to get version output (truly async)
      const getVersion = async (
        cmd: string,
        parse?: (out: string, stderr?: string) => string,
      ): Promise<string | null> => {
        try {
          const { stdout, stderr } = await execAsync(cmd, { timeout: 5000 });
          if (parse) return parse(stdout, stderr);
          return stdout.trim();
        } catch (err: any) {
          // Some commands output to stderr (like java -version)
          if (parse && err.stderr) {
            try {
              return parse(err.stdout || '', err.stderr);
            } catch {
              return null;
            }
          }
          return null;
        }
      };

      // Android environment variables (show full path if DEBUG, otherwise just set/unset)
      const isDebug = process.env.DEBUG === 'true';
      const androidHome = process.env.ANDROID_HOME
        ? isDebug
          ? process.env.ANDROID_HOME
          : 'set'
        : 'unset';
      const androidSdkRoot = process.env.ANDROID_SDK_ROOT
        ? isDebug
          ? process.env.ANDROID_SDK_ROOT
          : 'set'
        : 'unset';

      // Run all version checks in parallel for speed
      const [
        gradleVersion,
        javaVersion,
        cordovaVersion,
        xcodeVersion,
        androidSdkVersion,
        electronVersion,
        electronBuilderVersion,
        tauriVersion,
        cargoVersion,
        rustcVersion,
      ] = await Promise.all([
        // Gradle
        getVersion('gradle --version', (out) => {
          const m = out.match(/Gradle (\d+\.\d+(?:\.\d+)?)/);
          return m ? m[1] : out.split('\n')[0];
        }),
        // Java (outputs to stderr)
        getVersion('java -version 2>&1', (out, stderr) => {
          const combined = stderr || out;
          const m = combined.match(/version "([\d._]+)"/);
          return m ? m[1] : combined.split('\n')[0];
        }),
        // Cordova
        getVersion('cordova --version', (out) => out.split('\n')[0].trim()),
        // Xcode (macOS only)
        process.platform === 'darwin'
          ? getVersion('xcodebuild -version', (out) => {
              const m = out.match(/Xcode (\d+\.\d+(?:\.\d+)?)/);
              return m ? m[1] : out.split('\n')[0];
            })
          : Promise.resolve(null),
        // Android SDK
        process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
          ? Promise.resolve(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT)
          : getVersion('adb version', (out) => {
              const m = out.match(/Android Debug Bridge version ([\d.]+)/);
              return m ? m[1] : out.split('\n')[0];
            }),
        // Electron
        getVersion('npx electron --version', (out) => out.replace(/^v/, '').trim()),
        // Electron Builder
        getVersion('npx electron-builder --version', (out) => out.trim()),
        // Tauri
        getVersion('npx tauri --version', (out) => {
          const m = out.match(/tauri (\d+\.\d+\.\d+)/);
          return m ? m[1] : out.split('\n')[0];
        }),
        // Cargo
        getVersion('cargo --version', (out) => {
          const m = out.match(/cargo (\d+\.\d+\.\d+)/);
          return m ? m[1] : out.split('\n')[0];
        }),
        // Rustc
        getVersion('rustc --version', (out) => {
          const m = out.match(/rustc (\d+\.\d+\.\d+)/);
          return m ? m[1] : out.split('\n')[0];
        }),
      ]);

      const xcodebuildVersion = xcodeVersion;

      // Check Gradle-Java compatibility
      let compatibilityCheck: ReturnType<typeof checkCompatibility> | undefined = undefined;
      if (gradleVersion && javaVersion) {
        const javaMajor = parseJavaVersion(javaVersion);
        const gradleParsed = parseGradleVersion(gradleVersion);
        if (javaMajor && gradleParsed) {
          compatibilityCheck = checkCompatibility(javaMajor, gradleParsed);
        }
      }

      res.json(
        createResponse(true, {
          ...support,
          currentPlatform,
          supportedPlatforms,
          mobile: {
            gradleVersion,
            javaVersion,
            cordovaVersion,
            androidSdkVersion,
            xcodeVersion,
            xcodebuildVersion,
            androidHome,
            androidSdkRoot,
            compatibility: compatibilityCheck,
          },
          desktop: {
            electronVersion,
            electronBuilderVersion,
            tauriVersion,
            cargoVersion,
            rustcVersion,
          },
        }),
      );
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * POST /api/export/binary
   * Generate SEA binary export
   */
  generateBinary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { habits, serverConfig, envContent, frontendHtml, platform = 'current' } = req.body;

      // Validate required fields
      if (!habits || !Array.isArray(habits) || habits.length === 0) {
        res.status(400).json(createResponse(false, undefined, 'habits array is required'));
        return;
      }

      if (!serverConfig || typeof serverConfig.port !== 'number') {
        res.status(400).json(createResponse(false, undefined, 'serverConfig with port is required'));
        return;
      }

      // Check SEA support
      const support = checkSeaSupport();
      if (!support.supported) {
        res.status(400).json(createResponse(false, undefined, support.message));
        return;
      }

      // Validate platform
      const supportedPlatforms = getSupportedPlatforms();
      if (!supportedPlatforms.includes(platform)) {
        res.status(400).json(
          createResponse(
            false,
            undefined,
            `Unsupported platform: ${platform}. Supported: ${supportedPlatforms.join(', ')}`,
          ),
        );
        return;
      }

      // Generate the binary
      console.log(`📦 Generating SEA binary for platform: ${platform}`);
      const result = await generateSeaBinary({
        habits,
        serverConfig,
        envContent: envContent || '',
        frontendHtml,
        platform,
      });

      if (!result.success || !result.binaryPath) {
        res.status(500).json(
          createResponse(false, undefined, result.error || 'Binary generation failed'),
        );
        return;
      }

      // Send the binary file as download
      const filename = platform.startsWith('win') ? 'habits.exe' : 'habits';
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Binary-Platform', result.platform || platform);
      res.setHeader('X-Binary-Size', result.size?.toString() || '0');

      // Stream the file
      const fileStream = fs.createReadStream(result.binaryPath);
      fileStream.pipe(res);

      // Cleanup after sending
      fileStream.on('end', () => {
        try {
          // Delete the temp binary and its directory
          const tempDir = path.dirname(result.binaryPath!);
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    } catch (error: any) {
      console.error('Binary export error:', error);
      res.status(500).json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * POST /api/export/pack/desktop
   * Generate desktop app scaffold or binary (Electron or Tauri)
   */
  packDesktop = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        habits, 
        serverConfig, 
        frontendHtml, 
        backendUrl, 
        desktopPlatform = 'all', 
        framework = 'tauri',
        buildBinary = false,
        debugBuild = false,
        stackName,
        stackId,
        appName,
        appIcon,
        executionMode = 'client',
        envVars,
      } = req.body;

      // Validate required fields
      if (!habits || !Array.isArray(habits) || habits.length === 0) {
        res.status(400).json(createResponse(false, undefined, 'habits array is required'));
        return;
      }

      // backendUrl is only required for 'client' mode
      if (executionMode !== 'full' && !backendUrl) {
        res.status(400).json(
          createResponse(false, undefined, 'backendUrl is required for client mode desktop apps'),
        );
        return;
      }

      if (!frontendHtml) {
        res.status(400).json(
          createResponse(false, undefined, 'frontendHtml is required for desktop apps'),
        );
        return;
      }

      // Validate framework
      const validFrameworks = ['electron', 'tauri'];
      if (!validFrameworks.includes(framework)) {
        res.status(400).json(
          createResponse(
            false,
            undefined,
            `Invalid framework: ${framework}. Valid: ${validFrameworks.join(', ')}`,
          ),
        );
        return;
      }

      // Call the desktop pack function
      const result = await packDesktopForWeb({
        habits,
        serverConfig,
        frontendHtml,
        backendUrl,
        desktopPlatform,
        framework: framework as 'electron' | 'tauri',
        buildBinary,
        debugBuild,
        stackName,
        stackId,
        appName,
        appIcon,
        executionMode,
        envVars,
      });

      if (!result.success) {
        res.status(500).json(createResponse(false, undefined, result.error));
        return;
      }

      // Handle binary file response
      if (result.binaryPath && result.binaryFilename && result.binaryMimeType) {
        res.setHeader('Content-Type', result.binaryMimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.binaryFilename}"`);
        const stream = fs.createReadStream(result.binaryPath);
        stream.pipe(res);

        // Cleanup after sending
        stream.on('end', () => {
          if (result.cleanup) result.cleanup();
        });
        stream.on('error', () => {
          if (result.cleanup) result.cleanup();
        });
        return;
      }

      // Handle zip buffer response
      if (result.zipBuffer && result.zipFilename) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${result.zipFilename}"`);
        res.send(result.zipBuffer);
        return;
      }

      res.status(500).json(createResponse(false, undefined, 'Invalid pack result'));
    } catch (error: any) {
      console.error('Desktop export error:', error);
      res.status(500).json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * POST /api/export/pack/mobile
   * Generate mobile app scaffold or binary
   */
  packMobile = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        habits,
        serverConfig,
        frontendHtml,
        backendUrl,
        mobileTarget = 'both',
        buildBinary = false,
        debugBuild = false,
        framework = 'tauri',
        stackName,
        stackId,
        appName,
        appIcon,
        executionMode = 'client',
        envVars,
      } = req.body;

      // Validate required fields
      if (!habits || !Array.isArray(habits) || habits.length === 0) {
        res.status(400).json(createResponse(false, undefined, 'habits array is required'));
        return;
      }

      // backendUrl is only required for 'client' mode
      if (executionMode !== 'full' && !backendUrl) {
        res.status(400).json(
          createResponse(false, undefined, 'backendUrl is required for client mode mobile apps'),
        );
        return;
      }

      if (!frontendHtml) {
        res.status(400).json(
          createResponse(false, undefined, 'frontendHtml is required for mobile apps'),
        );
        return;
      }

      const validTargets = ['ios', 'android', 'both'];
      if (!validTargets.includes(mobileTarget)) {
        res.status(400).json(
          createResponse(
            false,
            undefined,
            `Invalid mobile target: ${mobileTarget}. Valid: ${validTargets.join(', ')}`,
          ),
        );
        return;
      }

      const validFrameworks = ['capacitor', 'cordova', 'tauri'];
      if (!validFrameworks.includes(framework)) {
        res.status(400).json(
          createResponse(
            false,
            undefined,
            `Invalid framework: ${framework}. Valid: ${validFrameworks.join(', ')}`,
          ),
        );
        return;
      }

      // Call the mobile pack function
      const result = await packMobileForWeb({
        habits,
        serverConfig,
        frontendHtml,
        backendUrl,
        mobileTarget: mobileTarget as 'ios' | 'android' | 'both',
        buildBinary,
        debugBuild,
        framework: framework as 'capacitor' | 'cordova' | 'tauri',
        stackName,
        stackId,
        appName,
        appIcon,
        executionMode,
        envVars,
      });

      if (!result.success) {
        res.status(500).json(createResponse(false, undefined, result.error));
        return;
      }

      // Handle binary file response
      if (result.binaryPath && result.binaryFilename && result.binaryMimeType) {
        res.setHeader('Content-Type', result.binaryMimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.binaryFilename}"`);
        const stream = fs.createReadStream(result.binaryPath);
        stream.pipe(res);

        // Cleanup after sending
        stream.on('end', () => {
          if (result.cleanup) result.cleanup();
        });
        stream.on('error', () => {
          if (result.cleanup) result.cleanup();
        });
        return;
      }

      // Handle zip buffer response
      if (result.zipBuffer && result.zipFilename) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${result.zipFilename}"`);
        res.send(result.zipBuffer);
        return;
      }

      res.status(500).json(createResponse(false, undefined, 'Invalid pack result'));
    } catch (error: any) {
      console.error('Mobile export error:', error);
      res.status(500).json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * POST /api/export/pack/docker
   * Generate Docker package with Dockerfile and docker-compose.yml
   */
  packDocker = async (req: Request, res: Response): Promise<void> => {
    try {
      const { habits, serverConfig, envContent, frontendHtml, stackYaml, habitFiles, stackName } = req.body;

      // Validate required fields
      if (!habits || !Array.isArray(habits) || habits.length === 0) {
        res.status(400).json(createResponse(false, undefined, 'habits array is required'));
        return;
      }

      if (!stackYaml) {
        res.status(400).json(createResponse(false, undefined, 'stackYaml is required'));
        return;
      }

      if (!habitFiles || !Array.isArray(habitFiles)) {
        res.status(400).json(createResponse(false, undefined, 'habitFiles array is required'));
        return;
      }

      // envContent is optional - default to empty string if not provided
      const finalEnvContent = envContent || '';

      // Call the Docker pack function
      const result = await packDockerForWeb({
        habits,
        serverConfig,
        envContent: finalEnvContent,
        frontendHtml,
        stackYaml,
        habitFiles,
        stackName,
      });

      if (!result.success) {
        res.status(500).json(createResponse(false, undefined, result.error));
        return;
      }

      // Handle zip buffer response
      if (result.zipBuffer && result.zipFilename) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${result.zipFilename}"`);
        res.send(result.zipBuffer);
        return;
      }

      res.status(500).json(createResponse(false, undefined, 'Invalid pack result'));
    } catch (error: any) {
      console.error('Docker export error:', error);
      res.status(500).json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * POST /api/export/pack/habit
   * Generate .habit file (self-contained ZIP with bundle, stack.yaml, habits)
   */
  packHabit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { habits, stackYaml, habitFiles, stackName, envContent } = req.body;
      const bundleResult = await generateBundle({ habits, appName: stackName || 'HabitsApp', envVars: {} });
      if (!bundleResult.success) { res.status(500).json(createResponse(false, undefined, bundleResult.error)); return; }

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      zip.file('cortex-bundle.js', bundleResult.code || '');
      zip.file('stack.yaml', stackYaml);
      for (const h of habitFiles) zip.file(h.filename, h.content);
      if (envContent) zip.file('.env', envContent);

      const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${stackName || 'habits'}.habit"`);
      res.send(buffer);
    } catch (e: any) {
      console.error('Habit export error:', e);
      res.status(500).json(createResponse(false, undefined, e.message));
    }
  };
}
