//! Device selection utilities

use crate::error::{LocalAiError, Result};
use candle_core::Device;
use serde::{Deserialize, Serialize};

/// Device type for inference
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum DeviceType {
    /// CPU device
    #[default]
    Cpu,
    /// Metal (macOS GPU)
    Metal,
    /// CUDA (NVIDIA GPU)
    Cuda,
    /// Auto-detect best available device
    Auto,
}

impl DeviceType {
    /// Select the appropriate Candle device
    pub fn to_device(&self) -> Result<Device> {
        match self {
            DeviceType::Cpu => Ok(Device::Cpu),
            DeviceType::Metal => {
                #[cfg(feature = "metal")]
                {
                    Device::new_metal(0).map_err(LocalAiError::Candle)
                }
                #[cfg(not(feature = "metal"))]
                {
                    Err(LocalAiError::Config(
                        "Metal feature not enabled at compile time".to_string(),
                    ))
                }
            }
            DeviceType::Cuda => {
                #[cfg(feature = "cuda")]
                {
                    Device::new_cuda(0).map_err(LocalAiError::Candle)
                }
                #[cfg(not(feature = "cuda"))]
                {
                    Err(LocalAiError::Config(
                        "CUDA feature not enabled at compile time".to_string(),
                    ))
                }
            }
            DeviceType::Auto => select_best_device(),
        }
    }
}

/// Automatically select the best available device
pub fn select_best_device() -> Result<Device> {
    #[cfg(feature = "metal")]
    {
        if let Ok(device) = Device::new_metal(0) {
            return Ok(device);
        }
    }

    #[cfg(feature = "cuda")]
    {
        if let Ok(device) = Device::new_cuda(0) {
            return Ok(device);
        }
    }

    Ok(Device::Cpu)
}

impl std::fmt::Display for DeviceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DeviceType::Cpu => write!(f, "cpu"),
            DeviceType::Metal => write!(f, "metal"),
            DeviceType::Cuda => write!(f, "cuda"),
            DeviceType::Auto => write!(f, "auto"),
        }
    }
}

impl std::str::FromStr for DeviceType {
    type Err = LocalAiError;

    fn from_str(s: &str) -> Result<Self> {
        match s.to_lowercase().as_str() {
            "cpu" => Ok(DeviceType::Cpu),
            "metal" => Ok(DeviceType::Metal),
            "cuda" => Ok(DeviceType::Cuda),
            "auto" => Ok(DeviceType::Auto),
            _ => Err(LocalAiError::InvalidParameter(format!(
                "Invalid device type: {}. Valid options: cpu, metal, cuda, auto",
                s
            ))),
        }
    }
}
