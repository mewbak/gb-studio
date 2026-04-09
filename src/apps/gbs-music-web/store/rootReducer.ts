import { combineReducers, UnknownAction, Action } from "@reduxjs/toolkit";
import undoable from "redux-undo";
import { TRACKER_REDO, TRACKER_UNDO } from "consts";
import clipboard from "store/features/clipboard/clipboardState";
import editor from "store/features/editor/editorState";
import music from "store/features/music/musicState";
import navigation from "store/features/navigation/navigationState";
import tracker from "store/features/tracker/trackerState";
import trackerDocument from "store/features/trackerDocument/trackerDocumentState";
import { musicAssetsReducer } from "./features/musicAssets/musicAssetsState";

let lastTrackerUndoStateTime = 0;
const UNDO_THROTTLE = 300;

const makeStaticUndoReducer =
  <TState, TAction extends Action = UnknownAction>(
    innerReducer: (state: TState | undefined, action: TAction) => TState,
  ) =>
  (
    state:
      | {
          past: TState[];
          present: TState;
          future: TState[];
        }
      | undefined,
    action: TAction,
  ) => {
    const present = innerReducer(state?.present, action);

    return {
      past: state?.past ?? [],
      present,
      future: state?.future ?? [],
    };
  };

const noopReducer =
  <T>(initialState: T) =>
  (state: T = initialState): T =>
    state;

const entitiesReducer = combineReducers({
  music: musicAssetsReducer,
  backgrounds: noopReducer({ ids: [], entities: {} }),
  scenes: noopReducer({ ids: [], entities: {} }),
  spriteSheets: noopReducer({ ids: [], entities: {} }),
  palettes: noopReducer({ ids: [], entities: {} }),
  customEvents: noopReducer({ ids: [], entities: {} }),
  sounds: noopReducer({ ids: [], entities: {} }),
  fonts: noopReducer({ ids: [], entities: {} }),
  avatars: noopReducer({ ids: [], entities: {} }),
  emotes: noopReducer({ ids: [], entities: {} }),
  actorPrefabs: noopReducer({ ids: [], entities: {} }),
  triggerPrefabs: noopReducer({ ids: [], entities: {} }),
});

const projectPresentReducer = combineReducers({
  entities: entitiesReducer,
  settings: noopReducer({}),
  metadata: noopReducer({}),
});

const projectReducer = makeStaticUndoReducer(projectPresentReducer);

const rootReducer = combineReducers({
  editor,
  clipboard,
  music,
  navigation,
  tracker,
  musicAssets: musicAssetsReducer,
  project: projectReducer,
  trackerDocument: undoable(trackerDocument, {
    limit: 20,
    initTypes: [
      "trackerDocument/loadSong/pending",
      "trackerDocument/unloadSong",
    ],
    filter: (action, currentState, previousHistory) => {
      if (
        action.type.startsWith("trackerDocument/loadSong/fulfilled") ||
        action.type.startsWith("trackerDocument/addSequence") ||
        action.type.startsWith("trackerDocument/removeSequence")
      ) {
        return true;
      }

      const shouldStoreUndo =
        currentState !== previousHistory.present &&
        Date.now() > lastTrackerUndoStateTime + UNDO_THROTTLE;
      if (!shouldStoreUndo) {
        return false;
      }
      lastTrackerUndoStateTime = Date.now();
      return (
        action.type.startsWith("trackerDocument/") &&
        !action.type.startsWith("trackerDocument/loadSong") &&
        !action.type.startsWith("trackerDocument/saveSong") &&
        !action.type.startsWith("trackerDocument/addNewSong") &&
        !action.type.startsWith("trackerDocument/requestAddNewSong") &&
        !action.type.startsWith("trackerDocument/setSongFilename")
      );
    },
    ignoreInitialState: true,
    undoType: TRACKER_UNDO,
    redoType: TRACKER_REDO,
  }),
});

export default rootReducer;
