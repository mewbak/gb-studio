import {
  PIANO_ROLL_CELL_SIZE,
  TOTAL_NOTES,
  TRACKER_PATTERN_LENGTH,
} from "consts";
import clamp from "shared/lib/helpers/clamp";

export const calculatePlaybackTrackerPosition = (
  playbackOrder: number,
  playbackRow: number,
) =>
  playbackOrder * TRACKER_PATTERN_LENGTH * PIANO_ROLL_CELL_SIZE +
  playbackRow * PIANO_ROLL_CELL_SIZE;

export const calculateDocumentWidth = (sequenceLength: number) =>
  sequenceLength * TRACKER_PATTERN_LENGTH * PIANO_ROLL_CELL_SIZE;

export const noteToRow = (note: number) => TOTAL_NOTES - 1 - note;

export const rowToNote = (row: number) => TOTAL_NOTES - 1 - row;

export const wrapNote = (note: number) =>
  ((note % TOTAL_NOTES) + TOTAL_NOTES) % TOTAL_NOTES;
export interface RollGridPoint {
  absRow: number;
  note: number;
}

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

export const pixelToGridIndex = (pixel: number) =>
  Math.floor(pixel / PIANO_ROLL_CELL_SIZE);

export const pixelToGridStart = (pixel: number) =>
  pixelToGridIndex(pixel) * PIANO_ROLL_CELL_SIZE;

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
