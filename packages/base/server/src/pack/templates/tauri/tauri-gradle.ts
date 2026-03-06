/**
 * Tauri Android Gradle Configuration
 * Optimizes APK size through R8 shrinking and build optimizations
 */

/**
 * Generate gradle.properties with size optimizations
 */
export function getTauriGradleProperties(): string {
  return `# Android Build Optimizations
# Enable R8 full mode for maximum shrinking
android.enableR8.fullMode=true

# Enable code shrinking
android.enableR8=true

# Enable resource shrinking
android.enableResourceOptimizations=true

# Optimize for size
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8 -XX:+UseParallelGC
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configureondemand=true

# AndroidX
android.useAndroidX=true
android.enableJetifier=true

# Kotlin
kotlin.code.style=official
`;
}

/**
 * Generate ProGuard rules for additional optimization
 */
export function getTauriProguardRules(): string {
  return `# Tauri ProGuard Rules for Size Optimization

# Keep Tauri core classes
-keep class app.tauri.** { *; }

# Optimize aggressively
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# Remove logging
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Strip debug info
-keepattributes *Annotation*,Signature,Exception
-renamesourcefileattribute SourceFile
`;
}

/**
 * Generate app-level build.gradle modifications
 * Note: Modern Tauri v2 uses Kotlin DSL (build.gradle.kts)
 * This template shows Groovy syntax but is converted to Kotlin DSL in code
 */
export function getTauriBuildGradleOptimizations(): string {
  return `
// Kotlin DSL (build.gradle.kts) example:
android {
    defaultConfig {
        // Only build for aarch64 (modern 64-bit ARM architecture)
        // This alone reduces APK size by ~75% compared to universal APK
        ndk {
            abiFilters.addAll(listOf("aarch64"))
        }
    }
    
    // Split APKs by architecture - disable universal APK
    splits {
        abi {
            isEnable = true
            reset()
            include("aarch64")
            isUniversalApk = false  // CRITICAL: prevents building universal APK
        }
    }
    
    buildTypes {
        getByName("release") {
            // Enable shrinking, obfuscation, and optimization
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    
    packaging {
        // Exclude unnecessary files
        resources.excludes.add("META-INF/NOTICE")
        resources.excludes.add("META-INF/LICENSE")
        resources.excludes.add("META-INF/DEPENDENCIES")
        resources.excludes.add("META-INF/*.kotlin_module")
    }
}
`;
}
