use tauri::{command, AppHandle, Runtime};

use crate::{
    error::Error,
    models::{ReadSmsRequest, ReadSmsResponse, SendSmsRequest, SendSmsResponse},
    Result, SmsExt,
};

/// Send an SMS message
#[command]
pub async fn send_sms<R: Runtime>(
    app: AppHandle<R>,
    request: SendSmsRequest,
) -> Result<SendSmsResponse> {
    #[cfg(mobile)]
    {
        app.sms().send_sms(request)
    }
    #[cfg(not(mobile))]
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
    #[cfg(mobile)]
    {
        app.sms().read_sms(request)
    }
    #[cfg(not(mobile))]
    {
        let _ = app;
        let _ = request;
        Err(Error::NotAvailableOnDesktop)
    }
}
