/**
 * Cordova config.xml Template
 * 
 * Generates the config.xml for Cordova mobile apps with
 * appropriate permissions and settings for API calls.
 */

export interface CordovaConfigOptions {
  appId: string;
  appName: string;
  description: string;
  backendUrl: string;
  version?: string;
  author?: {
    name?: string;
    email?: string;
    website?: string;
  };
}

/**
 * Generate the Cordova config.xml content
 */
export function getCordovaConfig(options: CordovaConfigOptions): string {
  const { appId, appName, description, backendUrl, version = '1.0.0', author } = options;

  // Extract domain from backend URL for whitelist
  let backendDomain = '*';
  try {
    const url = new URL(backendUrl);
    backendDomain = url.hostname;
  } catch (e) {
    // Invalid URL, use wildcard
  }

  return `<?xml version='1.0' encoding='utf-8'?>
<widget id="${appId}" version="${version}" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>${escapeXml(appName)}</name>
    <description>${escapeXml(description)}</description>
    ${author ? `
    <author email="${author.email || ''}" href="${author.website || ''}">
        ${escapeXml(author.name || '')}
    </author>` : ''}
    
    <content src="index.html" />
    
    <!-- Access permissions for API calls -->
    <access origin="*" />
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
    <allow-navigation href="${backendUrl}/*" />
    <allow-navigation href="http://${backendDomain}/*" />
    <allow-navigation href="https://${backendDomain}/*" />
    
    <!-- Platform-specific settings -->
    <platform name="android">
        <allow-intent href="market:*" />
        <preference name="android-minSdkVersion" value="24" />
        <preference name="android-targetSdkVersion" value="35" />
        <preference name="android-compileSdkVersion" value="35" />
        <edit-config file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
            <application android:usesCleartextTraffic="true" xmlns:android="http://schemas.android.com/apk/res/android" />
        </edit-config>
    </platform>
    
    <platform name="ios">
        <allow-intent href="itms:*" />
        <allow-intent href="itms-apps:*" />
        <preference name="deployment-target" value="13.0" />
        <preference name="WKWebViewOnly" value="true" />
        <config-file parent="NSAppTransportSecurity" platform="ios" target="*-Info.plist">
            <dict>
                <key>NSAllowsArbitraryLoads</key>
                <true/>
            </dict>
        </config-file>
    </platform>
    
    <!-- General preferences -->
    <preference name="DisallowOverscroll" value="true" />
    <preference name="StatusBarOverlaysWebView" value="false" />
    <preference name="StatusBarBackgroundColor" value="#1a1a2e" />
    <preference name="StatusBarStyle" value="lightcontent" />
    <preference name="Orientation" value="default" />
    <preference name="BackgroundColor" value="0xff1a1a2e" />
    
    <!-- Splash screen -->
    <preference name="SplashScreen" value="screen" />
    <preference name="SplashScreenDelay" value="3000" />
    <preference name="FadeSplashScreen" value="true" />
    <preference name="FadeSplashScreenDuration" value="300" />
    <preference name="ShowSplashScreenSpinner" value="false" />
    
    <!-- Engine version requirements -->
    <engine name="android" spec="^12.0.0" />
    <engine name="ios" spec="^7.0.0" />
</widget>`;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
