package com.plugin.system_settings

import android.Manifest
import android.app.Activity
import android.app.NotificationManager
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class VolumeStreamArgs {
    var stream: String = "media"
}

@InvokeArg
class SetVolumeArgs {
    var level: Float = 0.5f
    var stream: String = "media"
    var showUi: Boolean = false
}

@InvokeArg
class SetMuteArgs {
    var mute: Boolean = false
    var stream: String = "media"
}

@InvokeArg
class SetRingerModeArgs {
    var mode: String = "normal"
}

@InvokeArg
class SetBluetoothArgs {
    var enabled: Boolean = false
}

@InvokeArg
class SetDndArgs {
    var enabled: Boolean = false
}

@TauriPlugin
class SystemSettingsPlugin(private val activity: Activity) : Plugin(activity) {

    private val audioManager: AudioManager by lazy {
        activity.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    }

    private val bluetoothManager: BluetoothManager? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            activity.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        } else {
            null
        }
    }

    private val notificationManager: NotificationManager by lazy {
        activity.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }

    private fun getStreamType(stream: String): Int {
        return when (stream.lowercase()) {
            "media" -> AudioManager.STREAM_MUSIC
            "ring" -> AudioManager.STREAM_RING
            "alarm" -> AudioManager.STREAM_ALARM
            "notification" -> AudioManager.STREAM_NOTIFICATION
            "voice" -> AudioManager.STREAM_VOICE_CALL
            "system" -> AudioManager.STREAM_SYSTEM
            else -> AudioManager.STREAM_MUSIC
        }
    }

    @Command
    fun get_volume(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(VolumeStreamArgs::class.java)
            val streamType = getStreamType(args.stream)
            val current = audioManager.getStreamVolume(streamType)
            val max = audioManager.getStreamMaxVolume(streamType)
            val level = if (max > 0) current.toFloat() / max else 0f
            val muted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                audioManager.isStreamMute(streamType)
            } else {
                current == 0
            }

            val result = JSObject()
            result.put("level", level)
            result.put("muted", muted)
            result.put("max", max)
            result.put("current", current)
            invoke.resolve(result)
        } catch (e: Exception) {
            invoke.reject("Failed to get volume: ${e.message}")
        }
    }

    @Command
    fun set_volume(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SetVolumeArgs::class.java)
            val streamType = getStreamType(args.stream)
            val max = audioManager.getStreamMaxVolume(streamType)
            val newVolume = (args.level.coerceIn(0f, 1f) * max).toInt()
            val flags = if (args.showUi) AudioManager.FLAG_SHOW_UI else 0

            audioManager.setStreamVolume(streamType, newVolume, flags)
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject("Failed to set volume: ${e.message}")
        }
    }

    @Command
    fun set_mute(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SetMuteArgs::class.java)
            val streamType = getStreamType(args.stream)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                audioManager.adjustStreamVolume(
                    streamType,
                    if (args.mute) AudioManager.ADJUST_MUTE else AudioManager.ADJUST_UNMUTE,
                    0
                )
            } else {
                @Suppress("DEPRECATION")
                audioManager.setStreamMute(streamType, args.mute)
            }
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject("Failed to set mute: ${e.message}")
        }
    }

    @Command
    fun get_ringer_mode(invoke: Invoke) {
        try {
            val mode = when (audioManager.ringerMode) {
                AudioManager.RINGER_MODE_NORMAL -> "normal"
                AudioManager.RINGER_MODE_VIBRATE -> "vibrate"
                AudioManager.RINGER_MODE_SILENT -> "silent"
                else -> "normal"
            }

            val result = JSObject()
            result.put("mode", mode)
            invoke.resolve(result)
        } catch (e: Exception) {
            invoke.reject("Failed to get ringer mode: ${e.message}")
        }
    }

    @Command
    fun set_ringer_mode(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SetRingerModeArgs::class.java)

            // Check for DND access permission if setting to silent or vibrate
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N &&
                args.mode.lowercase() in listOf("silent", "vibrate")
            ) {
                if (!notificationManager.isNotificationPolicyAccessGranted) {
                    // Open settings to grant DND access
                    val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                    activity.startActivity(intent)
                    invoke.reject("DND access required. Please grant permission and try again.")
                    return
                }
            }

            val mode = when (args.mode.lowercase()) {
                "normal" -> AudioManager.RINGER_MODE_NORMAL
                "vibrate" -> AudioManager.RINGER_MODE_VIBRATE
                "silent" -> AudioManager.RINGER_MODE_SILENT
                else -> AudioManager.RINGER_MODE_NORMAL
            }

            audioManager.ringerMode = mode
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject("Failed to set ringer mode: ${e.message}")
        }
    }

    @Command
    fun get_bluetooth_state(invoke: Invoke) {
        try {
            val adapter = bluetoothManager?.adapter ?: BluetoothAdapter.getDefaultAdapter()

            if (adapter == null) {
                val result = JSObject()
                result.put("state", "unsupported")
                result.put("enabled", false)
                invoke.resolve(result)
                return
            }

            val state = when (adapter.state) {
                BluetoothAdapter.STATE_OFF -> "off"
                BluetoothAdapter.STATE_TURNING_ON -> "turning_on"
                BluetoothAdapter.STATE_ON -> "on"
                BluetoothAdapter.STATE_TURNING_OFF -> "turning_off"
                else -> "off"
            }

            val result = JSObject()
            result.put("state", state)
            result.put("enabled", adapter.isEnabled)
            invoke.resolve(result)
        } catch (e: Exception) {
            invoke.reject("Failed to get Bluetooth state: ${e.message}")
        }
    }

    @Command
    fun set_bluetooth(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SetBluetoothArgs::class.java)
            val adapter = bluetoothManager?.adapter ?: BluetoothAdapter.getDefaultAdapter()

            if (adapter == null) {
                invoke.reject("Bluetooth not supported on this device")
                return
            }

            // Check permissions for Android 12+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (ContextCompat.checkSelfPermission(
                        activity,
                        Manifest.permission.BLUETOOTH_CONNECT
                    ) != PackageManager.PERMISSION_GRANTED
                ) {
                    ActivityCompat.requestPermissions(
                        activity,
                        arrayOf(Manifest.permission.BLUETOOTH_CONNECT),
                        1001
                    )
                    invoke.reject("Bluetooth permission required")
                    return
                }
            }

            // Note: Direct enable/disable is deprecated in Android 13+
            // For newer versions, we need to open Bluetooth settings
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                activity.startActivity(intent)
                invoke.reject("Cannot directly control Bluetooth on Android 13+. Opening settings.")
                return
            }

            @Suppress("DEPRECATION")
            val success = if (args.enabled) {
                adapter.enable()
            } else {
                adapter.disable()
            }

            if (success) {
                invoke.resolve()
            } else {
                invoke.reject("Failed to ${if (args.enabled) "enable" else "disable"} Bluetooth")
            }
        } catch (e: SecurityException) {
            invoke.reject("Bluetooth permission denied: ${e.message}")
        } catch (e: Exception) {
            invoke.reject("Failed to set Bluetooth state: ${e.message}")
        }
    }

    @Command
    fun get_dnd_state(invoke: Invoke) {
        try {
            val hasPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                notificationManager.isNotificationPolicyAccessGranted
            } else {
                true
            }

            val enabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val filter = notificationManager.currentInterruptionFilter
                filter != NotificationManager.INTERRUPTION_FILTER_ALL
            } else {
                false
            }

            val result = JSObject()
            result.put("enabled", enabled)
            result.put("has_permission", hasPermission)
            invoke.resolve(result)
        } catch (e: Exception) {
            invoke.reject("Failed to get DND state: ${e.message}")
        }
    }

    @Command
    fun set_dnd(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SetDndArgs::class.java)

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                invoke.reject("DND not supported on Android < 6.0")
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N &&
                !notificationManager.isNotificationPolicyAccessGranted
            ) {
                // Open settings to grant access
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                activity.startActivity(intent)
                invoke.reject("DND access required. Please grant permission and try again.")
                return
            }

            val filter = if (args.enabled) {
                NotificationManager.INTERRUPTION_FILTER_PRIORITY
            } else {
                NotificationManager.INTERRUPTION_FILTER_ALL
            }

            notificationManager.setInterruptionFilter(filter)
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject("Failed to set DND state: ${e.message}")
        }
    }
}
