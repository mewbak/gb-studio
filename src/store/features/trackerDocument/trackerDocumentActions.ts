import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
import { actions } from "./trackerDocumentState";
import type { PatternCellChange } from "./trackerDocumentState";
import type { MusicAsset } from "shared/lib/resources/types";
import API from "renderer/lib/api";
import { matchAssetEntity } from "shared/lib/entities/entitiesHelpers";
import {
  parsePatternToClipboard,
  parseClipboardToPattern,
  parseClipboardOrigin,
  NO_CHANGE_ON_PASTE,
  parsePatternFieldsToClipboard,
} from "shared/lib/uge/clipboard";
import {
  TRACKER_ROW_SIZE,
  TRACKER_CHANNEL_FIELDS,
  TRACKER_NUM_CHANNELS,
  TRACKER_PATTERN_LENGTH,
} from "consts";
import type { PatternCellAddress } from "shared/lib/uge/editor/types";
import type { PatternCell } from "shared/lib/uge/types";
import { RootState, AppThunk } from "store/storeTypes";
import {
  buildSequencePattern,
  getSequenceChannelCell,
  toAbsRow,
  resolveAbsRow,
} from "store/features/trackerDocument/trackerDocumentHelpers";
import { wrapNote } from "shared/lib/uge/display";

const convertModToUgeSong = createAsyncThunk<
  {
    data: MusicAsset;
  },
  {
    asset: MusicAsset;
    allMusic: MusicAsset[];
  }
>("trackerDocument/convertModToUge", async ({ asset, allMusic }) => {
  const data = await API.tracker.convertModToUge(asset);
  // Find existing asset with same filename to get correct id
  const existingAsset = matchAssetEntity(data, allMusic);
  return {
    data: existingAsset ? existingAsset : data,
  };
});

const selectTrackerDocumentSong = (state: RootState) =>
  state.trackerDocument.present.song;

const copyAbsoluteCells =
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

    const flatPattern = song.sequence.flatMap((_, sequenceId) =>
      buildSequencePattern(song, sequenceId),
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

const cutAbsoluteCells =
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

    const flatPattern = song.sequence.flatMap((_, sequenceId) =>
      buildSequencePattern(song, sequenceId),
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

const pasteInPlace =
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

      const resolved = resolveAbsRow(song.sequence, absRow, args.channelId);

      if (!resolved) {
        continue;
      }

      const existing = song.patterns?.[resolved.patternId]?.[resolved.rowId];
      if (!existing) {
        continue;
      }

      changes.push({
        patternId: resolved.patternId,
        rowId: resolved.rowId,
        channelId: args.channelId,
        changes: {
          note: cell.note,
          instrument:
            cell.instrument !== NO_CHANGE_ON_PASTE
              ? cell.instrument
              : existing.instrument,
          effectCode:
            cell.effectCode !== NO_CHANGE_ON_PASTE
              ? cell.effectCode
              : existing.effectCode,
          effectParam:
            cell.effectParam !== NO_CHANGE_ON_PASTE
              ? cell.effectParam
              : existing.effectParam,
        },
      });
    }

    if (changes.length > 0) {
      dispatch(actions.applyPatternCellChanges({ changes }));
    }
  };

const copyTrackerFields =
  (args: { sequenceId: number; selectedTrackerFields: number[] }): AppThunk =>
  (_dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { sequenceId, selectedTrackerFields } = args;

    const pattern = buildSequencePattern(song, sequenceId);
    if (!pattern || selectedTrackerFields.length === 0) {
      return;
    }

    const clipboardText = parsePatternFieldsToClipboard(
      pattern,
      selectedTrackerFields,
    );

    void API.clipboard.writeText(clipboardText);
  };

const cutTrackerFields =
  (args: { sequenceId: number; selectedTrackerFields: number[] }): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { sequenceId, selectedTrackerFields } = args;

    const pattern = buildSequencePattern(song, sequenceId);
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
        sequenceId,
        selectedTrackerFields,
      }),
    );
  };

