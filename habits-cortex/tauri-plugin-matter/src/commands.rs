use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::MatterExt;

#[command]
pub(crate) async fn discover_devices<R: Runtime>(
    app: AppHandle<R>,
    timeout: Option<u32>,
) -> crate::Result<Vec<MatterDevice>> {
    app.matter().discover_devices(DiscoverArgs {
        timeout: timeout.unwrap_or(10),
    })
}

#[command]
pub(crate) async fn get_devices<R: Runtime>(app: AppHandle<R>) -> crate::Result<Vec<MatterDevice>> {
    app.matter().get_devices()
}

#[command]
pub(crate) async fn get_device_state<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
) -> crate::Result<DeviceState> {
    app.matter().get_device_state(DeviceIdArgs { device_id })
}

#[command]
pub(crate) async fn set_on_off<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
    on: bool,
) -> crate::Result<()> {
    app.matter().set_on_off(SetOnOffArgs { device_id, on })
}

#[command]
pub(crate) async fn set_level<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
    level: u8,
    transition_time: Option<f32>,
) -> crate::Result<()> {
    app.matter().set_level(SetLevelArgs {
        device_id,
        level: level.min(100),
        transition_time,
    })
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
    app.matter().set_color(SetColorArgs {
        device_id,
        hue,
        saturation,
        color_temperature,
        transition_time,
    })
}

#[command]
pub(crate) async fn commission_device<R: Runtime>(
    app: AppHandle<R>,
    pairing_code: String,
    name: Option<String>,
) -> crate::Result<MatterDevice> {
    app.matter().commission_device(CommissionArgs { pairing_code, name })
}

#[command]
pub(crate) async fn remove_device<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
) -> crate::Result<()> {
    app.matter().remove_device(DeviceIdArgs { device_id })
}
