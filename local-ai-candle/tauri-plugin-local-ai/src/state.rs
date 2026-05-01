//! State management for Local AI plugin instances

use crate::error::{Error, Result};
use local_ai_core::{
    embed::TextEmbedder,
    image_caption::ImageCaptioner,
    image_gen::ImageGenerator,
    text_gen::TextGenerator,
    text_to_voice::VoiceSynthesizer,
    transcribe::Transcriber,
};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Unique identifier for model instances
pub type InstanceId = String;

/// State container for all AI model instances
pub struct LocalAiState {
    /// Path to the models directory, set during plugin initialization
    pub models_dir: PathBuf,
    text_generators: RwLock<HashMap<InstanceId, Arc<RwLock<TextGenerator>>>>,
    image_captioners: RwLock<HashMap<InstanceId, Arc<RwLock<ImageCaptioner>>>>,
    image_generators: RwLock<HashMap<InstanceId, Arc<ImageGenerator>>>,
    transcribers: RwLock<HashMap<InstanceId, Arc<RwLock<Transcriber>>>>,
    voice_synthesizers: RwLock<HashMap<InstanceId, Arc<RwLock<VoiceSynthesizer>>>>,
    text_embedders: RwLock<HashMap<InstanceId, Arc<TextEmbedder>>>,
}

impl Default for LocalAiState {
    fn default() -> Self {
        // Fallback to hardcoded path if not initialized properly
        Self::new(
            dirs::data_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("com.codenteam-oss.habits")
                .join("models")
        )
    }
}

impl LocalAiState {
    /// Create a new state with the given models directory
    pub fn new(models_dir: PathBuf) -> Self {
        Self {
            models_dir,
            text_generators: RwLock::new(HashMap::new()),
            image_captioners: RwLock::new(HashMap::new()),
            image_generators: RwLock::new(HashMap::new()),
            transcribers: RwLock::new(HashMap::new()),
            voice_synthesizers: RwLock::new(HashMap::new()),
            text_embedders: RwLock::new(HashMap::new()),
        }
    }

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

    // ========================================================================
    // Text Embedder
    // ========================================================================

    pub async fn add_text_embedder(&self, embedder: TextEmbedder) -> InstanceId {
        let id = Self::generate_id();
        let mut embedders = self.text_embedders.write().await;
        embedders.insert(id.clone(), Arc::new(embedder));
        id
    }

    pub async fn get_text_embedder(&self, id: &str) -> Result<Arc<TextEmbedder>> {
        let embedders = self.text_embedders.read().await;
        embedders
            .get(id)
            .cloned()
            .ok_or_else(|| Error::InstanceNotFound(format!("TextEmbedder: {}", id)))
    }

    pub async fn remove_text_embedder(&self, id: &str) -> Result<()> {
        let mut embedders = self.text_embedders.write().await;
        embedders
            .remove(id)
            .ok_or_else(|| Error::InstanceNotFound(format!("TextEmbedder: {}", id)))?;
        Ok(())
    }
}