const pasteTrackerFields =
  (args: { sequenceId: number; startField: number }): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { sequenceId, startField } = args;
    const pattern = buildSequencePattern(song, sequenceId);

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

        if (pastedCell.effectCode !== NO_CHANGE_ON_PASTE) {
          cellChanges.effectCode = pastedCell.effectCode;
        }

        if (pastedCell.effectParam !== NO_CHANGE_ON_PASTE) {
          cellChanges.effectParam = pastedCell.effectParam;
        }

        if (Object.keys(cellChanges).length === 0) {
          continue;
        }

        const targetPatternId = song.sequence[sequenceId]?.channels[channelId];
        if (targetPatternId === undefined) {
          continue;
        }

        changes.push({
          patternId: targetPatternId,
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

const moveAbsoluteCells =
  (args: {
    patternCells: PatternCellAddress[];
    rowDelta: number;
    noteDelta: number;
    clone: boolean;
  }): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { patternCells, rowDelta, noteDelta, clone } = args;

    if (patternCells.length === 0) {
      return;
    }

    if (rowDelta === 0 && noteDelta === 0) {
      return;
    }

    const totalAbsRows = song.sequence.length * TRACKER_PATTERN_LENGTH;

    const uniqueSourceCells = new Map<
      string,
      {
        patternId: number;
        rowId: number;
        channelId: number;
        sequenceId: number;
        absRow: number;
        cell: PatternCell;
        note: number;
      }
    >();

    for (const sourceAddress of patternCells) {
      const resolved = getSequenceChannelCell(
        song,
        sourceAddress.sequenceId,
        sourceAddress.channelId,
        sourceAddress.rowId,
      );
      if (!resolved) {
        continue;
      }

      const { patternId, cell } = resolved;

      if (!cell || cell.note === null) {
        continue;
      }

      const key = `${patternId}:${sourceAddress.rowId}:${sourceAddress.channelId}`;
      if (uniqueSourceCells.has(key)) {
        continue;
      }

      uniqueSourceCells.set(key, {
        patternId,
        rowId: sourceAddress.rowId,
        channelId: sourceAddress.channelId,
        sequenceId: sourceAddress.sequenceId,
        absRow: toAbsRow(sourceAddress.sequenceId, sourceAddress.rowId),
        cell,
        note: cell.note,
      });
    }

    if (uniqueSourceCells.size === 0) {
      return;
    }

    const selectedPatternCellKeys = new Set(
      patternCells.map(
        (selectedCell) =>
          `${selectedCell.sequenceId}:${selectedCell.rowId}:${selectedCell.channelId}`,
      ),
    );

    const changes: Array<{
      patternId: number;
      rowId: number;
      channelId: number;
      changes: Partial<PatternCell>;
    }> = [];

    for (const source of uniqueSourceCells.values()) {
      const targetAbsRow = source.absRow + rowDelta;

      const previousSourcePositionKey = `${source.sequenceId}:${
        source.rowId - rowDelta
      }:${source.channelId}`;

      if (!clone && !selectedPatternCellKeys.has(previousSourcePositionKey)) {
        changes.push({
          patternId: source.patternId,
          rowId: source.rowId,
          channelId: source.channelId,
          changes: {
            instrument: null,
            note: null,
            effectCode: null,
            effectParam: null,
          },
        });
      }

      if (targetAbsRow < 0 || targetAbsRow >= totalAbsRows) {
        continue;
      }

      const targetResolved = resolveAbsRow(
        song.sequence,
        targetAbsRow,
        source.channelId,
      );
      if (!targetResolved) {
        continue;
      }

      changes.push({
        patternId: targetResolved.patternId,
        rowId: targetResolved.rowId,
        channelId: source.channelId,
        changes: {
          ...source.cell,
          note: wrapNote(source.note + noteDelta),
        },
      });
    }

    if (changes.length > 0) {
      dispatch(actions.applyPatternCellChanges({ changes }));
    }

    const newSelection = [...uniqueSourceCells.values()]
      .map((source) => {
        const targetAbsRow = source.absRow + rowDelta;

        if (targetAbsRow < 0 || targetAbsRow >= totalAbsRows) {
          return null;
        }

        const resolved = resolveAbsRow(
          song.sequence,
          targetAbsRow,
          source.channelId,
        );
        if (!resolved) {
          return null;
        }

        return {
          sequenceId: resolved.sequenceId,
          rowId: resolved.rowId,
          channelId: source.channelId,
        };
      })
      .filter(
        (selectedCell): selectedCell is PatternCellAddress =>
          selectedCell !== null,
      );

    dispatch(moveAbsoluteCellsComplete({ newSelection }));
  };

const moveAbsoluteCellsComplete = createAction<{
  newSelection: PatternCellAddress[];
}>("trackerDocument/moveAbsoluteCellsComplete");

const commitPastedAbsoluteCells =
  (args: {
    pastedPattern: PatternCell[][];
    channelId: number;
    startSequenceId: number;
    startRowId: number;
    anchorNote: number;
  }): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const {
      pastedPattern,
      channelId,
      startSequenceId,
      startRowId,
      anchorNote,
    } = args;

    if (pastedPattern.length === 0) {
      return;
    }

    const startAbsRow = toAbsRow(startSequenceId, startRowId);
    const totalAbsRows = song.sequence.length * TRACKER_PATTERN_LENGTH;

    let noteOffset: number | undefined;

    const changes: Array<{
      patternId: number;
      rowId: number;
      channelId: number;
      changes: Partial<PatternCell>;
    }> = [];

    for (let offset = 0; offset < pastedPattern.length; offset++) {
      const cell = pastedPattern[offset]?.[0];

      if (!cell || cell.note === null || cell.note === NO_CHANGE_ON_PASTE) {
        continue;
      }

      if (noteOffset === undefined) {
        noteOffset = anchorNote - cell.note;
      }

      const targetAbsRow = startAbsRow + offset;
      if (targetAbsRow < 0 || targetAbsRow >= totalAbsRows) {
        continue;
      }

      const resolved = resolveAbsRow(song.sequence, targetAbsRow, channelId);
      if (!resolved) {
        continue;
      }

      const existing = song.patterns?.[resolved.patternId]?.[resolved.rowId];
      if (!existing) {
        continue;
      }

      changes.push({
        patternId: resolved.patternId,
        rowId: resolved.rowId,
        channelId,
        changes: {
          ...cell,
          note: wrapNote(cell.note + noteOffset),
        },
      });
    }

    if (changes.length > 0) {
      dispatch(actions.applyPatternCellChanges({ changes }));
    }
  };

