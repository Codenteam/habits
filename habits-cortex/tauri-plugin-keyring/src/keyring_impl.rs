use tauri::{AppHandle, Runtime};
use std::sync::Once;

// Debug mode JSON storage
#[cfg(debug_assertions)]
use {
    serde::{Deserialize, Serialize},
    std::collections::HashMap,
    std::fs,
    std::path::PathBuf,
    std::sync::{Arc, Mutex},
};

// Production mode - use keyring_core
#[cfg(not(debug_assertions))]
use keyring_core::Entry;

// Platform-specific imports (only in production)
#[cfg(all(not(debug_assertions), target_os = "macos"))]
use apple_native_keyring_store::keychain::Store as AppleStore;

#[cfg(all(not(debug_assertions), target_os = "ios"))]
use apple_native_keyring_store::protected::Store as AppleStore;

#[cfg(all(not(debug_assertions), target_os = "windows"))]
use windows_native_keyring_store::Store as WindowsStore;

#[cfg(all(not(debug_assertions), target_os = "linux", not(target_os = "android")))]
use dbus_secret_service_keyring_store::Store as LinuxStore;

#[cfg(all(not(debug_assertions), target_os = "android"))]
use android_native_keyring_store::Store as AndroidStore;

// Debug mode JSON keyring store
#[cfg(debug_assertions)]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct JsonKeyringData {
    entries: HashMap<String, Vec<u8>>,
}

#[cfg(debug_assertions)]
#[derive(Clone)]
struct JsonKeyringStore {
    file_path: PathBuf,
    data: Arc<Mutex<JsonKeyringData>>,
}

#[cfg(debug_assertions)]
impl JsonKeyringStore {
    fn new() -> Self {
        let file_path = std::env::temp_dir().join("tauri_keyring_debug.json");

        // Print that we are in dev mode and the file path being used
        println!("Debug mode: Using JSON keyring store at {:?}", file_path);
        
        let data = if file_path.exists() {
            if let Ok(content) = fs::read_to_string(&file_path) {
                serde_json::from_str::<JsonKeyringData>(&content)
                    .unwrap_or_default()
            } else {
                JsonKeyringData::default()
            }
        } else {
            JsonKeyringData::default()
        };
        
        Self {
            file_path,
            data: Arc::new(Mutex::new(data)),
        }
    }
    
    fn save(&self) -> Result<(), String> {
        let data = self.data.lock().unwrap();
        let json = serde_json::to_string_pretty(&*data)
            .map_err(|e| e.to_string())?;
        fs::write(&self.file_path, json)
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    
    fn make_key(service: &str, user: &str) -> String {
        format!("{}:{}", service, user)
    }
    
    fn get(&self, service: &str, user: &str) -> Option<Vec<u8>> {
        let data = self.data.lock().unwrap();
        let key = Self::make_key(service, user);
        data.entries.get(&key).cloned()
    }

    fn set(&self, service: &str, user: &str, secret: &[u8]) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        let key = Self::make_key(service, user);
        data.entries.insert(key, secret.to_vec());
        drop(data);
        self.save()
    }

    fn delete(&self, service: &str, user: &str) -> Result<bool, String> {
        let mut data = self.data.lock().unwrap();
        let key = Self::make_key(service, user);
        let existed = data.entries.remove(&key).is_some();
        drop(data);
        self.save()?;
        Ok(existed)
    }
}

static INIT: Once = Once::new();

/// Initialize the keyring store for the current platform (production mode only)
#[cfg(not(debug_assertions))]
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
    #[cfg(not(debug_assertions))]
    init_store();
    
    #[cfg(debug_assertions)]
    let store = JsonKeyringStore::new();
    
    Ok(Keyring {
        #[cfg(debug_assertions)]
        store,
    })
}

/// Access to the keyring APIs.
#[derive(Clone)]
pub struct Keyring {
    #[cfg(debug_assertions)]
    store: JsonKeyringStore,
}

// Implement Send + Sync
unsafe impl Send for Keyring {}
unsafe impl Sync for Keyring {}

impl Keyring {
    #[cfg(not(debug_assertions))]
    fn create_entry(&self, service: &str, user: &str) -> keyring_core::Result<Entry> {
        Entry::new(service, user)
    }

    pub fn get_password(&self, service: &str, user: &str) -> keyring_core::Result<Option<String>> {
        #[cfg(debug_assertions)]
        {
            match self.store.get(service, user) {
                Some(bytes) => Ok(Some(String::from_utf8_lossy(&bytes).to_string())),
                None => Ok(None),
            }
        }
        
        #[cfg(not(debug_assertions))]
        {
            match self.create_entry(service, user)?.get_password() {
                Ok(password) => Ok(Some(password)),
                Err(keyring_core::Error::NoEntry) => Ok(None),
                Err(e) => Err(e),
            }
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
        #[cfg(debug_assertions)]
        {
            self.store.set(service, user, password.as_bytes())
                .map_err(|e| keyring_core::Error::PlatformFailure(e.into()))
        }
        
        #[cfg(not(debug_assertions))]
        {
            self.create_entry(service, user)?.set_password(password)
        }
    }

    pub fn delete_password(&self, service: &str, user: &str) -> keyring_core::Result<()> {
        #[cfg(debug_assertions)]
        {
            match self.store.delete(service, user) {
                Ok(true) => Ok(()),
                Ok(false) => Err(keyring_core::Error::NoEntry),
                Err(e) => Err(keyring_core::Error::PlatformFailure(e.into())),
            }
        }
        
        #[cfg(not(debug_assertions))]
        {
            self.create_entry(service, user)?.delete_credential()
        }
    }

    pub fn get_secret(&self, service: &str, user: &str) -> keyring_core::Result<Option<Vec<u8>>> {
        #[cfg(debug_assertions)]
        {
            Ok(self.store.get(service, user))
        }
        
        #[cfg(not(debug_assertions))]
        {
            match self.create_entry(service, user)?.get_secret() {
                Ok(secret) => Ok(Some(secret)),
                Err(keyring_core::Error::NoEntry) => Ok(None),
                Err(e) => Err(e),
            }
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
        #[cfg(debug_assertions)]
        {
            self.store.set(service, user, secret)
                .map_err(|e| keyring_core::Error::PlatformFailure(e.into()))
        }
        
        #[cfg(not(debug_assertions))]
        {
            self.create_entry(service, user)?.set_secret(secret)
        }
    }

    pub fn delete_secret(&self, service: &str, user: &str) -> keyring_core::Result<()> {
        #[cfg(debug_assertions)]
        {
            match self.store.delete(service, user) {
                Ok(true) => Ok(()),
                Ok(false) => Err(keyring_core::Error::NoEntry),
                Err(e) => Err(keyring_core::Error::PlatformFailure(e.into())),
            }
        }
        
        #[cfg(not(debug_assertions))]
        {
            self.create_entry(service, user)?.delete_credential()
        }
    }
}
