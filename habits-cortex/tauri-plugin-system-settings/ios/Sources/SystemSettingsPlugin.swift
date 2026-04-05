import AVFoundation
import CoreBluetooth
import Tauri
import UIKit
import WebKit

/// Arguments for volume operations
struct VolumeStreamArgs: Decodable {
    let stream: String?
}

struct SetVolumeArgs: Decodable {
    let level: Float
    let stream: String?
    let showUi: Bool?
}

struct SetMuteArgs: Decodable {
    let mute: Bool
    let stream: String?
}

struct SetRingerModeArgs: Decodable {
    let mode: String
}

struct SetBluetoothArgs: Decodable {
    let enabled: Bool
}

struct SetDndArgs: Decodable {
    let enabled: Bool
}

class SystemSettingsPlugin: Plugin, CBCentralManagerDelegate {
    private var bluetoothManager: CBCentralManager?
    private var bluetoothStateCallback: ((String, Bool) -> Void)?
    
    override init() {
        super.init()
        setupBluetoothManager()
    }
    
    private func setupBluetoothManager() {
        bluetoothManager = CBCentralManager(delegate: self, queue: nil, options: [
            CBCentralManagerOptionShowPowerAlertKey: false
        ])
    }
    
    // MARK: - Volume Control
    
    @objc public func get_volume(_ invoke: Invoke) throws {
        // iOS has limited volume control - we can only read and set system volume
        let session = AVAudioSession.sharedInstance()
        
        do {
            try session.setActive(true)
            let level = session.outputVolume
            
            invoke.resolve([
                "level": level,
                "muted": level == 0,
                "max": 1,
                "current": Int(level * 100)
            ])
        } catch {
            invoke.reject("Failed to get volume: \(error.localizedDescription)")
        }
    }
    
    @objc public func set_volume(_ invoke: Invoke) throws {
        // iOS does not allow programmatic volume control for security reasons
        // We can only show the volume HUD or use MPVolumeView
        invoke.reject("iOS does not support programmatic volume control. Use MPVolumeView for UI-based control.")
    }
    
    @objc public func set_mute(_ invoke: Invoke) throws {
        // iOS does not allow programmatic mute control
        invoke.reject("iOS does not support programmatic mute control")
    }
    
    // MARK: - Ringer Mode
    
    @objc public func get_ringer_mode(_ invoke: Invoke) throws {
        // iOS doesn't have a direct API to check ringer mode
        // We can detect it indirectly through audio session
        let session = AVAudioSession.sharedInstance()
        
        // Check if there's no audio route (might indicate silent)
        let currentRoute = session.currentRoute
        let hasOutput = !currentRoute.outputs.isEmpty
        
        // This is a best-effort detection - iOS doesn't expose ringer state
        invoke.resolve([
            "mode": hasOutput ? "normal" : "silent"
        ])
    }
    
    @objc public func set_ringer_mode(_ invoke: Invoke) throws {
        // iOS does not allow programmatic ringer mode control
        invoke.reject("iOS does not support programmatic ringer mode control")
    }
    
    // MARK: - Bluetooth
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        let (state, enabled) = getBluetoothState(from: central.state)
        bluetoothStateCallback?(state, enabled)
    }
    
    private func getBluetoothState(from state: CBManagerState) -> (String, Bool) {
        switch state {
        case .poweredOff:
            return ("off", false)
        case .poweredOn:
            return ("on", true)
        case .resetting:
            return ("turning_on", false)
        case .unauthorized:
            return ("unauthorized", false)
        case .unsupported:
            return ("unsupported", false)
        case .unknown:
            return ("off", false)
        @unknown default:
            return ("off", false)
        }
    }
    
    @objc public func get_bluetooth_state(_ invoke: Invoke) throws {
        guard let manager = bluetoothManager else {
            invoke.resolve([
                "state": "unsupported",
                "enabled": false
            ])
            return
        }
        
        let (state, enabled) = getBluetoothState(from: manager.state)
        invoke.resolve([
            "state": state,
            "enabled": enabled
        ])
    }
    
    @objc public func set_bluetooth(_ invoke: Invoke) throws {
        // iOS does not allow programmatic Bluetooth control
        // We can only check the state and open Settings
        if let url = URL(string: UIApplication.openSettingsURLString) {
            DispatchQueue.main.async {
                UIApplication.shared.open(url)
            }
        }
        invoke.reject("iOS does not support programmatic Bluetooth control. Opening Settings.")
    }
    
    // MARK: - Do Not Disturb
    
    @objc public func get_dnd_state(_ invoke: Invoke) throws {
        // iOS Focus mode (DND) state is not directly accessible
        // We can only detect if notifications are allowed
        invoke.resolve([
            "enabled": false,  // Cannot detect on iOS
            "hasPermission": false  // No API to change DND
        ])
    }
    
    @objc public func set_dnd(_ invoke: Invoke) throws {
        // iOS does not allow programmatic DND control
        invoke.reject("iOS does not support programmatic Do Not Disturb control")
    }
}

@_cdecl("init_plugin_system_settings")
func initPlugin() -> Plugin {
    return SystemSettingsPlugin()
}
