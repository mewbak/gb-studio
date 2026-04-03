import reducer, {
  initialState,
  SubpatternEditorMode,
  TrackerState,
} from "../../../../src/store/features/tracker/trackerState";
import actions from "../../../../src/store/features/tracker/trackerActions";
import { loadSongFile } from "../../../../src/store/features/trackerDocument/trackerDocumentState";

test("Should default subpattern editor mode to simple", () => {
  expect(initialState.subpatternEditorMode).toBe("simple");
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
