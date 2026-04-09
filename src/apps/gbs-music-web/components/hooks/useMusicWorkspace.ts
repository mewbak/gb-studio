import { useCallback, useState } from "react";
import {
  createMusicWorkspace,
  MusicDocumentReference,
  MusicWorkspace,
} from "shared/lib/music/workspace";
import trackerActions from "store/features/tracker/trackerActions";
import {
  createTemplateMusicDocument,
  importMusicDocument,
  registerExampleData,
  registerSongBackupData,
  renameWebDocument,
  supportsPersistentSave,
  webMusicEnvironment,
} from "gbs-music-web/lib/adapters";
import { musicAssetActions } from "gbs-music-web/store/features/musicAssets/musicAssetsState";
import { musicWorkspaceToAssets } from "gbs-music-web/store/features/musicAssets/musicAssetsHelpers";
import { useAppDispatch, useAppSelector } from "store/hooks";
import {
  BACKUP_SONG_KEY,
  deserializeSong,
  getBackupInfo,
} from "gbs-music-web/lib/songBackup";
import { actions as trackerDocumentActions } from "store/features/trackerDocument/trackerDocumentState";

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

interface UseMusicWorkspaceParams {
  templateSongData: Uint8Array;
}

interface UseMusicWorkspaceResult {
  singleDocumentMode: boolean;
  hasBackup: boolean;
  backupSongName: string;
  createSong: () => Promise<void>;
  importSong: () => Promise<void>;
  openDirectoryWorkspace: () => Promise<void>;
  restoreBackupSong: () => Promise<void>;
  openExample: (name: string, filename: string, url: string) => Promise<void>;
  renameSong: (musicId: string, newBaseName: string) => Promise<void>;
}

export const useMusicWorkspace = ({
  templateSongData,
}: UseMusicWorkspaceParams): UseMusicWorkspaceResult => {
  const dispatch = useAppDispatch();
  const [workspace, setWorkspace] = useState<MusicWorkspace>();
  const singleDocumentMode = !supportsPersistentSave();
  const selectedSongId = useAppSelector(
    (state) => state.tracker.selectedSongId,
  );

  const backupInfo = getBackupInfo();
  const hasBackup = backupInfo !== null;
  const backupSongName = backupInfo?.name ?? "";

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

        if (nextWorkspace.documents.length === 0) {
          const document = await createTemplateMusicDocument(
            new Uint8Array(templateSongData),
            nextWorkspace,
          );

          if (!document) {
            return;
          }
          applyWorkspace(appendWorkspaceDocument(nextWorkspace, document));
          return;
        }

        applyWorkspace(nextWorkspace);
      } catch (error) {
        if (!isAbortError(error)) {
          throw error;
        }
      }
    },
    [applyWorkspace, templateSongData],
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
  }, [applyWorkspace, singleDocumentMode, templateSongData, workspace]);

  const importSong = useCallback(async () => {
    if (singleDocumentMode) {
      await openMusicWorkspace("file");
      return;
    }

    const document = await importMusicDocument();
    if (!document) {
      return;
    }

    const nextWorkspace = appendWorkspaceDocument(workspace, document);
    applyWorkspace(nextWorkspace);
  }, [applyWorkspace, openMusicWorkspace, singleDocumentMode, workspace]);

  const openDirectoryWorkspace = useCallback(async () => {
    if (singleDocumentMode) {
      return;
    }

    await openMusicWorkspace("directory");
  }, [openMusicWorkspace, singleDocumentMode]);

  const restoreBackupSong = useCallback(async () => {
    const json = localStorage.getItem(BACKUP_SONG_KEY);
    if (!json) {
      return;
    }

    const song = deserializeSong(json);
    if (!song) {
      return;
    }

    const { saveUGESong } = await import("shared/lib/uge/ugeHelper");
    const data = new Uint8Array(saveUGESong(song));

    const name = song.name || "Backup";
    const filename = song.filename || "backup.uge";
    const reference = registerSongBackupData(data, name, filename);

    const nextWorkspace = createMusicWorkspace({
      source: "browser",
      openMode: "file",
      activeDocumentId: reference.id,
      documents: [reference],
    });

    applyWorkspace(nextWorkspace);
  }, [applyWorkspace]);

  const openExample = useCallback(
    async (name: string, filename: string, url: string) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const data = new Uint8Array(buffer);
      const reference = registerExampleData(data, name, filename);
      const nextWorkspace = createMusicWorkspace({
        source: "browser",
        openMode: "file",
        activeDocumentId: reference.id,
        documents: [reference],
      });
      applyWorkspace(nextWorkspace);
    },
    [applyWorkspace],
  );

  const renameSong = useCallback(
    async (musicId: string, newBaseName: string) => {
      const doc = workspace?.documents.find((d) => d.id === musicId);
      if (!doc) {
        return;
      }

      // Strip path separators — slashes are valid in Electron paths but not in
      // web filenames (the FS API rejects them with a NotAllowedError).
      const safeName = newBaseName.replace(/[/\\]/g, "").trim();
      if (!safeName) {
        return;
      }

      const newFilename = `${safeName}.uge`;
      const newRef = await renameWebDocument(musicId, doc.filename, newFilename);

      setWorkspace((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          documents: prev.documents.map((d) => (d.id === musicId ? newRef : d)),
        };
      });

      dispatch(
        musicAssetActions.renameMusicAsset({
          musicId,
          newFilename,
        }),
      );

      if (musicId === selectedSongId) {
        dispatch(trackerDocumentActions.setSongFilename(newFilename));
      }
    },
    [dispatch, selectedSongId, workspace],
  );

  return {
    singleDocumentMode,
    hasBackup,
    backupSongName,
    createSong,
    importSong,
    openDirectoryWorkspace,
    restoreBackupSong,
    openExample,
    renameSong,
  };
};
