import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer";
import backupMusicMiddleware from "gbs-music-web/store/backupMusicMiddleware";

export type MusicEditorRootState = ReturnType<typeof rootReducer>;

export const createMusicEditorStore = () =>
  configureStore({
    reducer: rootReducer,
    devTools: {
      latency: 200,
      actionsDenylist: ["tracker/setHover"],
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat([backupMusicMiddleware]),
  });

export type MusicEditorStore = ReturnType<typeof createMusicEditorStore>;
