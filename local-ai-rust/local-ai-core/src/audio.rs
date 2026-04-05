//! Audio processing utilities

use crate::error::{LocalAiError, Result};
use std::io::Write;
use std::path::Path;

/// Decode audio file to PCM samples
pub fn pcm_decode<P: AsRef<Path>>(path: P) -> Result<(Vec<f32>, u32)> {
    use symphonia::core::audio::{AudioBufferRef, Signal};
    use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
    use symphonia::core::conv::FromSample;

    fn conv<T>(
        samples: &mut Vec<f32>,
        data: std::borrow::Cow<symphonia::core::audio::AudioBuffer<T>>,
    ) where
        T: symphonia::core::sample::Sample,
        f32: symphonia::core::conv::FromSample<T>,
    {
        samples.extend(data.chan(0).iter().map(|v| f32::from_sample(*v)))
    }

    let src = std::fs::File::open(path)?;
    let mss = symphonia::core::io::MediaSourceStream::new(Box::new(src), Default::default());
    let hint = symphonia::core::probe::Hint::new();
    let meta_opts: symphonia::core::meta::MetadataOptions = Default::default();
    let fmt_opts: symphonia::core::formats::FormatOptions = Default::default();

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .map_err(|e| LocalAiError::Audio(format!("Failed to probe audio format: {e}")))?;
    let mut format = probed.format;

    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| LocalAiError::Audio("No supported audio tracks found".to_string()))?;

    let dec_opts: DecoderOptions = Default::default();
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &dec_opts)
        .map_err(|_| LocalAiError::Audio("Unsupported codec".to_string()))?;
    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.unwrap_or(0);
    let mut pcm_data = Vec::new();

    while let Ok(packet) = format.next_packet() {
        while !format.metadata().is_latest() {
            format.metadata().pop();
        }
        if packet.track_id() != track_id {
            continue;
        }
        match decoder
            .decode(&packet)
            .map_err(|e| LocalAiError::Audio(format!("Decode error: {e}")))?
        {
            AudioBufferRef::F32(buf) => pcm_data.extend(buf.chan(0)),
            AudioBufferRef::U8(data) => conv(&mut pcm_data, data),
            AudioBufferRef::U16(data) => conv(&mut pcm_data, data),
            AudioBufferRef::U24(data) => conv(&mut pcm_data, data),
            AudioBufferRef::U32(data) => conv(&mut pcm_data, data),
            AudioBufferRef::S8(data) => conv(&mut pcm_data, data),
            AudioBufferRef::S16(data) => conv(&mut pcm_data, data),
            AudioBufferRef::S24(data) => conv(&mut pcm_data, data),
            AudioBufferRef::S32(data) => conv(&mut pcm_data, data),
            AudioBufferRef::F64(data) => conv(&mut pcm_data, data),
        }
    }

    Ok((pcm_data, sample_rate))
}

/// Write PCM samples to a WAV file
pub fn write_pcm_as_wav<W: Write>(w: &mut W, samples: &[f32], sample_rate: u32) -> std::io::Result<()> {
    let len = 12u32; // header
    let len = len + 24u32; // fmt
    let len = len + samples.len() as u32 * 2 + 8; // data
    let n_channels = 1u16;
    let bytes_per_second = sample_rate * 2 * n_channels as u32;

    w.write_all(b"RIFF")?;
    w.write_all(&(len - 8).to_le_bytes())?;
    w.write_all(b"WAVE")?;

    // Format block
    w.write_all(b"fmt ")?;
    w.write_all(&16u32.to_le_bytes())?;
    w.write_all(&1u16.to_le_bytes())?; // PCM
    w.write_all(&n_channels.to_le_bytes())?;
    w.write_all(&sample_rate.to_le_bytes())?;
    w.write_all(&bytes_per_second.to_le_bytes())?;
    w.write_all(&2u16.to_le_bytes())?;
    w.write_all(&16u16.to_le_bytes())?;

    // Data block
    w.write_all(b"data")?;
    w.write_all(&(samples.len() as u32 * 2).to_le_bytes())?;
    for sample in samples.iter() {
        let s = (sample.clamp(-1.0, 1.0) * 32767.0) as i16;
        w.write_all(&s.to_le_bytes())?;
    }
    Ok(())
}

/// Normalize audio loudness
pub fn normalize_loudness(pcm: &[f32]) -> Vec<f32> {
    let max_val = pcm.iter().map(|x| x.abs()).fold(0.0f32, f32::max);
    if max_val > 0.0 {
        pcm.iter().map(|x| x / max_val * 0.95).collect()
    } else {
        pcm.to_vec()
    }
}
