import { InstrumentType } from "shared/lib/music/types";
import { PatternCell } from "shared/lib/uge/types";
import clamp from "shared/lib/helpers/clamp";
import { OCTAVE_SIZE } from "consts";
import l10n from "shared/lib/lang/l10n";

/** Note name labels indexed by semitone within an octave (C through B). */
export const noteName = [
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

/**
 * Get localised channel name
 */
export const getL10NChannelName = (channelId: 0 | 1 | 2 | 3): string => {
  if (channelId === 0) {
    return l10n("FIELD_CHANNEL_DUTY_1");
  } else if (channelId === 1) {
    return l10n("FIELD_CHANNEL_DUTY_2");
  } else if (channelId === 2) {
    return l10n("FIELD_CHANNEL_WAVE");
  } else {
    return l10n("FIELD_CHANNEL_NOISE");
  }
};

/**
 * Calculates BPM from a ticks-per-row value.
 * Uses the hUGETracker timing constant (59.7275… ticks/sec at 60Hz).
 */
export const getBPM = (ticksPerRow: number): number => {
  const BPM_FACTOR = (59.727500569606 * 60) / 4;
  return BPM_FACTOR / ticksPerRow;
};

/**
 * Derives a visually distinct HSL hue (0-360) for a pattern by index.
 * Uses the golden-angle increment so adjacent patterns have different hues.
 */
export const patternHue = (index: number): number =>
  ((index + 1) * 137.5) % 360;

/**
 * Renders a note number as a tracker display string (e.g. `"C-4"`, `"A#5"`).
 * Returns `"..."` when note is null.
 */
export const renderNote = (note: number | null): string => {
  if (note === null) {
    return "...";
  }
  const octave = ~~(note / 12) + 3;
  return `${noteName[note % 12]}${octave}`;
};

/**
 * Renders an instrument index as a zero-padded 2-digit string (1-based, e.g. `"01"`, `"16"`).
 * Returns `".."` when instrument is null.
 */
export const renderInstrument = (instrument: number | null): string => {
  if (instrument === null) return "..";
  return (instrument + 1).toString().padStart(2, "0") || "..";
};

/**
 * Renders an effect code as an uppercase hex character (e.g. `"A"`, `"F"`).
 * Returns `"."` when effectcode is null.
 */
export const renderEffect = (effectcode: number | null): string => {
  return effectcode?.toString(16).toUpperCase() || ".";
};

/**
 * Renders an effect parameter as a zero-padded 2-digit uppercase hex string (e.g. `"0F"`, `"FF"`).
 * Returns `".."` when effectparam is null.
 */
export const renderEffectParam = (effectparam: number | null): string => {
  return effectparam?.toString(16).toUpperCase().padStart(2, "0") || "..";
};

/**
 * Wraps a note value to the valid note range (0–71) using modulo arithmetic.
 * Handles negative values correctly.
 */
export const wrapNote = (note: number): number => {
  const TOTAL_NOTES = 72;
  return ((note % TOTAL_NOTES) + TOTAL_NOTES) % TOTAL_NOTES;
};

/**
 * Maps a GB channel ID to its instrument type.
 * Channels 0 and 1 are duty, channel 2 is wave, channel 3 is noise.
 */
export const channelIdToInstrumentType = (
  channelId: 0 | 1 | 2 | 3,
): InstrumentType => {
  if (channelId === 2) {
    return "wave";
  }
  if (channelId === 3) {
    return "noise";
  }
  return "duty";
};

/**
 * Transposes a note value by `noteDelta` semitones, clamped to the valid range (0–71).
 * When transposing by a full octave, keeps the note within its octave class boundaries.
 * Returns null unchanged.
 */
export const transposeNoteValue = (
  note: number | null,
  noteDelta: number,
): number | null => {
  if (note === null) {
    return note;
  }

  if (Math.abs(noteDelta) === OCTAVE_SIZE) {
    const noteClass = note % OCTAVE_SIZE;
    const min = noteClass;
    const max =
      noteClass + Math.floor((71 - noteClass) / OCTAVE_SIZE) * OCTAVE_SIZE;
    const next = note + noteDelta;
    return clamp(next, min, max);
  }

  return clamp(note + noteDelta, 0, 71);
};

/**
 * Renders a full pattern cell as a compact display object for debugging or logging.
 * Returns an object with string representations of each field.
 */
export const renderPatternCell = (
  cell: PatternCell,
): { note: string; instrument: string; effect: string; param: string } => ({
  note: renderNote(cell.note),
  instrument: renderInstrument(cell.instrument),
  effect: renderEffect(cell.effectcode),
  param: renderEffectParam(cell.effectparam),
});
