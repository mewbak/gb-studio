import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import AppContainerDnD from "components/app/AppContainerDnD";
import {
  createMusicWorkspace,
  MusicDocumentReference,
  MusicWorkspace,
} from "shared/lib/music/workspace";
import trackerActions from "store/features/tracker/trackerActions";
import styled, { ThemeProvider } from "styled-components";
import GlobalStyle from "components/ui/globalStyle";
import { Button } from "components/ui/buttons/Button";
import { MenuOverlay } from "components/ui/menu/Menu";
import l10n from "shared/lib/lang/l10n";
import { saveSongFile } from "store/features/trackerDocument/trackerDocumentState";
import {
  createTemplateMusicDocument,
  importMusicDocument,
  supportsPersistentSave,
  webMusicEnvironment,
} from "gbs-music-web/lib/adapters";
import { installWebRendererApi } from "gbs-music-web/lib/api";
import MusicWebToolbar, {
  MUSIC_WEB_TOOLBAR_HEIGHT,
} from "gbs-music-web/components/MusicWebToolbar";
import { getThemeById } from "gbs-music-web/lib/preferences";
import { createMusicEditorStore } from "gbs-music-web/store/configureStore";
import { musicAssetActions } from "gbs-music-web/store/features/musicAssets/musicAssetsState";
import { musicWorkspaceToAssets } from "gbs-music-web/store/features/musicAssets/musicAssetsHelpers";
import StandaloneMusicPage from "gbs-music-web/components/StandaloneMusicPage";
import { useAppSelector } from "store/hooks";
import { musicSelectors } from "store/features/entities/entitiesState";
import { initKeyBindings } from "renderer/lib/keybindings/keyBindings";
import { GB3D } from "./components/Splash3D";
import { Select } from "ui/form/Select";

const root = createRoot(document.getElementById("App") as HTMLElement);
const store = createMusicEditorStore();
const webApiController = installWebRendererApi();
void store.dispatch(trackerActions.initViewFromSaved());

initKeyBindings();

const AppShell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const AppContent = styled.div`
  flex: 1 1 0;
  min-height: 0;
`;

const ConfirmOverlay = styled(MenuOverlay)`
  background: rgba(0, 0, 0, 0.35);
`;

const ConfirmModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  width: min(460px, calc(100vw - 32px));
  transform: translate(-50%, -50%);
  background: ${(props) => props.theme.colors.card.background};
  color: ${(props) => props.theme.colors.card.text};
  border: 1px solid ${(props) => props.theme.colors.card.border};
  box-shadow: ${(props) => props.theme.colors.card.boxShadow};
  border-radius: 4px;
  padding: 24px;
  z-index: 1001;
`;

const ConfirmTitle = styled.div`
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 10px;
`;

const ConfirmDetail = styled.p`
  margin: 0;
  line-height: 1.5;
`;

const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
`;

