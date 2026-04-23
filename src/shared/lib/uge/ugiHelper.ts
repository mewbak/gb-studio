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
    addUint32(0); // waveOutputLevel (unused for duty)
    addUint32(0); // waveWaveformIndex (unused for duty)
    addUint32(0); // counterStep (unused for duty)
    addSubpattern(instrument);
  } else if (isWaveInstrument(instrument)) {
    addUint32(1); // type: wave
    addShortString(instrument.name || "");
    addUint32(instrument.length !== null ? 256 - instrument.length : 0);
    addUint8(instrument.length === null ? 0 : 1);
    addUint8(0); // initialVolume (unused for wave)
    addUint32(0); // volumeDirection (unused for wave)
    addUint8(0); // volumeSweepAmount (unused for wave)
    addUint32(0); // freqSweepTime (unused for wave)
    addUint32(0); // freqSweepDirection (unused for wave)
    addUint32(0); // freqSweepShift (unused for wave)
    addUint8(0); // duty (unused for wave)
    addUint32(instrument.volume);
    addUint32(instrument.waveIndex);
    addUint32(0); // counterStep (unused for wave)
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
    addUint32(0); // freqSweepTime (unused for noise)
    addUint32(0); // freqSweepDirection (unused for noise)
    addUint32(0); // freqSweepShift (unused for noise)
    addUint8(0); // duty (unused for noise)
    addUint32(0); // waveOutputLevel (unused for noise)
    addUint32(0); // waveWaveformIndex (unused for noise)
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
  const lengthEnabled = readUint8();
  let initialVolume = readUint8();
  if (initialVolume > 15) initialVolume = 15;
  const volumeDirection = readUint32();
  let volumeSweepAmount = readUint8();
  if (volumeSweepAmount !== 0) volumeSweepAmount = 8 - volumeSweepAmount;
  if (volumeDirection) volumeSweepAmount = -volumeSweepAmount;

  const freqSweepTime = readUint32();
  const freqSweepDirection = readUint32();
  let freqSweepShift = readUint32();
  if (freqSweepDirection) freqSweepShift = -freqSweepShift;

  const duty = readUint8();
  const waveOutputLevel = readUint32();
  const waveWaveformIndex = readUint32();
  const noiseCounterStep = readUint32();
  const subpatternEnabled = readUint8();

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
    subpatternEnabled: subpatternEnabled !== 0,
    subpattern,
  };

  if (type === 0) {
    const instr: DutyInstrument = {
      index: 0,
      name,
      length: lengthEnabled ? 64 - length : null,
      dutyCycle: duty,
      initialVolume,
      volumeSweepChange: volumeSweepAmount,
      frequencySweepTime: freqSweepTime,
      frequencySweepShift: freqSweepShift,
      ...subpatternData,
    };
    return instr;
  } else if (type === 1) {
    const instr: WaveInstrument = {
      index: 0,
      name,
      length: lengthEnabled ? 256 - length : null,
      volume: waveOutputLevel,
      waveIndex: waveWaveformIndex,
      ...subpatternData,
    };
    return instr;
  } else if (type === 2) {
    const instr: NoiseInstrument = {
      index: 0,
      name,
      length: lengthEnabled ? 64 - length : null,
      initialVolume,
      volumeSweepChange: volumeSweepAmount,
      dividingRatio: 0,
      bitCount: noiseCounterStep ? 7 : 15,
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
