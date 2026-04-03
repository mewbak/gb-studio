/* eslint-disable camelcase */
import { createSlice, PayloadAction, UnknownAction } from "@reduxjs/toolkit";
import type { InstrumentType, MusicExportFormat } from "shared/lib/music/types";
import clamp from "shared/lib/helpers/clamp";
import { MAX_EXPORT_LOOPS, MIN_EXPORT_LOOPS } from "shared/lib/music/constants";
import {
  addNewSongFile,
  loadSongFile,
  moveAbsoluteCellsComplete,
  saveSongFile,
} from "store/features/trackerDocument/trackerDocumentState";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { PatternCell } from "shared/lib/uge/types";
import { AppThunk } from "store/configureStore";
import API from "renderer/lib/api";
import { parseClipboardToPattern } from "store/features/trackerDocument/trackerDocumentHelpers";
import { PatternCellAddress } from "shared/lib/uge/editor/types";

export type PianoRollToolType = "pencil" | "eraser" | "selection" | null;

export type TrackerViewType = "tracker" | "roll";

export type TrackerSidebarViewType = "instrument" | "cell";

export type SubpatternEditorMode = "script" | "tracker";

export type MobileOverlayView =
  | "none"
  | "notes"
  | "channels"
  | "instruments"
  | "settings"
  | "sequence";

interface SelectedInstrument {
  id: string;
  type: InstrumentType;
}

interface CellAddress {
  sequenceId: number;
  patternId: number;
  rowId: number;
  channelId: number;
}

export const pasteAbsoluteCells =
  (): AppThunk<Promise<void>> => async (dispatch) => {
    const clipboardText = await API.clipboard.readText();
    const pastedPattern = parseClipboardToPattern(clipboardText);

    if (!pastedPattern || pastedPattern.length === 0) {
      return;
    }

    dispatch(
      actions.setPastedPattern({
        pattern: pastedPattern,
      }),
    );
    dispatch(actions.setSelectedPatternCells([]));
  };

export interface TrackerState {
  status: "loading" | "error" | "loaded" | "init";
  error?: string;
  modified: boolean;

  playing: boolean;
  exporting: boolean;
  playerReady: boolean;

  octaveOffset: number;
  editStep: number;

  view: TrackerViewType;
  tool: PianoRollToolType;
  selectedInstrumentId: number;
  selectedChannel: 0 | 1 | 2 | 3;
  visibleChannels: number[];
  hoverNote: number | null;
  hoverColumn: number | null;
  hoverSequence: number | null;
  startPlaybackPosition: [number, number];
  defaultStartPlaybackPosition: [number, number];
  selectedSongId: string;
  selectedInstrument: SelectedInstrument;
  selectedSequence: number;
  selectedPatternCells: PatternCellAddress[];
  selection: [number, number, number, number];
  selectedEffectCell: CellAddress | null;
  subpatternEditorFocus: boolean;
  subpatternEditorMode: SubpatternEditorMode;
  exportFormat: MusicExportFormat;
  exportLoopCount: number;
  channelStatus: [boolean, boolean, boolean, boolean];
  pastedPattern: PatternCell[][] | null;
  sidebarView: TrackerSidebarViewType;
  showVirtualKeyboard: boolean;
  mobileOverlayView: MobileOverlayView;
}

export const initialState: TrackerState = {
  // status: null,
  status: "init",
  error: "",
  modified: false,

  playing: false,
  exporting: false,
  playerReady: false,
  // song: null,
  octaveOffset: 0,
  editStep: 1,
  // modified: false,
  view: "roll",
  tool: "pencil",
  selectedInstrumentId: 0,
  selectedChannel: 0,
  visibleChannels: [0, 1, 2, 3],
  hoverNote: null,
  hoverColumn: null,
  hoverSequence: null,
  startPlaybackPosition: [0, 0],
  defaultStartPlaybackPosition: [0, 0],
  selectedSongId: "",
  selectedInstrument: {
    id: "0",
    type: "duty",
  },
  selectedSequence: 0,
  selectedPatternCells: [],
  selection: [-1, -1, -1, -1],
  selectedEffectCell: null,
  subpatternEditorFocus: false,
  subpatternEditorMode: "script",
  exportFormat: "mp3",
  exportLoopCount: 1,
  channelStatus: [false, false, false, false],
  pastedPattern: null,
  sidebarView: "instrument",
  showVirtualKeyboard: false,
  mobileOverlayView: "none",
};

