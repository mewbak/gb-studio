import {
  OCTAVE_SIZE,
  TOTAL_NOTES,
  TRACKER_CHANNEL_FIELDS,
  TRACKER_NUM_CHANNELS,
  TRACKER_PATTERN_LENGTH,
  TRACKER_ROW_SIZE,
} from "consts";
import clamp from "shared/lib/helpers/clamp";
import { PatternCell } from "shared/lib/uge/types";
import { createPatternCell } from "shared/lib/uge/song";
import { noteStringsForClipboard } from "shared/lib/music/constants";
import { toValidChannelId } from "shared/lib/uge/editor/helpers";

export const NO_CHANGE_ON_PASTE = -9;

type PatternCellKey = keyof PatternCell;
const patternCellFields: PatternCellKey[] = [
  "note",
  "instrument",
  "effectcode",
  "effectparam",
];

export interface AbsRowPosition {
  sequenceId: number;
  rowId: number;
}

export const toAbsRow = (sequenceId: number, rowId: number) =>
  sequenceId * TRACKER_PATTERN_LENGTH + rowId;

export const fromAbsRow = (absRow: number): AbsRowPosition => ({
  sequenceId: Math.floor(absRow / TRACKER_PATTERN_LENGTH),
  rowId: absRow % TRACKER_PATTERN_LENGTH,
});

export interface ResolvedAbsRow extends AbsRowPosition {
  patternId: number;
}

export const resolveAbsRow = (
  sequence: number[],
  absRow: number,
): ResolvedAbsRow | null => {
  const { sequenceId, rowId } = fromAbsRow(absRow);
  const patternId = sequence[sequenceId];
  if (patternId === undefined) {
    return null;
  }
  return { sequenceId, rowId, patternId };
};

export const transposePatternCellNote = (
  cell: PatternCell | undefined,
  noteDelta: number,
) => {
  if (!cell) {
    return;
  }

  if (cell.note === null) {
    return;
  }

  if (Math.abs(noteDelta) === OCTAVE_SIZE) {
    const noteClass = cell.note % OCTAVE_SIZE;
    const min = noteClass;
    const max =
      noteClass + Math.floor((71 - noteClass) / OCTAVE_SIZE) * OCTAVE_SIZE;
    const next = cell.note + noteDelta;
    cell.note = clamp(next, min, max);
    return;
  }

  cell.note = clamp(cell.note + noteDelta, 0, 71);
};

export const getTransposeNoteDelta = (
  direction: "up" | "down",
  size: "note" | "octave",
) => {
  const deltaBase = direction === "up" ? 1 : -1;
  return size === "octave" ? deltaBase * OCTAVE_SIZE : deltaBase;
};

interface ResolvedTrackerCell {
  patternId: number;
  rowIndex: number;
  channelIndex: 0 | 1 | 2 | 3;
}

export const resolveUniqueTrackerCells = (
  patternId: number,
  selectedTrackerFields: number[],
): ResolvedTrackerCell[] => {
  const seen = new Set<string>();
  const resolvedCells: ResolvedTrackerCell[] = [];

  for (const field of selectedTrackerFields) {
    const rowIndex = Math.floor(field / TRACKER_ROW_SIZE);
    const channelIndex = toValidChannelId(
      Math.floor(field / TRACKER_CHANNEL_FIELDS) % TRACKER_NUM_CHANNELS,
    );
    const key = `${patternId}:${rowIndex}:${channelIndex}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    resolvedCells.push({
      patternId,
      rowIndex,
      channelIndex,
    });
  }

  return resolvedCells;
};

interface ResolvedTrackerCellField {
  patternId: number;
  rowIndex: number;
  channelIndex: number;
  fieldIndex: number;
}

export const resolveTrackerCellFields = (
  patternId: number,
  selectedTrackerFields: number[],
): ResolvedTrackerCellField[] => {
  const seen = new Set<string>();
  const resolvedCells: ResolvedTrackerCellField[] = [];

  for (const field of selectedTrackerFields) {
    const rowIndex = Math.floor(field / TRACKER_ROW_SIZE);
    const channelIndex =
      Math.floor(field / TRACKER_CHANNEL_FIELDS) % TRACKER_NUM_CHANNELS;
    const fieldIndex = field % TRACKER_CHANNEL_FIELDS;
    const key = `${patternId}:${rowIndex}:${channelIndex}:${fieldIndex}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    resolvedCells.push({
      patternId,
      rowIndex,
      channelIndex,
      fieldIndex,
    });
  }

  return resolvedCells;
};

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

