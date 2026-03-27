use keyring_core::Entry;
use tauri::{AppHandle, Runtime};
use std::sync::Once;

// Platform-specific imports
#[cfg(any(target_os = "macos", target_os = "ios"))]
use apple_native_keyring_store::keychain::Store as AppleStore;

#[cfg(target_os = "windows")]
use windows_native_keyring_store::Store as WindowsStore;

#[cfg(all(target_os = "linux", not(target_os = "android")))]
use dbus_secret_service_keyring_store::Store as LinuxStore;

#[cfg(target_os = "android")]
use android_native_keyring_store::Store as AndroidStore;

static INIT: Once = Once::new();

/// Initialize the keyring store for the current platform
fn init_store() {
    INIT.call_once(|| {
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        {
            if let Ok(store) = AppleStore::new() {
                keyring_core::set_default_store(store);
            }
        }

        #[cfg(target_os = "windows")]
        {
            if let Ok(store) = WindowsStore::new() {
                keyring_core::set_default_store(store);
            }
        }

        #[cfg(all(target_os = "linux", not(target_os = "android")))]
        {
            if let Ok(store) = LinuxStore::new() {
                keyring_core::set_default_store(store);
            }
        }
        
        #[cfg(target_os = "android")]
        {
            if let Ok(store) = AndroidStore::new() {
                keyring_core::set_default_store(store);
            }
        }
    });
}

pub fn init<R: Runtime>(_app: &AppHandle<R>) -> crate::Result<Keyring> {
    init_store();
    Ok(Keyring)
}

/// Access to the keyring APIs.
#[derive(Clone)]
pub struct Keyring;

// Implement Send + Sync since Keyring has no state
unsafe impl Send for Keyring {}
unsafe impl Sync for Keyring {}

impl Keyring {
    fn create_entry(&self, service: &str, user: &str) -> keyring_core::Result<Entry> {
        Entry::new(service, user)
    }

    pub fn get_password(&self, service: &str, user: &str) -> keyring_core::Result<Option<String>> {
        match self.create_entry(service, user)?.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring_core::Error::NoEntry) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn get_or_set_password(
        &self,
        service: &str,
        user: &str,
        password: &str,
    ) -> keyring_core::Result<String> {
        match self.get_password(service, user)? {
            Some(key) => Ok(key),
            None => {
                self.set_password(service, user, password)?;
                Ok(password.to_string())
            }
        }
    }

    pub fn set_password(&self, service: &str, user: &str, password: &str) -> keyring_core::Result<()> {
        self.create_entry(service, user)?.set_password(password)
    }

    pub fn delete_password(&self, service: &str, user: &str) -> keyring_core::Result<()> {
        self.create_entry(service, user)?.delete_credential()
    }

    pub fn get_secret(&self, service: &str, user: &str) -> keyring_core::Result<Option<Vec<u8>>> {
        match self.create_entry(service, user)?.get_secret() {
            Ok(secret) => Ok(Some(secret)),
            Err(keyring_core::Error::NoEntry) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn get_or_set_secret(
        &self,
        service: &str,
        user: &str,
        secret: &[u8],
    ) -> keyring_core::Result<Vec<u8>> {
        match self.get_secret(service, user)? {
            Some(key) => Ok(key),
            None => {
                self.set_secret(service, user, secret)?;
                Ok(secret.to_vec())
            }
        }
    }

    pub fn set_secret(&self, service: &str, user: &str, secret: &[u8]) -> keyring_core::Result<()> {
        self.create_entry(service, user)?.set_secret(secret)
    }

    pub fn delete_secret(&self, service: &str, user: &str) -> keyring_core::Result<()> {
        self.create_entry(service, user)?.delete_credential()
    }
}
