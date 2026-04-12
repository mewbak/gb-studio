import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer";
import backupMusicMiddleware from "gbs-music-web/store/backupMusicMiddleware";
import projectMiddleware from "gbs-music-web/store/projectMiddleware";

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
      }).concat([backupMusicMiddleware, projectMiddleware]),
  });

export type MusicEditorStore = ReturnType<typeof createMusicEditorStore>;
