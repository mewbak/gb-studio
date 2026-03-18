import type { MusicAsset } from "shared/lib/resources/types";

export const musicWorkspaceSourceValues = ["filesystem", "browser"] as const;

export type MusicWorkspaceSource = (typeof musicWorkspaceSourceValues)[number];

export const musicWorkspaceOpenModeValues = ["file", "directory"] as const;

export type MusicWorkspaceOpenMode =
  (typeof musicWorkspaceOpenModeValues)[number];

export const musicDocumentFormatValues = ["uge", "mod"] as const;

export type MusicDocumentFormat = (typeof musicDocumentFormatValues)[number];

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

export const musicAssetToDocumentReference = (
  asset: Pick<MusicAsset, "id" | "name" | "filename" | "type">,
): MusicDocumentReference => ({
  id: asset.id,
  name: asset.name,
  filename: asset.filename,
  format: asset.type === "mod" ? "mod" : "uge",
});
