package com.plugin.matter

import android.app.Activity
import android.util.Log
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.gms.home.matter.Matter
import com.google.android.gms.home.matter.commissioning.CommissioningRequest
import com.google.android.gms.home.matter.commissioning.CommissioningResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.concurrent.ConcurrentHashMap

@InvokeArg
class DiscoverArgs {
    var timeout: Int = 10
}

@InvokeArg
class SetOnOffArgs {
    var deviceId: String = ""
    var on: Boolean = false
}

@InvokeArg
class SetLevelArgs {
    var deviceId: String = ""
    var level: Int = 100
    var transitionTime: Float? = null
}

@InvokeArg
class SetColorArgs {
    var deviceId: String = ""
    var hue: Int? = null
    var saturation: Int? = null
    var colorTemperature: Int? = null
    var transitionTime: Float? = null
}

@InvokeArg
class CommissionArgs {
    var pairingCode: String = ""
    var name: String? = null
}

@InvokeArg
class DeviceIdArgs {
    var deviceId: String = ""
}

/**
 * Matter smart home plugin for Android.
 * 
 * This plugin uses Google Play Services Home API for Matter device control.
 * Note: Full Matter support requires:
 * 1. Google Play Services 
 * 2. Device running Android 8.1 (API 27) or higher
 * 3. Google Home app installed and configured
 */
@TauriPlugin
class MatterPlugin(private val activity: Activity) : Plugin(activity) {
    
    companion object {
        private const val TAG = "MatterPlugin"
        private const val COMMISSION_REQUEST_CODE = 2001
    }
    
    private val scope = CoroutineScope(Dispatchers.Main)
    
    // In-memory device cache (in production, this would be persisted)
    private val deviceCache = ConcurrentHashMap<String, JSObject>()
    
    // Pending commission invoke
    private var pendingCommissionInvoke: Invoke? = null

    @Command
    fun discover_devices(invoke: Invoke) {
        val args = invoke.parseArgs(DiscoverArgs::class.java)
        
        scope.launch {
            try {
                // Note: Matter device discovery happens through Google Home
                // The app needs to be a Matter commissioner to discover devices
                // For now, we return cached/known devices
                
                val devices = JSArray()
                deviceCache.values.forEach { device ->
                    devices.put(device)
                }
                
                invoke.resolve(devices)
            } catch (e: Exception) {
                Log.e(TAG, "Discovery failed", e)
                invoke.reject("Discovery failed: ${e.message}")
            }
        }
    }

    @Command
    fun get_devices(invoke: Invoke) {
        try {
            val devices = JSArray()
            deviceCache.values.forEach { device ->
                devices.put(device)
            }
            invoke.resolve(devices)
        } catch (e: Exception) {
            invoke.reject("Failed to get devices: ${e.message}")
        }
    }

    @Command
    fun get_device_state(invoke: Invoke) {
        val args = invoke.parseArgs(DeviceIdArgs::class.java)
        
        try {
            val device = deviceCache[args.deviceId]
            if (device == null) {
                invoke.reject("Device not found: ${args.deviceId}")
                return
            }
            
            // Return current known state
            val state = JSObject()
            state.put("id", args.deviceId)
            state.put("online", device.optBoolean("online", true))
            
            // Include current state values if available
            if (device.has("on")) state.put("on", device.getBoolean("on"))
            if (device.has("level")) state.put("level", device.getInt("level"))
            if (device.has("hue")) state.put("hue", device.getInt("hue"))
            if (device.has("saturation")) state.put("saturation", device.getInt("saturation"))
            if (device.has("colorTemperature")) state.put("colorTemperature", device.getInt("colorTemperature"))
            
            invoke.resolve(state)
        } catch (e: Exception) {
            invoke.reject("Failed to get device state: ${e.message}")
        }
    }

    @Command
    fun set_on_off(invoke: Invoke) {
        val args = invoke.parseArgs(SetOnOffArgs::class.java)
        
        scope.launch {
            try {
                val device = deviceCache[args.deviceId]
                if (device == null) {
                    invoke.reject("Device not found: ${args.deviceId}")
                    return@launch
                }
                
                // Update state
                device.put("on", args.on)
                deviceCache[args.deviceId] = device
                
                // In production, this would send the command to the actual device
                // via Matter protocol through Google Home APIs
                Log.i(TAG, "Set ${args.deviceId} on=${args.on}")
                
                invoke.resolve()
            } catch (e: Exception) {
                invoke.reject("Failed to set on/off: ${e.message}")
            }
        }
    }

