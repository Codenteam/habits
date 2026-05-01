#!/bin/bash
# Build and test all three AI capabilities

set -e

cd "$(dirname "$0")"

# ============================================================================
# Model paths
# ============================================================================
QWEN_MODEL=~/.cache/huggingface/hub/models--Qwen--Qwen2-0.5B-Instruct-GGUF/snapshots/198f08841147e5196a6a69bd0053690fb1fd3857/qwen2-0_5b-instruct-q4_0.gguf
QWEN_TOKENIZER=~/.cache/huggingface/hub/models--Qwen--Qwen2-0.5B-Instruct/snapshots/c540970f9e29518b1d8f06ab8b24cba66ad77b6d/tokenizer.json

SD_DIR=~/.cache/huggingface/hub/models--runwayml--stable-diffusion-v1-5/snapshots/451f4fe16113bff5a5d2269ed5ad43b0592e9a14
SD_UNET="$SD_DIR/unet/diffusion_pytorch_model.fp16.safetensors"
SD_VAE="$SD_DIR/vae/diffusion_pytorch_model.fp16.safetensors"
SD_CLIP="$SD_DIR/text_encoder/model.fp16.safetensors"
SD_TOKENIZER=~/.cache/huggingface/hub/models--openai--clip-vit-base-patch32/snapshots/3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268/tokenizer.json

BLIP_MODEL=~/.cache/huggingface/hub/models--lmz--candle-blip/snapshots/73d3c462fe07bf5ed3d65afc9d1ff063b391952e/blip-image-captioning-large-q4k.gguf
BLIP_TOKENIZER=~/.cache/huggingface/hub/models--Salesforce--blip-image-captioning-large/snapshots/353689b859fcf0523410b1806dace5fb46ecdf41/tokenizer.json

# ============================================================================
# Download missing models
# ============================================================================
download_if_missing() {
  local path="$1"
  local url="$2"
  local name="$3"
  
  if [ ! -f "$path" ]; then
    echo "Downloading $name..."
    mkdir -p "$(dirname "$path")"
    curl -L -o "$path" "$url"
  fi
}

echo "Checking for required models..."

# Text generation models
download_if_missing "$QWEN_MODEL" \
  "https://huggingface.co/Qwen/Qwen2-0.5B-Instruct-GGUF/resolve/main/qwen2-0_5b-instruct-q4_0.gguf" \
  "Qwen2 0.5B Q4_0 (~350MB)"

download_if_missing "$QWEN_TOKENIZER" \
  "https://huggingface.co/Qwen/Qwen2-0.5B-Instruct/resolve/main/tokenizer.json" \
  "Qwen2 tokenizer"

# Stable Diffusion 1.5 models
download_if_missing "$SD_UNET" \
  "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/unet/diffusion_pytorch_model.fp16.safetensors" \
  "SD 1.5 UNet FP16 (~1.6GB)"

download_if_missing "$SD_VAE" \
  "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/vae/diffusion_pytorch_model.fp16.safetensors" \
  "SD 1.5 VAE FP16 (~167MB)"

download_if_missing "$SD_CLIP" \
  "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/text_encoder/model.fp16.safetensors" \
  "SD 1.5 CLIP FP16 (~235MB)"

download_if_missing "$SD_TOKENIZER" \
  "https://huggingface.co/openai/clip-vit-base-patch32/resolve/main/tokenizer.json" \
  "CLIP tokenizer"

# BLIP models
download_if_missing "$BLIP_MODEL" \
  "https://huggingface.co/lmz/candle-blip/resolve/main/blip-image-captioning-large-q4k.gguf" \
  "BLIP Large Q4K (~258MB)"

download_if_missing "$BLIP_TOKENIZER" \
  "https://huggingface.co/Salesforce/blip-image-captioning-large/resolve/main/tokenizer.json" \
  "BLIP tokenizer"

echo "All models ready."
echo ""

# ============================================================================
# Build
# ============================================================================
cargo build --release

# ============================================================================
# 1. Text Generation
# ============================================================================
echo "=== TEXT GENERATION ==="
./target/release/local-ai text \
  --model "$QWEN_MODEL" \
  --tokenizer "$QWEN_TOKENIZER" \
  --prompt "Write a haiku about programming"

echo ""

# ============================================================================
# 2. Image Generation (Stable Diffusion 1.5)
# ============================================================================
echo "=== IMAGE GENERATION ==="
./target/release/local-ai text-to-image \
  --prompt "A cute robot programming on a laptop" \
  --unet "$SD_UNET" \
  --vae "$SD_VAE" \
  --clip "$SD_CLIP" \
  --tokenizer "$SD_TOKENIZER" \
  --output generated.png \
  --height 512 --width 512 \
  --steps 20

echo ""

# ============================================================================
# 3. Image to Text
# ============================================================================
echo "=== IMAGE TO TEXT ==="
./target/release/local-ai image-to-text \
  --model "$BLIP_MODEL" \
  --tokenizer "$BLIP_TOKENIZER" \
  --image generated.png

echo ""

# ============================================================================
# 4. Text Embeddings (BERT / sentence-transformers)
# ============================================================================
echo "=== TEXT EMBEDDINGS ==="
./target/release/local-ai embed \
  --model "sentence-transformers/all-MiniLM-L6-v2" \
  --text "This is a test sentence." \
  --text "This is a completely different sentence about cats." \
  --format stats

echo ""
echo "Done!"