const trackerSlice = createSlice({
  name: "tracker",
  initialState,
  reducers: {
    playTracker: (state, _action: PayloadAction<void>) => {
      state.playing = true;
    },
    pauseTracker: (state, _action: PayloadAction<void>) => {
      state.playing = false;
    },
    stopTracker: (state, _action: PayloadAction<void>) => {
      state.playing = false;
      state.startPlaybackPosition = [...state.defaultStartPlaybackPosition];
    },
    setExporting: (state, action: PayloadAction<boolean>) => {
      state.exporting = action.payload;
      if (action.payload) {
        state.playing = false;
      }
    },
    playerReady: (state, action: PayloadAction<boolean>) => {
      console.warn("SET PLAYER READY TO ", action.payload);
      state.playerReady = action.payload;
    },
    setView: (state, action: PayloadAction<TrackerViewType>) => {
      state.view = action.payload;
    },
    setHover: (
      state,
      action: PayloadAction<{
        note: number | null;
        column: number | null;
        sequenceId: number | null;
      }>,
    ) => {
      state.hoverNote = action.payload.note;
      state.hoverColumn = action.payload.column;
      state.hoverSequence = action.payload.sequenceId;
    },
    setTool: (state, _action: PayloadAction<PianoRollToolType>) => {
      state.tool = _action.payload;
    },
    setSelectedInstrumentId: (state, action: PayloadAction<number>) => {
      state.selectedInstrumentId = clamp(action.payload, 0, 15);
      state.sidebarView = "instrument";
    },
    setSelectedChannel: (state, action: PayloadAction<0 | 1 | 2 | 3>) => {
      if (state.selectedChannel !== action.payload) {
        state.selectedEffectCell = null;
        state.selectedChannel = action.payload;
      }
    },
    setVisibleChannels: (state, _action: PayloadAction<number[]>) => {
      state.visibleChannels = _action.payload;
    },
    setOctaveOffset: (state, _action: PayloadAction<number>) => {
      state.octaveOffset = _action.payload;
    },
    setEditStep: (state, _action: PayloadAction<number>) => {
      state.editStep = _action.payload;
    },
    setDefaultStartPlaybackPosition: (
      state,
      _action: PayloadAction<[number, number]>,
    ) => {
      state.startPlaybackPosition = _action.payload;
      state.defaultStartPlaybackPosition = _action.payload;
    },
    setSelectedSongId: (state, action: PayloadAction<string>) => {
      state.selectedSongId = action.payload;
    },
    setSelectedInstrument: (
      state,
      action: PayloadAction<SelectedInstrument>,
    ) => {
      state.selectedInstrument = action.payload;
      state.sidebarView = "instrument";
    },
    setSelectedSequence: (state, action: PayloadAction<number>) => {
      state.selectedSequence = action.payload;
    },
    setSelectedPatternCells: (
      state,
      action: PayloadAction<PatternCellAddress[]>,
    ) => {
      state.selectedPatternCells = action.payload;
      if (action.payload.length > 0) {
        state.sidebarView = "cell";
      }
    },
    setSelectedEffectCell: (
      state,
      action: PayloadAction<CellAddress | null>,
    ) => {
      if (state.selectedEffectCell !== action.payload) {
        state.selectedEffectCell = action.payload;
        state.mobileOverlayView = "notes";
      }
    },
    setSubpatternEditorFocus: (state, _action: PayloadAction<boolean>) => {
      console.log("FOCUS:", _action.payload);
      state.subpatternEditorFocus = _action.payload;
    },
    setSubpatternEditorMode: (
      state,
      action: PayloadAction<SubpatternEditorMode>,
    ) => {
      state.subpatternEditorMode = action.payload;
    },
    setExportSettings: (
      state,
      action: PayloadAction<{
        format: MusicExportFormat;
        loopCount: number;
      }>,
    ) => {
      state.exportFormat = action.payload.format;
      state.exportLoopCount = clamp(
        Math.floor(action.payload.loopCount),
        MIN_EXPORT_LOOPS,
        MAX_EXPORT_LOOPS,
      );
    },
    setChannelStatus: (
      state,
      action: PayloadAction<[boolean, boolean, boolean, boolean]>,
    ) => {
      state.channelStatus = action.payload;
    },
    setPastedPattern: (
      state,
      action: PayloadAction<{
        pattern: PatternCell[][];
      }>,
    ) => {
      state.pastedPattern = action.payload.pattern;
    },

    clearPastedPattern: (state) => {
      state.pastedPattern = null;
    },

    setSidebarView: (state, action: PayloadAction<TrackerSidebarViewType>) => {
      state.sidebarView = action.payload;
    },

    setShowVirtualKeyboard: (state, action: PayloadAction<boolean>) => {
      state.showVirtualKeyboard = action.payload;
    },

    setMobileOverlayView: (state, action: PayloadAction<MobileOverlayView>) => {
      state.mobileOverlayView = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(loadSongFile.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loadSongFile.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message;
      })
      .addCase(loadSongFile.fulfilled, (state) => {
        return {
          ...initialState,
          selectedSongId: state.selectedSongId,
          view: state.view,
          subpatternEditorMode: state.subpatternEditorMode,
          showVirtualKeyboard: state.showVirtualKeyboard,
          status: "loaded",
          modified: false,
        };
      })
      .addCase(saveSongFile.fulfilled, (state) => {
        state.modified = false;
      })
      .addCase(trackerDocumentActions.unloadSong, (state) => {
        state.modified = false;
        state.status = "init";
        state.playerReady = false;
      })
      .addCase(trackerDocumentActions.moveSequence, (state, action) => {
        state.selectedSequence = action.payload.toIndex;
      })
      // When adding a new song file jump to it in navigator
      .addCase(addNewSongFile.fulfilled, (state, action) => {
        state.selectedSongId = action.payload.data.id;
      })
      // When adding a importing song file jump to it in navigator
      .addCase(
        trackerDocumentActions.convertModToUgeSong.fulfilled,
        (state, action) => {
          state.selectedSongId = action.payload.data.id;
        },
      )
      // After dragging cells, set selection to new location
      .addCase(moveAbsoluteCellsComplete, (state, action) => {
        state.selectedPatternCells = action.payload.newSelection;
      })
      .addCase(trackerDocumentActions.insertSequence, (state, action) => {
        const offset = action.payload.position === "after" ? 1 : 0;
        state.selectedSequence = action.payload.sequenceIndex + offset;
      })
      .addCase(trackerDocumentActions.clearAbsoluteCells, (state) => {
        state.mobileOverlayView = "none";
      })
      .addMatcher(
        (action: UnknownAction): action is UnknownAction =>
          action.type.startsWith("trackerDocument/") &&
          !action.type.startsWith("trackerDocument/loadSong") &&
          !action.type.startsWith("trackerDocument/saveSong") &&
          !action.type.startsWith("trackerDocument/addNewSong") &&
          !action.type.startsWith("trackerDocument/requestAddNewSong"),
        (state, _action) => {
          state.modified = true;
        },
      ),
});

export const { actions } = trackerSlice;

export default trackerSlice.reducer;
