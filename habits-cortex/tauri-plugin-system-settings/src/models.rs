use serde::{Deserialize, Serialize};

/// Volume stream types for Android
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VolumeStream {
    /// Music, video, games
    Media,
    /// Ringtone
    Ring,
    /// Alarm
    Alarm,
    /// Notification
    Notification,
    /// Voice calls
    Voice,
    /// System sounds
    System,
}

impl Default for VolumeStream {
    fn default() -> Self {
        VolumeStream::Media
    }
}

/// Arguments for getting volume
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeStreamArgs {
    #[serde(default)]
    pub stream: VolumeStream,
}

/// Volume information returned by get_volume
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeInfo {
    /// Current volume level (0.0 to 1.0)
    pub level: f32,
    /// Whether the stream is muted
    pub muted: bool,
    /// Maximum volume value (platform specific)
    pub max: i32,
    /// Current raw volume value
    pub current: i32,
}

/// Arguments for setting volume
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetVolumeArgs {
    /// Volume level from 0.0 to 1.0
    pub level: f32,
    #[serde(default)]
    pub stream: VolumeStream,
    /// Whether to show volume UI (Android only)
    #[serde(default)]
    pub show_ui: bool,
}

/// Arguments for setting mute state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetMuteArgs {
    pub mute: bool,
    #[serde(default)]
    pub stream: VolumeStream,
}

/// Ringer mode values for Android
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RingerMode {
    /// Ringer on - sound enabled
    Normal,
    /// Ringer off - vibrate only
    Vibrate,
    /// Silent - no sound or vibrate
    Silent,
}

/// Ringer mode information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RingerModeInfo {
    pub mode: RingerMode,
}

/// Arguments for setting ringer mode
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetRingerModeArgs {
    pub mode: RingerMode,
}

/// Bluetooth adapter state
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BluetoothAdapterState {
    Off,
    TurningOn,
    On,
    TurningOff,
    Unsupported,
    Unauthorized,
}

/// Bluetooth state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BluetoothState {
    pub state: BluetoothAdapterState,
    pub enabled: bool,
}

/// Arguments for setting Bluetooth state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetBluetoothArgs {
    pub enabled: bool,
}

/// Do Not Disturb state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DndState {
    /// Whether DND is enabled
    pub enabled: bool,
    /// Whether the app has permission to change DND settings
    pub has_permission: bool,
}

/// Arguments for setting DND state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetDndArgs {
    pub enabled: bool,
}
