import React, { useCallback, useEffect, useState } from "react";
import trackerActions from "store/features/tracker/trackerActions";
import styled from "styled-components";
import { saveSongFile } from "store/features/trackerDocument/trackerDocumentState";
import { webMusicEnvironment } from "gbs-music-web/lib/adapters";
import StandaloneMusicPage from "gbs-music-web/components/StandaloneMusicPage";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { musicSelectors } from "store/features/entities/entitiesState";
import WebAPI from "gbs-music-web/lib/api";
import { ConfirmUnsavedChangesDialog } from "gbs-music-web/components/dialog/ConfirmUnsavedChangesDialog";
import { MusicWebSplash } from "gbs-music-web/components/MusicWebSplash";
import { MusicWebToolbar } from "gbs-music-web/components/MusicWebToolbar";
import { useUnsavedChangesGuard } from "gbs-music-web/components/hooks/useUnsavedChangesGuard";
import templateUge from "gbs-music-web/data/template.uge";
import { useMusicWorkspace } from "gbs-music-web/components/hooks/useMusicWorkspace";

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

export const MusicWebApp = () => {
  const dispatch = useAppDispatch();
  const [themeId, setThemeId] = useState(WebAPI.getThemeId());
  const [localeId, setLocaleId] = useState(WebAPI.getLocaleId());
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

  const { singleDocumentMode, createSong, importSong, openDirectoryWorkspace } =
    useMusicWorkspace({
      templateSongData,
    });

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

  const onLocaleChange = useCallback(async (nextLocaleId: string) => {
    await WebAPI.setLocaleId(nextLocaleId);
    setLocaleId(nextLocaleId);
  }, []);

  const allSongs = useAppSelector(musicSelectors.selectAll);
  const hasSongs = allSongs.length > 0;

  const onCreateSong = useCallback(() => {
    void runWithUnsavedCheck(createSong);
  }, [createSong, runWithUnsavedCheck]);

  const onImportSong = useCallback(() => {
    void runWithUnsavedCheck(importSong);
  }, [importSong, runWithUnsavedCheck]);

  const onOpenDirectoryWorkspace = useCallback(() => {
    void runWithUnsavedCheck(openDirectoryWorkspace);
  }, [openDirectoryWorkspace, runWithUnsavedCheck]);

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
            onCreateSong={onCreateSong}
            onImportSong={onImportSong}
            onOpenDirectoryWorkspace={onOpenDirectoryWorkspace}
            onSelectSong={onSelectSong}
          />
        ) : (
          <MusicWebSplash
            onCreateSong={onCreateSong}
            onImportSong={onImportSong}
            onOpenDirectoryWorkspace={
              singleDocumentMode ? undefined : onOpenDirectoryWorkspace
            }
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
