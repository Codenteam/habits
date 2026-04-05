//! State management for Local AI plugin instances

use crate::error::{Error, Result};
use local_ai_core::{
    image_caption::ImageCaptioner,
    image_gen::ImageGenerator,
    text_gen::TextGenerator,
    text_to_voice::VoiceSynthesizer,
    transcribe::Transcriber,
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Unique identifier for model instances
pub type InstanceId = String;

/// State container for all AI model instances
#[derive(Default)]
pub struct LocalAiState {
    text_generators: RwLock<HashMap<InstanceId, Arc<RwLock<TextGenerator>>>>,
    image_captioners: RwLock<HashMap<InstanceId, Arc<RwLock<ImageCaptioner>>>>,
    image_generators: RwLock<HashMap<InstanceId, Arc<ImageGenerator>>>,
    transcribers: RwLock<HashMap<InstanceId, Arc<RwLock<Transcriber>>>>,
    voice_synthesizers: RwLock<HashMap<InstanceId, Arc<RwLock<VoiceSynthesizer>>>>,
}

impl LocalAiState {
    /// Generate a unique instance ID
    pub fn generate_id() -> InstanceId {
        uuid::Uuid::new_v4().to_string()
    }

    // ========================================================================
    // Text Generator
    // ========================================================================

    pub async fn add_text_generator(&self, generator: TextGenerator) -> InstanceId {
        let id = Self::generate_id();
        let mut generators = self.text_generators.write().await;
        generators.insert(id.clone(), Arc::new(RwLock::new(generator)));
        id
    }

    pub async fn get_text_generator(
        &self,
        id: &str,
    ) -> Result<Arc<RwLock<TextGenerator>>> {
        let generators = self.text_generators.read().await;
        generators
            .get(id)
            .cloned()
            .ok_or_else(|| Error::InstanceNotFound(format!("TextGenerator: {}", id)))
    }

    pub async fn remove_text_generator(&self, id: &str) -> Result<()> {
        let mut generators = self.text_generators.write().await;
        generators
            .remove(id)
            .ok_or_else(|| Error::InstanceNotFound(format!("TextGenerator: {}", id)))?;
        Ok(())
    }

    // ========================================================================
    // Image Captioner
    // ========================================================================

    pub async fn add_image_captioner(&self, captioner: ImageCaptioner) -> InstanceId {
        let id = Self::generate_id();
        let mut captioners = self.image_captioners.write().await;
        captioners.insert(id.clone(), Arc::new(RwLock::new(captioner)));
        id
    }

    pub async fn get_image_captioner(
        &self,
        id: &str,
    ) -> Result<Arc<RwLock<ImageCaptioner>>> {
        let captioners = self.image_captioners.read().await;
        captioners
            .get(id)
            .cloned()
            .ok_or_else(|| Error::InstanceNotFound(format!("ImageCaptioner: {}", id)))
    }

    pub async fn remove_image_captioner(&self, id: &str) -> Result<()> {
        let mut captioners = self.image_captioners.write().await;
        captioners
            .remove(id)
            .ok_or_else(|| Error::InstanceNotFound(format!("ImageCaptioner: {}", id)))?;
        Ok(())
    }

    // ========================================================================
    // Image Generator
    // ========================================================================

    pub async fn add_image_generator(&self, generator: ImageGenerator) -> InstanceId {
        let id = Self::generate_id();
        let mut generators = self.image_generators.write().await;
        generators.insert(id.clone(), Arc::new(generator));
        id
    }

    pub async fn get_image_generator(&self, id: &str) -> Result<Arc<ImageGenerator>> {
        let generators = self.image_generators.read().await;
        generators
            .get(id)
            .cloned()
            .ok_or_else(|| Error::InstanceNotFound(format!("ImageGenerator: {}", id)))
    }

    pub async fn remove_image_generator(&self, id: &str) -> Result<()> {
        let mut generators = self.image_generators.write().await;
        generators
            .remove(id)
            .ok_or_else(|| Error::InstanceNotFound(format!("ImageGenerator: {}", id)))?;
        Ok(())
    }

    // ========================================================================
    // Transcriber
    // ========================================================================

    pub async fn add_transcriber(&self, transcriber: Transcriber) -> InstanceId {
        let id = Self::generate_id();
        let mut transcribers = self.transcribers.write().await;
        transcribers.insert(id.clone(), Arc::new(RwLock::new(transcriber)));
        id
    }

    pub async fn get_transcriber(&self, id: &str) -> Result<Arc<RwLock<Transcriber>>> {
        let transcribers = self.transcribers.read().await;
        transcribers
            .get(id)
            .cloned()
            .ok_or_else(|| Error::InstanceNotFound(format!("Transcriber: {}", id)))
    }

    pub async fn remove_transcriber(&self, id: &str) -> Result<()> {
        let mut transcribers = self.transcribers.write().await;
        transcribers
            .remove(id)
            .ok_or_else(|| Error::InstanceNotFound(format!("Transcriber: {}", id)))?;
        Ok(())
    }

    // ========================================================================
    // Voice Synthesizer
    // ========================================================================

    pub async fn add_voice_synthesizer(&self, synthesizer: VoiceSynthesizer) -> InstanceId {
        let id = Self::generate_id();
        let mut synthesizers = self.voice_synthesizers.write().await;
        synthesizers.insert(id.clone(), Arc::new(RwLock::new(synthesizer)));
        id
    }

    pub async fn get_voice_synthesizer(
        &self,
        id: &str,
    ) -> Result<Arc<RwLock<VoiceSynthesizer>>> {
        let synthesizers = self.voice_synthesizers.read().await;
        synthesizers
            .get(id)
            .cloned()
            .ok_or_else(|| Error::InstanceNotFound(format!("VoiceSynthesizer: {}", id)))
    }

    pub async fn remove_voice_synthesizer(&self, id: &str) -> Result<()> {
        let mut synthesizers = self.voice_synthesizers.write().await;
        synthesizers
            .remove(id)
            .ok_or_else(|| Error::InstanceNotFound(format!("VoiceSynthesizer: {}", id)))?;
        Ok(())
    }
}
