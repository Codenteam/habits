#!/usr/bin/env node
/**
 * Smart build script for local-ai-node
 * 
 * Auto-detects the platform and enables appropriate GPU acceleration:
 * - macOS: Metal + Accelerate
 * - Linux/Windows with NVIDIA: CUDA (if nvcc available)
 * - Otherwise: CPU only
 */

const { execSync, spawnSync } = require('child_process');
const os = require('os');

const platform = os.platform();
const arch = os.arch();

console.log(`\n🔧 Building local-ai-node for ${platform}/${arch}\n`);

// Detect available GPU features
function detectFeatures() {
  const features = [];

  if (platform === 'darwin') {
    // macOS: Always enable Metal and Accelerate
    features.push('metal', 'accelerate');
    console.log('✅ macOS detected - enabling Metal GPU acceleration');
    console.log('✅ macOS detected - enabling Accelerate framework');
  } else if (platform === 'linux' || platform === 'win32') {
    // Check for CUDA
    try {
      const result = spawnSync('nvcc', ['--version'], { encoding: 'utf8' });
      if (result.status === 0) {
        features.push('cuda');
        console.log('✅ NVIDIA CUDA detected - enabling CUDA acceleration');
      } else {
        console.log('ℹ️  No CUDA detected - using CPU');
      }
    } catch {
      console.log('ℹ️  nvcc not found - using CPU');
    }
  }

  return features;
}

// Build command
function build() {
  const features = detectFeatures();
  
  let command = 'npx napi build --platform --release';
  
  if (features.length > 0) {
    command += ` --features ${features.join(',')}`;
  }

  console.log(`\n🚀 Running: ${command}\n`);
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: __dirname + '/..'
    });
    
    console.log('\n✅ Build completed successfully!\n');
    
    // Print feature summary
    if (features.includes('metal')) {
      console.log('   🎮 GPU: Metal (Apple Silicon / macOS)');
    } else if (features.includes('cuda')) {
      console.log('   🎮 GPU: CUDA (NVIDIA)');
    } else {
      console.log('   💻 GPU: None (CPU only)');
    }
    
    if (features.includes('accelerate')) {
      console.log('   ⚡ CPU: Accelerate framework optimized');
    }
    
    console.log('');
  } catch (error) {
    console.error('\n❌ Build failed!');
    process.exit(1);
  }
}

build();
