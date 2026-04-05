import React, { useCallback, useEffect, useState } from "react";
import {
  createMusicWorkspace,
  MusicDocumentReference,
  MusicWorkspace,
} from "shared/lib/music/workspace";
import trackerActions from "store/features/tracker/trackerActions";
import styled from "styled-components";
import { saveSongFile } from "store/features/trackerDocument/trackerDocumentState";
import {
  createTemplateMusicDocument,
  importMusicDocument,
  supportsPersistentSave,
  webMusicEnvironment,
} from "gbs-music-web/lib/adapters";
import MusicWebToolbar, {
  MUSIC_WEB_TOOLBAR_HEIGHT,
} from "gbs-music-web/components/MusicWebToolbar";
import { musicAssetActions } from "gbs-music-web/store/features/musicAssets/musicAssetsState";
import { musicWorkspaceToAssets } from "gbs-music-web/store/features/musicAssets/musicAssetsHelpers";
import StandaloneMusicPage from "gbs-music-web/components/StandaloneMusicPage";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { musicSelectors } from "store/features/entities/entitiesState";
import WebAPI from "gbs-music-web/lib/api";
import { ConfirmUnsavedChangesDialog } from "gbs-music-web/components/dialog/ConfirmUnsavedChangesDialog";
import { MusicWebSplash } from "gbs-music-web/components/MusicWebSplash";
import { useUnsavedChangesGuard } from "gbs-music-web/components/hooks/useUnsavedChangesGuard";
import templateUge from "gbs-music-web/data/template.uge";

const AppShell = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const AppContent = styled.div`
  flex: 1 1 0;
  min-height: 0;
  display: flex;
`;

