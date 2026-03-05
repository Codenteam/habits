/**
 * Gradle and Java Compatibility Matrix
 * 
 * This module provides compatibility checking between Gradle and Java versions
 * to prevent "Unsupported class file major version" errors during builds.
 * 
 * References:
 * - https://docs.gradle.org/current/userguide/compatibility.html
 * - Cordova Android 13+ typically uses Gradle 8.x
 */

export interface JavaVersion {
  major: number;
  version: string;
  classFileMajorVersion: number;
}

export interface GradleVersion {
  version: string;
  minJava: number;
  maxJava: number;
  recommended: number;
}

/**
 * Java version to class file major version mapping
 * Class file major version = 44 + Java major version
 */
export const JAVA_VERSIONS: Record<number, JavaVersion> = {
  8: { major: 8, version: '1.8', classFileMajorVersion: 52 },
  11: { major: 11, version: '11', classFileMajorVersion: 55 },
  17: { major: 17, version: '17', classFileMajorVersion: 61 },
  21: { major: 21, version: '21', classFileMajorVersion: 65 },
  22: { major: 22, version: '22', classFileMajorVersion: 66 },
  23: { major: 23, version: '23', classFileMajorVersion: 67 },
};

/**
 * Gradle version compatibility matrix
 * Each entry defines the minimum and maximum Java versions supported
 */
export const GRADLE_COMPATIBILITY: GradleVersion[] = [
  { version: '7.0-7.2', minJava: 8, maxJava: 16, recommended: 11 },
  { version: '7.3-7.6', minJava: 8, maxJava: 17, recommended: 17 },
  { version: '8.0-8.4', minJava: 8, maxJava: 19, recommended: 17 },
  { version: '8.5', minJava: 8, maxJava: 20, recommended: 17 },
  { version: '8.6-8.7', minJava: 8, maxJava: 21, recommended: 17 },
  { version: '8.8+', minJava: 8, maxJava: 22, recommended: 17 },
];

/**
 * Cordova Android version to Gradle version mapping
 * Reference: https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html
 */
export const CORDOVA_GRADLE_VERSIONS: Record<string, string> = {
  '14.0': '8.13',
  '13.0': '8.7',
  '12.0': '7.6',
  '11.0': '7.4.2',
  '10.1': '7.1.1',
  '10.0': '7.1.1',
};

/**
 * Cordova Android version to recommended JDK version mapping
 */
export const CORDOVA_JDK_VERSIONS: Record<string, number> = {
  '14.0': 17,
  '13.0': 17,
  '12.0': 11,
  '11.0': 11,
  '10.1': 11,
  '10.0': 11,
};

/**
 * Cordova Android version to Build Tools version mapping
 */
export const CORDOVA_BUILD_TOOLS: Record<string, string> = {
  '14.0': '35.0.0',
  '13.0': '34.0.0',
  '12.0': '33.0.2',
  '11.0': '32.0.0',
  '10.1': '30.0.3',
  '10.0': '30.0.3',
};

/**
 * Parse Java version string to extract major version
 * Handles formats like: "17.0.1", "1.8.0_292", "21.0.2"
 */
