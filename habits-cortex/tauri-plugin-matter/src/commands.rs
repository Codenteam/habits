use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::Error;

#[cfg(target_os = "android")]
use crate::MatterExt;

#[command]
pub(crate) async fn discover_devices<R: Runtime>(
    app: AppHandle<R>,
    timeout: Option<u32>,
) -> crate::Result<Vec<MatterDevice>> {
    #[cfg(target_os = "android")]
    {
        app.matter().discover_devices(DiscoverArgs {
            timeout: timeout.unwrap_or(10),
        })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, timeout);
        Err(Error::UnsupportedPlatform("Matter is only available on Android".into()))
    }
}

#[command]
pub(crate) async fn get_devices<R: Runtime>(app: AppHandle<R>) -> crate::Result<Vec<MatterDevice>> {
    #[cfg(target_os = "android")]
    {
        app.matter().get_devices()
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err(Error::UnsupportedPlatform("Matter is only available on Android".into()))
    }
}

#[command]
pub(crate) async fn get_device_state<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
) -> crate::Result<DeviceState> {
    #[cfg(target_os = "android")]
    {
        app.matter().get_device_state(DeviceIdArgs { device_id })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, device_id);
        Err(Error::UnsupportedPlatform("Matter is only available on Android".into()))
    }
}

#[command]
pub(crate) async fn set_on_off<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
    on: bool,
) -> crate::Result<()> {
    #[cfg(target_os = "android")]
    {
        app.matter().set_on_off(SetOnOffArgs { device_id, on })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, device_id, on);
        Err(Error::UnsupportedPlatform("Matter is only available on Android".into()))
    }
}

#[command]
pub(crate) async fn set_level<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
    level: u8,
    transition_time: Option<f32>,
) -> crate::Result<()> {
    #[cfg(target_os = "android")]
    {
        app.matter().set_level(SetLevelArgs {
            device_id,
            level: level.min(100),
            transition_time,
        })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, device_id, level, transition_time);
        Err(Error::UnsupportedPlatform("Matter is only available on Android".into()))
    }
}

#[command]
pub(crate) async fn set_color<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
    hue: Option<u16>,
    saturation: Option<u8>,
    color_temperature: Option<u16>,
    transition_time: Option<f32>,
) -> crate::Result<()> {
    #[cfg(target_os = "android")]
    {
        app.matter().set_color(SetColorArgs {
            device_id,
            hue,
            saturation,
            color_temperature,
            transition_time,
        })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, device_id, hue, saturation, color_temperature, transition_time);
        Err(Error::UnsupportedPlatform("Matter is only available on Android".into()))
    }
}

#[command]
pub(crate) async fn commission_device<R: Runtime>(
    app: AppHandle<R>,
    pairing_code: String,
    name: Option<String>,
) -> crate::Result<MatterDevice> {
    #[cfg(target_os = "android")]
    {
        app.matter().commission_device(CommissionArgs { pairing_code, name })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, pairing_code, name);
        Err(Error::UnsupportedPlatform("Matter is only available on Android".into()))
    }
}

#[command]
pub(crate) async fn remove_device<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
) -> crate::Result<()> {
    #[cfg(target_os = "android")]
    {
        app.matter().remove_device(DeviceIdArgs { device_id })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, device_id);
        Err(Error::UnsupportedPlatform("Matter is only available on Android".into()))
    }
}
