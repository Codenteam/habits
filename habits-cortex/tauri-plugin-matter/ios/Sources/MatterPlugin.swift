import HomeKit
import Tauri
import UIKit

/// Arguments for discover and other operations
struct DiscoverArgs: Decodable {
    let timeout: Int?
}

struct SetOnOffArgs: Decodable {
    let deviceId: String
    let on: Bool
}

struct SetLevelArgs: Decodable {
    let deviceId: String
    let level: Int
    let transitionTime: Float?
}

struct SetColorArgs: Decodable {
    let deviceId: String
    let hue: Int?
    let saturation: Int?
    let colorTemperature: Int?
    let transitionTime: Float?
}

struct CommissionArgs: Decodable {
    let pairingCode: String
    let name: String?
}

struct DeviceIdArgs: Decodable {
    let deviceId: String
}

/**
 * Matter smart home plugin for iOS using HomeKit.
 * 
 * On iOS, Matter devices are managed through HomeKit, which provides
 * native Matter support starting from iOS 15 and enhanced in iOS 16+.
 */
class MatterPlugin: Plugin, HMHomeManagerDelegate {
    private var homeManager: HMHomeManager?
    private var primaryHome: HMHome?
    
    // Map of device ID to HMAccessory UUID
    private var deviceMap: [String: UUID] = [:]
    
    override init() {
        super.init()
        setupHomeKit()
    }
    
    private func setupHomeKit() {
        homeManager = HMHomeManager()
        homeManager?.delegate = self
    }
    
    // MARK: - HMHomeManagerDelegate
    
    func homeManagerDidUpdateHomes(_ manager: HMHomeManager) {
        primaryHome = manager.primaryHome ?? manager.homes.first
        
        // Build device map from accessories
        if let home = primaryHome {
            for accessory in home.accessories {
                let deviceId = accessory.uniqueIdentifier.uuidString
                deviceMap[deviceId] = accessory.uniqueIdentifier
            }
        }
    }
    
    // MARK: - Helper methods
    
    private func findAccessory(deviceId: String) -> HMAccessory? {
        guard let home = primaryHome else { return nil }
        
        // Try to find by UUID
        if let uuid = UUID(uuidString: deviceId) {
            return home.accessories.first { $0.uniqueIdentifier == uuid }
        }
        
        // Fall back to name matching
        return home.accessories.first { $0.name == deviceId }
    }
    
    private func accessoryToJson(_ accessory: HMAccessory) -> [String: Any] {
        var capabilities: [String] = []
        var deviceType = "unknown"
        
        for service in accessory.services {
            switch service.serviceType {
            case HMServiceTypeLightbulb:
                deviceType = "light"
                capabilities.append("on_off")
                
                // Check for brightness
                if service.characteristics.contains(where: { $0.characteristicType == HMCharacteristicTypeBrightness }) {
                    capabilities.append("level_control")
                }
                
                // Check for color
                if service.characteristics.contains(where: { $0.characteristicType == HMCharacteristicTypeHue }) {
                    capabilities.append("color_control")
                }
                
            case HMServiceTypeSwitch:
                deviceType = "switch"
                capabilities.append("on_off")
                
            case HMServiceTypeOutlet:
                deviceType = "outlet"
                capabilities.append("on_off")
                
            case HMServiceTypeThermostat:
                deviceType = "thermostat"
                capabilities.append("temperature_control")
                
            case HMServiceTypeLockMechanism:
                deviceType = "door_lock"
                capabilities.append("door_lock")
                
            case HMServiceTypeFan:
                deviceType = "fan"
                capabilities.append("on_off")
                
            default:
                break
            }
        }
        
        return [
            "id": accessory.uniqueIdentifier.uuidString,
            "name": accessory.name,
            "deviceType": deviceType,
            "online": accessory.isReachable,
            "capabilities": capabilities
        ]
    }
    
    private func getCharacteristic(accessory: HMAccessory, type: String) -> HMCharacteristic? {
        for service in accessory.services {
            if let char = service.characteristics.first(where: { $0.characteristicType == type }) {
                return char
            }
        }
        return nil
    }
    
    // MARK: - Commands
    
    @objc public func discover_devices(_ invoke: Invoke) throws {
        guard let home = primaryHome else {
            invoke.resolve([])
            return
        }
        
        var devices: [[String: Any]] = []
        for accessory in home.accessories {
            devices.append(accessoryToJson(accessory))
        }
        
        invoke.resolve(devices)
    }
    
    @objc public func get_devices(_ invoke: Invoke) throws {
        guard let home = primaryHome else {
            invoke.resolve([])
            return
        }
        
        var devices: [[String: Any]] = []
        for accessory in home.accessories {
            devices.append(accessoryToJson(accessory))
        }
        
        invoke.resolve(devices)
    }
    
