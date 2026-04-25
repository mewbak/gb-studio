import reducer, {
  initialState,
  SubpatternEditorMode,
  TrackerState,
} from "../../../../src/store/features/tracker/trackerState";
import actions from "../../../../src/store/features/tracker/trackerActions";
import { loadSongFile } from "../../../../src/store/features/trackerDocument/trackerDocumentState";
import { TRACKER_ROW_SIZE } from "../../../../src/consts";

test("Should default subpattern editor mode to script", () => {
  expect(initialState.subpatternEditorMode).toBe("script");
});

test("Should default metronome to disabled", () => {
  expect(initialState.metronomeEnabled).toBe(false);
});

test("Should set subpattern editor mode", () => {
  const state: TrackerState = {
    ...initialState,
    subpatternEditorMode: "script",
  };

  const action = actions.setSubpatternEditorMode("tracker");
  const newState = reducer(state, action);

  expect(newState.subpatternEditorMode).toBe("tracker");
});

test("Should set metronome enabled state", () => {
  const state: TrackerState = {
    ...initialState,
    metronomeEnabled: false,
  };

  const action = actions.setMetronomeEnabled(true);
  const newState = reducer(state, action);

  expect(newState.metronomeEnabled).toBe(true);
});

test("Should preserve subpattern editor mode when song loads", () => {
  const state: TrackerState = {
    ...initialState,
    subpatternEditorMode: "tracker" as SubpatternEditorMode,
    selectedSongId: "song-1",
    status: "loading",
  };

  const action = loadSongFile.fulfilled(
    undefined as never,
    "request-id",
    "song-1",
  );
  const newState = reducer(state, action);

  expect(newState.subpatternEditorMode).toBe("tracker");
  expect(newState.selectedSongId).toBe("song-1");
});

test("Should preserve metronome enabled state when song loads", () => {
  const state: TrackerState = {
    ...initialState,
    metronomeEnabled: true,
    selectedSongId: "song-1",
    status: "loading",
  };

  const action = loadSongFile.fulfilled(
    undefined as never,
    "request-id",
    "song-1",
  );
  const newState = reducer(state, action);

  expect(newState.metronomeEnabled).toBe(true);
  expect(newState.selectedSongId).toBe("song-1");
});

test("Should derive tracker selection state from tracker grid updates", () => {
  const action = actions.setTrackerGridState({
    activeField: 5,
    selectionOrigin: {
      x: 4,
      y: 0,
      sequenceId: 0,
    },
    selectionRect: {
      x: 4,
      y: 0,
      width: 1,
      height: 1,
    },
  });

  const newState = reducer(initialState, action);

  expect(newState.trackerActiveField).toBe(5);
  expect(newState.selectedTrackerFields).toEqual([
    4,
    TRACKER_ROW_SIZE + 4,
    5,
    TRACKER_ROW_SIZE + 5,
  ]);
  expect(newState.selectedPatternCells).toEqual([
    { sequenceId: 0, rowId: 0, channelId: 1 },
    { sequenceId: 0, rowId: 1, channelId: 1 },
  ]);
  expect(newState.selectedChannel).toBe(1);
});

test("Should move tracker grid to the selected sequence when idle", () => {
  const state: TrackerState = {
    ...initialState,
    selectedSequence: 0,
    selectedChannel: 2,
  };

  const newState = reducer(state, actions.setSelectedSequence(2));

  expect(newState.selectedSequence).toBe(2);
  expect(newState.selectedChannel).toBe(2);
  expect(newState.trackerActiveField).toBe(2 * 64 * TRACKER_ROW_SIZE + 8);
  expect(newState.trackerSelectionOrigin).toEqual({
    x: 8,
    y: 0,
    sequenceId: 2,
  });
  expect(newState.selectedTrackerFields).toEqual([8]);
  expect(newState.selectedPatternCells).toEqual([
    { sequenceId: 2, rowId: 0, channelId: 2 },
  ]);
});

test("Should not reset tracker grid selection while playing", () => {
  const state: TrackerState = {
    ...initialState,
    playing: true,
    selectedSequence: 0,
    trackerActiveField: 10,
    trackerSelectionOrigin: { x: 2, y: 0, sequenceId: 0 },
    selectedTrackerFields: [2],
  };

  const newState = reducer(state, actions.setSelectedSequence(3));

  expect(newState.selectedSequence).toBe(3);
  expect(newState.trackerActiveField).toBe(10);
  expect(newState.trackerSelectionOrigin).toEqual({
    x: 2,
    y: 0,
    sequenceId: 0,
  });
  expect(newState.selectedTrackerFields).toEqual([2]);
});
