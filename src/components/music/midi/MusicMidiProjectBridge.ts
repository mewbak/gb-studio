import API from "renderer/lib/api";
import type { MusicMidiState } from "shared/lib/music/midi";
import { musicMidiController } from "./musicMidiController";

type MusicMidiBridgeStore = {
  dispatch: (action: unknown) => unknown;
  getState: () => {
    tracker: {
      midiInput: MusicMidiState;
    };
  };
  subscribe: (listener: () => void) => () => void;
};

let activeStore: MusicMidiBridgeStore | null = null;
let teardownBridge: (() => void) | null = null;

export const initMusicMidiProjectBridge = (store: MusicMidiBridgeStore) => {
  if (activeStore === store && teardownBridge) {
    return teardownBridge;
  }

  teardownBridge?.();

  activeStore = store;
  musicMidiController.bindStore(store);

  let previousMidiState = store.getState().tracker.midiInput;

  API.music.updateMidiInputMenuState(previousMidiState);

  const unsubscribeStore = store.subscribe(() => {
    const midiState = store.getState().tracker.midiInput;
    if (midiState === previousMidiState) {
      return;
    }

    previousMidiState = midiState;
    API.music.updateMidiInputMenuState(midiState);
  });

  const unsubscribeToggle = API.events.menu.midiInputToggle.subscribe(() => {
    void musicMidiController.toggleEnabled();
  });

  const unsubscribeSelect = API.events.menu.midiInputSelect.subscribe(
    (_event, inputId) => {
      void musicMidiController.selectInput(inputId);
    },
  );

  void musicMidiController.initialize();

  teardownBridge = () => {
    unsubscribeStore();
    unsubscribeToggle();
    unsubscribeSelect();
    if (activeStore === store) {
      activeStore = null;
    }
    if (teardownBridge) {
      teardownBridge = null;
    }
  };

  return teardownBridge;
};