export function parseJavaVersion(versionString: string): number | null {
  if (!versionString) return null;
  
  // Remove quotes if present
  versionString = versionString.replace(/"/g, '');
  
  // Handle "1.8" format (Java 8)
  if (versionString.startsWith('1.8')) {
    return 8;
  }
  
  // Handle modern format "17.0.1", "21.0.2", etc.
  const match = versionString.match(/^(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

/**
 * Parse Gradle version string to extract major.minor version
 * Handles formats like: "Gradle 8.2.1", "8.2", "8.2.1"
 */
export function parseGradleVersion(versionString: string): string | null {
  if (!versionString) return null;
  
  // Extract version number from "Gradle X.Y.Z" format
  const match = versionString.match(/(\d+\.\d+)(?:\.\d+)?/);
  if (match) {
    return match[1];
  }
  
  return null;
}

/**
 * Get Gradle compatibility info for a given Gradle version
 */
export function getGradleCompatibility(gradleVersion: string): GradleVersion | null {
  const parsed = parseGradleVersion(gradleVersion);
  if (!parsed) return null;
  
  const [major, minor] = parsed.split('.').map(Number);
  
  // Find matching compatibility entry
  for (const entry of GRADLE_COMPATIBILITY) {
    const rangeMatch = entry.version.match(/^(\d+)\.(\d+)(?:-(\d+)\.(\d+))?(\+)?$/);
    if (!rangeMatch) continue;
    
    const [, minMajor, minMinor, maxMajor, maxMinor, plus] = rangeMatch;
    const min = parseFloat(`${minMajor}.${minMinor}`);
    const max = maxMajor ? parseFloat(`${maxMajor}.${maxMinor}`) : min;
    const current = parseFloat(`${major}.${minor}`);
    
    if (plus && current >= min) {
      return entry;
    } else if (current >= min && current <= max) {
      return entry;
    }
  }
  
  return null;
}

/**
 * Check if a Java version is compatible with a Gradle version
 */
export function isCompatible(javaVersion: number, gradleVersion: string): boolean {
  const compat = getGradleCompatibility(gradleVersion);
  if (!compat) return false;
  
  return javaVersion >= compat.minJava && javaVersion <= compat.maxJava;
}

/**
 * Get recommended Java version for a Gradle version
 */
export function getRecommendedJava(gradleVersion: string): number | null {
  const compat = getGradleCompatibility(gradleVersion);
  return compat ? compat.recommended : null;
}

/**
 * Get compatibility status with detailed information
 */
export interface CompatibilityCheck {
  compatible: boolean;
  javaVersion: number;
  gradleVersion: string;
  minJava?: number;
  maxJava?: number;
  recommended?: number;
  message: string;
}

export function checkCompatibility(
  javaVersion: string | number,
  gradleVersion: string
): CompatibilityCheck {
  const javaMajor = typeof javaVersion === 'number' 
    ? javaVersion 
    : parseJavaVersion(javaVersion);
  
  if (!javaMajor) {
    return {
      compatible: false,
      javaVersion: 0,
      gradleVersion,
      message: `Could not parse Java version: ${javaVersion}`,
    };
  }
  
  const compat = getGradleCompatibility(gradleVersion);
  if (!compat) {
    return {
      compatible: false,
      javaVersion: javaMajor,
      gradleVersion,
      message: `Could not determine compatibility for Gradle ${gradleVersion}`,
    };
  }
  
  const compatible = javaMajor >= compat.minJava && javaMajor <= compat.maxJava;
  
  if (compatible) {
    return {
      compatible: true,
      javaVersion: javaMajor,
      gradleVersion,
      minJava: compat.minJava,
      maxJava: compat.maxJava,
      recommended: compat.recommended,
      message: `Java ${javaMajor} is compatible with Gradle ${gradleVersion} (range: ${compat.minJava}-${compat.maxJava}, recommended: ${compat.recommended})`,
    };
  } else {
    return {
      compatible: false,
      javaVersion: javaMajor,
      gradleVersion,
      minJava: compat.minJava,
      maxJava: compat.maxJava,
      recommended: compat.recommended,
      message: `Java ${javaMajor} is NOT compatible with Gradle ${gradleVersion}. Required: Java ${compat.minJava}-${compat.maxJava} (recommended: ${compat.recommended})`,
    };
  }
}

/**
 * Get Gradle version expected for Cordova Android version
 */
export function getCordovaGradleVersion(cordovaAndroidVersion: string): string | null {
  // Extract major version (e.g., "13.0.0" -> "13.0")
  const match = cordovaAndroidVersion.match(/^(\d+\.\d+)/);
  if (!match) return null;
  
  return CORDOVA_GRADLE_VERSIONS[match[1]] || null;
}

/**
 * Get recommended JDK version for Cordova Android version
 */
export function getCordovaJDKVersion(cordovaAndroidVersion: string): number | null {
  // Extract major version (e.g., "13.0.0" -> "13.0")
  const match = cordovaAndroidVersion.match(/^(\d+\.\d+)/);
  if (!match) return null;
  
  return CORDOVA_JDK_VERSIONS[match[1]] || null;
}

/**
 * Get Build Tools version for Cordova Android version
 */
export function getCordovaBuildToolsVersion(cordovaAndroidVersion: string): string | null {
  // Extract major version (e.g., "13.0.0" -> "13.0")
  const match = cordovaAndroidVersion.match(/^(\d+\.\d+)/);
  if (!match) return null;
  
  return CORDOVA_BUILD_TOOLS[match[1]] || null;
}

/**
 * Get full compatibility report for Cordova builds
 */
export interface CordovaCompatibilityReport {
  compatible: boolean;
  javaVersion: number;
  gradleVersion: string;
  cordovaAndroidVersion?: string;
  expectedGradleVersion?: string;
  recommendation: string;
  details: CompatibilityCheck;
}

export function checkCordovaCompatibility(
  javaVersion: string | number,
  gradleVersion: string,
  cordovaAndroidVersion?: string
): CordovaCompatibilityReport {
  const details = checkCompatibility(javaVersion, gradleVersion);
  
  let recommendation = details.message;
  let expectedGradle: string | undefined = undefined;
  
  if (cordovaAndroidVersion) {
    const gradleForCordova = getCordovaGradleVersion(cordovaAndroidVersion);
    if (gradleForCordova) {
      expectedGradle = gradleForCordova;
      recommendation += `\n\nCordova Android ${cordovaAndroidVersion} typically uses Gradle ${expectedGradle}.`;
      
      // Double-check against expected Gradle version
      if (expectedGradle !== parseGradleVersion(gradleVersion)) {
        const expectedCompat = checkCompatibility(javaVersion, expectedGradle);
        if (!expectedCompat.compatible) {
          recommendation += `\nWARNING: Java ${details.javaVersion} may not be compatible with expected Gradle ${expectedGradle}.`;
        }
      }
    }
  }
  
  if (!details.compatible && details.recommended) {
    recommendation += `\n\n🔧 Solution: Install and use Java ${details.recommended}`;
  }
  
  return {
    compatible: details.compatible,
    javaVersion: details.javaVersion,
    gradleVersion,
    cordovaAndroidVersion,
    expectedGradleVersion: expectedGradle,
    recommendation,
    details,
  };
}
