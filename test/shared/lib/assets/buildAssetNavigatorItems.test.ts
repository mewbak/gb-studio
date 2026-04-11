import {
  buildAssetNavigatorItems,
  FileSystemNavigatorItem,
} from "../../../../src/shared/lib/assets/buildAssetNavigatorItems";

type TestAsset = {
  id: string;
  filename: string;
  plugin?: string;
};

const asset = (id: string, filename: string): TestAsset => ({
  id,
  filename,
});

const simplify = <T>(items: FileSystemNavigatorItem<T>[]) =>
  items.map((item) => ({
    type: item.type,
    filename: item.filename,
    nestLevel: item.nestLevel ?? 0,
  }));

describe("buildAssetNavigatorItems", () => {
  it("hides files inside closed folders", () => {
    const items = buildAssetNavigatorItems(
      [asset("song-1", "abc/abc_1.uge"), asset("song-2", "root_song.uge")],
      [],
      "",
    );

    expect(simplify(items)).toEqual([
      { type: "folder", filename: "abc", nestLevel: 0 },
      { type: "file", filename: "root_song.uge", nestLevel: 0 },
    ]);
  });

  it("returns flat search results without folders", () => {
    const items = buildAssetNavigatorItems(
      [
        asset("song-1", "abc/abc_1.uge"),
        asset("song-2", "abc/abc_2.uge"),
        asset("song-3", "other/song.uge"),
      ],
      [],
      "abc_",
    );

    expect(simplify(items)).toEqual([
      { type: "file", filename: "abc_1.uge", nestLevel: 0 },
      { type: "file", filename: "abc_2.uge", nestLevel: 0 },
    ]);
  });

  it("keeps a folder's visible children grouped directly after the folder before similarly prefixed root files", () => {
    const items = buildAssetNavigatorItems(
      [
        asset("song-1", "abc/abc_1.uge"),
        asset("song-2", "abc/abc_2.uge"),
        asset("song-3", "abc_3.uge"),
      ],
      ["abc"],
      "",
    );

    expect(simplify(items)).toEqual([
      { type: "folder", filename: "abc", nestLevel: 0 },
      { type: "file", filename: "abc_1.uge", nestLevel: 1 },
      { type: "file", filename: "abc_2.uge", nestLevel: 1 },
      { type: "file", filename: "abc_3.uge", nestLevel: 0 },
    ]);
  });

  it("keeps nested folder children grouped before sibling files that share the same prefix", () => {
    const items = buildAssetNavigatorItems(
      [
        asset("song-1", "abc/def/def_1.uge"),
        asset("song-2", "abc/def_2.uge"),
      ],
      ["abc", "abc/def"],
      "",
    );

    expect(simplify(items)).toEqual([
      { type: "folder", filename: "abc", nestLevel: 0 },
      { type: "folder", filename: "def", nestLevel: 1 },
      { type: "file", filename: "def_1.uge", nestLevel: 2 },
      { type: "file", filename: "def_2.uge", nestLevel: 1 },
    ]);
  });

  it("keeps a folder subtree before a root file with the same basename", () => {
    const items = buildAssetNavigatorItems(
      [asset("song-1", "abc/song.uge"), asset("song-2", "abc.uge")],
      ["abc"],
      "",
    );

    expect(simplify(items)).toEqual([
      { type: "folder", filename: "abc", nestLevel: 0 },
      { type: "file", filename: "song.uge", nestLevel: 1 },
      { type: "file", filename: "abc.uge", nestLevel: 0 },
    ]);
  });
});
