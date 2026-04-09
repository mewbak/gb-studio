export interface MusicExample {
  filename: string;
  displayName: string;
  url: string;
}

const formatDisplayName = (filename: string): string => {
  const base = filename.replace(/\.uge$/i, "");
  const withoutArtist = base.includes("_")
    ? base.slice(base.indexOf("_") + 1)
    : base;
  return withoutArtist.replace(/([a-z])([A-Z])/g, "$1 $2");
};

const req = require.context(
  "../../../../appData/templates/gbs2/assets/music",
  false,
  /\.uge$/i,
);

export const musicExamples: MusicExample[] = req
  .keys()
  .map((key) => {
    const filename = key.replace(/^\.\//, "");
    return {
      filename,
      displayName: formatDisplayName(filename),
      url: req(key) as string,
    };
  })
  .sort((a, b) => a.displayName.localeCompare(b.displayName));
