import { configureStore } from "@reduxjs/toolkit";
import { createMusicAssetSelectors } from "./features/musicAssets/musicAssetsState";
import rootReducer from "./rootReducer";

export type MusicEditorRootState = ReturnType<typeof rootReducer>;

export const musicAssetSelectors =
  createMusicAssetSelectors<MusicEditorRootState>();

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
      }),
  });