    @objc public func get_device_state(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(DeviceIdArgs.self)
        
        guard let accessory = findAccessory(deviceId: args.deviceId) else {
            invoke.reject("Device not found: \(args.deviceId)")
            return
        }
        
        var state: [String: Any] = [
            "id": accessory.uniqueIdentifier.uuidString,
            "online": accessory.isReachable
        ]
        
        // Read current characteristics
        if let powerChar = getCharacteristic(accessory: accessory, type: HMCharacteristicTypePowerState) {
            powerChar.readValue { error in
                if error == nil, let value = powerChar.value as? Bool {
                    state["on"] = value
                }
            }
        }
        
        if let brightnessChar = getCharacteristic(accessory: accessory, type: HMCharacteristicTypeBrightness) {
            brightnessChar.readValue { error in
                if error == nil, let value = brightnessChar.value as? Int {
                    state["level"] = value
                }
            }
        }
        
        if let hueChar = getCharacteristic(accessory: accessory, type: HMCharacteristicTypeHue) {
            hueChar.readValue { error in
                if error == nil, let value = hueChar.value as? Float {
                    state["hue"] = Int(value)
                }
            }
        }
        
        if let satChar = getCharacteristic(accessory: accessory, type: HMCharacteristicTypeSaturation) {
            satChar.readValue { error in
                if error == nil, let value = satChar.value as? Float {
                    state["saturation"] = Int(value)
                }
            }
        }
        
        // Give time for async reads
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            invoke.resolve(state)
        }
    }
    
    @objc public func set_on_off(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(SetOnOffArgs.self)
        
        guard let accessory = findAccessory(deviceId: args.deviceId) else {
            invoke.reject("Device not found: \(args.deviceId)")
            return
        }
        
        guard let powerChar = getCharacteristic(accessory: accessory, type: HMCharacteristicTypePowerState) else {
            invoke.reject("Device does not support on/off")
            return
        }
        
        powerChar.writeValue(args.on) { error in
            if let error = error {
                invoke.reject("Failed to set power: \(error.localizedDescription)")
            } else {
                invoke.resolve()
            }
        }
    }
    
    @objc public func set_level(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(SetLevelArgs.self)
        
        guard let accessory = findAccessory(deviceId: args.deviceId) else {
            invoke.reject("Device not found: \(args.deviceId)")
            return
        }
        
        guard let brightnessChar = getCharacteristic(accessory: accessory, type: HMCharacteristicTypeBrightness) else {
            invoke.reject("Device does not support brightness")
            return
        }
        
        let level = min(100, max(0, args.level))
        
        brightnessChar.writeValue(level) { error in
            if let error = error {
                invoke.reject("Failed to set brightness: \(error.localizedDescription)")
            } else {
                invoke.resolve()
            }
        }
    }
    
    @objc public func set_color(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(SetColorArgs.self)
        
        guard let accessory = findAccessory(deviceId: args.deviceId) else {
            invoke.reject("Device not found: \(args.deviceId)")
            return
        }
        
        var writeErrors: [String] = []
        let group = DispatchGroup()
        
        if let hue = args.hue {
            if let hueChar = getCharacteristic(accessory: accessory, type: HMCharacteristicTypeHue) {
                group.enter()
                hueChar.writeValue(Float(min(360, max(0, hue)))) { error in
                    if let error = error {
                        writeErrors.append("hue: \(error.localizedDescription)")
                    }
                    group.leave()
                }
            }
        }
        
        if let saturation = args.saturation {
            if let satChar = getCharacteristic(accessory: accessory, type: HMCharacteristicTypeSaturation) {
                group.enter()
                satChar.writeValue(Float(min(100, max(0, saturation)))) { error in
                    if let error = error {
                        writeErrors.append("saturation: \(error.localizedDescription)")
                    }
                    group.leave()
                }
            }
        }
        
        if let colorTemp = args.colorTemperature {
            if let tempChar = getCharacteristic(accessory: accessory, type: HMCharacteristicTypeColorTemperature) {
                group.enter()
                tempChar.writeValue(min(6500, max(2000, colorTemp))) { error in
                    if let error = error {
                        writeErrors.append("colorTemp: \(error.localizedDescription)")
                    }
                    group.leave()
                }
            }
        }
        
        group.notify(queue: .main) {
            if writeErrors.isEmpty {
                invoke.resolve()
            } else {
                invoke.reject("Color set errors: \(writeErrors.joined(separator: ", "))")
            }
        }
    }
    
    @objc public func commission_device(_ invoke: Invoke) throws {
        // On iOS, Matter commissioning is handled through the Home app
        // We can only suggest opening the Home app
        if let url = URL(string: "com.apple.home://") {
            DispatchQueue.main.async {
                UIApplication.shared.open(url)
            }
        }
        invoke.reject("Matter commissioning on iOS must be done through the Home app. Please add the device there first.")
    }
    
    @objc public func remove_device(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(DeviceIdArgs.self)
        
        guard let home = primaryHome,
              let accessory = findAccessory(deviceId: args.deviceId) else {
            invoke.reject("Device not found: \(args.deviceId)")
            return
        }
        
        home.removeAccessory(accessory) { error in
            if let error = error {
                invoke.reject("Failed to remove device: \(error.localizedDescription)")
            } else {
                self.deviceMap.removeValue(forKey: args.deviceId)
                invoke.resolve()
            }
        }
    }
}

@_cdecl("init_plugin_matter")
func initPlugin() -> Plugin {
    return MatterPlugin()
}
