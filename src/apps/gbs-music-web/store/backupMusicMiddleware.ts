import { Dispatch, isAction, Middleware } from "@reduxjs/toolkit";
import { MusicEditorRootState } from "gbs-music-web/store/configureStore";
import throttle from "lodash/throttle";
import { Song } from "shared/lib/uge/types";
import {
  BACKUP_SONG_KEY,
  BACKUP_TIMESTAMP_KEY,
  serializeSong,
} from "gbs-music-web/lib/songBackup";

const throttledWriteToLocalStorage = throttle(
  (song: Song) => {
    localStorage.setItem(BACKUP_SONG_KEY, serializeSong(song));
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, String(Date.now()));
  },
  3000,
  {
    leading: false,
  },
);

const backupMusicMiddleware: Middleware<Dispatch, MusicEditorRootState> =
  (store) => (next) => (action) => {
    next(action);

    if (!isAction(action)) {
      return;
    }

    if (
      action.type.startsWith("trackerDocument/") &&
      !action.type.startsWith("trackerDocument/loadSong") &&
      !action.type.startsWith("trackerDocument/saveSong") &&
      !action.type.startsWith("trackerDocument/addNewSong") &&
      !action.type.startsWith("trackerDocument/unloadSong") &&
      !action.type.startsWith("trackerDocument/requestAddNewSong")
    ) {
      const state = store.getState();
      if (state.trackerDocument.present.song) {
        throttledWriteToLocalStorage(state.trackerDocument.present.song);
      }
    }
  };

export default backupMusicMiddleware;
