/* eslint-disable camelcase */
import {
  createAsyncThunk,
  createSlice,
  PayloadAction,
  createAction,
} from "@reduxjs/toolkit";
import cloneDeep from "lodash/cloneDeep";
import {
  Song,
  PatternCell,
  SubPatternCell,
  DutyInstrument,
  NoiseInstrument,
  WaveInstrument,
} from "shared/lib/uge/types";
import { AppThunk, RootState } from "store/configureStore";
import API from "renderer/lib/api";
import { MusicResourceAsset } from "shared/lib/resources/types";
import { createPatternCell, createSong } from "shared/lib/uge/song";
import { InstrumentType } from "shared/lib/music/types";
import {
  fromAbsRow,
  getTransposeNoteDelta,
  NO_CHANGE_ON_PASTE,
  parseClipboardOrigin,
  parseClipboardToPattern,
  parsePatternFieldsToClipboard,
  parsePatternToClipboard,
  resolveTrackerCellFields,
  resolveUniqueTrackerCells,
  transposePatternCellNote,
} from "./trackerDocumentHelpers";
import {
  TRACKER_CHANNEL_FIELDS,
  TRACKER_NUM_CHANNELS,
  TRACKER_PATTERN_LENGTH,
  TRACKER_ROW_SIZE,
} from "consts";
import { PatternCellAddress } from "shared/lib/uge/editor/types";

interface TrackerDocumentState {
  // status: "loading" | "error" | "loaded" | "init";
  // error?: string;
  song?: Song;
  // modified: boolean;
}

export const initialState: TrackerDocumentState = {
  // status: "init",
  // error: "",
  // modified: false,
};

export const requestAddNewSongFile = createAction<string>(
  "trackerDocument/requestAddNewSong",
);

export const addNewSongFile = createAsyncThunk<
  { data: MusicResourceAsset },
  string
>(
  "trackerDocument/addNewSong",
  async (
    path,
    _thunkApi,
  ): Promise<{
    data: MusicResourceAsset;
  }> => {
    return {
      data: await API.tracker.addNewUGEFile(path),
    };
  },
);

export const loadSongFile = createAsyncThunk<Song, string>(
  "trackerDocument/loadSong",
  async (path, _thunkApi): Promise<Song> => {
    const song = await API.tracker.loadUGEFile(path);
    return song;
  },
);

export const saveSongFile = createAsyncThunk<void, void>(
  "trackerDocument/saveSong",
  async (_, thunkApi) => {
    const state = thunkApi.getState() as RootState;

    if (!state.tracker.modified) {
      throw new Error("Cannot save unmodified song");
    }
    if (!state.trackerDocument.present.song) {
      throw new Error("No song selected");
    }

    const song = state.trackerDocument.present.song;
    try {
      await API.tracker.saveUGEFile(song);
    } catch (e) {
      console.log(e);
      throw e;
    }
  },
);

const selectTrackerDocumentSong = (state: RootState) =>
  state.trackerDocument.present.song;

export const copyAbsoluteCells =
  (args: { patternCells: PatternCellAddress[] }): AppThunk =>
  (_dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { patternCells } = args;

    if (patternCells.length === 0) {
      return;
    }

    const channelId = patternCells[0]?.channelId;
    if (channelId === undefined) {
      return;
    }

    const absRows = patternCells
      .filter((cell) => cell.channelId === channelId)
      .map((cell) => cell.sequenceId * 64 + cell.rowId);

    if (absRows.length === 0) {
      return;
    }

    const flatPattern = song.sequence.flatMap(
      (patternId) => song.patterns[patternId],
    );
    const originAbsRow = Math.min(...absRows);

    const clipboardText = parsePatternToClipboard(
      flatPattern,
      channelId,
      absRows,
      originAbsRow,
    );

    void API.clipboard.writeText(clipboardText);
  };

