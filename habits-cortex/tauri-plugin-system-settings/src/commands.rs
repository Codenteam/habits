use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::Error;

#[cfg(target_os = "android")]
use crate::SystemSettingsExt;

#[command]
pub(crate) async fn get_volume<R: Runtime>(
    app: AppHandle<R>,
    stream: Option<VolumeStream>,
) -> crate::Result<VolumeInfo> {
    #[cfg(target_os = "android")]
    {
        app.system_settings().get_volume(VolumeStreamArgs {
            stream: stream.unwrap_or_default(),
        })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, stream);
        Err(Error::NotSupported)
    }
}

#[command]
pub(crate) async fn set_volume<R: Runtime>(
    app: AppHandle<R>,
    level: f32,
    stream: Option<VolumeStream>,
    show_ui: Option<bool>,
) -> crate::Result<()> {
    #[cfg(target_os = "android")]
    {
        app.system_settings().set_volume(SetVolumeArgs {
            level,
            stream: stream.unwrap_or_default(),
            show_ui: show_ui.unwrap_or(false),
        })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, level, stream, show_ui);
        Err(Error::NotSupported)
    }
}

#[command]
pub(crate) async fn set_mute<R: Runtime>(
    app: AppHandle<R>,
    mute: bool,
    stream: Option<VolumeStream>,
) -> crate::Result<()> {
    #[cfg(target_os = "android")]
    {
        app.system_settings().set_mute(SetMuteArgs {
            mute,
            stream: stream.unwrap_or_default(),
        })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, mute, stream);
        Err(Error::NotSupported)
    }
}

#[command]
pub(crate) async fn get_ringer_mode<R: Runtime>(app: AppHandle<R>) -> crate::Result<RingerModeInfo> {
    #[cfg(target_os = "android")]
    {
        app.system_settings().get_ringer_mode()
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err(Error::NotSupported)
    }
}

#[command]
pub(crate) async fn set_ringer_mode<R: Runtime>(
    app: AppHandle<R>,
    mode: RingerMode,
) -> crate::Result<()> {
    #[cfg(target_os = "android")]
    {
        app.system_settings().set_ringer_mode(SetRingerModeArgs { mode })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, mode);
        Err(Error::NotSupported)
    }
}

#[command]
pub(crate) async fn get_bluetooth_state<R: Runtime>(
    app: AppHandle<R>,
) -> crate::Result<BluetoothState> {
    #[cfg(target_os = "android")]
    {
        app.system_settings().get_bluetooth_state()
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err(Error::NotSupported)
    }
}

#[command]
pub(crate) async fn set_bluetooth<R: Runtime>(
    app: AppHandle<R>,
    enabled: bool,
) -> crate::Result<()> {
    #[cfg(target_os = "android")]
    {
        app.system_settings().set_bluetooth(SetBluetoothArgs { enabled })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, enabled);
        Err(Error::NotSupported)
    }
}

#[command]
pub(crate) async fn get_dnd_state<R: Runtime>(app: AppHandle<R>) -> crate::Result<DndState> {
    #[cfg(target_os = "android")]
    {
        app.system_settings().get_dnd_state()
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err(Error::NotSupported)
    }
}

#[command]
pub(crate) async fn set_dnd<R: Runtime>(app: AppHandle<R>, enabled: bool) -> crate::Result<()> {
    #[cfg(target_os = "android")]
    {
        app.system_settings().set_dnd(SetDndArgs { enabled })
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, enabled);
        Err(Error::NotSupported)
    }
}
