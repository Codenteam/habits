use std::sync::Arc;
use tauri::{command, AppHandle, Runtime};
use tokio::sync::Mutex;

use crate::error::Result;
use crate::diffusion_manager::DiffusionManager;
use crate::models::*;
use crate::DiffusionExt;

/// Generate an image from a text prompt
#[command]
pub(crate) async fn generate_image<R: Runtime>(
    app: AppHandle<R>,
    model_path: String,
    prompt: String,
    negative_prompt: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    steps: Option<u32>,
    guidance_scale: Option<f32>,
    seed: Option<u64>,
    response_format: Option<String>,
) -> Result<GenerateImageResult> {
    let manager = app.diffusion().clone();
    
    let params = GenerateImageParams {
        model_path,
        prompt,
        negative_prompt: negative_prompt.unwrap_or_default(),
        width: width.unwrap_or(512),
        height: height.unwrap_or(512),
        steps: steps.unwrap_or(20),
        guidance_scale: guidance_scale.unwrap_or(7.5),
        seed,
        response_format: response_format.unwrap_or_else(|| "b64_json".to_string()),
    };
    
    let result: std::result::Result<crate::error::Result<GenerateImageResult>, tokio::task::JoinError> = 
        tokio::task::spawn_blocking(move || {
            let mut manager_guard = futures::executor::block_on(manager.lock());
            manager_guard.generate(&params)
        })
        .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::Inference(e.to_string())),
    }
}

/// List available diffusion models
#[command]
pub(crate) async fn list_models<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Vec<DiffusionModelInfo>> {
    let manager = app.diffusion().clone();
    
    let result: std::result::Result<crate::error::Result<Vec<DiffusionModelInfo>>, tokio::task::JoinError> = 
        tokio::task::spawn_blocking(move || {
            let manager_guard = futures::executor::block_on(manager.lock());
            manager_guard.list_models()
        })
        .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::File(e.to_string())),
    }
}

/// Ensure models directory exists
#[command]
pub(crate) async fn ensure_models_dir<R: Runtime>(
    app: AppHandle<R>,
) -> Result<String> {
    let manager = app.diffusion().clone();
    let manager_guard = manager.lock().await;
    let path = manager_guard.ensure_models_dir()?;
    Ok(path.to_string_lossy().to_string())
}

/// Unload all models to free memory
#[command]
pub(crate) async fn unload_model<R: Runtime>(
    app: AppHandle<R>,
) -> Result<()> {
    let manager = app.diffusion().clone();
    
    let result: std::result::Result<crate::error::Result<()>, tokio::task::JoinError> = 
        tokio::task::spawn_blocking(move || {
            let manager_guard = futures::executor::block_on(manager.lock());
            manager_guard.unload_all()
        })
        .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::Model(e.to_string())),
    }
}
