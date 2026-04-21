import type { MusicDocumentReference, MusicWorkspace } from "./workspace";

type ConfirmDiscardChangesResult = "save" | "discard" | "cancel";

export interface MusicWorkspaceDocument<TDocument> {
  meta: MusicDocumentReference;
  data: TDocument;
  modified: boolean;
}

export interface MusicEnvironment<TDocument> {
  openFileWorkspace?: () => Promise<MusicWorkspace>;
  openDirectoryWorkspace?: () => Promise<MusicWorkspace>;
  loadDocument: (
    document: MusicDocumentReference,
  ) => Promise<MusicWorkspaceDocument<TDocument>>;
  saveDocument: (document: MusicWorkspaceDocument<TDocument>) => Promise<void>;
  saveDocumentAs?: (
    document: MusicWorkspaceDocument<TDocument>,
  ) => Promise<MusicWorkspaceDocument<TDocument>>;
  confirmDiscardChanges: (
    documentName: string,
  ) => Promise<ConfirmDiscardChangesResult>;
  setWindowTitle: (title: string) => void;
}

export const supportsSingleFileWorkspaces = <TDocument>(
  environment: Pick<MusicEnvironment<TDocument>, "openFileWorkspace">,
) => typeof environment.openFileWorkspace === "function";

export const supportsDirectoryWorkspaces = <TDocument>(
  environment: Pick<MusicEnvironment<TDocument>, "openDirectoryWorkspace">,
) => typeof environment.openDirectoryWorkspace === "function";

export const supportsSaveAs = <TDocument>(
  environment: Pick<MusicEnvironment<TDocument>, "saveDocumentAs">,
) => typeof environment.saveDocumentAs === "function";
