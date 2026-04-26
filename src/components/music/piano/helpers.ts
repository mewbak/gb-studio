import {
  PIANO_ROLL_CELL_SIZE,
  TOTAL_NOTES,
  TRACKER_PATTERN_LENGTH,
} from "consts";
import {
  DutyInstrument,
  NoiseInstrument,
  PatternCell,
  WaveInstrument,
} from "shared/lib/uge/types";
import clamp from "shared/lib/helpers/clamp";

type ChannelInstrument = DutyInstrument | WaveInstrument | NoiseInstrument;

const SET_VOLUME_EFFECT = 12;
const NOTE_CUT_EFFECT = 14;
const SET_SPEED_EFFECT = 15;
const TIMER_HZ = 64;

const isInstrumentAudible = (instrument: ChannelInstrument) =>
  "volume" in instrument
    ? instrument.volume > 0
    : instrument.initialVolume > 0 || instrument.volumeSweepChange > 0;

const getInstrumentLengthSeconds = (instrument: ChannelInstrument) =>
  instrument.length !== null ? instrument.length / 256 : null;

const getInstrumentFadeOutSeconds = (instrument: ChannelInstrument) => {
  if (
    "volume" in instrument ||
    instrument.initialVolume <= 0 ||
    instrument.volumeSweepChange >= 0
  ) {
    return null;
  }

  return (
    (instrument.initialVolume * (8 - Math.abs(instrument.volumeSweepChange))) /
    64
  );
};

export const getPatternTicksPerRow = (
  pattern: ReadonlyArray<PatternCell>,
  initialTicksPerRow: number,
) => {
  let currentTicksPerRow = initialTicksPerRow;

  return pattern.map((cell) => {
    if (cell.effectCode === SET_SPEED_EFFECT && (cell.effectParam ?? 0) > 0) {
      currentTicksPerRow = cell.effectParam ?? currentTicksPerRow;
    }

    return currentTicksPerRow;
  });
};

export const getPatternListStartTicksPerRow = (
  patterns: ReadonlyArray<ReadonlyArray<PatternCell> | undefined>,
  initialTicksPerRow: number,
) => {
  let currentPatternTicksPerRow = initialTicksPerRow;

  return patterns.map((pattern) => {
    const startTicksPerRow = currentPatternTicksPerRow;

    if (!pattern) {
      return startTicksPerRow;
    }

    const patternTicksPerRow = getPatternTicksPerRow(
      pattern,
      currentPatternTicksPerRow,
    );

    if (patternTicksPerRow.length > 0) {
      currentPatternTicksPerRow =
        patternTicksPerRow[patternTicksPerRow.length - 1];
    }

    return startTicksPerRow;
  });
};

export const getPatternListTicksPerRow = (
  patterns: ReadonlyArray<ReadonlyArray<PatternCell> | undefined>,
  initialTicksPerRow: number,
) => {
  const ticksPerRowByAbsRow: number[] = [];
  let currentPatternTicksPerRow = initialTicksPerRow;

  for (const pattern of patterns) {
    if (!pattern) {
      continue;
    }

    const patternTicksPerRow = getPatternTicksPerRow(
      pattern,
      currentPatternTicksPerRow,
    );
    ticksPerRowByAbsRow.push(...patternTicksPerRow);

    if (patternTicksPerRow.length > 0) {
      currentPatternTicksPerRow =
        patternTicksPerRow[patternTicksPerRow.length - 1];
    }
  }

  return ticksPerRowByAbsRow;
};

const getRowsForDurationSeconds = ({
  durationSeconds,
  startRowIndex,
  ticksPerRowByRow,
}: {
  durationSeconds: number;
  startRowIndex: number;
  ticksPerRowByRow: ReadonlyArray<number>;
}) => {
  let elapsedSeconds = 0;

  for (
    let rowIndex = startRowIndex;
    rowIndex < ticksPerRowByRow.length;
    rowIndex += 1
  ) {
    const rowDurationSeconds = ticksPerRowByRow[rowIndex] / TIMER_HZ;
    const nextElapsedSeconds = elapsedSeconds + rowDurationSeconds;

    if (nextElapsedSeconds >= durationSeconds) {
      const secondsIntoRow = durationSeconds - elapsedSeconds;
      return rowIndex - startRowIndex + secondsIntoRow / rowDurationSeconds;
    }

    elapsedSeconds = nextElapsedSeconds;
  }

  return ticksPerRowByRow.length - startRowIndex;
};

const getRowsUntilNextNote = (
  channelCells: ReadonlyArray<PatternCell>,
  rowIndex: number,
) => {
  for (
    let nextRow = rowIndex + 1;
    nextRow < channelCells.length;
    nextRow += 1
  ) {
    if (channelCells[nextRow].note !== null) {
      return nextRow - rowIndex;
    }
  }

  return null;
};

