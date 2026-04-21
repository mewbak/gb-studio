type MusicWorkspaceSource = "filesystem" | "browser";

type MusicWorkspaceOpenMode = "file" | "directory";

type MusicDocumentFormat = "uge" | "mod";

export interface MusicDocumentReference {
  id: string;
  name: string;
  filename: string;
  format: MusicDocumentFormat;
  readonly?: boolean;
}

export interface MusicWorkspace {
  source: MusicWorkspaceSource;
  openMode: MusicWorkspaceOpenMode;
  rootName?: string;
  documents: MusicDocumentReference[];
  activeDocumentId?: string;
}

export const createMusicWorkspace = (
  workspace: Partial<MusicWorkspace> = {},
): MusicWorkspace => ({
  source: workspace.source ?? "filesystem",
  openMode: workspace.openMode ?? "file",
  rootName: workspace.rootName,
  documents: workspace.documents ?? [],
  activeDocumentId: workspace.activeDocumentId,
});

export const getActiveMusicDocument = (workspace: MusicWorkspace) =>
  workspace.documents.find(
    (document) => document.id === workspace.activeDocumentId,
  );