const paintAbsoluteCells =
  (args: {
    cells: Array<{ absRow: number; note: number }>;
    channelId: number;
    instrumentId: number;
  }): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { cells, channelId, instrumentId } = args;

    if (cells.length === 0) {
      return;
    }

    const changes: PatternCellChange[] = [];
    const seen = new Set<string>();

    for (const paintCell of cells) {
      const resolved = resolveAbsRow(
        song.sequence,
        paintCell.absRow,
        channelId,
      );
      if (!resolved) {
        continue;
      }

      const key = `${resolved.patternId}:${resolved.rowId}:${channelId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const existing = song.patterns?.[resolved.patternId]?.[resolved.rowId];

      if (!existing) {
        continue;
      }

      if (
        existing.note === paintCell.note &&
        existing.instrument === instrumentId
      ) {
        continue;
      }

      changes.push({
        patternId: resolved.patternId,
        rowId: resolved.rowId,
        channelId,
        changes: {
          instrument: instrumentId,
          note: paintCell.note,
        },
      });
    }

    if (changes.length > 0) {
      dispatch(actions.applyPatternCellChanges({ changes }));
    }
  };

const eraseAbsoluteCells =
  (args: {
    cells: Array<{ absRow: number; note: number }>;
    channelId: number;
  }): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const song = selectTrackerDocumentSong(state);

    if (!song) {
      return;
    }

    const { cells, channelId } = args;

    if (cells.length === 0) {
      return;
    }

    const changes: PatternCellChange[] = [];
    const seen = new Set<string>();

    for (const eraseCell of cells) {
      const resolved = resolveAbsRow(
        song.sequence,
        eraseCell.absRow,
        channelId,
      );
      if (!resolved) {
        continue;
      }

      const key = `${resolved.patternId}:${resolved.rowId}:${channelId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const existing = song.patterns?.[resolved.patternId]?.[resolved.rowId];

      if (!existing) {
        continue;
      }

      if (existing.note !== eraseCell.note) {
        continue;
      }

      changes.push({
        patternId: resolved.patternId,
        rowId: resolved.rowId,
        channelId,
        changes: {
          instrument: null,
          note: null,
        },
      });
    }

    if (changes.length > 0) {
      dispatch(actions.applyPatternCellChanges({ changes }));
    }
  };

const allActions = {
  ...actions,
  convertModToUgeSong,
  copyAbsoluteCells,
  cutAbsoluteCells,
  pasteInPlace,
  copyTrackerFields,
  cutTrackerFields,
  pasteTrackerFields,
  moveAbsoluteCells,
  moveAbsoluteCellsComplete,
  commitPastedAbsoluteCells,
  paintAbsoluteCells,
  eraseAbsoluteCells,
};

export default allActions;
