import { PatternCell, SubPatternCell } from "shared/lib/uge/types";
import { noteStringsForClipboard } from "shared/lib/music/constants";
import { createPatternCell, createSubPatternCell } from "shared/lib/uge/song";
import {
  renderNote,
  renderInstrument,
  renderEffect,
  renderEffectParam,
} from "shared/lib/uge/display";

/**
 * Sentinel value used in clipboard paste operations to signal "leave this
 * field unchanged" rather than writing a real value or null.
 */
export const NO_CHANGE_ON_PASTE = -9;

type PatternCellKey = keyof PatternCell;
const patternCellFields: PatternCellKey[] = [
  "note",
  "instrument",
  "effectcode",
  "effectparam",
];

type SubPatternCellKey = keyof SubPatternCell;
const subPatternCellFields: SubPatternCellKey[] = [
  "note",
  "jump",
  "effectcode",
  "effectparam",
];

// ── Pattern cell string formatting ──────────────────────────────────────────

/** Serialises a single PatternCell to the MOD-compatible tracker clipboard format. */
const patternCellToString = (
  p: PatternCell,
  fields: PatternCellKey[] = patternCellFields,
): string => {
  return `|${fields.includes("note") ? renderNote(p.note) : "   "}${
    fields.includes("instrument") ? renderInstrument(p.instrument) : "  "
  }...${fields.includes("effectcode") ? renderEffect(p.effectcode) : " "}${
    fields.includes("effectparam") ? renderEffectParam(p.effectparam) : "  "
  }`;
};

/** Serialises a single SubPatternCell to the MOD-compatible tracker clipboard format. */
const subPatternCellToString = (
  p: SubPatternCell,
  fields: SubPatternCellKey[] = subPatternCellFields,
): string => {
  return `|${fields.includes("note") ? renderNote(p.note) : "   "}${
    fields.includes("jump") ? renderInstrument(p.jump) : "  "
  }...${fields.includes("effectcode") ? renderEffect(p.effectcode) : " "}${
    fields.includes("effectparam") ? renderEffectParam(p.effectparam) : "  "
  }`;
};

// ── Patterns ─────────────────────────────────────────────────────────────────

/**
 * Extracts the GBStudio absolute-row origin number from a clipboard string header.
 * Returns null when the header is absent.
 */
export const parseClipboardOrigin = (clipboard: string): number | null => {
  const match = clipboard.match(/^GBStudio origin: (\d+)$/m);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Converts pattern cell data to a MOD-format compatible clipboard string.
 * Optionally filters to a single channel, a set of selected row indices, and
 * embeds an absolute-row origin marker for relative paste operations.
 */
export const parsePatternToClipboard = (
  pattern: PatternCell[][],
  channelId?: number,
  selectedCells?: number[],
  originAbsRow?: number,
): string => {
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
        return patternCellToString(row);
      } else {
        return `${patternCellToString(p[0])}${patternCellToString(
          p[1],
        )}${patternCellToString(p[2])}${patternCellToString(p[3])}`;
      }
    });
  } else if (selectedCells.length > 0) {
    const sortedSelectedCells = [...selectedCells].sort((a, b) => a - b);
    for (
      let i = sortedSelectedCells[0];
      i <= sortedSelectedCells[sortedSelectedCells.length - 1];
      i++
    ) {
      if (channelId !== undefined) {
        if (selectedCells.indexOf(i) > -1) {
          parsed.push(patternCellToString(pattern[i][channelId]));
        } else {
          parsed.push(patternCellToString(createPatternCell()));
        }
      }
    }
  }

  return parsed.join("\n");
};

/**
 * Converts a rectangular selection of tracker fields (by field index) to a
 * MOD-format compatible clipboard string, preserving only the selected columns.
 */
export const parsePatternFieldsToClipboard = (
  pattern: PatternCell[][],
  selectedFields: number[],
): string => {
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
      rowStr += `${patternCellToString(
        pattern[i][j],
        patternCellFields.slice(Math.max(0, start), start + end),
      )}`;
    }
    parsed.push(rowStr);
  }
  return parsed.join("\n");
};

/**
 * Parses a MOD-format clipboard string back into a 2D array of PatternCells.
 * Unknown or empty fields are represented as `NO_CHANGE_ON_PASTE` so callers
 * can distinguish "leave unchanged" from an explicit null.
 */
export const parseClipboardToPattern = (clipboard: string): PatternCell[][] => {
  const strToInt = (string: string, radix: number, offset = 0) => {
    const int = parseInt(string, radix);
    return isNaN(int) ? null : int + offset;
  };
  const rows = clipboard.split("\n");
  const pattern = rows
    .filter((r) => r[0] === "|")
    .map((r) => {
      if (r[0] === "|") {
        const channel = r.substring(1).split("|");
        return channel.map((c) => {
          const patternCell = createPatternCell();
          const cellString = [
            c.substring(0, 3),
            c.substring(3, 5),
            c.substring(8, 9),
            c.substring(9, 11),
          ];
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

// ── SubPatterns ───────────────────────────────────────────────────────────────

/**
 * Converts a rectangular selection of subpattern fields to a
 * MOD-format compatible clipboard string.
 */
export const parseSubPatternFieldsToClipboard = (
  subpattern: SubPatternCell[],
  selectedFields: number[],
): string => {
  const parsed: string[] = [
    "GBStudio hUGETracker paste format compatible with...",
    "ModPlug Tracker  XM",
  ];

  const w =
    (selectedFields[selectedFields.length - 1] - selectedFields[0]) % 4;
  const h = Math.floor(
    (selectedFields[selectedFields.length - 1] - selectedFields[0]) / 4,
  );
  const firstRow = Math.floor(selectedFields[0] / 4);
  const firstColumn = selectedFields[0] % 4;
  for (let i = firstRow; i <= firstRow + h; i++) {
    let rowStr = "";
    for (
      let j = Math.floor(firstColumn / 4);
      j <= Math.floor((firstColumn + w) / 4);
      j++
    ) {
      const start = firstColumn - j;
      const end = w + 1;
      rowStr += `${subPatternCellToString(
        subpattern[i],
        subPatternCellFields.slice(Math.max(0, start), start + end),
      )}`;
    }
    parsed.push(rowStr);
  }
  return parsed.join("\n");
};

/**
 * Parses a MOD-format clipboard string back into a 2D array of SubPatternCells.
 * Unknown or empty fields are represented as `NO_CHANGE_ON_PASTE`.
 */
export const parseClipboardToSubPattern = (
  clipboard: string,
): SubPatternCell[][] => {
  const strToInt = (string: string, radix: number, offset = 0) => {
    const int = parseInt(string, radix);
    return isNaN(int) ? null : int + offset;
  };
  const rows = clipboard.split("\n");
  const pattern = rows
    .filter((r) => r[0] === "|")
    .map((r) => {
      if (r[0] === "|") {
        const channel = r.substring(1).split("|");
        return channel.map((c) => {
          const patternCell = createSubPatternCell();
          const cellString = [
            c.substring(0, 3),
            c.substring(3, 5),
            c.substring(8, 9),
            c.substring(9, 11),
          ];
          const note = noteStringsForClipboard.indexOf(cellString[0]);
          patternCell.note =
            cellString[0] !== "   "
              ? note === -1
                ? null
                : note
              : NO_CHANGE_ON_PASTE;
          patternCell.jump =
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