const dataUriToUint8Array = (dataUri: string): Uint8Array => {
  const prefix = "base64,";
  const prefixIndex = dataUri.indexOf(prefix);

  if (prefixIndex === -1) {
    throw new Error("Invalid template data URI");
  }

  const base64 = dataUri.slice(prefixIndex + prefix.length);
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const templateSongData = dataUriToUint8Array(templateUge);

const sortDocuments = (documents: MusicDocumentReference[]) =>
  [...documents].sort((a, b) =>
    a.filename.localeCompare(b.filename, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const appendWorkspaceDocument = (
  workspace: MusicWorkspace | undefined,
  document: MusicDocumentReference,
) => {
  if (!workspace) {
    return createMusicWorkspace({
      source: "browser",
      openMode: "file",
      activeDocumentId: document.id,
      documents: [document],
    });
  }

  const existingDocuments = workspace.documents.filter(
    (item) => item.id !== document.id,
  );
  return createMusicWorkspace({
    ...workspace,
    documents: sortDocuments([...existingDocuments, document]),
    activeDocumentId: document.id,
  });
};

export const MusicWebApp = () => {
  const dispatch = useAppDispatch();
  const [workspace, setWorkspace] = useState<MusicWorkspace>();
  const [themeId, setThemeId] = useState(WebAPI.getThemeId());
  const [localeId, setLocaleId] = useState(WebAPI.getLocaleId());
  const singleDocumentMode = !supportsPersistentSave();
  const modified = useAppSelector((state) => state.tracker.modified);
  const currentSongName = useAppSelector((state) => {
    const currentId = state.tracker.selectedSongId;
    return musicSelectors.selectById(state, currentId)?.name ?? "";
  });
  const selectedSongId = useAppSelector(
    (state) => state.tracker.selectedSongId,
  );

  const saveCurrentSong = useCallback(async () => {
    const result = await dispatch(saveSongFile());
    return saveSongFile.fulfilled.match(result);
  }, [dispatch]);

  const {
    hasPendingAction,
    runWithUnsavedCheck,
    closeConfirm,
    saveAndContinue,
    discardAndContinue,
  } = useUnsavedChangesGuard({
    modified,
    save: saveCurrentSong,
  });

  useEffect(() => {
    webMusicEnvironment.setWindowTitle(
      currentSongName ? `GBS Music - ${currentSongName}` : "GBS Music",
    );
  }, [currentSongName]);

  const applyWorkspace = useCallback(
    (nextWorkspace: MusicWorkspace) => {
      setWorkspace(nextWorkspace);
      dispatch(
        musicAssetActions.setMusicAssets(musicWorkspaceToAssets(nextWorkspace)),
      );
      dispatch(
        trackerActions.setSelectedSongId(nextWorkspace.activeDocumentId ?? ""),
      );
    },
    [dispatch],
  );

  const openMusicWorkspace = useCallback(
    async (mode: "file" | "directory") => {
      try {
        const nextWorkspace =
          mode === "file"
            ? await webMusicEnvironment.openFileWorkspace?.()
            : await webMusicEnvironment.openDirectoryWorkspace?.();
        if (!nextWorkspace) {
          return;
        }
        applyWorkspace(nextWorkspace);
      } catch (error) {
        if (!isAbortError(error)) {
          throw error;
        }
      }
    },
    [applyWorkspace],
  );

  const createSong = useCallback(async () => {
    const document = await createTemplateMusicDocument(
      new Uint8Array(templateSongData),
      workspace,
    );
    if (!document) {
      return;
    }
    const nextWorkspace = singleDocumentMode
      ? createMusicWorkspace({
          source: "browser",
          openMode: "file",
          activeDocumentId: document.id,
          documents: [document],
        })
      : appendWorkspaceDocument(workspace, document);
    applyWorkspace(nextWorkspace);
  }, [applyWorkspace, singleDocumentMode, workspace]);

  const importSong = useCallback(async () => {
    const document = await importMusicDocument();
    if (!document) {
      return;
    }
    const nextWorkspace = singleDocumentMode
      ? createMusicWorkspace({
          source: "browser",
          openMode: "file",
          activeDocumentId: document.id,
          documents: [document],
        })
      : appendWorkspaceDocument(workspace, document);
    applyWorkspace(nextWorkspace);
  }, [applyWorkspace, singleDocumentMode, workspace]);

  const onSelectSong = useCallback(
    (nextSongId: string) => {
      if (nextSongId === selectedSongId) {
        return;
      }
      void runWithUnsavedCheck(async () => {
        dispatch(trackerActions.setSelectedSongId(nextSongId));
      });
    },
    [dispatch, runWithUnsavedCheck, selectedSongId],
  );

  const onThemeChange = useCallback((nextThemeId: string) => {
    WebAPI.setThemeId(nextThemeId);
    setThemeId(nextThemeId);
  }, []);

  const onLocaleChange = useCallback((nextLocaleId: string) => {
    WebAPI.setLocaleId(nextLocaleId);
    setLocaleId(nextLocaleId);
  }, []);

  const allSongs = useAppSelector(musicSelectors.selectAll);
  const hasSongs = allSongs.length > 0;

  const onCreateSong = useCallback(() => {
    void runWithUnsavedCheck(createSong);
  }, [createSong, runWithUnsavedCheck]);

  const onImportSong = useCallback(() => {
    if (singleDocumentMode) {
      void runWithUnsavedCheck(() => openMusicWorkspace("file"));
    } else {
      void runWithUnsavedCheck(importSong);
    }
  }, [importSong, openMusicWorkspace, runWithUnsavedCheck, singleDocumentMode]);

  const onOpenDirectoryWorkspace = useCallback(() => {
    if (singleDocumentMode) {
      return;
    }
    void runWithUnsavedCheck(() => openMusicWorkspace("directory"));
  }, [openMusicWorkspace, runWithUnsavedCheck, singleDocumentMode]);

  return (
    <AppShell
      data-id="app-shell"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <MusicWebToolbar
        themeId={themeId}
        localeId={localeId}
        onThemeChange={onThemeChange}
        onLocaleChange={onLocaleChange}
        onCreateSong={onCreateSong}
        onImportSong={onImportSong}
        onOpenDirectoryWorkspace={
          singleDocumentMode ? undefined : onOpenDirectoryWorkspace
        }
      />
      <AppContent data-id="app-content">
        {hasSongs ? (
          <StandaloneMusicPage
            key={localeId}
            onCreateSong={onCreateSong}
            onImportSong={onImportSong}
            onOpenDirectoryWorkspace={onOpenDirectoryWorkspace}
            onSelectSong={onSelectSong}
            topInset={MUSIC_WEB_TOOLBAR_HEIGHT}
          />
        ) : (
          <MusicWebSplash
            onCreateSong={onCreateSong}
            onImportSong={onImportSong}
            onOpenDirectoryWorkspace={onOpenDirectoryWorkspace}
          />
        )}
      </AppContent>
      {hasPendingAction ? (
        <ConfirmUnsavedChangesDialog
          filename={currentSongName}
          onCancel={closeConfirm}
          onSave={saveAndContinue}
          onDiscard={discardAndContinue}
        />
      ) : null}
    </AppShell>
  );
};