const sortDocuments = (documents: MusicDocumentReference[]) =>
  [...documents].sort((a, b) =>
    a.filename.localeCompare(b.filename, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const setWorkspaceInStore = (workspace: MusicWorkspace) => {
  store.dispatch(
    musicAssetActions.setMusicAssets(musicWorkspaceToAssets(workspace)),
  );
  store.dispatch(
    trackerActions.setSelectedSongId(workspace.activeDocumentId ?? ""),
  );
};

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

const loadTemplateSongData = async () => {
  const templateUrl = new URL("template.uge", window.location.href).toString();
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`Unable to load music template: ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
};

const MusicWebApp = () => {
  const [workspace, setWorkspace] = useState<MusicWorkspace>();
  const [themeId, setThemeId] = useState(webApiController.getThemeId());
  const [localeId, setLocaleId] = useState(webApiController.getLocaleId());
  const [pendingAction, setPendingAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const theme = useMemo(() => getThemeById(themeId), [themeId]);
  const singleDocumentMode = !supportsPersistentSave();
  const modified = useAppSelector((state) => state.tracker.modified);
  const currentSongName = useAppSelector((state) => {
    const currentId = state.tracker.selectedSongId;
    return musicSelectors.selectById(state, currentId)?.name ?? "";
  });
  const selectedSongId = useAppSelector(
    (state) => state.tracker.selectedSongId,
  );

  useEffect(() => {
    webMusicEnvironment.setWindowTitle(
      currentSongName ? `GBS Music - ${currentSongName}` : "GBS Music",
    );
  }, [currentSongName]);

  const applyWorkspace = useCallback((nextWorkspace: MusicWorkspace) => {
    setWorkspace(nextWorkspace);
    setWorkspaceInStore(nextWorkspace);
  }, []);

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
    const templateData = await loadTemplateSongData();
    const document = await createTemplateMusicDocument(templateData, workspace);
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

  const closeConfirm = useCallback(() => {
    setPendingAction(null);
  }, []);

  const runWithUnsavedCheck = useCallback(
    async (action: () => Promise<void>) => {
      if (!modified) {
        await action();
        return;
      }
      setPendingAction(() => action);
    },
    [modified],
  );

  const onSaveAndContinue = useCallback(async () => {
    if (!pendingAction) {
      return;
    }
    const result = await store.dispatch(saveSongFile());
    if (saveSongFile.fulfilled.match(result)) {
      const action = pendingAction;
      closeConfirm();
      await action();
    }
  }, [closeConfirm, pendingAction]);

  const onDiscardAndContinue = useCallback(async () => {
    if (!pendingAction) {
      return;
    }
    const action = pendingAction;
    closeConfirm();
    await action();
  }, [closeConfirm, pendingAction]);

  const onSelectSong = useCallback(
    (nextSongId: string) => {
      if (nextSongId === selectedSongId) {
        return;
      }
      void runWithUnsavedCheck(async () => {
        store.dispatch(trackerActions.setSelectedSongId(nextSongId));
      });
    },
    [runWithUnsavedCheck, selectedSongId],
  );

  const onThemeChange = useCallback((nextThemeId: string) => {
    webApiController.setThemeId(nextThemeId);
    setThemeId(nextThemeId);
  }, []);

  const onLocaleChange = useCallback((nextLocaleId: string) => {
    webApiController.setLocaleId(nextLocaleId);
    setLocaleId(nextLocaleId);
  }, []);

  const allSongs = useAppSelector(musicSelectors.selectAll);

  const onCreateSong = useCallback(() => {
    void runWithUnsavedCheck(async () => {
      await createSong();
    });
  }, [createSong, runWithUnsavedCheck]);

  const onImportSong = useCallback(() => {
    if (singleDocumentMode) {
      void runWithUnsavedCheck(async () => {
        await openMusicWorkspace("file");
      });
    } else {
      void runWithUnsavedCheck(async () => {
        await importSong();
      });
    }
  }, [importSong, openMusicWorkspace, runWithUnsavedCheck, singleDocumentMode]);

  const onOpenDirectoryWorkspace = useCallback(() => {
    if (singleDocumentMode) {
      return;
    }
    void runWithUnsavedCheck(async () => {
      await openMusicWorkspace("directory");
    });
  }, [openMusicWorkspace, runWithUnsavedCheck, singleDocumentMode]);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AppShell
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
          onCreateSong={() =>
            void runWithUnsavedCheck(async () => {
              await createSong();
            })
          }
          onImportSong={
            singleDocumentMode
              ? () =>
                  void runWithUnsavedCheck(async () => {
                    await openMusicWorkspace("file");
                  })
              : () =>
                  void runWithUnsavedCheck(async () => {
                    await importSong();
                  })
          }
          onOpenDirectoryWorkspace={
            singleDocumentMode
              ? undefined
              : () =>
                  void runWithUnsavedCheck(async () => {
                    await openMusicWorkspace("directory");
                  })
          }
        />
        <AppContent>
          {allSongs.length > 0 ? (
            <StandaloneMusicPage
              key={localeId}
              onCreateSong={onCreateSong}
              onImportSong={onImportSong}
              onOpenDirectoryWorkspace={onOpenDirectoryWorkspace}
              onSelectSong={onSelectSong}
              topInset={MUSIC_WEB_TOOLBAR_HEIGHT}
            />
          ) : (
            <div
              style={{
                background:
                  "radial-gradient(circle at 50% 40%,#e9a1ab 0%, #d1456d 26%, #982c51 50%, #1f1828 100%)",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <div style={{ width: 500, height: 500, marginTop: -200 }}>
                  <GB3D colorMode="light" />
                </div>
                <div>
                  <Select
                    value={{ value: "workspace", label: "Workspace" }}
                    options={[
                      { value: "workspace", label: "Workspace" },
                      { value: "single", label: "Single File" },
                    ]}
                  />
                </div>
                <div
                  style={{ display: "flex", gap: 10, justifyContent: "center" }}
                >
                  {onCreateSong ? (
                    <Button
                      style={{ flexGrow: 1 }}
                      size="large"
                      variant="primary"
                      onClick={onCreateSong}
                    >
                      {l10n("TOOL_ADD_SONG_LABEL")}
                    </Button>
                  ) : null}
                  {onImportSong ? (
                    <Button
                      style={{ flexGrow: 1 }}
                      size="large"
                      variant="primary"
                      onClick={onImportSong}
                    >
                      {l10n("FIELD_OPEN_FILE")}
                    </Button>
                  ) : null}
                  {onOpenDirectoryWorkspace ? (
                    <Button
                      style={{ flexGrow: 1 }}
                      size="large"
                      variant="primary"
                      onClick={onOpenDirectoryWorkspace}
                    >
                      {l10n("FIELD_OPEN_FOLDER")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </AppContent>
        {pendingAction ? (
          <>
            <ConfirmOverlay onClick={closeConfirm} />
            <ConfirmModal role="dialog" aria-modal="true">
              <ConfirmTitle>
                {l10n("DIALOG_TRACKER_CHANGES_NOT_SAVED", {
                  name: currentSongName,
                })}
              </ConfirmTitle>
              <ConfirmDetail>
                {l10n("DIALOG_TRACKER_CHANGES_NOT_SAVED_DESCRIPTION")}
              </ConfirmDetail>
              <ConfirmActions>
                <Button onClick={() => void onSaveAndContinue()}>
                  {l10n("DIALOG_SAVE_AND_CONTINUE")}
                </Button>
                <Button
                  variant="normal"
                  onClick={() => void onDiscardAndContinue()}
                >
                  {l10n("DIALOG_CONTINUE_WITHOUT_SAVING")}
                </Button>
                <Button variant="transparent" onClick={closeConfirm}>
                  {l10n("DIALOG_CANCEL")}
                </Button>
              </ConfirmActions>
            </ConfirmModal>
          </>
        ) : null}
      </AppShell>
    </ThemeProvider>
  );
};

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <AppContainerDnD>
        <MusicWebApp />
      </AppContainerDnD>
    </Provider>
  </React.StrictMode>,
);