export const cutAbsoluteCells =
  (args: { patternCells: PatternCellAddress[] }): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { patternCells } = args;

    if (patternCells.length === 0) {
      return;
    }

    const channelId = patternCells[0]?.channelId;
    if (channelId === undefined) {
      return;
    }

    const absRows = patternCells
      .filter((cell) => cell.channelId === channelId)
      .map((cell) => cell.sequenceId * 64 + cell.rowId);

    if (absRows.length === 0) {
      return;
    }

    const flatPattern = song.sequence.flatMap(
      (patternId) => song.patterns[patternId],
    );
    const originAbsRow = Math.min(...absRows);

    const clipboardText = parsePatternToClipboard(
      flatPattern,
      channelId,
      absRows,
      originAbsRow,
    );

    void API.clipboard.writeText(clipboardText);

    dispatch(
      actions.clearAbsoluteCells({
        patternCells,
      }),
    );
  };

export const pasteInPlace =
  (args: { channelId: number }): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const totalAbsRows = song.sequence.length * 64;
    const clipboardText = await API.clipboard.readText();
    const pastedPattern = parseClipboardToPattern(clipboardText);
    const originAbsRow = parseClipboardOrigin(clipboardText) ?? 0;

    if (!pastedPattern || pastedPattern.length === 0) {
      return;
    }

    const changes: Array<{
      patternId: number;
      rowId: number;
      channelId: number;
      changes: Partial<PatternCell>;
    }> = [];

    for (let offset = 0; offset < pastedPattern.length; offset++) {
      const cell = pastedPattern[offset]?.[0];
      if (!cell) {
        continue;
      }

      if (cell.note === null || cell.note === NO_CHANGE_ON_PASTE) {
        continue;
      }

      const absRow = originAbsRow + offset;
      if (absRow >= totalAbsRows) {
        break;
      }

      const { sequenceId, rowId } = fromAbsRow(absRow);
      const patternId = song.sequence[sequenceId];

      if (patternId === undefined) {
        continue;
      }

      const existing = song.patterns?.[patternId]?.[rowId]?.[args.channelId];
      if (!existing) {
        continue;
      }

      changes.push({
        patternId,
        rowId,
        channelId: args.channelId,
        changes: {
          note: cell.note,
          instrument:
            cell.instrument !== NO_CHANGE_ON_PASTE
              ? cell.instrument
              : existing.instrument,
          effectcode:
            cell.effectcode !== NO_CHANGE_ON_PASTE
              ? cell.effectcode
              : existing.effectcode,
          effectparam:
            cell.effectparam !== NO_CHANGE_ON_PASTE
              ? cell.effectparam
              : existing.effectparam,
        },
      });
    }

    if (changes.length > 0) {
      dispatch(actions.applyPatternCellChanges({ changes }));
    }
  };

export const copyTrackerFields =
  (args: { patternId: number; selectedTrackerFields: number[] }): AppThunk =>
  (_dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { patternId, selectedTrackerFields } = args;

    const pattern = song.patterns[patternId];
    if (!pattern || selectedTrackerFields.length === 0) {
      return;
    }

    const clipboardText = parsePatternFieldsToClipboard(
      pattern,
      selectedTrackerFields,
    );

    void API.clipboard.writeText(clipboardText);
  };

export const cutTrackerFields =
  (args: { patternId: number; selectedTrackerFields: number[] }): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { patternId, selectedTrackerFields } = args;

    const pattern = song.patterns[patternId];
    if (!pattern || selectedTrackerFields.length === 0) {
      return;
    }

    const clipboardText = parsePatternFieldsToClipboard(
      pattern,
      selectedTrackerFields,
    );

    void API.clipboard.writeText(clipboardText);

    dispatch(
      actions.clearTrackerFields({
        patternId,
        selectedTrackerFields,
      }),
    );
  };

