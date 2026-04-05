use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::SystemSettingsExt;

#[command]
pub(crate) async fn get_volume<R: Runtime>(
    app: AppHandle<R>,
    stream: Option<VolumeStream>,
) -> crate::Result<VolumeInfo> {
    app.system_settings().get_volume(VolumeStreamArgs {
        stream: stream.unwrap_or_default(),
    })
}

#[command]
pub(crate) async fn set_volume<R: Runtime>(
    app: AppHandle<R>,
    level: f32,
    stream: Option<VolumeStream>,
    show_ui: Option<bool>,
) -> crate::Result<()> {
    app.system_settings().set_volume(SetVolumeArgs {
        level,
        stream: stream.unwrap_or_default(),
        show_ui: show_ui.unwrap_or(false),
    })
}

#[command]
pub(crate) async fn set_mute<R: Runtime>(
    app: AppHandle<R>,
    mute: bool,
    stream: Option<VolumeStream>,
) -> crate::Result<()> {
    app.system_settings().set_mute(SetMuteArgs {
        mute,
        stream: stream.unwrap_or_default(),
    })
}

#[command]
pub(crate) async fn get_ringer_mode<R: Runtime>(app: AppHandle<R>) -> crate::Result<RingerModeInfo> {
    app.system_settings().get_ringer_mode()
}

#[command]
pub(crate) async fn set_ringer_mode<R: Runtime>(
    app: AppHandle<R>,
    mode: RingerMode,
) -> crate::Result<()> {
    app.system_settings().set_ringer_mode(SetRingerModeArgs { mode })
}

#[command]
pub(crate) async fn get_bluetooth_state<R: Runtime>(
    app: AppHandle<R>,
) -> crate::Result<BluetoothState> {
    app.system_settings().get_bluetooth_state()
}

#[command]
pub(crate) async fn set_bluetooth<R: Runtime>(
    app: AppHandle<R>,
    enabled: bool,
) -> crate::Result<()> {
    app.system_settings().set_bluetooth(SetBluetoothArgs { enabled })
}

#[command]
pub(crate) async fn get_dnd_state<R: Runtime>(app: AppHandle<R>) -> crate::Result<DndState> {
    app.system_settings().get_dnd_state()
}

#[command]
pub(crate) async fn set_dnd<R: Runtime>(app: AppHandle<R>, enabled: bool) -> crate::Result<()> {
    app.system_settings().set_dnd(SetDndArgs { enabled })
}
