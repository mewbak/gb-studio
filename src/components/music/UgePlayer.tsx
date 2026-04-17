import React, { useEffect } from "react";
import trackerActions from "store/features/tracker/trackerActions";
import API from "renderer/lib/api";
import { MusicDataReceivePacket } from "shared/lib/music/types";
import { useAppDispatch, useAppSelector, useAppStore } from "store/hooks";
import type { RootState } from "store/configureStore";

const selectIsPlaybackMetronomeEnabled = (state: RootState) => {
  const midiState = state.tracker.midiInput;
  const metronomeEnabled = state.tracker.metronomeEnabled;
  const view = state.tracker.view;
  return (
    metronomeEnabled &&
    view === "roll" &&
    midiState.enabled &&
    midiState.selectedInputId !== null &&
    midiState.recordingEnabled
  );
};

export const UgePlayer = () => {
  const store = useAppStore();
  const dispatch = useAppDispatch();

  useEffect(() => {
    API.music.openMusic();
    return function close() {
      API.music.closeMusic();
    };
  }, []);

  const play = useAppSelector((state) => state.tracker.playing);
  const exporting = useAppSelector((state) => state.tracker.exporting);

  const playbackMetronomeEnabled = useAppSelector(
    selectIsPlaybackMetronomeEnabled,
  );

  useEffect(() => {
    const listener = (_event: unknown, d: MusicDataReceivePacket) => {
      switch (d.action) {
        case "initialized":
          const state = store.getState();
          const song = state.trackerDocument.present.song;
          if (song) {
            API.music.sendToMusicWindow({
              action: "load-song",
              song,
            });
          }
          break;
        case "loaded":
          dispatch(trackerActions.playerReady(true));
          break;
        case "muted":
          dispatch(trackerActions.setChannelStatus(d.channels));
          break;
      }
    };

    const unsubscribeMusicData = API.events.music.response.subscribe(listener);

    return () => {
      unsubscribeMusicData();
    };
  }, [store, dispatch]);

  useEffect(() => {
    if (exporting) {
      return;
    }
    const state = store.getState();
    const song = state.trackerDocument.present.song;
    const playbackMetronomeEnabled = selectIsPlaybackMetronomeEnabled(state);

    if (play && song) {
      API.music.sendToMusicWindow({
        action: "play",
        song: song,
        metronomeEnabled: playbackMetronomeEnabled,
      });
    } else {
      API.music.sendToMusicWindow({
        action: "stop",
      });
    }
  }, [store, play, exporting]);

  useEffect(() => {
    API.music.sendToMusicWindow({
      action: "set-metronome-enabled",
      enabled: playbackMetronomeEnabled,
    });
  }, [playbackMetronomeEnabled]);

  return <div />;
};
