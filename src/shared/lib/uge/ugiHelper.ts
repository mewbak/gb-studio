/* eslint-disable camelcase */
import {
  DutyInstrument,
  NoiseInstrument,
  SubPatternCell,
  WaveInstrument,
} from "./types";

export type UGIInstrument = DutyInstrument | WaveInstrument | NoiseInstrument;

// A .ugi file is a raw binary dump of a single TInstrumentV3 struct from
// hUGETracker - identical to one instrument block in a .uge v6 file.
// Total size: 4 + 256 + 4 + 1 + 1 + 4 + 1 + 4 + 4 + 4 + 1 + 4 + 4 + 4 + 1
//             + 64 * (4 + 4 + 4 + 4 + 1) = 1385 bytes
export const UGI_INSTRUMENT_SIZE = 1385;

/**
 * Serialize a single instrument to the hUGETracker .ugi binary format.
 */
export const saveUGIInstrument = (instrument: UGIInstrument): Buffer => {
  const buffer = new ArrayBuffer(UGI_INSTRUMENT_SIZE);
  const view = new DataView(buffer);
  let idx = 0;

  const addUint8 = (value: number) => {
    view.setUint8(idx, value);
    idx += 1;
  };
  const addUint32 = (value: number) => {
    view.setUint32(idx, value, true);
    idx += 4;
  };
  const addShortString = (s: string) => {
    view.setUint8(idx, s.length);
    idx += 1;
    const te = new TextEncoder();
    te.encodeInto(s, new Uint8Array(buffer, idx, idx + 255));
    idx += 255;
  };

  const addSubpattern = (i: UGIInstrument) => {
    addUint8(i.subpatternEnabled ? 1 : 0);
    for (let n = 0; n < 64; n++) {
      const cell = i.subpattern[n];
      addUint32(cell?.note ?? 90);
      addUint32(0); // unused field (Instrument in TCellV2)
      addUint32(cell?.jump ?? 0);
      addUint32(cell?.effectcode ?? 0);
      addUint8(cell?.effectparam ?? 0);
    }
  };

  if (isDutyInstrument(instrument)) {
    addUint32(0); // type: duty/square
    addShortString(instrument.name || "");
    addUint32(instrument.length !== null ? 64 - instrument.length : 0);
    addUint8(instrument.length === null ? 0 : 1);
    addUint8(instrument.initialVolume);
    addUint32(instrument.volumeSweepChange < 0 ? 1 : 0);
    addUint8(
      instrument.volumeSweepChange !== 0
        ? 8 - Math.abs(instrument.volumeSweepChange)
        : 0,
    );
    addUint32(instrument.frequencySweepTime);
    addUint32(instrument.frequencySweepShift < 0 ? 1 : 0);
    addUint32(Math.abs(instrument.frequencySweepShift));
    addUint8(instrument.dutyCycle);
    addUint32(0); // wave_output_level (unused for duty)
    addUint32(0); // wave_waveform_index (unused for duty)
    addUint32(0); // counter_step (unused for duty)
    addSubpattern(instrument);
  } else if (isWaveInstrument(instrument)) {
    addUint32(1); // type: wave
    addShortString(instrument.name || "");
    addUint32(instrument.length !== null ? 256 - instrument.length : 0);
    addUint8(instrument.length === null ? 0 : 1);
    addUint8(0); // initialVolume (unused for wave)
    addUint32(0); // volume_direction (unused for wave)
    addUint8(0); // volume_sweep_amount (unused for wave)
    addUint32(0); // freq_sweep_time (unused for wave)
    addUint32(0); // freq_sweep_direction (unused for wave)
    addUint32(0); // freq_sweep_shift (unused for wave)
    addUint8(0); // duty (unused for wave)
    addUint32(instrument.volume);
    addUint32(instrument.waveIndex);
    addUint32(0); // counter_step (unused for wave)
    addSubpattern(instrument);
  } else {
    addUint32(2); // type: noise
    addShortString(instrument.name || "");
    addUint32(instrument.length !== null ? 64 - instrument.length : 0);
    addUint8(instrument.length === null ? 0 : 1);
    addUint8(instrument.initialVolume);
    addUint32(instrument.volumeSweepChange < 0 ? 1 : 0);
    addUint8(
      instrument.volumeSweepChange !== 0
        ? 8 - Math.abs(instrument.volumeSweepChange)
        : 0,
    );
    addUint32(0); // freq_sweep_time (unused for noise)
    addUint32(0); // freq_sweep_direction (unused for noise)
    addUint32(0); // freq_sweep_shift (unused for noise)
    addUint8(0); // duty (unused for noise)
    addUint32(0); // wave_output_level (unused for noise)
    addUint32(0); // wave_waveform_index (unused for noise)
    addUint32(instrument.bitCount === 7 ? 1 : 0);
    addSubpattern(instrument);
  }

  return Buffer.from(buffer);
};

