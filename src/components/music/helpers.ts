import API from "renderer/lib/api";
import {
  DutyInstrument,
  NoiseInstrument,
  WaveInstrument,
} from "shared/lib/uge/types";

const BPM_FACTOR = (59.727500569606 * 60) / 4;

export function getBPM(ticksPerRow: number): number {
  return BPM_FACTOR / ticksPerRow;
}

export const patternHue = (index: number) => ((index + 1) * 137.5) % 360;

const noteName = [
  "C-",
  "C#",
  "D-",
  "D#",
  "E-",
  "F-",
  "F#",
  "G-",
  "G#",
  "A-",
  "A#",
  "B-",
];
export const renderNote = (note: number | null): string => {
  if (note === null) {
    return "...";
  }
  const octave = ~~(note / 12) + 3;
  return `${noteName[note % 12]}${octave}`;
};

export const renderInstrument = (instrument: number | null): string => {
  if (instrument === null) return "..";
  return (instrument + 1).toString().padStart(2, "0") || "..";
};

export const renderEffect = (effectcode: number | null): string => {
  return effectcode?.toString(16).toUpperCase() || ".";
};

export const renderEffectParam = (effectparam: number | null): string => {
  return effectparam?.toString(16).toUpperCase().padStart(2, "0") || "..";
};

export const playDutyNotePreview = (
  note: number,
  instrument: DutyInstrument,
  channel: 0 | 1,
  effectCode: number,
  effectParam: number,
) => {
  API.music.sendToMusicWindow({
    action: "preview",
    type: "duty",
    note,
    instrument,
    channel,
    effectCode,
    effectParam,
  });
};

export const playWaveNotePreview = (
  note: number,
  instrument: WaveInstrument,
  waveForm: Uint8Array,
  effectCode: number,
  effectParam: number,
) => {
  API.music.sendToMusicWindow({
    action: "preview",
    type: "wave",
    note: note,
    instrument,
    waveForm,
    effectCode,
    effectParam,
  });
};

export const playNoiseNotePreview = (
  note: number,
  instrument: NoiseInstrument,
  effectCode: number,
  effectParam: number,
) => {
  API.music.sendToMusicWindow({
    action: "preview",
    type: "noise",
    note: note,
    instrument,
    effectCode,
    effectParam,
  });
};
