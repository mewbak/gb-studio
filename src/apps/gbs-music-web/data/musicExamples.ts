export interface MusicExample {
  filename: string;
  displayName: string;
  data: string; // base64 data URI
}

const formatDisplayName = (filename: string): string => {
  const base = filename.replace(/\.uge$/i, "");
  // Strip "Artist_" prefix (e.g. "Rulz_" or "Tronimal_")
  const withoutArtist = base.includes("_")
    ? base.slice(base.indexOf("_") + 1)
    : base;
  // Insert spaces before uppercase letters following lowercase (CamelCase → words)
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
      data: req(key) as string,
    };
  })
  .sort((a, b) => a.displayName.localeCompare(b.displayName));