export const pasteTrackerFields =
  (args: { patternId: number; startField: number }): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { patternId, startField } = args;
    const pattern = song.patterns[patternId];

    if (!pattern) {
      return;
    }

    const clipboardText = await API.clipboard.readText();
    const pastedPattern = parseClipboardToPattern(clipboardText);

    if (!pastedPattern || pastedPattern.length === 0) {
      return;
    }

    const startRow = Math.floor(startField / TRACKER_ROW_SIZE);
    const startChannelId =
      Math.floor(startField / TRACKER_CHANNEL_FIELDS) % TRACKER_NUM_CHANNELS;

    const changes: Array<{
      patternId: number;
      rowId: number;
      channelId: number;
      changes: Partial<PatternCell>;
    }> = [];

    for (let rowOffset = 0; rowOffset < pastedPattern.length; rowOffset++) {
      const pastedRow = pastedPattern[rowOffset];
      const rowId = startRow + rowOffset;

      if (!pattern[rowId]) {
        break;
      }

      for (
        let channelOffset = 0;
        channelOffset < pastedRow.length && startChannelId + channelOffset < 4;
        channelOffset++
      ) {
        const pastedCell = pastedRow[channelOffset];
        if (!pastedCell) {
          continue;
        }

        const channelId = startChannelId + channelOffset;
        const existing = pattern[rowId]?.[channelId];

        if (!existing) {
          continue;
        }

        const cellChanges: Partial<PatternCell> = {};

        if (pastedCell.note !== NO_CHANGE_ON_PASTE) {
          cellChanges.note = pastedCell.note;
        }

        if (pastedCell.instrument !== NO_CHANGE_ON_PASTE) {
          cellChanges.instrument = pastedCell.instrument;
        }

        if (pastedCell.effectcode !== NO_CHANGE_ON_PASTE) {
          cellChanges.effectcode = pastedCell.effectcode;
        }

        if (pastedCell.effectparam !== NO_CHANGE_ON_PASTE) {
          cellChanges.effectparam = pastedCell.effectparam;
        }

        if (Object.keys(cellChanges).length === 0) {
          continue;
        }

        changes.push({
          patternId,
          rowId,
          channelId,
          changes: cellChanges,
        });
      }
    }

    if (changes.length > 0) {
      dispatch(actions.applyPatternCellChanges({ changes }));
    }
  };

