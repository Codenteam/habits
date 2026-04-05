use std::sync::{Arc, Mutex};
use tauri::{command, AppHandle, Runtime};

use crate::error::Result;
use crate::candle_manager::CandleManager;
use crate::models::*;
use crate::CandleExt;

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
    let manager = app.candle().clone();
    
    let params = ChatParams {
        model_path,
        messages,
        system_prompt,
        temperature: temperature.unwrap_or(0.7),
        max_tokens: max_tokens.unwrap_or(2048),
        top_p: top_p.unwrap_or(1.0),
    };
    
    let result = tokio::task::spawn_blocking(move || {
        let manager_guard = manager.lock().unwrap();
        manager_guard.chat(&params)
    })
    .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::Inference(e.to_string())),
    }
}

/// Run vision chat completion (image analysis)
#[command]
pub(crate) async fn vision_chat<R: Runtime>(
    app: AppHandle<R>,
    model_path: String,
    image: String,
    prompt: String,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
    detail: Option<String>,
) -> Result<VisionResult> {
    let manager = app.candle().clone();
    
    let params = VisionParams {
        model_path,
        image,
        prompt,
        detail,
        temperature: temperature.unwrap_or(0.7),
        max_tokens: max_tokens.unwrap_or(2048),
    };
    
    let result = tokio::task::spawn_blocking(move || {
        let manager_guard = manager.lock().unwrap();
        manager_guard.vision_chat(&params)
    })
    .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::Vision(e.to_string())),
    }
}

/// Generate an image using Stable Diffusion
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
    seed: Option<i64>,
    response_format: Option<String>,
) -> Result<GenerateImageResult> {
    let manager = app.candle().clone();
    
    let params = GenerateImageParams {
        model_path,
        prompt,
        negative_prompt,
        width: width.unwrap_or(512),
        height: height.unwrap_or(512),
        steps: steps.unwrap_or(20),
        guidance_scale: guidance_scale.unwrap_or(7.5),
        seed,
        response_format,
    };
    
    let result = tokio::task::spawn_blocking(move || {
        let manager_guard = manager.lock().unwrap();
        manager_guard.generate_image(&params)
    })
    .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::ImageGeneration(e.to_string())),
    }
}

/// List available models
#[command]
pub(crate) async fn list_models<R: Runtime>(
    app: AppHandle<R>,
) -> Result<ListModelsResult> {
    let manager = app.candle().clone();
    
    let result = tokio::task::spawn_blocking(move || {
        let manager_guard = manager.lock().unwrap();
        manager_guard.list_models()
    })
    .await;
    
    match result {
        Ok(inner) => inner,
        Err(e) => Err(crate::error::Error::Model(e.to_string())),
    }
}

/// Ensure models directory exists and return its path
#[command]
pub(crate) async fn ensure_models_dir<R: Runtime>(
    app: AppHandle<R>,
) -> Result<String> {
    let manager = app.candle().clone();
    let manager_guard = manager.lock().unwrap();
    let path = manager_guard.ensure_models_dir()?;
    Ok(path.to_string_lossy().to_string())
}
