import { Dispatch, Middleware } from "@reduxjs/toolkit";
import { renameWebDocument } from "gbs-music-web/lib/adapters";
import { musicAssetActions } from "gbs-music-web/store/features/musicAssets/musicAssetsState";
import type { MusicEditorRootState } from "gbs-music-web/store/configureStore";
import { actions as trackerDocumentActions } from "store/features/trackerDocument/trackerDocumentState";
import projectActions from "store/features/project/projectActions";

const projectMiddleware: Middleware<Dispatch, MusicEditorRootState> =
  (store) => (next) => async (action) => {
    const result = next(action);

    if (!projectActions.renameMusicAsset.match(action)) {
      return result;
    }

    const state = store.getState();
    const asset =
      state.project.present.entities.music.entities[action.payload.musicId];
    if (!asset) {
      return result;
    }

    const safeName = action.payload.newFilename.replace(/[/\\]/g, "").trim();
    if (!safeName) {
      return result;
    }

    const newFilename = `${safeName}.${asset.type === "uge" ? "uge" : "mod"}`;
    if (newFilename === asset.filename) {
      return result;
    }

    await renameWebDocument(
      action.payload.musicId,
      asset.filename,
      newFilename,
    );

    store.dispatch(
      musicAssetActions.renameMusicAsset({
        musicId: action.payload.musicId,
        newFilename,
      }),
    );

    if (action.payload.musicId === state.tracker.selectedSongId) {
      store.dispatch(trackerDocumentActions.setSongFilename(newFilename));
    }

    return result;
  };

export default projectMiddleware;
