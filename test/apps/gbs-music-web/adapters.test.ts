/**
 * @jest-environment jsdom
 */

import {
  createTemplateMusicDocument,
  resetMusicWorkspaceAdapterState,
} from "../../../src/apps/gbs-music-web/lib/adapters";

describe("createTemplateMusicDocument", () => {
  beforeEach(() => {
    resetMusicWorkspaceAdapterState();
  });

  afterEach(() => {
    resetMusicWorkspaceAdapterState();
  });

  test("should increment fallback filenames within the same workspace session", async () => {
    const firstDocument = await createTemplateMusicDocument(
      new Uint8Array([1]),
      undefined,
      "New Song",
    );
    const secondDocument = await createTemplateMusicDocument(
      new Uint8Array([2]),
      undefined,
      "New Song",
    );

    expect(firstDocument?.filename).toBe("New Song.uge");
    expect(secondDocument?.filename).toBe("New Song 2.uge");
  });

  test("should restart fallback filenames after resetting the workspace session", async () => {
    await createTemplateMusicDocument(new Uint8Array([1]), undefined, "xyz");
    await createTemplateMusicDocument(
      new Uint8Array([2]),
      undefined,
      "New Song",
    );
    await createTemplateMusicDocument(
      new Uint8Array([3]),
      undefined,
      "New Song",
    );

    resetMusicWorkspaceAdapterState();

    const nextDocument = await createTemplateMusicDocument(
      new Uint8Array([4]),
      undefined,
      "foobar",
    );

    expect(nextDocument?.filename).toBe("foobar.uge");
  });
});
