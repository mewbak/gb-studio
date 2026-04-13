const {
  defaultManifestPath,
  generateMusicWebLocales,
  listLocaleFiles,
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
  }
}

module.exports = MusicWebLocalesPlugin;
