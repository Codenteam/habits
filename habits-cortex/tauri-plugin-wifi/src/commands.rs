use tauri::{command, AppHandle, Runtime};

use crate::{
    error::Error,
    models::{
        GetCurrentNetworkResponse, IsConnectedRequest, IsConnectedResponse,
        ListSavedNetworksResponse, PermissionStatus, RequestPermissionsRequest,
    },
    Result, WifiExt,
};

/// Get information about the current Wi-Fi network
#[command]
pub async fn get_current_network<R: Runtime>(
    app: AppHandle<R>,
) -> Result<GetCurrentNetworkResponse> {
    #[cfg(mobile)]
    {
        app.wifi().get_current_network()
    }
    #[cfg(not(mobile))]
    {
        let _ = app;
        Err(Error::NotAvailableOnDesktop)
    }
}

/// Check if connected to a Wi-Fi network
#[command]
pub async fn is_connected<R: Runtime>(
    app: AppHandle<R>,
    request: IsConnectedRequest,
) -> Result<IsConnectedResponse> {
    #[cfg(mobile)]
    {
        app.wifi().is_connected(request)
    }
    #[cfg(not(mobile))]
    {
        let _ = app;
        let _ = request;
        Err(Error::NotAvailableOnDesktop)
    }
}

/// List saved Wi-Fi networks
#[command]
pub async fn list_saved_networks<R: Runtime>(
    app: AppHandle<R>,
) -> Result<ListSavedNetworksResponse> {
    #[cfg(mobile)]
    {
        app.wifi().list_saved_networks()
    }
    #[cfg(not(mobile))]
    {
        let _ = app;
        Err(Error::NotAvailableOnDesktop)
    }
}

/// Check Wi-Fi-related permissions
#[command]
pub async fn check_permissions<R: Runtime>(app: AppHandle<R>) -> Result<PermissionStatus> {
    #[cfg(mobile)]
    {
        app.wifi().check_permissions()
    }
    #[cfg(not(mobile))]
    {
        let _ = app;
        Err(Error::NotAvailableOnDesktop)
    }
}

/// Request Wi-Fi-related permissions
#[command]
pub async fn request_permissions<R: Runtime>(
    app: AppHandle<R>,
    request: RequestPermissionsRequest,
) -> Result<PermissionStatus> {
    #[cfg(mobile)]
    {
        app.wifi().request_permissions(request)
    }
    #[cfg(not(mobile))]
    {
        let _ = app;
        let _ = request;
        Err(Error::NotAvailableOnDesktop)
    }
}
