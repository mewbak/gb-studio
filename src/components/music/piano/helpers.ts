import {
  PIANO_ROLL_CELL_SIZE,
  TOTAL_NOTES,
  TRACKER_PATTERN_LENGTH,
} from "consts";
import clamp from "shared/lib/helpers/clamp";

/** Calculates the pixel offset of the playback cursor in the piano-roll timeline. */
export const calculatePlaybackTrackerPosition = (
  playbackOrder: number,
  playbackRow: number,
) =>
  playbackOrder * TRACKER_PATTERN_LENGTH * PIANO_ROLL_CELL_SIZE +
  playbackRow * PIANO_ROLL_CELL_SIZE;

/** Calculates the total pixel width of the piano-roll document for a given sequence length. */
export const calculateDocumentWidth = (sequenceLength: number) =>
  sequenceLength * TRACKER_PATTERN_LENGTH * PIANO_ROLL_CELL_SIZE;

/** Converts a MIDI-style note number to a piano-roll row index (top = highest note). */
export const noteToRow = (note: number) => TOTAL_NOTES - 1 - note;

/** Converts a piano-roll row index back to a MIDI-style note number. */
export const rowToNote = (row: number) => TOTAL_NOTES - 1 - row;

export interface RollGridPoint {
  absRow: number;
  note: number;
}

/**
 * Bresenham line interpolation between two grid points. Returns all grid
 * positions that should be filled when drawing from `from` to `to`.
 */
export const interpolateGridLine = (
  from: RollGridPoint | null,
  to: RollGridPoint,
): RollGridPoint[] => {
  if (!from) {
    return [to];
  }

  const points: RollGridPoint[] = [];
  let x0 = from.absRow;
  let y0 = from.note;
  const x1 = to.absRow;
  const y1 = to.note;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (x0 !== x1 || y0 !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    points.push({ absRow: x0, note: y0 });
  }

  return points;
};

/** Converts a pixel offset to a grid cell index using `PIANO_ROLL_CELL_SIZE`. */
export const pixelToGridIndex = (pixel: number) =>
  Math.floor(pixel / PIANO_ROLL_CELL_SIZE);

export const pixelToGridStart = (pixel: number) =>
  pixelToGridIndex(pixel) * PIANO_ROLL_CELL_SIZE;

/**
 * Converts a pixel range [start, start+size] to a clamped grid cell range
 * [from, to]. Useful for determining which cells overlap a viewport region.
 */
export const pixelRangeToGridRange = (
  start: number,
  size: number,
  max: number,
) => {
  const from = clamp(Math.floor(start / PIANO_ROLL_CELL_SIZE), 0, max - 1);

  const to = clamp(
    Math.ceil((start + size) / PIANO_ROLL_CELL_SIZE),
    from + 1,
    max,
  );

  return { from, to };
};

/**
 * Converts page coordinates to a snapped grid point within the piano-roll
 * canvas. Clamps the result to the valid document bounds.
 */
export const pageToSnappedGridPoint = (
  pageX: number,
  pageY: number,
  bounds: DOMRect,
  sequenceLength: number,
) => {
  const totalAbsRows = sequenceLength * TRACKER_PATTERN_LENGTH;

  return {
    x: clamp(
      pixelToGridStart(pageX - bounds.left),
      0,
      totalAbsRows * PIANO_ROLL_CELL_SIZE - 1,
    ),
    y: clamp(
      pixelToGridStart(pageY - bounds.top),
      0,
      TOTAL_NOTES * PIANO_ROLL_CELL_SIZE - PIANO_ROLL_CELL_SIZE,
    ),
  };
};