const getRowsUntilSilenceEffect = (
  channelCells: ReadonlyArray<PatternCell>,
  ticksPerRowByRow: ReadonlyArray<number>,
  rowIndex: number,
) => {
  for (let nextRow = rowIndex; nextRow < channelCells.length; nextRow += 1) {
    const cell = channelCells[nextRow];

    if (
      cell.effectCode === SET_VOLUME_EFFECT &&
      (cell.effectParam ?? 0) === 0
    ) {
      return nextRow - rowIndex + 1;
    }

    if (cell.effectCode === NOTE_CUT_EFFECT) {
      const ticksPerRow = ticksPerRowByRow[nextRow];
      const cutTick = cell.effectParam ?? 0;

      if (cutTick < ticksPerRow) {
        return nextRow - rowIndex + cutTick / ticksPerRow;
      }
    }
  }

  return null;
};

export const getPatternNoteSustain = ({
  instruments,
  channelCells,
  ticksPerRowByRow,
  rowIndex,
  instrumentId,
}: {
  instruments: ReadonlyArray<ChannelInstrument> | undefined;
  channelCells: ReadonlyArray<PatternCell>;
  ticksPerRowByRow: ReadonlyArray<number>;
  rowIndex: number;
  instrumentId: number | null;
}): number => {
  if (instrumentId === null || !instruments) {
    return 0;
  }

  const instrument = instruments[instrumentId];
  if (!instrument || !isInstrumentAudible(instrument)) {
    return 0;
  }

  const remainingRows = Math.max(channelCells.length - rowIndex, 1);
  let duration = remainingRows;

  // Check when note would end because another note played on the same channel
  const rowsUntilNextNote = getRowsUntilNextNote(channelCells, rowIndex);
  if (rowsUntilNextNote !== null && rowsUntilNextNote < duration) {
    duration = rowsUntilNextNote;
  }

  // Check when note would end because a Note Cut or Volume effect would stop it
  const rowsUntilSilenceEffect = getRowsUntilSilenceEffect(
    channelCells,
    ticksPerRowByRow,
    rowIndex,
  );
  if (rowsUntilSilenceEffect !== null && rowsUntilSilenceEffect < duration) {
    duration = rowsUntilSilenceEffect;
  }

  // Check when note would end because the instrument length was reached
  const instrumentLengthSeconds = getInstrumentLengthSeconds(instrument);
  if (instrumentLengthSeconds !== null) {
    const rowsUntilInstrumentLength = getRowsForDurationSeconds({
      durationSeconds: instrumentLengthSeconds,
      startRowIndex: rowIndex,
      ticksPerRowByRow,
    });
    if (rowsUntilInstrumentLength < duration) {
      duration = rowsUntilInstrumentLength;
    }
  }

  // Check when note would end because the instrument envelope fade out ended
  const fadeOutSeconds = getInstrumentFadeOutSeconds(instrument);
  if (fadeOutSeconds !== null) {
    const rowsUntilFadeOut = getRowsForDurationSeconds({
      durationSeconds: fadeOutSeconds,
      startRowIndex: rowIndex,
      ticksPerRowByRow,
    });
    if (rowsUntilFadeOut < duration) {
      duration = rowsUntilFadeOut;
    }
  }

  return Math.max(1, duration);
};

/** Calculates the pixel offset of the playback cursor in the piano-roll timeline. */
export const calculatePlaybackTrackerPosition = (
  playbackOrder: number,
  playbackRow: number,
  currentTick = 0,
  ticksPerRow = 0,
) =>
  playbackOrder * TRACKER_PATTERN_LENGTH * PIANO_ROLL_CELL_SIZE +
  (playbackRow +
    (ticksPerRow > 0 ? clamp(currentTick / ticksPerRow, 0, 1) : 0)) *
    PIANO_ROLL_CELL_SIZE;

/** Calculates the total pixel width of the piano-roll document for a given sequence length. */
export const calculateDocumentWidth = (sequenceLength: number) =>
  sequenceLength * TRACKER_PATTERN_LENGTH * PIANO_ROLL_CELL_SIZE;

/** Converts a MIDI-style note number to a piano-roll row index (top = highest note). */
export const noteToRow = (note: number) => TOTAL_NOTES - 1 - note;

/** Converts a piano-roll row index back to a MIDI-style note number. */
export const rowToNote = (row: number) => TOTAL_NOTES - 1 - row;

interface RollGridPoint {
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

const pixelToGridStart = (pixel: number) =>
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
