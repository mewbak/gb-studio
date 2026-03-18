import {
  createEntityAdapter,
  createSelector,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import type { MusicAsset } from "shared/lib/resources/types";

const musicAssetsAdapter = createEntityAdapter<MusicAsset>();

const musicAssetsSlice = createSlice({
  name: "musicAssets",
  initialState: musicAssetsAdapter.getInitialState(),
  reducers: {
    setMusicAssets: (state, action: PayloadAction<MusicAsset[]>) =>
      musicAssetsAdapter.setAll(state, action.payload),
    renameMusicAsset: (
      state,
      action: PayloadAction<{ musicId: string; newFilename: string }>,
    ) => {
      const existing = state.entities[action.payload.musicId];
      if (!existing) {
        return;
      }
      musicAssetsAdapter.updateOne(state, {
        id: action.payload.musicId,
        changes: {
          filename: action.payload.newFilename,
          name: action.payload.newFilename.replace(/\.[^.]+$/, ""),
        },
      });
    },
    removeMusicAsset: (state, action: PayloadAction<{ musicId: string }>) =>
      musicAssetsAdapter.removeOne(state, action.payload.musicId),
  },
});

export const { actions: musicAssetActions, reducer: musicAssetsReducer } =
  musicAssetsSlice;

export const createMusicAssetSelectors = <
  TState extends { musicAssets: ReturnType<typeof musicAssetsReducer> },
>() => {
  const selectors = musicAssetsAdapter.getSelectors<TState>(
    (state) => state.musicAssets,
  );

  const selectUgeSongs = createSelector(selectors.selectAll, (songs) =>
    songs.filter((song) => (song.type || "uge") === "uge"),
  );

  return {
    ...selectors,
    selectUgeSongs,
  };
};
