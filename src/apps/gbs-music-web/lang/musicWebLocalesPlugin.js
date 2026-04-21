/* eslint-disable @typescript-eslint/no-var-requires */
const {
  defaultManifestPath,
  defaultOutputDir,
  generateMusicWebLocales,
  listLocaleFiles,
  removeGeneratedMusicWebLocales,
} = require("./musicWebLocales");

class MusicWebLocalesPlugin {
  apply(compiler) {
    const generate = async () => {
      await Promise.resolve(
        generateMusicWebLocales({
          logger: { warn: () => {} },
        }),
      );
    };

    compiler.hooks.beforeRun.tapPromise("MusicWebLocalesPlugin", generate);
    compiler.hooks.watchRun.tapPromise("MusicWebLocalesPlugin", generate);

    compiler.hooks.afterCompile.tap("MusicWebLocalesPlugin", (compilation) => {
      compilation.fileDependencies.add(defaultManifestPath);
      for (const localeFile of listLocaleFiles()) {
        compilation.fileDependencies.add(localeFile);
      }
    });

    compiler.hooks.done.tap("MusicWebLocalesPlugin", (stats) => {
      if (compiler.watchMode || stats.hasErrors()) {
        return;
      }

      removeGeneratedMusicWebLocales(defaultOutputDir);
    });
  }
}

module.exports = MusicWebLocalesPlugin;
