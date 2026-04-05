package app.tauri.wifi

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.Permission
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

private const val TAG = "WifiPlugin"

@InvokeArg
class IsConnectedArgs {
    var ssid: String? = null
}

@InvokeArg
class RequestPermissionsArgs {
    var permissions: List<String> = listOf()
}

@TauriPlugin(
    permissions = [
        Permission(strings = [Manifest.permission.ACCESS_WIFI_STATE], alias = "wifiState"),
        Permission(strings = [Manifest.permission.ACCESS_FINE_LOCATION], alias = "location"),
        Permission(strings = [Manifest.permission.ACCESS_COARSE_LOCATION], alias = "coarseLocation")
    ]
)
class WifiPlugin(private val activity: Activity) : Plugin(activity) {
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val wifiManager: WifiManager by lazy {
        activity.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    }
    private val connectivityManager: ConnectivityManager by lazy {
        activity.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    }

    @Command
    fun getCurrentNetwork(invoke: Invoke) {
        scope.launch {
            try {
                Log.d(TAG, "Getting current network info")
                
                // Check location permission (required for SSID access on Android 8.0+)
                if (!hasLocationPermission()) {
                    val ret = JSObject()
                    ret.put("connected", false)
                    ret.put("error", "Location permission required to access Wi-Fi info")
                    invoke.resolve(ret)
                    return@launch
                }
                
                val networkInfo = getWifiInfo()
                
                if (networkInfo == null) {
                    val ret = JSObject()
                    ret.put("connected", false)
                    invoke.resolve(ret)
                    return@launch
                }
                
                val ret = JSObject()
                ret.put("connected", true)
                
                val network = JSObject()
                network.put("ssid", networkInfo.ssid.replace("\"", ""))
                network.put("bssid", networkInfo.bssid)
                network.put("signalStrength", networkInfo.rssi)
                network.put("signalLevel", WifiManager.calculateSignalLevel(networkInfo.rssi, 5))
                network.put("frequency", networkInfo.frequency)
                network.put("is5ghz", networkInfo.frequency >= 5000)
                network.put("linkSpeed", networkInfo.linkSpeed)
                
                // Get IP address
                val ipAddress = networkInfo.ipAddress
                if (ipAddress != 0) {
                    val ipString = String.format(
                        "%d.%d.%d.%d",
                        ipAddress and 0xff,
                        ipAddress shr 8 and 0xff,
                        ipAddress shr 16 and 0xff,
                        ipAddress shr 24 and 0xff
                    )
                    network.put("ipAddress", ipString)
                }
                
                ret.put("network", network)
                invoke.resolve(ret)
                
                Log.d(TAG, "Current network: ${networkInfo.ssid}")
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to get current network", e)
                val ret = JSObject()
                ret.put("connected", false)
                ret.put("error", e.message ?: "Unknown error")
                invoke.resolve(ret)
            }
        }
    }
    
    @Command
    fun isConnected(invoke: Invoke) {
        scope.launch {
            try {
                val args = invoke.parseArgs(IsConnectedArgs::class.java)
                
                Log.d(TAG, "Checking connection, target SSID: ${args.ssid}")
                
                // Check location permission for SSID access
                if (!hasLocationPermission()) {
                    val ret = JSObject()
                    ret.put("connected", false)
                    ret.put("error", "Location permission required")
                    invoke.resolve(ret)
                    return@launch
                }
                
                val networkInfo = getWifiInfo()
                
                val ret = JSObject()
                
                if (networkInfo == null) {
                    ret.put("connected", false)
                    invoke.resolve(ret)
                    return@launch
                }
                
                val currentSsid = networkInfo.ssid.replace("\"", "")
                ret.put("connected", true)
                ret.put("currentSsid", currentSsid)
                
                // If target SSID specified, check if it matches
                if (args.ssid != null) {
                    ret.put("matchesRequested", currentSsid == args.ssid)
                }
                
                invoke.resolve(ret)
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to check connection", e)
                invoke.reject(e.message ?: "Unknown error")
            }
        }
    }
    
    @Command
    fun listSavedNetworks(invoke: Invoke) {
        scope.launch {
            try {
                Log.d(TAG, "Listing saved networks")
                
                // Note: getConfiguredNetworks() is deprecated and returns empty on Android 10+
                // for non-system apps. We'll return what we can.
                @Suppress("DEPRECATION")
                val configuredNetworks = wifiManager.configuredNetworks
                
                val networks = JSArray()
                
                if (configuredNetworks != null) {
                    for (network in configuredNetworks) {
                        val net = JSObject()
                        net.put("ssid", network.SSID.replace("\"", ""))
                        net.put("networkId", network.networkId)
                        networks.put(net)
                    }
                }
                
                val ret = JSObject()
                ret.put("networks", networks)
                invoke.resolve(ret)
                
            } catch (e: SecurityException) {
                Log.w(TAG, "Cannot list saved networks - permission denied or Android 10+ restriction")
                val ret = JSObject()
                ret.put("networks", JSArray())
                invoke.resolve(ret)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to list saved networks", e)
                invoke.reject(e.message ?: "Unknown error")
            }
        }
    }
    
    @Command
    fun checkPermissions(invoke: Invoke) {
        try {
            val ret = JSObject()
            
            val locationGranted = ContextCompat.checkSelfPermission(
                activity, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
            
            val wifiStateGranted = ContextCompat.checkSelfPermission(
                activity, Manifest.permission.ACCESS_WIFI_STATE
            ) == PackageManager.PERMISSION_GRANTED
            
            ret.put("location", if (locationGranted) "granted" else "denied")
            ret.put("wifiState", if (wifiStateGranted) "granted" else "denied")
            
            invoke.resolve(ret)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check permissions", e)
            invoke.reject(e.message ?: "Unknown error")
        }
    }
    
    @Command
    fun requestPermissions(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(RequestPermissionsArgs::class.java)
            
            val permissionsToRequest = mutableListOf<String>()
            
            for (perm in args.permissions) {
                when (perm) {
                    "location" -> {
                        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_FINE_LOCATION)
                            != PackageManager.PERMISSION_GRANTED) {
                            permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION)
                        }
                    }
                    "wifiState" -> {
                        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_WIFI_STATE)
                            != PackageManager.PERMISSION_GRANTED) {
                            permissionsToRequest.add(Manifest.permission.ACCESS_WIFI_STATE)
                        }
                    }
                }
            }
            
            if (permissionsToRequest.isNotEmpty()) {
                // Request permissions - the result will come through onActivityResult
                // For now, we'll just return current status
                Log.d(TAG, "Requesting permissions: $permissionsToRequest")
            }
            
            // Return current status
            checkPermissions(invoke)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to request permissions", e)
            invoke.reject(e.message ?: "Unknown error")
        }
    }
    
    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            activity, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(
            activity, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    @Suppress("DEPRECATION")
    private fun getWifiInfo(): WifiInfo? {
        // Check if Wi-Fi is enabled
        if (!wifiManager.isWifiEnabled) {
            return null
        }
        
        // For Android 12+, use NetworkCapabilities
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val network = connectivityManager.activeNetwork ?: return null
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return null
            
            if (!capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                return null
            }
        }
        
        val wifiInfo = wifiManager.connectionInfo
        
        // Check if actually connected (SSID will be <unknown ssid> if not)
        if (wifiInfo?.ssid == null || 
            wifiInfo.ssid == "<unknown ssid>" || 
            wifiInfo.ssid == "0x") {
            return null
        }
        
        return wifiInfo
    }
}
