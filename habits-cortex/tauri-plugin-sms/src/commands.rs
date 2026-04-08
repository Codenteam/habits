use tauri::{command, AppHandle, Runtime};

use crate::{
    error::Error,
    models::{ReadSmsRequest, ReadSmsResponse, SendSmsRequest, SendSmsResponse},
    Result,
};

#[cfg(target_os = "android")]
use crate::SmsExt;

/// Send an SMS message
#[command]
pub async fn send_sms<R: Runtime>(
    app: AppHandle<R>,
    request: SendSmsRequest,
) -> Result<SendSmsResponse> {
    #[cfg(target_os = "android")]
    {
        app.sms().send_sms(request)
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        let _ = request;
        Err(Error::NotAvailableOnDesktop)
    }
}

/// Read SMS messages
#[command]
pub async fn read_sms<R: Runtime>(
    app: AppHandle<R>,
    request: ReadSmsRequest,
) -> Result<ReadSmsResponse> {
    #[cfg(target_os = "android")]
    {
        app.sms().read_sms(request)
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        let _ = request;
        Err(Error::NotAvailableOnDesktop)
    }
}
