import type {
  MusicDocumentReference,
  MusicWorkspace,
} from "shared/lib/music/workspace";
import type { MusicAsset } from "shared/lib/resources/types";

const musicDocumentToAsset = (
  document: MusicDocumentReference,
): MusicAsset => ({
  _v: 0,
  inode: document.id,
  id: document.id,
  name: document.name.replace(/\.[^.]+$/, ""),
  symbol: "song",
  filename: document.filename,
  settings: {},
  type: document.format,
});

export const musicWorkspaceToAssets = (workspace: MusicWorkspace) =>
  workspace.documents.map(musicDocumentToAsset);
