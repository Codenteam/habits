/**
 * Security Scanning Module (DLP, PII, Moderation)
 * 
 * Provides input scanning capabilities for security concerns.
 * Uses @codenteam/intersect package from private registry.
 */

import type { ILogger } from '@ha-bits/core';

// ============================================================================
// Types
// ============================================================================

/**
 * Security scan configuration from environment variables
 */
export interface SecurityScanConfig {
  dlpEnabled: boolean;
  dlpIcapUrl: string | null;
  dlpIcapTimeout: number;
  piiMode: 'log' | 'eradicate' | 'replace' | null;
  moderationEnabled: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get security configuration from environment variables
 * 
 * Environment variables:
 * - HABITS_DLP_ENABLED: Set to 'true' to enable DLP scanning
 * - HABITS_DLP_ICAP_URL: ICAP server URL for enterprise DLP (e.g., icap://server:1344/scan)
 * - HABITS_DLP_ICAP_TIMEOUT: ICAP request timeout in ms (default: 5000)
 * - HABITS_PII_PROTECTION: Set to 'log', 'eradicate', or 'replace'
 * - HABITS_MODERATION_ENABLED: Set to 'true' to enable content moderation
 */
export function getSecurityConfig(): SecurityScanConfig {
  const dlpEnabled = process.env.HABITS_DLP_ENABLED === 'true';
  const dlpIcapUrl = process.env.HABITS_DLP_ICAP_URL || null;
  const dlpIcapTimeout = parseInt(process.env.HABITS_DLP_ICAP_TIMEOUT || '5000', 10);
  const piiValue = process.env.HABITS_PII_PROTECTION;
  const piiMode = (piiValue === 'log' || piiValue === 'eradicate' || piiValue === 'replace') ? piiValue : null;
  const moderationEnabled = process.env.HABITS_MODERATION_ENABLED === 'true';
  
  return { dlpEnabled, dlpIcapUrl, dlpIcapTimeout, piiMode, moderationEnabled };
}

// ============================================================================
// Scanning Functions
// ============================================================================

/**
 * Scan input data for security concerns (DLP, PII, Moderation)
 * Called on habits.input.* data and trigger output data
 * 
 * @param data - The input data to scan (string, object, or array)
 * @param config - Security configuration from getSecurityConfig()
 * @param logger - Logger instance for output
 * @returns Processed data (potentially redacted/modified based on config)
 */
export async function scanInputForSecurity(
  data: any,
  config: SecurityScanConfig,
  logger: ILogger
): Promise<any> {
  let processedData = data;
  
  // Skip if no security features enabled
  if (!config.dlpEnabled && !config.piiMode && !config.moderationEnabled) {
    return processedData;
  }
  
  try {
    // Import @codenteam/intersect from private registry
    // This package is hosted on a private npm registry and provides DLP, PII, and moderation capabilities
    // @ts-ignore - Package is from private registry, not available at compile time
    const intersect = await import('@codenteam/intersect');
    
    // DLP Scanning
    if (config.dlpEnabled) {
      logger.log('🔐 [Security] Running DLP scan on input data...');
      try {
        const dlpOptions: { icapUrl?: string; timeout?: number } = {};
        if (config.dlpIcapUrl) {
          dlpOptions.icapUrl = config.dlpIcapUrl;
          dlpOptions.timeout = config.dlpIcapTimeout;
          logger.log(`🔐 [DLP] Using ICAP server: ${config.dlpIcapUrl}`);
        }
        const dlpResult = await intersect.dlp.consume(processedData, dlpOptions);
        processedData = dlpResult.data ?? processedData;
        if (dlpResult.findings && dlpResult.findings.length > 0) {
          logger.log(`🔐 [DLP] Found ${dlpResult.findings.length} sensitive data instance(s)`);
        }
      } catch (dlpError: any) {
        logger.warn(`⚠️ [DLP] Scan failed: ${dlpError.message}`);
      }
    }
    
    // PII Protection
    if (config.piiMode) {
      logger.log(`🔐 [Security] Running PII scan (mode: ${config.piiMode}) on input data...`);
      try {
        const piiResult = await intersect.pii.consume(processedData, { mode: config.piiMode });
        processedData = piiResult.data ?? processedData;
        if (piiResult.detections && piiResult.detections.length > 0) {
          logger.log(`🔐 [PII] Found ${piiResult.detections.length} PII instance(s) - mode: ${config.piiMode}`);
        }
      } catch (piiError: any) {
        logger.warn(`⚠️ [PII] Scan failed: ${piiError.message}`);
      }
    }
    
    // Content Moderation
    if (config.moderationEnabled) {
      logger.log('🔐 [Security] Running moderation scan on input data...');
      try {
        const modResult = await intersect.moderation.consume(processedData);
        if (modResult.flagged) {
          logger.warn(`⚠️ [Moderation] Content flagged: ${JSON.stringify(modResult.categories)}`);
        }
        processedData = modResult.data ?? processedData;
      } catch (modError: any) {
        logger.warn(`⚠️ [Moderation] Scan failed: ${modError.message}`);
      }
    }
  } catch (importError: any) {
    // Package not available - log and continue without security scanning
    logger.warn(`⚠️ [Security] @codenteam/intersect package not available: ${importError.message}`);
    logger.warn('   Security features (DLP, PII, Moderation) are disabled.');
  }
  
  return processedData;
}
