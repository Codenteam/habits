use serde::{Deserialize, Serialize};

/// A Matter device discovered on the network
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatterDevice {
    /// Unique device identifier
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Device type (e.g., "light", "switch", "thermostat")
    pub device_type: DeviceType,
    /// Whether the device is currently reachable
    pub online: bool,
    /// Supported clusters/capabilities
    pub capabilities: Vec<Capability>,
}

/// Device type categories
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeviceType {
    Light,
    Switch,
    Outlet,
    Thermostat,
    DoorLock,
    WindowCovering,
    Fan,
    Sensor,
    Unknown,
}

/// Device capabilities based on Matter clusters
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Capability {
    OnOff,
    LevelControl,
    ColorControl,
    TemperatureControl,
    DoorLock,
    WindowCovering,
}

/// Current state of a device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceState {
    pub id: String,
    pub online: bool,
    /// Whether the device is on (for OnOff capable devices)
    pub on: Option<bool>,
    /// Brightness level 0-100 (for LevelControl capable devices)
    pub level: Option<u8>,
    /// Hue 0-360 (for ColorControl capable devices)
    pub hue: Option<u16>,
    /// Saturation 0-100 (for ColorControl capable devices)
    pub saturation: Option<u8>,
    /// Color temperature in Kelvin (for ColorControl capable devices)
    pub color_temperature: Option<u16>,
}

/// Arguments for discover_devices
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverArgs {
    /// Timeout in seconds for discovery
    #[serde(default = "default_timeout")]
    pub timeout: u32,
}

fn default_timeout() -> u32 {
    10
}

/// Arguments for set_on_off
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetOnOffArgs {
    pub device_id: String,
    pub on: bool,
}

/// Arguments for set_level
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetLevelArgs {
    pub device_id: String,
    /// Brightness level 0-100
    pub level: u8,
    /// Transition time in seconds (optional)
    pub transition_time: Option<f32>,
}

/// Arguments for set_color
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetColorArgs {
    pub device_id: String,
    /// Hue 0-360 (optional)
    pub hue: Option<u16>,
    /// Saturation 0-100 (optional)
    pub saturation: Option<u8>,
    /// Color temperature in Kelvin (optional)
    pub color_temperature: Option<u16>,
    /// Transition time in seconds (optional)
    pub transition_time: Option<f32>,
}

/// Arguments for commissioning a new device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommissionArgs {
    /// QR code payload or manual pairing code
    pub pairing_code: String,
    /// Custom name for the device
    pub name: Option<String>,
}

/// Arguments for device operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceIdArgs {
    pub device_id: String,
}
