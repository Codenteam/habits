use std::sync::Arc;
use tauri::{command, AppHandle, Runtime};
use tokio::sync::Mutex;

use crate::error::Result;
use crate::llama_manager::LlamaManager;
use crate::models::*;
use crate::LlamaExt;

use futures_util::StreamExt;
use std::io::Write;

/// Load a model into memory
#[command]
pub(crate) async fn load_model<R: Runtime>(
    app: AppHandle<R>,
    model_path: String,
) -> Result<()> {
    let manager = app.llama().clone();
    
    let result: std::result::Result<crate::error::Result<()>, tokio::task::JoinError> = tokio::task::spawn_blocking(move || {
        let mut manager_guard = futures::executor::block_on(manager.lock());
        manager_guard.load_model(&model_path)
    })
    .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::Model(e.to_string())),
    }
}

/// Unload a model from memory
#[command]
pub(crate) async fn unload_model<R: Runtime>(
    app: AppHandle<R>,
    model_path: String,
) -> Result<()> {
    let manager = app.llama().clone();
    
    let result: std::result::Result<crate::error::Result<()>, tokio::task::JoinError> = tokio::task::spawn_blocking(move || {
        let manager_guard = futures::executor::block_on(manager.lock());
        manager_guard.unload_model(&model_path)
    })
    .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::Model(e.to_string())),
    }
}

/// Run chat completion
#[command]
pub(crate) async fn chat<R: Runtime>(
    app: AppHandle<R>,
    model_path: String,
    messages: Vec<ChatMessage>,
    system_prompt: Option<String>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
    top_p: Option<f32>,
) -> Result<ChatResult> {
    let manager = app.llama().clone();
    
    let params = ChatParams {
        model_path,
        messages,
        system_prompt,
        temperature: temperature.unwrap_or(0.7),
        max_tokens: max_tokens.unwrap_or(2048),
        top_p: top_p.unwrap_or(1.0),
    };
    
    let result: std::result::Result<crate::error::Result<ChatResult>, tokio::task::JoinError> = tokio::task::spawn_blocking(move || {
        let mut manager_guard = futures::executor::block_on(manager.lock());
        manager_guard.chat(&params)
    })
    .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::Inference(e.to_string())),
    }
}

/// List locally installed models
#[command]
pub(crate) async fn list_models<R: Runtime>(
    app: AppHandle<R>,
    directory: Option<String>,
) -> Result<Vec<ModelInfo>> {
    let manager = app.llama().clone();
    
    let result: std::result::Result<crate::error::Result<Vec<ModelInfo>>, tokio::task::JoinError> = tokio::task::spawn_blocking(move || {
        let manager_guard = futures::executor::block_on(manager.lock());
        
        if let Some(dir) = directory {
            // List from custom directory
            let path = std::path::PathBuf::from(&dir);
            if !path.exists() {
                return Ok(vec![]);
            }
            
            let mut models = Vec::new();
            for entry in std::fs::read_dir(&path)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.extension().map_or(false, |e| e == "gguf") {
                    let metadata = std::fs::metadata(&path)?;
                    let name = path.file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default();
                    
                    models.push(ModelInfo {
                        id: path.file_name().unwrap().to_string_lossy().to_string(),
                        name: name.replace('-', " ").replace('_', " "),
                        description: None,
                        path: Some(path.to_string_lossy().to_string()),
                        size: Some(metadata.len()),
                        provider: "local".to_string(),
                        supports: ModelCapabilities {
                            chat: true,
                            completion: true,
                            ..Default::default()
                        },
                    });
                }
            }
            Ok(models)
        } else {
            manager_guard.list_models()
        }
    })
    .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::File(e.to_string())),
    }
}

/// Install/download a model
#[command]
pub(crate) async fn install_model<R: Runtime>(
    app: AppHandle<R>,
    model_url: String,
    model_name: String,
    destination: Option<String>,
) -> Result<InstallResult> {
    let manager = app.llama().clone();
    
    // Determine destination
    let dest_dir = if let Some(dir) = destination {
        std::path::PathBuf::from(dir)
    } else {
        let manager_guard = manager.lock().await;
        manager_guard.ensure_models_dir()?
    };
    
    // Generate filename
    let mut filename = model_name.clone();
    if !filename.ends_with(".gguf") {
        filename.push_str(".gguf");
    }
    let dest_path = dest_dir.join(&filename);
    
    // Download the file
    let client = reqwest::Client::new();
    let response = client.get(&model_url)
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Ok(InstallResult {
            success: false,
            path: None,
            size: None,
            error: Some(format!("Download failed with status: {}", response.status())),
        });
    }
    
    // Get content length for progress
    let _total_size = response.content_length();
    
    // Create file and write stream
    let mut file = std::fs::File::create(&dest_path)?;
    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        file.write_all(&chunk)?;
        downloaded += chunk.len() as u64;
    }
    
    file.flush()?;
    
    Ok(InstallResult {
        success: true,
        path: Some(dest_path.to_string_lossy().to_string()),
        size: Some(downloaded),
        error: None,
    })
}

/// Get information about a model
#[command]
pub(crate) async fn get_model_info<R: Runtime>(
    app: AppHandle<R>,
    model_path: String,
) -> Result<Option<ModelInfo>> {
    let manager = app.llama().clone();
    
    let result: std::result::Result<crate::error::Result<Option<ModelInfo>>, tokio::task::JoinError> = tokio::task::spawn_blocking(move || {
        let manager_guard = futures::executor::block_on(manager.lock());
        manager_guard.get_model_info(&model_path)
    })
    .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::File(e.to_string())),
    }
}

/// Ensure the models directory exists
#[command]
pub(crate) async fn ensure_models_dir<R: Runtime>(
    app: AppHandle<R>,
) -> Result<String> {
    let manager = app.llama().clone();
    let manager_guard = manager.lock().await;
    
    let path = manager_guard.ensure_models_dir()?;
    Ok(path.to_string_lossy().to_string())
}
