import API from "renderer/lib/api";
import {
  DutyInstrument,
  NoiseInstrument,
  Song,
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
) => {
  API.music.sendToMusicWindow({
    action: "preview",
    type: "duty",
    note,
    instrument,
    channel,
  });
};

export const playWaveNotePreview = (
  note: number,
  instrument: WaveInstrument,
  waveForm: Uint8Array,
) => {
  API.music.sendToMusicWindow({
    action: "preview",
    type: "wave",
    note: note,
    instrument,
    waveForm,
  });
};

export const playNoiseNotePreview = (
  note: number,
  instrument: NoiseInstrument,
) => {
  API.music.sendToMusicWindow({
    action: "preview",
    type: "noise",
    note: note,
    instrument,
  });
};

export const playNotePreview = (
  song: Song,
  channel: number,
  note: number,
  instrumentIndex: number,
) => {
  if (channel === 0 || channel === 1) {
    // Duty
    const instrument = song.duty_instruments[instrumentIndex];
    playDutyNotePreview(note, instrument, channel);
  } else if (channel === 2) {
    // Wave
    const instrument = song.wave_instruments[instrumentIndex];
    const waveForm = song.waves[instrument.wave_index];
    playWaveNotePreview(note, instrument, waveForm);
  } else if (channel === 4) {
    const instrument = song.noise_instruments[instrumentIndex];
    playNoiseNotePreview(note, instrument);
  }
};
