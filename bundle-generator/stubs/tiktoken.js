/**
 * Stub for tiktoken - provides mock token counting for browser bundles.
 * tiktoken uses native WASM bindings that can't run in browsers.
 * This stub provides a simple character-based approximation (4 chars ≈ 1 token).
 */

function createMockEncoder() {
  return {
    encode(text) {
      // Simple approximation: ~4 characters per token
      const tokenCount = Math.ceil((text || '').length / 4);
      return new Array(tokenCount).fill(0);
    },
    decode(tokens) {
      return '';
    },
    free() {
      // No-op - no resources to free in mock
    }
  };
}

function encoding_for_model(model) {
  return createMockEncoder();
}

function get_encoding(encoding) {
  return createMockEncoder();
}

module.exports = {
  encoding_for_model,
  get_encoding
};
