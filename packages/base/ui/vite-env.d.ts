// Provides Vite runtime types for TypeScript (import.meta.env)
// and declares build-time injected constants like __APP_VERSION__.
// This ensures that when TypeScript runs during the build process, it can correctly
// recognize Vite-provided environment variables and the app version injected from Vite config,
// so the build passes without type errors and values are correctly replaced by Vite at compile time.

/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