const patternCelltoString = (
  p: PatternCell,
  fields: PatternCellKey[] = [
    "note",
    "instrument",
    "effectcode",
    "effectparam",
  ],
) => {
  return `|${fields.includes("note") ? renderNote(p.note) : "   "}${
    fields.includes("instrument") ? renderInstrument(p.instrument) : "  "
  }...${fields.includes("effectcode") ? renderEffect(p.effectcode) : " "}${
    fields.includes("effectparam") ? renderEffectParam(p.effectparam) : "  "
  }`;
};

export const parseClipboardOrigin = (clipboard: string): number | null => {
  const match = clipboard.match(/^GBStudio origin: (\d+)$/m);
  return match ? parseInt(match[1], 10) : null;
};

export const parsePatternToClipboard = (
  pattern: PatternCell[][],
  channelId?: number,
  selectedCells?: number[],
  originAbsRow?: number,
) => {
  let parsed: string[] = [
    "GBStudio hUGETracker Piano format compatible with...",
    "ModPlug Tracker  XM",
  ];

  if (originAbsRow !== undefined) {
    parsed.push(`GBStudio origin: ${originAbsRow}`);
  }

  if (!selectedCells) {
    parsed = pattern.map((p) => {
      if (channelId !== undefined) {
        const row = p[channelId];
        return patternCelltoString(row);
      } else {
        return `${patternCelltoString(p[0])}${patternCelltoString(
          p[1],
        )}${patternCelltoString(p[2])}${patternCelltoString(p[3])}`;
      }
    });
  } else if (selectedCells.length > 0) {
    const sortedSelectedCells = [...selectedCells].sort((a, b) => a - b);
    console.log(selectedCells, sortedSelectedCells);
    for (
      let i = sortedSelectedCells[0];
      i <= sortedSelectedCells[sortedSelectedCells.length - 1];
      i++
    ) {
      if (channelId !== undefined) {
        if (selectedCells.indexOf(i) > -1) {
          parsed.push(patternCelltoString(pattern[i][channelId]));
        } else {
          parsed.push(patternCelltoString(createPatternCell()));
        }
      }
    }
  }

  return parsed.join("\n");
};

export const parsePatternFieldsToClipboard = (
  pattern: PatternCell[][],
  selectedFields: number[],
) => {
  const parsed: string[] = [
    "GBStudio hUGETracker paste format compatible with...",
    "ModPlug Tracker  XM",
  ];

  const w =
    (selectedFields[selectedFields.length - 1] - selectedFields[0]) % 16;
  const h = Math.floor(
    (selectedFields[selectedFields.length - 1] - selectedFields[0]) / 16,
  );
  const firstRow = Math.floor(selectedFields[0] / 16);
  const firstColumn = selectedFields[0] % 16;
  for (let i = firstRow; i <= firstRow + h; i++) {
    let rowStr = "";
    for (
      let j = Math.floor(firstColumn / 4);
      j <= Math.floor((firstColumn + w) / 4);
      j++
    ) {
      const start = firstColumn - j * 4;
      const end = w + 1;
      rowStr += `${patternCelltoString(
        pattern[i][j],
        patternCellFields.slice(Math.max(0, start), start + end),
      )}`;
    }
    parsed.push(rowStr);
  }
  return parsed.join("\n");
};

export const parseClipboardToPattern = (clipboard: string) => {
  const strToInt = (string: string, radix: number, offset = 0) => {
    const int = parseInt(string, radix);
    return isNaN(int) ? null : int + offset;
  };
  const rows = clipboard.split("\n");
  const pattern = rows
    .filter((r) => r[0] === "|")
    .map((r, i) => {
      console.log(`ROW ${i}: `, r);
      if (r[0] === "|") {
        const channel = r.substring(1).split("|");
        return channel.map((c, j) => {
          console.log(`CELL ${j}:`, c);
          const patternCell = createPatternCell();
          const cellString = [
            c.substring(0, 3),
            c.substring(3, 5),
            c.substring(8, 9),
            c.substring(9, 11),
          ];
          // Send NO_CHANGE_ON_PASTE to not change parameter when merging
          const note = noteStringsForClipboard.indexOf(cellString[0]);
          patternCell.note =
            cellString[0] !== "   "
              ? note === -1
                ? null
                : note
              : NO_CHANGE_ON_PASTE;
          patternCell.instrument =
            cellString[1] !== "  "
              ? strToInt(cellString[1], 10, -1)
              : NO_CHANGE_ON_PASTE;
          patternCell.effectcode =
            cellString[2] !== " "
              ? strToInt(cellString[2], 16)
              : NO_CHANGE_ON_PASTE;
          patternCell.effectparam =
            cellString[3] !== "  "
              ? strToInt(cellString[3], 16)
              : NO_CHANGE_ON_PASTE;
          return patternCell;
        });
      }
      throw new Error("Unsupported format");
    });

  return pattern;
};

export const wrapNote = (note: number) =>
  ((note % TOTAL_NOTES) + TOTAL_NOTES) % TOTAL_NOTES;
