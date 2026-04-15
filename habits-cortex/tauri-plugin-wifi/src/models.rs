use serde::{Deserialize, Serialize};

/// Information about the current Wi-Fi network
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInfo {
    /// Network SSID (name)
    pub ssid: String,
    /// BSSID (MAC address of access point)
    pub bssid: Option<String>,
    /// Signal strength in dBm
    pub signal_strength: Option<i32>,
    /// Signal level (0-4)
    pub signal_level: Option<i32>,
    /// Frequency in MHz
    pub frequency: Option<i32>,
    /// Whether this is a 5GHz network
    pub is_5ghz: Option<bool>,
    /// Link speed in Mbps
    pub link_speed: Option<i32>,
    /// IP address
    pub ip_address: Option<String>,
}

/// Response containing current network info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetCurrentNetworkResponse {
    /// Whether connected to a Wi-Fi network
    pub connected: bool,
    /// Network info (if connected)
    pub network: Option<NetworkInfo>,
}

/// Request to check connection to specific SSID
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IsConnectedRequest {
    /// Optional SSID to check (if None, just checks if connected to any network)
    pub ssid: Option<String>,
}

/// Response for connectivity check
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IsConnectedResponse {
    /// Whether connected
    pub connected: bool,
    /// Current SSID (if connected)
    pub current_ssid: Option<String>,
    /// Whether connected to the requested SSID (if SSID was specified)
    pub matches_requested: Option<bool>,
}

/// A saved Wi-Fi network
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedNetwork {
    /// Network SSID
    pub ssid: String,
    /// Network ID (Android-specific)
    pub network_id: Option<i32>,
}

/// Response containing saved networks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSavedNetworksResponse {
    /// List of saved networks
    pub networks: Vec<SavedNetwork>,
}

/// Permission status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionStatus {
    /// Location permission (required for Wi-Fi SSID access on both platforms)
    pub location: String,
    /// Wi-Fi state permission (Android-specific)
    pub wifi_state: Option<String>,
}

/// Request to request permissions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestPermissionsRequest {
    /// Permissions to request
    pub permissions: Vec<String>,
}
