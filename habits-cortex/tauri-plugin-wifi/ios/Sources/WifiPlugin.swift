import CoreLocation
import Network
import NetworkExtension
import SystemConfiguration.CaptiveNetwork
import Tauri
import UIKit

// MARK: - Argument Classes

class IsConnectedArgs: Decodable {
    var ssid: String?
}

class RequestPermissionsArgs: Decodable {
    var permissions: [String]?
}

// MARK: - Wi-Fi Plugin

class WifiPlugin: Plugin, CLLocationManagerDelegate {
    
    private var locationManager: CLLocationManager?
    private var pendingPermissionInvoke: Invoke?
    
    override init() {
        super.init()
    }
    
    @objc public func getCurrentNetwork(_ invoke: Invoke) {
        // On iOS, we need location permission to access Wi-Fi SSID
        guard checkLocationPermission() else {
            invoke.resolve([
                "connected": false,
                "error": "Location permission required to access Wi-Fi info on iOS"
            ])
            return
        }
        
        if let networkInfo = getWifiInfo() {
            invoke.resolve([
                "connected": true,
                "network": [
                    "ssid": networkInfo.ssid,
                    "bssid": networkInfo.bssid ?? NSNull(),
                    "signalStrength": NSNull(), // Not available on iOS
                    "signalLevel": NSNull(),
                    "frequency": NSNull(),
                    "is5ghz": NSNull(),
                    "linkSpeed": NSNull(),
                    "ipAddress": getIPAddress() ?? NSNull()
                ]
            ])
        } else {
            invoke.resolve([
                "connected": false
            ])
        }
    }
    
    @objc public func isConnected(_ invoke: Invoke) {
        do {
            let args = try invoke.parseArgs(IsConnectedArgs.self)
            
            guard checkLocationPermission() else {
                invoke.resolve([
                    "connected": false,
                    "error": "Location permission required"
                ])
                return
            }
            
            if let networkInfo = getWifiInfo() {
                var response: [String: Any] = [
                    "connected": true,
                    "currentSsid": networkInfo.ssid
                ]
                
                if let targetSsid = args.ssid {
                    response["matchesRequested"] = networkInfo.ssid == targetSsid
                }
                
                invoke.resolve(response)
            } else {
                invoke.resolve([
                    "connected": false
                ])
            }
            
        } catch {
            invoke.reject("Failed to parse arguments: \(error.localizedDescription)")
        }
    }
    
    @objc public func listSavedNetworks(_ invoke: Invoke) {
        // iOS does not provide API to list saved networks for privacy reasons
        invoke.resolve([
            "networks": []
        ])
    }
    
    @objc public func checkPermissions(_ invoke: Invoke) {
        let locationStatus = CLLocationManager.authorizationStatus()
        
        let locationPermission: String
        switch locationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            locationPermission = "granted"
        case .denied, .restricted:
            locationPermission = "denied"
        case .notDetermined:
            locationPermission = "prompt"
        @unknown default:
            locationPermission = "denied"
        }
        
        invoke.resolve([
            "location": locationPermission,
            "wifiState": "granted" // Always available on iOS
        ])
    }
    
    @objc public func requestPermissions(_ invoke: Invoke) {
        self.pendingPermissionInvoke = invoke
        
        if locationManager == nil {
            locationManager = CLLocationManager()
            locationManager?.delegate = self
        }
        
        let status = CLLocationManager.authorizationStatus()
        
        if status == .notDetermined {
            locationManager?.requestWhenInUseAuthorization()
            // Will continue in delegate callback
        } else {
            // Already determined, return current status
            returnPermissionStatus(invoke)
        }
    }
    
    // MARK: - CLLocationManagerDelegate
    
    public func locationManager(
        _ manager: CLLocationManager,
        didChangeAuthorization status: CLAuthorizationStatus
    ) {
        if let invoke = pendingPermissionInvoke {
            returnPermissionStatus(invoke)
            pendingPermissionInvoke = nil
        }
    }
    
    // MARK: - Private Helpers
    
    private func checkLocationPermission() -> Bool {
        let status = CLLocationManager.authorizationStatus()
        return status == .authorizedAlways || status == .authorizedWhenInUse
    }
    
    private func returnPermissionStatus(_ invoke: Invoke) {
        let locationStatus = CLLocationManager.authorizationStatus()
        
        let locationPermission: String
        switch locationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            locationPermission = "granted"
        case .denied, .restricted:
            locationPermission = "denied"
        case .notDetermined:
            locationPermission = "prompt"
        @unknown default:
            locationPermission = "denied"
        }
        
        invoke.resolve([
            "location": locationPermission,
            "wifiState": "granted"
        ])
    }
    
    private struct WifiInfo {
        let ssid: String
        let bssid: String?
    }
    
    private func getWifiInfo() -> WifiInfo? {
        // iOS 14+ requires specific entitlements to access Wi-Fi info
        // Without the entitlement, this will return nil
        
        var ssid: String?
        var bssid: String?
        
        if let interfaces = CNCopySupportedInterfaces() as? [String] {
            for interface in interfaces {
                if let interfaceInfo = CNCopyCurrentNetworkInfo(interface as CFString) as NSDictionary? {
                    ssid = interfaceInfo[kCNNetworkInfoKeySSID as String] as? String
                    bssid = interfaceInfo[kCNNetworkInfoKeyBSSID as String] as? String
                    break
                }
            }
        }
        
        guard let unwrappedSsid = ssid, !unwrappedSsid.isEmpty else {
            return nil
        }
        
        return WifiInfo(ssid: unwrappedSsid, bssid: bssid)
    }
    
    private func getIPAddress() -> String? {
        var address: String?
        
        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0 else { return nil }
        guard let firstAddr = ifaddr else { return nil }
        
        for ifptr in sequence(first: firstAddr, next: { $0.pointee.ifa_next }) {
            let interface = ifptr.pointee
            
            // Check for IPv4 interface
            let addrFamily = interface.ifa_addr.pointee.sa_family
            if addrFamily == UInt8(AF_INET) {
                // Check if it's en0 (Wi-Fi interface)
                let name = String(cString: interface.ifa_name)
                if name == "en0" {
                    var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                    getnameinfo(
                        interface.ifa_addr,
                        socklen_t(interface.ifa_addr.pointee.sa_len),
                        &hostname,
                        socklen_t(hostname.count),
                        nil,
                        0,
                        NI_NUMERICHOST
                    )
                    address = String(cString: hostname)
                }
            }
        }
        
        freeifaddrs(ifaddr)
        return address
    }
}

@_cdecl("init_plugin_wifi")
func initPlugin() -> Plugin {
    return WifiPlugin()
}
