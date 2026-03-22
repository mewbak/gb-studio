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
import { RootState } from "store/configureStore";
import API from "renderer/lib/api";
import { MusicResourceAsset } from "shared/lib/resources/types";
import { createPatternCell, createSong } from "shared/lib/uge/song";
import { InstrumentType } from "shared/lib/music/types";
import {
  fromAbsRow,
  getTransposeNoteDelta,
  resolveTrackerCellFields,
  resolveUniqueTrackerCells,
  transposePatternCellNote,
} from "./trackerDocumentHelpers";

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
    // return new Promise((resolve) => setTimeout(() => resolve(song), 500000));
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

    transposeTrackerFields: (
      state,
      action: PayloadAction<{
        patternId: number;
        selectedTrackerFields: number[];
        direction: "up" | "down";
        size: "note" | "octave";
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternId, selectedTrackerFields, direction, size } =
        action.payload;
      const noteDelta = getTransposeNoteDelta(direction, size);

      const resolvedCells = resolveUniqueTrackerCells(
        patternId,
        selectedTrackerFields,
      );

      for (const { patternId, rowIndex, channelIndex } of resolvedCells) {
        const pattern = state.song.patterns?.[patternId];
        if (!pattern) {
          continue;
        }
        const cell = pattern[rowIndex]?.[channelIndex];
        transposePatternCellNote(cell, noteDelta);
      }
    },

    transposeAbsoluteCells: (
      state,
      action: PayloadAction<{
        channelId: number;
        absRows: number[];
        direction: "up" | "down";
        size: "note" | "octave";
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { channelId, absRows, direction, size } = action.payload;
      const noteDelta = getTransposeNoteDelta(direction, size);

      const seen = new Set<string>();

      for (const absRow of absRows) {
        const { sequenceId, rowId } = fromAbsRow(absRow);
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

    changeInstrumentTrackerFields: (
      state,
      action: PayloadAction<{
        patternId: number;
        selectedTrackerFields: number[];
        instrumentId: number;
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { patternId, selectedTrackerFields, instrumentId } = action.payload;

      const resolvedCells = resolveUniqueTrackerCells(
        patternId,
        selectedTrackerFields,
      );

      for (const { patternId, rowIndex, channelIndex } of resolvedCells) {
        const pattern = state.song.patterns?.[patternId];
        if (!pattern) {
          continue;
        }
        const cell = pattern[rowIndex]?.[channelIndex];
        if (cell) {
          cell.instrument = instrumentId;
        }
      }
    },

    changeInstrumentAbsoluteCells: (
      state,
      action: PayloadAction<{
        channelId: number;
        absRows: number[];
        instrumentId: number;
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { channelId, absRows, instrumentId } = action.payload;

      const seen = new Set<string>();

      for (const absRow of absRows) {
        const { sequenceId, rowId } = fromAbsRow(absRow);
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
        channelId: number;
        absRows: number[];
      }>,
    ) => {
      if (!state.song) {
        return;
      }

      const { channelId, absRows } = action.payload;

      const seen = new Set<string>();

      for (const absRow of absRows) {
        const { sequenceId, rowId } = fromAbsRow(absRow);
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
      console.log(newSubPattern);
      const newSubPatternCell = { ...newSubPattern[row] };
      let patch = { ..._action.payload.changes };
      if (
        patch.effectcode &&
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
