use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::{
    models::{
        GetCurrentNetworkResponse, IsConnectedRequest, IsConnectedResponse,
        ListSavedNetworksResponse, PermissionStatus, RequestPermissionsRequest,
    },
    Result,
};

const PLUGIN_IDENTIFIER: &str = "app.tauri.wifi";

/// Access to the Wi-Fi plugin APIs.
pub struct Wifi<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Wifi<R> {
    /// Get current Wi-Fi network info
    pub fn get_current_network(&self) -> Result<GetCurrentNetworkResponse> {
        self.0
            .run_mobile_plugin("getCurrentNetwork", ())
            .map_err(Into::into)
    }

    /// Check if connected to a Wi-Fi network
    pub fn is_connected(&self, request: IsConnectedRequest) -> Result<IsConnectedResponse> {
        self.0
            .run_mobile_plugin("isConnected", request)
            .map_err(Into::into)
    }

    /// List saved Wi-Fi networks
    pub fn list_saved_networks(&self) -> Result<ListSavedNetworksResponse> {
        self.0
            .run_mobile_plugin("listSavedNetworks", ())
            .map_err(Into::into)
    }

    /// Check Wi-Fi permissions
    pub fn check_permissions(&self) -> Result<PermissionStatus> {
        self.0
            .run_mobile_plugin("checkPermissions", ())
            .map_err(Into::into)
    }

    /// Request Wi-Fi permissions
    pub fn request_permissions(&self, request: RequestPermissionsRequest) -> Result<PermissionStatus> {
        self.0
            .run_mobile_plugin("requestPermissions", request)
            .map_err(Into::into)
    }
}

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> Result<Wifi<R>> {
    // Android-only - iOS disabled due to swift-rs targeting bug
    let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "WifiPlugin")?;
    Ok(Wifi(handle))
}
