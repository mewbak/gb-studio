import {
  createMusicWorkspace,
  getActiveMusicDocument,
} from "shared/lib/music/workspace";
import {
  supportsDirectoryWorkspaces,
  supportsSaveAs,
  supportsSingleFileWorkspaces,
} from "shared/lib/music/environment";

describe("workspace package contracts", () => {
  test("createMusicWorkspace builds a workspace with an active document", () => {
    const workspace = createMusicWorkspace({
      source: "filesystem",
      openMode: "directory",
      activeDocumentId: "song-1",
      documents: [
        {
          id: "song-1",
          name: "Song 1",
          filename: "music/song-1.uge",
          format: "uge",
        },
      ],
    });

    expect(getActiveMusicDocument(workspace)?.filename).toBe(
      "music/song-1.uge",
    );
  });

  test("platform helpers describe adapter capabilities", () => {
    const adapter = {
      openFileWorkspace: async () => createMusicWorkspace(),
      openDirectoryWorkspace: async () => createMusicWorkspace(),
      loadDocument: async (document: {
        id: string;
        name: string;
        filename: string;
        format: "uge" | "mod";
      }) => ({
        meta: document,
        data: { patterns: [] },
        modified: false,
      }),
      saveDocument: async () => undefined,
      saveDocumentAs: async (document: {
        meta: {
          id: string;
          name: string;
          filename: string;
          format: "uge" | "mod";
        };
        data: { patterns: never[] };
        modified: boolean;
      }) => document,
    };

    expect(supportsSingleFileWorkspaces(adapter)).toBe(true);
    expect(supportsDirectoryWorkspaces(adapter)).toBe(true);
    expect(supportsSaveAs(adapter)).toBe(true);
  });
});
