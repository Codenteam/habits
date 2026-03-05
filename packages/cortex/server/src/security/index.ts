/**
 * Security Module for Habits Cortex
 * 
 * Provides:
 * - Input scanning (DLP, PII, Moderation)
 * - Security wrapper for policy and permissions
 */

export { getSecurityConfig, scanInputForSecurity } from './inputScanner';
export type { SecurityScanConfig } from './inputScanner';
