use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.plugin.matter";

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_matter);

/// Access to the Matter smart home APIs.
pub struct Matter<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Matter<R> {
    pub fn discover_devices(&self, args: DiscoverArgs) -> crate::Result<Vec<MatterDevice>> {
        self.0
            .run_mobile_plugin("discover_devices", args)
            .map_err(Into::into)
    }

    pub fn get_devices(&self) -> crate::Result<Vec<MatterDevice>> {
        self.0
            .run_mobile_plugin("get_devices", ())
            .map_err(Into::into)
    }

    pub fn get_device_state(&self, args: DeviceIdArgs) -> crate::Result<DeviceState> {
        self.0
            .run_mobile_plugin("get_device_state", args)
            .map_err(Into::into)
    }

    pub fn set_on_off(&self, args: SetOnOffArgs) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("set_on_off", args)
            .map_err(Into::into)
    }

    pub fn set_level(&self, args: SetLevelArgs) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("set_level", args)
            .map_err(Into::into)
    }

    pub fn set_color(&self, args: SetColorArgs) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("set_color", args)
            .map_err(Into::into)
    }

    pub fn commission_device(&self, args: CommissionArgs) -> crate::Result<MatterDevice> {
        self.0
            .run_mobile_plugin("commission_device", args)
            .map_err(Into::into)
    }

    pub fn remove_device(&self, args: DeviceIdArgs) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("remove_device", args)
            .map_err(Into::into)
    }
}

/// Initializes the plugin for mobile platforms.
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Matter<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "MatterPlugin")?;
    
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_matter)?;
    
    Ok(Matter(handle))
}
