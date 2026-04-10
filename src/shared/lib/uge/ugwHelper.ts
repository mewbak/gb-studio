/** Size of a .ugw file: 32 bytes (TWave = TWaveV2 = packed array[0..31] of Byte) */
export const UGW_WAVE_SIZE = 32;

/**
 * Serialise a single waveform to the .ugw binary format used by hUGETracker.
 * The format is simply the 32 raw 4-bit sample bytes, one per byte.
 */
export const saveUGWave = (wave: Uint8Array): Buffer => {
  if (wave.length !== UGW_WAVE_SIZE) {
    throw new Error(
      `Invalid wave length: expected ${UGW_WAVE_SIZE}, got ${wave.length}`,
    );
  }
  const buf = Buffer.alloc(UGW_WAVE_SIZE);
  for (let i = 0; i < UGW_WAVE_SIZE; i++) {
    buf.writeUInt8(wave[i], i);
  }
  return buf;
};

/**
 * Parse a .ugw binary buffer into a 32-byte waveform array.
 * Throws if the buffer is too small.
 */
export const loadUGWave = (buffer: Buffer): Uint8Array => {
  if (buffer.length < UGW_WAVE_SIZE) {
    throw new Error(
      `Buffer too small: expected at least ${UGW_WAVE_SIZE} bytes, got ${buffer.length}`,
    );
  }
  return new Uint8Array(buffer.buffer, buffer.byteOffset, UGW_WAVE_SIZE);
};
