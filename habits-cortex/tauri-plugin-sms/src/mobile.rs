use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::{
    models::{ReadSmsRequest, ReadSmsResponse, SendSmsRequest, SendSmsResponse},
    Result,
};

const PLUGIN_IDENTIFIER: &str = "app.tauri.sms";

/// Access to the SMS plugin APIs.
pub struct Sms<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Sms<R> {
    /// Send an SMS message
    pub fn send_sms(&self, request: SendSmsRequest) -> Result<SendSmsResponse> {
        self.0
            .run_mobile_plugin("sendSms", request)
            .map_err(Into::into)
    }

    /// Read SMS messages
    pub fn read_sms(&self, request: ReadSmsRequest) -> Result<ReadSmsResponse> {
        self.0
            .run_mobile_plugin("readSms", request)
            .map_err(Into::into)
    }
}

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> Result<Sms<R>> {
    // Only Android has working native plugin - iOS disabled due to swift-rs targeting bug
    let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "SmsPlugin")?;
    Ok(Sms(handle))
}
