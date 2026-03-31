import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import { CROP_TOP, CROP_BOTTOM, CROP_LEFT, CROP_RIGHT, DEVICES, Platform } from './constants.cjs';

const execAsync = promisify(exec);

const screenshotsDir = __dirname;
const sourceDir = path.join(screenshotsDir, 'source');
const templatesDir = path.join(screenshotsDir, 'templates');
const outputDir = path.join(screenshotsDir, 'output');
const outputJpgDir = path.join(outputDir, 'jpg');
const outputSvgDir = path.join(outputDir, 'svg');
const outputOriginalDir = path.join(outputDir, 'original');
const tempDir = path.join(screenshotsDir, 'temp');

// Ensure output and temp directories exist
for (const dir of [outputDir, outputJpgDir, outputSvgDir, outputOriginalDir, tempDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const BATCH_SIZE = 10;

/**
 * Crop image using ImageMagick (remove top, bottom, left, right pixels)
 */
async function cropImage(inputPath: string, outputPath: string, cropTop: number, cropBottom: number, cropLeft: number, cropRight: number): Promise<void> {
  // Use -chop with gravity for reliable edge cropping
  await execAsync(`convert "${inputPath}" -gravity North -chop 0x${cropTop} -gravity South -chop 0x${cropBottom} -gravity West -chop ${cropLeft}x0 -gravity East -chop ${cropRight}x0 "${outputPath}"`);
  console.log(`  Cropped: ${path.basename(inputPath)} -> removed ${cropTop}px top, ${cropBottom}px bottom, ${cropLeft}px left, ${cropRight}px right`);
}

/**
 * Resize image to fit device screen dimensions
 */
async function resizeImage(inputPath: string, outputPath: string, width: number, height: number): Promise<void> {
  // Resize to exact screen dimensions (SVG already at correct size for store)
  await execAsync(`convert "${inputPath}" -filter Lanczos -resize ${width}x${height} "${outputPath}"`);
  console.log(`  Resized: ${path.basename(inputPath)} to fit ${width}x${height}`);
}

/**
 * Create a device frame with screenshot embedded
 */
async function createDeviceFrame(
  screenshotPath: string,
  svgTemplatePath: string,
  jpgOutputPath: string,
  svgOutputPath: string,
  deviceType: Platform
): Promise<void> {
  
  // Read SVG template
  let svgContent = fs.readFileSync(svgTemplatePath, 'utf-8');
  
  // Read screenshot and convert to base64
  const screenshotBuffer = fs.readFileSync(screenshotPath);
  const base64Image = screenshotBuffer.toString('base64');
  const mimeType = screenshotPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const dataUri = `data:${mimeType};base64,${base64Image}`;
  
  // Replace placeholder xlink:href with actual image data
  svgContent = svgContent.replace(/xlink:href="placeholder\.png"/, `xlink:href="${dataUri}"`);
  
  // Ensure output directories for this device exist
  for (const dir of [path.dirname(jpgOutputPath), path.dirname(svgOutputPath)]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Write SVG
  fs.writeFileSync(svgOutputPath, svgContent);
  
  // Convert SVG to PNG at 1x scale (SVG is already at retina size), then to JPG
  const tempPngPath = jpgOutputPath.replace(/\.jpg$/, '_temp.png');
  await execAsync(`rsvg-convert -o "${tempPngPath}" "${svgOutputPath}"`);
  await execAsync(`convert "${tempPngPath}" -quality 95 "${jpgOutputPath}"`);
  fs.unlinkSync(tempPngPath);
  
  console.log(`  Created: jpg/${deviceType}/${path.basename(jpgOutputPath)} + svg/${deviceType}/${path.basename(svgOutputPath)}`);
}

/**
 * Get image dimensions using ImageMagick identify
 */
async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
  const { stdout } = await execAsync(`identify -format "%w %h" "${imagePath}"`);
  const [width, height] = stdout.trim().split(' ').map(Number);
  return { width, height };
}

/**
 * Resize image to store dimensions if needed (preserves original in original/ folder)
 */
async function ensureStoreDimensions(imagePath: string, device: Platform): Promise<void> {
  const config = DEVICES.find(d => d.platform === device)!;
  const { width: targetWidth, height: targetHeight } = config.store;
  
  const { width, height } = await getImageDimensions(imagePath);
  
  if (width === targetWidth && height === targetHeight) {
    return; // Already correct size
  }
  
  // HUGE WARNING
  console.error('\n' + '!'.repeat(80));
  console.error('!'.repeat(80));
  console.error('!!!');
  console.error(`!!!  WARNING: ${path.basename(imagePath)} is ${width}x${height}, expected ${targetWidth}x${targetHeight}`);
  console.error('!!!  RESIZING TO STORE DIMENSIONS - ORIGINAL PRESERVED IN original/ FOLDER');
  console.error('!!!');
  console.error('!'.repeat(80));
  console.error('!'.repeat(80) + '\n');
  
  // Preserve original in original/ folder
  const originalDir = path.join(outputOriginalDir, device);
  if (!fs.existsSync(originalDir)) {
    fs.mkdirSync(originalDir, { recursive: true });
  }
  const originalPath = path.join(originalDir, path.basename(imagePath));
  fs.copyFileSync(imagePath, originalPath);
  
  // Resize with best quality preservation
  await execAsync(`convert "${imagePath}" -filter Lanczos -resize ${targetWidth}x${targetHeight}! -quality 98 "${imagePath}"`);
  
  console.log(`  Resized to ${targetWidth}x${targetHeight} (original saved to original/${device}/${path.basename(imagePath)})`);
}

/**
 * Process a single screenshot
 */
async function processScreenshot(imagePath: string, baseName: string, device: Platform): Promise<void> {
  const tempCroppedPath = path.join(tempDir, `cropped_${device}_${baseName}.png`);
  
  // Step 1: Crop the image (top, bottom, left, right)
  await cropImage(imagePath, tempCroppedPath, CROP_TOP, CROP_BOTTOM, CROP_LEFT, CROP_RIGHT);
  
  const config = DEVICES.find(d => d.platform === device)!;
  const tempResizedPath = path.join(tempDir, `resized_${device}_${baseName}.png`);
  const svgPath = path.join(templatesDir, `${device}.svg`);
  const outputName = baseName.replace(/_(?:ios|mac|ipad|android)_[^.]+/, '').replace(/\.png$/, '');
  const jpgOutputPath = path.join(outputJpgDir, device, `${outputName}.jpg`);
  const svgOutputPath = path.join(outputSvgDir, device, `${outputName}.svg`);
  
  // Resize to fit device screen
  await resizeImage(tempCroppedPath, tempResizedPath, config.capture.width, config.capture.height);
  
  // Create device frame
  await createDeviceFrame(tempResizedPath, svgPath, jpgOutputPath, svgOutputPath, device);
  
  // Ensure output matches store dimensions
  await ensureStoreDimensions(jpgOutputPath, device);
  
  // Clean up temp files
  fs.unlinkSync(tempResizedPath);
  fs.unlinkSync(tempCroppedPath);
}

/**
 * Process tasks in batches
 */
async function processBatch<T>(tasks: (() => Promise<T>)[], batchSize: number): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)} (${batch.length} items)...`);
    const batchResults = await Promise.all(batch.map(task => task()));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Main processing function
 */
async function main(): Promise<void> {
  console.log('Processing screenshots...\n');
  console.log(`Crop settings: Top=${CROP_TOP}px, Bottom=${CROP_BOTTOM}px, Left=${CROP_LEFT}px, Right=${CROP_RIGHT}px`);
  console.log(`Batch size: ${BATCH_SIZE}\n`);
  
  // Get all PNG images in the source directory
  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.png'));
  
  // Collect all tasks
  const tasks: (() => Promise<void>)[] = [];
  
  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    
    if (file.includes('_ios_')) {
      tasks.push(() => {
        console.log(`Processing iOS screenshot: ${file}`);
        return processScreenshot(filePath, file, 'ios');
      });
    } else if (file.includes('_mac_')) {
      tasks.push(() => {
        console.log(`Processing Mac screenshot: ${file}`);
        return processScreenshot(filePath, file, 'mac');
      });
    } else if (file.includes('_ipad_')) {
      tasks.push(() => {
        console.log(`Processing iPad screenshot: ${file}`);
        return processScreenshot(filePath, file, 'ipad');
      });
    } else if (file.includes('_android_')) {
      tasks.push(() => {
        console.log(`Processing Android screenshot: ${file}`);
        return processScreenshot(filePath, file, 'android');
      });
    } else {
      console.log(`Skipping (no pattern match): ${file}`);
    }
  }
  
  console.log(`\nTotal tasks: ${tasks.length}`);
  
  // Process in batches of BATCH_SIZE
  await processBatch(tasks, BATCH_SIZE);
  
  // Clean up temp directory
  if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
    fs.rmdirSync(tempDir);
  }
  
  console.log('\nDone! Output files are in:', outputDir);
}

// Run the script
main().catch(console.error);