    @Command
    fun set_level(invoke: Invoke) {
        val args = invoke.parseArgs(SetLevelArgs::class.java)
        
        scope.launch {
            try {
                val device = deviceCache[args.deviceId]
                if (device == null) {
                    invoke.reject("Device not found: ${args.deviceId}")
                    return@launch
                }
                
                val level = args.level.coerceIn(0, 100)
                device.put("level", level)
                
                // If level > 0, also set on = true
                if (level > 0) {
                    device.put("on", true)
                }
                
                deviceCache[args.deviceId] = device
                Log.i(TAG, "Set ${args.deviceId} level=$level")
                
                invoke.resolve()
            } catch (e: Exception) {
                invoke.reject("Failed to set level: ${e.message}")
            }
        }
    }

    @Command
    fun set_color(invoke: Invoke) {
        val args = invoke.parseArgs(SetColorArgs::class.java)
        
        scope.launch {
            try {
                val device = deviceCache[args.deviceId]
                if (device == null) {
                    invoke.reject("Device not found: ${args.deviceId}")
                    return@launch
                }
                
                args.hue?.let { device.put("hue", it.coerceIn(0, 360)) }
                args.saturation?.let { device.put("saturation", it.coerceIn(0, 100)) }
                args.colorTemperature?.let { device.put("colorTemperature", it.coerceIn(2000, 6500)) }
                
                deviceCache[args.deviceId] = device
                Log.i(TAG, "Set ${args.deviceId} color hue=${args.hue} sat=${args.saturation} temp=${args.colorTemperature}")
                
                invoke.resolve()
            } catch (e: Exception) {
                invoke.reject("Failed to set color: ${e.message}")
            }
        }
    }

    @Command
    fun commission_device(invoke: Invoke) {
        val args = invoke.parseArgs(CommissionArgs::class.java)
        
        scope.launch {
            try {
                // Use Google Play Services Matter commissioning
                val commissioningClient = Matter.getCommissioningClient(activity)
                
                val request = CommissioningRequest.builder()
                    .setCommissioningService(activity.packageName)
                    .build()
                
                // This will launch the commissioning flow
                pendingCommissionInvoke = invoke
                
                val intentSender = commissioningClient.commissionDevice(request).await()
                activity.startIntentSenderForResult(
                    intentSender,
                    COMMISSION_REQUEST_CODE,
                    null,
                    0,
                    0,
                    0
                )
                
            } catch (e: Exception) {
                Log.e(TAG, "Commission failed", e)
                pendingCommissionInvoke = null
                invoke.reject("Commission failed: ${e.message}")
            }
        }
    }
    
    // Called from activity when commissioning result is received
    fun handleCommissioningResult(success: Boolean, deviceId: String?, deviceName: String?) {
        val invoke = pendingCommissionInvoke ?: return
        pendingCommissionInvoke = null
        
        if (success && deviceId != null) {
            // Add to cache
            val device = JSObject()
            device.put("id", deviceId)
            device.put("name", deviceName ?: "Matter Device")
            device.put("deviceType", "light")  // Default type
            device.put("online", true)
            
            val capabilities = JSArray()
            capabilities.put("on_off")
            capabilities.put("level_control")
            device.put("capabilities", capabilities)
            
            deviceCache[deviceId] = device
            invoke.resolve(device)
        } else {
            invoke.reject("Commissioning was cancelled or failed")
        }
    }

    @Command
    fun remove_device(invoke: Invoke) {
        val args = invoke.parseArgs(DeviceIdArgs::class.java)
        
        try {
            if (deviceCache.remove(args.deviceId) != null) {
                invoke.resolve()
            } else {
                invoke.reject("Device not found: ${args.deviceId}")
            }
        } catch (e: Exception) {
            invoke.reject("Failed to remove device: ${e.message}")
        }
    }
}