/**
 * Parse a single instrument from a hUGETracker .ugi binary buffer.
 * Returns a typed instrument (DutyInstrument | WaveInstrument | NoiseInstrument).
 * Throws if the buffer is too small or contains an invalid instrument type.
 */
export const loadUGIInstrument = (buffer: Buffer): UGIInstrument => {
  if (buffer.byteLength < UGI_INSTRUMENT_SIZE) {
    throw new Error(
      `UGI buffer too small: expected at least ${UGI_INSTRUMENT_SIZE} bytes, got ${buffer.byteLength}`,
    );
  }

  const data = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  const uint8data = new Uint8Array(data);

  let offset = 0;

  const readUint32 = (): number => {
    const val = new DataView(data).getUint32(offset, true);
    offset += 4;
    return val;
  };
  const readUint8 = (): number => {
    return uint8data[offset++];
  };
  const readText = (): string => {
    const len = uint8data[offset];
    let text = "";
    if (len > 0) {
      text = new TextDecoder().decode(data.slice(offset + 1, offset + 1 + len));
    }
    offset += 256;
    return text;
  };

  const type = readUint32();
  const name = readText();
  const length = readUint32();
  const length_enabled = readUint8();
  let initialVolume = readUint8();
  if (initialVolume > 15) initialVolume = 15;
  const volume_direction = readUint32();
  let volume_sweep_amount = readUint8();
  if (volume_sweep_amount !== 0) volume_sweep_amount = 8 - volume_sweep_amount;
  if (volume_direction) volume_sweep_amount = -volume_sweep_amount;

  const freq_sweep_time = readUint32();
  const freq_sweep_direction = readUint32();
  let freq_sweep_shift = readUint32();
  if (freq_sweep_direction) freq_sweep_shift = -freq_sweep_shift;

  const duty = readUint8();
  const wave_output_level = readUint32();
  const wave_waveform_index = readUint32();
  const noise_counter_step = readUint32();
  const subpattern_enabled = readUint8();

  const subpattern: SubPatternCell[] = [];
  for (let n = 0; n < 64; n++) {
    const note = readUint32();
    offset += 4; // skip unused Instrument field (TCellV2)
    const jump = readUint32();
    const effectcode = readUint32();
    const effectparam = readUint8();

    subpattern.push({
      note: note === 90 ? null : note,
      jump,
      effectcode: effectcode === 0 && effectparam === 0 ? null : effectcode,
      effectparam: effectcode === 0 && effectparam === 0 ? null : effectparam,
    });
  }

  const subpatternData = {
    subpatternEnabled: subpattern_enabled !== 0,
    subpattern,
  };

  if (type === 0) {
    const instr: DutyInstrument = {
      index: 0,
      name,
      length: length_enabled ? 64 - length : null,
      dutyCycle: duty,
      initialVolume,
      volumeSweepChange: volume_sweep_amount,
      frequencySweepTime: freq_sweep_time,
      frequencySweepShift: freq_sweep_shift,
      ...subpatternData,
    };
    return instr;
  } else if (type === 1) {
    const instr: WaveInstrument = {
      index: 0,
      name,
      length: length_enabled ? 256 - length : null,
      volume: wave_output_level,
      waveIndex: wave_waveform_index,
      ...subpatternData,
    };
    return instr;
  } else if (type === 2) {
    const instr: NoiseInstrument = {
      index: 0,
      name,
      length: length_enabled ? 64 - length : null,
      initialVolume,
      volumeSweepChange: volume_sweep_amount,
      dividingRatio: 0,
      bitCount: noise_counter_step ? 7 : 15,
      ...subpatternData,
    };
    return instr;
  } else {
    throw new Error(`Invalid UGI instrument type: ${type}`);
  }
};

// Type guards

export const isDutyInstrument = (i: UGIInstrument): i is DutyInstrument =>
  "dutyCycle" in i;

export const isWaveInstrument = (i: UGIInstrument): i is WaveInstrument =>
  "waveIndex" in i;

export const isNoiseInstrument = (i: UGIInstrument): i is NoiseInstrument =>
  "bitCount" in i;

/**
 * Returns the instrument type string for a given UGIInstrument.
 */
export const ugiInstrumentType = (
  i: UGIInstrument,
): "duty" | "wave" | "noise" => {
  if (isDutyInstrument(i)) return "duty";
  if (isWaveInstrument(i)) return "wave";
  return "noise";
};
