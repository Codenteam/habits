import React, { useState } from 'react';
import { AuthConfig } from '../lib/formBuilder/types';
import { FormFieldRenderer } from './FormFieldRenderer';
import { FormBuilderAPI } from '../lib/formBuilderAPI';

interface Module {
  framework: string;
  name: string;
  displayName?: string;
  source: string;
  repository: string;
}

interface AuthSectionProps {
  authConfig: AuthConfig;
  value: any;
  module?: Module;
  className?: string;
}

export const AuthSection: React.FC<AuthSectionProps> = ({
  authConfig,
  value,
  module,
  className = ''
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ isValid: boolean; message: string } | null>(null);

  // Convert AuthConfig to FormField for rendering
  const authField = {
    id: 'auth',
    name: 'auth',
    displayName: authConfig.displayName,
    type: authConfig.type,
    required: authConfig.required,
    description: authConfig.description
  };

  const handleVerifyAuth = async () => {
    if (!module || !value) {
      setVerificationResult({
        isValid: false,
        message: 'Please enter authentication credentials first'
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await FormBuilderAPI.verifyAuth(module.framework, module.name, value);
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult({
        isValid: false,
        message: 'Failed to verify authentication'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`auth-section bg-slate-800 border border-slate-600 rounded-md p-4 ${className}`}>
      <div className="flex items-center mb-3">
        <svg 
          className="w-5 h-5 text-amber-400 mr-2" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" 
            clipRule="evenodd" 
          />
        </svg>
        <h3 className="text-lg font-medium text-amber-300">Authentication</h3>
      </div>
      
      <div className="auth-field">
        <FormFieldRenderer
          field={authField as any}
          key="auth"
        />
      </div>

      {/* Verify Auth Button */}
      {module && value && (
        <div className="mt-3">
          <button
            type="button"
            onClick={handleVerifyAuth}
            disabled={isVerifying}
            className="inline-flex items-center px-3 py-2 border border-slate-500 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-200 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verify Authentication
              </>
            )}
          </button>
        </div>
      )}

      {/* Verification Result */}
      {verificationResult && (
        <div className={`mt-3 p-3 border rounded-md ${
          verificationResult.isValid 
            ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300' 
            : 'bg-red-900/30 border-red-700 text-red-300'
        }`}>
          <div className="flex items-center">
            <svg 
              className={`w-4 h-4 mr-2 ${verificationResult.isValid ? 'text-emerald-400' : 'text-red-400'}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              {verificationResult.isValid ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            <p className="text-sm font-medium">
              {verificationResult.isValid ? 'Authentication Verified' : 'Authentication Failed'}
            </p>
          </div>
          <p className="text-sm mt-1">{verificationResult.message}</p>
        </div>
      )}

      {authConfig.description && (
        <div className="mt-3 p-3 bg-slate-700/50 border border-slate-600 rounded-md">
          <p className="text-sm text-slate-300 whitespace-pre-wrap">
            {authConfig.description}
          </p>
        </div>
      )}
    </div>
  );
};