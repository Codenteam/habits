# Packing Troubleshooting

## Android Common Issues
Usually the version mismatch between Java SDK, Cordova, Gradle, Build tools version cause most of the issues. Make sure you get this right before trying anything else.

## Cordova Android Compatibility Matrix

Use this table to ensure you have the correct versions installed for your target Cordova Android version:

| cordova-android | Android API | Build Tools | Gradle | AGP | JDK | Node.js |
|----------------|-------------|-------------|---------|------|-----|----------|
| 14.0.x | 24-35 | ^35.0.0 | 8.13 | 8.7.3 | 17 | >=20.5.0 |
| 13.0.x | 24-34 | ^34.0.0 | 8.7 | 8.3.0 | 17 | >=16.13.0 |
| 12.0.x | 24-33 | ^33.0.2 | 7.6 | 7.4.2 | 11 | >=16.13.0 |
| 11.0.x | 22-32 | ^32.0.0 | 7.4.2 | 7.2.1 | 11 | >=14.0.0 |
| 10.1.x | 22-30 | ^30.0.3 | 7.1.1 | 4.2.2 | 11 | >=12.0.0 |
| 10.0.x | 22-30 | ^30.0.3 | 7.1.1 | 4.2.2 | 11 | >=12.0.0 |

**Key Points:**
- JDK 17 is required for Cordova Android 13.0+ and 14.0+
- JDK 11 is required for Cordova Android 10.0-12.0
- Each version requires specific Build Tools (use `sdkmanager "build-tools;VERSION"`)
- Gradle and Java versions must be compatible (see [Gradle Compatibility](https://docs.gradle.org/current/userguide/compatibility.html))

**Reference:** [Cordova Android Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/android/)

## ANDROID_HOME is missing. 
Set ANDROID_HOME as mentioned (here)[https://developer.android.com/tools/variables] 

## Android Build Tools Missing

**Issue:** `No installed build tools found. Please install the Android build tools version X.X.X`

**Solution:**
Install the Build Tools version that matches your Cordova Android version (see compatibility matrix above):

```bash
# For Cordova Android 14.0.x
sdkmanager "build-tools;35.0.0"

# For Cordova Android 13.0.x
sdkmanager "build-tools;34.0.0"

# For Cordova Android 12.0.x
sdkmanager "build-tools;33.0.2"

# For Cordova Android 11.0.x
sdkmanager "build-tools;32.0.0"

# For Cordova Android 10.x
sdkmanager "build-tools;30.0.3"
```

## SDK XML Version Mismatch / Resource Compilation Failed

**Issue:** `This version only understands SDK XML versions up to 3 but an SDK XML file of version 4 was encountered` + `Invalid <color> for given resource value` + `Resource compilation failed`

**Solution:**
Use version compatible between command-line tools and Gradle wrapper:
```bash
# Option 1: Downgrade command-line tools (recommended for Gradle 7.x)
sdkmanager --uninstall "cmdline-tools;latest"
sdkmanager --install "cmdline-tools;9.0"

# Option 2: Use Gradle 8.0+ in your project (for Cordova Android 13.0+)
# Edit platforms/android/gradle/wrapper/gradle-wrapper.properties
# For Cordova Android 14.0.x:
# distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-all.zip
# For Cordova Android 13.0.x:
# distributionUrl=https\://services.gradle.org/distributions/gradle-8.7-all.zip
```

## Java Version Issues

**Issue:** `Unsupported class file major version XX`

**Solution:**
Ensure you're using the correct JDK version for your Cordova Android version:

```bash
# Check current Java version
java -version

# For Cordova Android 13.0+ and 14.0+ - Use JDK 17
# Install via Homebrew (macOS):
brew install openjdk@17

# For Cordova Android 10.x-12.x - Use JDK 11
# Install via Homebrew (macOS):
brew install openjdk@11

# Set JAVA_HOME environment variable
export JAVA_HOME=$(/usr/libexec/java_home -v 17)  # or -v 11
```

## Changing/Downgrading Gradle Version

**Issue:** Need to use a specific Gradle version to match your Cordova Android version

**Solution:**
Edit the Gradle wrapper properties file in your Cordova Android project:

**Step 1: Check current Gradle version**
```bash
cd platforms/android
./gradlew --version
```

**Step 2: Edit gradle-wrapper.properties**
```bash
# File location: platforms/android/gradle/wrapper/gradle-wrapper.properties
# Edit the distributionUrl line to change Gradle version
```

**Step 3: Use the appropriate Gradle version for your Cordova Android version:**

```properties
# For Cordova Android 14.0.x (Gradle 8.13)
distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-all.zip

# For Cordova Android 13.0.x (Gradle 8.7)
distributionUrl=https\://services.gradle.org/distributions/gradle-8.7-all.zip

# For Cordova Android 12.0.x (Gradle 7.6)
distributionUrl=https\://services.gradle.org/distributions/gradle-7.6-all.zip

# For Cordova Android 11.0.x (Gradle 7.4.2)
distributionUrl=https\://services.gradle.org/distributions/gradle-7.4.2-all.zip

# For Cordova Android 10.x (Gradle 7.1.1)
distributionUrl=https\://services.gradle.org/distributions/gradle-7.1.1-all.zip
```

**Step 4: Clean and rebuild**
```bash
./gradlew clean
./gradlew build
```

**Note:** The Gradle wrapper will automatically download the specified version on the next build.

## Electron "is damaged and can’t be opened" Issue (macOS)

**Issue:**  
When running the packed app on macOS, you see:  
`"App" is damaged and can’t be opened. You should eject the disk image.`

**Cause:**  
This is usually due to macOS Gatekeeper detecting that the Electron binary is unsigned or has been modified after signing. This often happens if you repackage Electron apps without proper code signing, or if the quarantine attribute is set on the app.

**Solution:**  
1. **Remove Quarantine Attribute (For testing only):**
    ```bash
    xattr -dr com.apple.quarantine /path/to/YourApp.app
    ```
    Replace `/path/to/YourApp.app` with the actual path to your Electron app.

2. **(Recommended) Sign the App:**
    - For production/distribution, always sign your Electron app with a valid Apple Developer certificate. See [Electron Code Signing Guide](https://www.electron.build/code-signing).

3. **If using DMG:**
    - After creating the DMG, run the `xattr` command on the mounted app or the DMG itself if you see the error.

**References:**
- [Electron macOS Notarization](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [Electron Troubleshooting macOS](https://www.electron.build/macos-code-signing)