const trackerSlice = createSlice({
  name: "trackerDocument",
  initialState,
  reducers: {
    unloadSong: (state, _action: PayloadAction<void>) => {
      state.song = undefined;
    },
    editSong: (state, _action: PayloadAction<{ changes: Partial<Song> }>) => {
      if (state.song) {
        state.song = {
          ...state.song,
          ..._action.payload.changes,
        };
      }
    },
    editDutyInstrument: (
      state,
      _action: PayloadAction<{
        instrumentId: number;
        changes: Partial<DutyInstrument>;
      }>,
    ) => {
      if (!state.song) {
        return;
      }
      const instrument =
        state.song.duty_instruments[_action.payload.instrumentId];
      const patch = { ..._action.payload.changes };

      if (!instrument) {
        return;
      }

      const instruments = [...state.song.duty_instruments];
      instruments[_action.payload.instrumentId] = {
        ...instrument,
        ...patch,
      } as DutyInstrument;

      state.song = {
        ...state.song,
        duty_instruments: instruments,
      };
    },
    editWaveInstrument: (
      state,
      _action: PayloadAction<{
        instrumentId: number;
        changes: Partial<WaveInstrument>;
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const instrument =
        state.song.wave_instruments[_action.payload.instrumentId];
      const patch = { ..._action.payload.changes };

      if (!instrument) {
        return;
      }

      const instruments = [...state.song.wave_instruments];
      instruments[_action.payload.instrumentId] = {
        ...instrument,
        ...patch,
      } as WaveInstrument;

      state.song = {
        ...state.song,
        wave_instruments: instruments,
      };
    },
    editNoiseInstrument: (
      state,
      _action: PayloadAction<{
        instrumentId: number;
        changes: Partial<NoiseInstrument>;
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const instrument =
        state.song.noise_instruments[_action.payload.instrumentId];
      const patch = { ..._action.payload.changes };

      if (!instrument) {
        return;
      }

      const instruments = [...state.song.noise_instruments];
      instruments[_action.payload.instrumentId] = {
        ...instrument,
        ...patch,
      } as NoiseInstrument;

      state.song = {
        ...state.song,
        noise_instruments: instruments,
      };
    },
    editPatternCell: (
      state,
      _action: PayloadAction<{
        patternId: number;
        cell: [number, number];
        changes: Partial<PatternCell>;
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const patternId = _action.payload.patternId;
      const rowId = _action.payload.cell[0];
      const colId = _action.payload.cell[1];
      const patternCell = state.song.patterns?.[patternId]?.[rowId]?.[colId];

      if (!patternCell) {
        return;
      }

      let patch = { ..._action.payload.changes };
      if (
        patch.effectcode &&
        patch.effectcode !== null &&
        (patch.effectparam === null || patch.effectparam === undefined) &&
        patternCell.effectparam === null
      ) {
        // If there's an effect code but no effect param, default to 0
        patch = {
          ...patch,
          effectparam: 0,
        };
      }

      const patterns = cloneDeep(state.song.patterns);
      patterns[patternId][rowId][colId] = {
        ...patternCell,
        ...patch,
      };

      state.song = {
        ...state.song,
        patterns: patterns,
      };
    },

    editPatternCells: (
      state,
      action: PayloadAction<{
        patternCells: PatternCellAddress[];
        changes: Partial<PatternCell>;
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternCells, changes } = action.payload;

      const seen = new Set<string>();

      for (const { sequenceId, rowId, channelId } of patternCells) {
        const patternId = state.song.sequence[sequenceId];

        if (patternId === undefined) {
          continue;
        }

        const key = `${patternId}:${rowId}:${channelId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const cell = state.song.patterns?.[patternId]?.[rowId]?.[channelId];
        if (cell) {
          Object.assign(cell, changes);
        }
      }
    },

    editPattern: (
      state,
      _action: PayloadAction<{
        patternId: number;
        pattern: PatternCell[][];
      }>,
    ) => {
      if (!state.song) {
        return;
      }
      const patternId = _action.payload.patternId;
      const patterns = cloneDeep(state.song.patterns);
      patterns[patternId] = _action.payload.pattern;
      state.song = {
        ...state.song,
        patterns,
      };
    },
    applyPatternCellChanges: (
      state,
      action: PayloadAction<{
        changes: Array<{
          patternId: number;
          rowId: number;
          channelId: number;
          changes: Partial<PatternCell>;
        }>;
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      for (const change of action.payload.changes) {
        const cell =
          state.song.patterns?.[change.patternId]?.[change.rowId]?.[
            change.channelId
          ];

        if (!cell) {
          continue;
        }

        let patch = { ...change.changes };

        if (
          patch.effectcode &&
          patch.effectcode !== null &&
          (patch.effectparam === null || patch.effectparam === undefined) &&
          cell.effectparam === null
        ) {
          patch = {
            ...patch,
            effectparam: 0,
          };
        }

        state.song.patterns[change.patternId][change.rowId][change.channelId] =
          {
            ...cell,
            ...patch,
          };
      }
    },

    transposeTrackerFields: (
      state,
      action: PayloadAction<{
        patternId: number;
        selectedTrackerFields: number[];
        direction: "up" | "down";
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternId, selectedTrackerFields, direction } = action.payload;
      const delta = direction === "up" ? 1 : -1;

      const resolvedFields = resolveTrackerCellFields(
        patternId,
        selectedTrackerFields,
      );

      for (const {
        patternId,
        rowIndex,
        channelIndex,
        fieldIndex,
      } of resolvedFields) {
        const pattern = state.song.patterns?.[patternId];
        if (!pattern) {
          continue;
        }

        const cell = pattern[rowIndex]?.[channelIndex];
        if (!cell) {
          continue;
        }

        if (fieldIndex === 0) {
          if (cell.note !== null) {
            cell.note = Math.max(0, Math.min(71, cell.note + delta));
          }
        } else if (fieldIndex === 1) {
          if (cell.instrument !== null) {
            cell.instrument = Math.max(
              0,
              Math.min(14, cell.instrument + delta),
            );
          }
        } else if (fieldIndex === 2) {
          if (cell.effectcode !== null) {
            cell.effectcode = Math.max(
              0,
              Math.min(15, cell.effectcode + delta),
            );
          }
        } else if (fieldIndex === 3) {
          if (cell.effectparam !== null) {
            cell.effectparam = Math.max(
              0,
              Math.min(255, cell.effectparam + delta),
            );
          }
        }
      }
    },

    transposeAbsoluteCells: (
      state,
      action: PayloadAction<{
        patternCells: PatternCellAddress[];
        direction: "up" | "down";
        size: "note" | "octave";
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternCells, direction, size } = action.payload;
      const noteDelta = getTransposeNoteDelta(direction, size);

      const seen = new Set<string>();

      for (const { sequenceId, rowId, channelId } of patternCells) {
        const patternId = state.song.sequence[sequenceId];

        if (patternId === undefined) {
          continue;
        }

        const key = `${patternId}:${rowId}:${channelId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const cell = state.song.patterns?.[patternId]?.[rowId]?.[channelId];
        transposePatternCellNote(cell, noteDelta);
      }
    },
    interpolateAbsoluteCells: (
      state,
      action: PayloadAction<{
        patternCells: PatternCellAddress[];
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternCells } = action.payload;

      if (patternCells.length === 0) {
        return;
      }

      const patternCellsByChannel = new Map<number, PatternCellAddress[]>();

      for (const patternCell of patternCells) {
        const existing = patternCellsByChannel.get(patternCell.channelId);
        if (existing) {
          existing.push(patternCell);
        } else {
          patternCellsByChannel.set(patternCell.channelId, [patternCell]);
        }
      }

      for (const [channelId, channelPatternCells] of patternCellsByChannel) {
        const uniqueResolvedCells = new Map<
          string,
          {
            patternId: number;
            rowId: number;
            channelId: number;
            absRow: number;
          }
        >();

        for (const { sequenceId, rowId, channelId } of channelPatternCells) {
          const patternId = state.song.sequence[sequenceId];

          if (patternId === undefined) {
            continue;
          }

          const key = `${patternId}:${rowId}:${channelId}`;
          const absRow = sequenceId * TRACKER_PATTERN_LENGTH + rowId;
          const existing = uniqueResolvedCells.get(key);

          if (!existing || absRow < existing.absRow) {
            uniqueResolvedCells.set(key, {
              patternId,
              rowId,
              channelId,
              absRow,
            });
          }
        }

        const sortedResolvedCells = [...uniqueResolvedCells.values()].sort(
          (a, b) => a.absRow - b.absRow,
        );

        let startCell: {
          patternId: number;
          rowId: number;
          channelId: number;
          absRow: number;
        } | null = null;
        let startNote: number | null = null;
        let startInstrument: number | null = null;

        let endCell: {
          patternId: number;
          rowId: number;
          channelId: number;
          absRow: number;
        } | null = null;
        let endNote: number | null = null;

        for (const resolved of sortedResolvedCells) {
          const cell =
            state.song.patterns?.[resolved.patternId]?.[resolved.rowId]?.[
              resolved.channelId
            ];

          if (!cell || cell.note === null) {
            continue;
          }

          startCell = resolved;
          startNote = cell.note;
          startInstrument = cell.instrument;
          break;
        }

        for (let i = sortedResolvedCells.length - 1; i >= 0; i--) {
          const resolved = sortedResolvedCells[i];
          const cell =
            state.song.patterns?.[resolved.patternId]?.[resolved.rowId]?.[
              resolved.channelId
            ];

          if (!cell || cell.note === null) {
            continue;
          }

          endCell = resolved;
          endNote = cell.note;
          break;
        }

        if (!startCell || startNote === null || !endCell || endNote === null) {
          continue;
        }

        if (startCell.absRow >= endCell.absRow - 1) {
          continue;
        }

        const span = endCell.absRow - startCell.absRow;
        const noteDelta = endNote - startNote;

        const modifiedKeys = new Set<string>([
          `${startCell.patternId}:${startCell.rowId}:${startCell.channelId}`,
          `${endCell.patternId}:${endCell.rowId}:${endCell.channelId}`,
        ]);

        for (
          let absRow = startCell.absRow + 1;
          absRow < endCell.absRow;
          absRow++
        ) {
          const { sequenceId, rowId } = fromAbsRow(absRow);
          const patternId = state.song.sequence[sequenceId];

          if (patternId === undefined) {
            continue;
          }

          const key = `${patternId}:${rowId}:${channelId}`;
          if (modifiedKeys.has(key)) {
            continue;
          }
          modifiedKeys.add(key);

          const cell = state.song.patterns?.[patternId]?.[rowId]?.[channelId];
          if (!cell) {
            continue;
          }

          const t = (absRow - startCell.absRow) / span;
          cell.note = Math.round(startNote + noteDelta * t);
          cell.instrument = startInstrument;
        }
      }
    },
    changeInstrumentAbsoluteCells: (
      state,
      action: PayloadAction<{
        patternCells: PatternCellAddress[];
        instrumentId: number;
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternCells, instrumentId } = action.payload;

      const seen = new Set<string>();

      for (const { sequenceId, rowId, channelId } of patternCells) {
        const patternId = state.song.sequence[sequenceId];

        if (patternId === undefined) {
          continue;
        }

        const key = `${patternId}:${rowId}:${channelId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const cell = state.song.patterns?.[patternId]?.[rowId]?.[channelId];
        if (cell) {
          cell.instrument = instrumentId;
        }
      }
    },

    changeNoteAbsoluteCells: (
      state,
      action: PayloadAction<{
        patternCells: PatternCellAddress[];
        note: number;
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternCells, note } = action.payload;

      const seen = new Set<string>();

      for (const { sequenceId, rowId, channelId } of patternCells) {
        const patternId = state.song.sequence[sequenceId];

        if (patternId === undefined) {
          continue;
        }

        const key = `${patternId}:${rowId}:${channelId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const cell = state.song.patterns?.[patternId]?.[rowId]?.[channelId];
        if (cell) {
          cell.note = note;
        }
      }
    },

    shiftTrackerFields: (
      state,
      action: PayloadAction<{
        patternId: number;
        selectedTrackerFields: number[];
        direction: "insert" | "delete";
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternId, selectedTrackerFields, direction } = action.payload;

      const pattern = state.song.patterns?.[patternId];
      if (!pattern || selectedTrackerFields.length === 0) {
        return;
      }

      const resolvedCells = resolveUniqueTrackerCells(
        patternId,
        selectedTrackerFields,
      );

      if (resolvedCells.length === 0) {
        return;
      }

      const selectedChannels = new Set<number>();
      let startRow = Infinity;

      for (const { rowIndex, channelIndex } of resolvedCells) {
        selectedChannels.add(channelIndex);
        if (rowIndex < startRow) {
          startRow = rowIndex;
        }
      }

      if (startRow < 0 || startRow >= pattern.length) {
        return;
      }

      for (const channelIndex of selectedChannels) {
        if (direction === "delete") {
          for (let row = startRow; row < pattern.length - 1; row++) {
            pattern[row][channelIndex] = {
              ...pattern[row + 1][channelIndex],
            };
          }

          pattern[pattern.length - 1][channelIndex] = createPatternCell();
        } else {
          for (let row = pattern.length - 1; row > startRow; row--) {
            pattern[row][channelIndex] = {
              ...pattern[row - 1][channelIndex],
            };
          }

          pattern[startRow][channelIndex] = createPatternCell();
        }
      }
    },

    clearTrackerFields: (
      state,
      action: PayloadAction<{
        patternId: number;
        selectedTrackerFields: number[];
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternId, selectedTrackerFields } = action.payload;

      const resolvedCells = resolveTrackerCellFields(
        patternId,
        selectedTrackerFields,
      );

      for (const {
        patternId,
        rowIndex,
        channelIndex,
        fieldIndex,
      } of resolvedCells) {
        const pattern = state.song.patterns?.[patternId];
        if (!pattern) {
          continue;
        }
        const cell = pattern[rowIndex]?.[channelIndex];
        if (cell) {
          if (fieldIndex === 0) {
            cell.note = null;
          } else if (fieldIndex === 1) {
            cell.instrument = null;
          } else if (fieldIndex === 2) {
            cell.effectcode = null;
          } else if (fieldIndex === 3) {
            cell.effectparam = null;
          }
        }
      }
    },

    clearAbsoluteCells: (
      state,
      action: PayloadAction<{
        patternCells: PatternCellAddress[];
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternCells } = action.payload;

      const seen = new Set<string>();

      for (const { sequenceId, rowId, channelId } of patternCells) {
        const patternId = state.song.sequence[sequenceId];

        if (patternId === undefined) {
          continue;
        }

        const key = `${patternId}:${rowId}:${channelId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        if (state.song.patterns?.[patternId]?.[rowId]?.[channelId]) {
          state.song.patterns[patternId][rowId][channelId] =
            createPatternCell();
        }
      }
    },

    editSubPatternCell: (
      state,
      _action: PayloadAction<{
        instrumentType: InstrumentType;
        instrumentId: number;
        cell: [number, number];
        changes: Partial<SubPatternCell>;
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      let instruments: DutyInstrument[] | WaveInstrument[] | NoiseInstrument[];
      switch (_action.payload.instrumentType) {
        case "duty":
          instruments = [...state.song.duty_instruments];
          break;
        case "wave":
          instruments = [...state.song.wave_instruments];
          break;
        case "noise":
          instruments = [...state.song.noise_instruments];
          break;
      }
      const instrumentId = _action.payload.instrumentId;
      const [row, _col] = _action.payload.cell;

      const newSubPattern = [...instruments[instrumentId].subpattern];
      const newSubPatternCell = { ...newSubPattern[row] };
      let patch = { ..._action.payload.changes };
      if (
        patch.effectcode !== undefined &&
        patch.effectcode !== null &&
        newSubPatternCell.effectparam === null
      ) {
        patch = {
          ...patch,
          effectparam: 0,
        };
      }

      newSubPattern[row] = { ...newSubPatternCell, ...patch };
      const newInstrument = { ...instruments[instrumentId] };
      newInstrument.subpattern = newSubPattern;

      instruments[instrumentId] = newInstrument;

      switch (_action.payload.instrumentType) {
        case "duty":
          state.song = {
            ...state.song,
            duty_instruments: instruments as DutyInstrument[],
          };
          break;
        case "wave":
          state.song = {
            ...state.song,
            wave_instruments: instruments as WaveInstrument[],
          };
          break;
        case "noise":
          state.song = {
            ...state.song,
            noise_instruments: instruments as NoiseInstrument[],
          };
          break;
      }
    },
    editSubPattern: (
      state,
      _action: PayloadAction<{
        instrumentId: number;
        instrumentType: "duty" | "wave" | "noise";
        subpattern: SubPatternCell[];
      }>,
    ) => {
      if (!state.song) {
        return;
      }
      let instruments: DutyInstrument[] | WaveInstrument[] | NoiseInstrument[];
      switch (_action.payload.instrumentType) {
        case "duty":
          instruments = [...state.song.duty_instruments];
          break;
        case "wave":
          instruments = [...state.song.wave_instruments];
          break;
        case "noise":
          instruments = [...state.song.noise_instruments];
          break;
      }

      const instrumentId = _action.payload.instrumentId;
      instruments[instrumentId].subpattern = _action.payload.subpattern;

      switch (_action.payload.instrumentType) {
        case "duty":
          state.song = {
            ...state.song,
            duty_instruments: instruments as DutyInstrument[],
          };
          break;
        case "wave":
          state.song = {
            ...state.song,
            wave_instruments: instruments as WaveInstrument[],
          };
          break;
        case "noise":
          state.song = {
            ...state.song,
            noise_instruments: instruments as NoiseInstrument[],
          };
          break;
      }
    },
    editWaveform: (
      state,
      _action: PayloadAction<{ index: number; waveForm: Uint8Array }>,
    ) => {
      if (!state.song) {
        return;
      }

      const newWaves = [...state.song.waves];
      newWaves[_action.payload.index] = _action.payload.waveForm;

      state.song = {
        ...state.song,
        waves: newWaves,
      };
    },
    editSequence: (
      state,
      _action: PayloadAction<{ sequenceIndex: number; sequenceId: number }>,
    ) => {
      if (!state.song) {
        return;
      }

      const newSequence = [...state.song.sequence];

      // Assign a new empty pattern
      if (_action.payload.sequenceId === -1) {
        const newPatterns = [...state.song.patterns];
        const pattern = [];
        for (let n = 0; n < 64; n++)
          pattern.push([
            createPatternCell(),
            createPatternCell(),
            createPatternCell(),
            createPatternCell(),
          ]);
        newPatterns.push(pattern);

        newSequence[_action.payload.sequenceIndex] = newPatterns.length - 1;

        state.song = {
          ...state.song,
          patterns: newPatterns,
          sequence: newSequence,
        };
      } else {
        newSequence[_action.payload.sequenceIndex] = _action.payload.sequenceId;

        state.song = {
          ...state.song,
          sequence: newSequence,
        };
      }
    },
    addSequence: (state) => {
      if (!state.song) {
        return;
      }

      const newPatterns = [...state.song.patterns];
      const pattern = [];
      for (let n = 0; n < 64; n++)
        pattern.push([
          createPatternCell(),
          createPatternCell(),
          createPatternCell(),
          createPatternCell(),
        ]);
      newPatterns.push(pattern);

      const newSequence = [...state.song.sequence];
      newSequence.push(newPatterns.length - 1);

      state.song = {
        ...state.song,
        patterns: newPatterns,
        sequence: newSequence,
      };
    },
    removeSequence: (
      state,
      _action: PayloadAction<{ sequenceIndex: number }>,
    ) => {
      if (!state.song) {
        return;
      }

      const newSequence = [...state.song.sequence];
      if (newSequence.length > 1) {
        newSequence.splice(_action.payload.sequenceIndex, 1);

        state.song = {
          ...state.song,
          sequence: newSequence,
        };
      }
    },
    moveSequence: (
      state,
      action: PayloadAction<{ fromIndex: number; toIndex: number }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { fromIndex, toIndex } = action.payload;
      const newSequence = [...state.song.sequence];

      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= newSequence.length ||
        toIndex >= newSequence.length
      ) {
        return;
      }

      const [movedItem] = newSequence.splice(fromIndex, 1);
      if (movedItem === undefined) {
        return;
      }
      newSequence.splice(toIndex, 0, movedItem);

      state.song = {
        ...state.song,
        sequence: newSequence,
      };
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(loadSongFile.pending, (state) => {
        state.song = undefined;
      })
      .addCase(loadSongFile.rejected, (state) => {
        state.song = createSong();
      })
      .addCase(loadSongFile.fulfilled, (state, action) => {
        state.song = action.payload;
      }),
});

export const { actions } = trackerSlice;

export default trackerSlice.reducer;
