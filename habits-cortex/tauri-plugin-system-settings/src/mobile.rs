use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

const PLUGIN_IDENTIFIER: &str = "com.plugin.system_settings";

/// Access to the system-settings APIs.
pub struct SystemSettings<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> SystemSettings<R> {
    pub fn get_volume(&self, args: VolumeStreamArgs) -> crate::Result<VolumeInfo> {
        self.0
            .run_mobile_plugin("get_volume", args)
            .map_err(Into::into)
    }

    pub fn set_volume(&self, args: SetVolumeArgs) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("set_volume", args)
            .map_err(Into::into)
    }

    pub fn set_mute(&self, args: SetMuteArgs) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("set_mute", args)
            .map_err(Into::into)
    }

    pub fn get_ringer_mode(&self) -> crate::Result<RingerModeInfo> {
        self.0
            .run_mobile_plugin("get_ringer_mode", ())
            .map_err(Into::into)
    }

    pub fn set_ringer_mode(&self, args: SetRingerModeArgs) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("set_ringer_mode", args)
            .map_err(Into::into)
    }

    pub fn get_bluetooth_state(&self) -> crate::Result<BluetoothState> {
        self.0
            .run_mobile_plugin("get_bluetooth_state", ())
            .map_err(Into::into)
    }

    pub fn set_bluetooth(&self, args: SetBluetoothArgs) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("set_bluetooth", args)
            .map_err(Into::into)
    }

    pub fn get_dnd_state(&self) -> crate::Result<DndState> {
        self.0
            .run_mobile_plugin("get_dnd_state", ())
            .map_err(Into::into)
    }

    pub fn set_dnd(&self, args: SetDndArgs) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("set_dnd", args)
            .map_err(Into::into)
    }
}

/// Initializes the plugin for mobile platforms.
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<SystemSettings<R>> {
    // Android-only - iOS disabled due to swift-rs targeting bug
    let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "SystemSettingsPlugin")?;
    Ok(SystemSettings(handle))
}
