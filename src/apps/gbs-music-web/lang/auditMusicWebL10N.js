/* eslint-disable @typescript-eslint/no-var-requires */
const { auditMusicWebL10NManifest } = require("./musicWebLocales");

const { missingKeys, unusedKeys } = auditMusicWebL10NManifest();

if (missingKeys.length > 0) {
  console.error(
    "music web locale manifest is missing statically referenced keys:",
  );
  for (const key of missingKeys) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

if (unusedKeys.length > 0) {
  console.warn("music web locale manifest has unused keys:");
  for (const key of unusedKeys) {
    console.warn(`- ${key}`);
  }
}

console.log("music web locale manifest audit passed");
