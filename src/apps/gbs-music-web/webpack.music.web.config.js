/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require("webpack");
const Path = require("path");
const zlib = require("zlib");
const { promisify } = require("util");
const CopyPlugin = require("copy-webpack-plugin");
const { GitRevisionPlugin } = require("git-revision-webpack-plugin");
const baseRules = require("../shared/webpack.rules");
const { repoPath, srcPath } = require("../shared/webpack.paths");
const pkg = require("../../../package.json");

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);
const isProduction = process.env.NODE_ENV !== "development";

const gitRevisionPlugin = new GitRevisionPlugin({
  commithashCommand: "rev-list --max-count=1 --no-merges --abbrev-commit HEAD",
});

const docsUrl = "https://www.gbstudio.dev/docs/";

class PrecompressAssetsPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      "PrecompressAssetsPlugin",
      (compilation) => {
        compilation.hooks.processAssets.tapPromise(
          {
            name: "PrecompressAssetsPlugin",
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER,
          },
          async () => {
            const assets = compilation
              .getAssets()
              .filter((asset) => /\.(js|html|css|wasm|uge)$/i.test(asset.name));

            await Promise.all(
              assets.map(async (asset) => {
                const source = asset.source.source();
                const buffer = Buffer.isBuffer(source)
                  ? source
                  : Buffer.from(source);
                const gzipBuffer = await gzip(buffer, { level: 9 });
                if (gzipBuffer.length < buffer.length) {
                  compilation.emitAsset(
                    `${asset.name}.gz`,
                    new webpack.sources.RawSource(gzipBuffer),
                  );
                }
                const brotliBuffer = await brotliCompress(buffer, {
                  params: {
                    [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
                  },
                });
                if (brotliBuffer.length < buffer.length) {
                  compilation.emitAsset(
                    `${asset.name}.br`,
                    new webpack.sources.RawSource(brotliBuffer),
                  );
                }
              }),
            );
          },
        );
      },
    );
  }
}

const rules = baseRules.map((rule) => {
  if (!rule.rules) {
    return rule;
  }

  return {
    ...rule,
    rules: rule.rules.map((nestedRule) => {
      if (nestedRule.loader !== "ts-loader") {
        return nestedRule;
      }

      return {
        ...nestedRule,
        options: {
          ...nestedRule.options,
          compilerOptions: {
            ...(nestedRule.options?.compilerOptions || {}),
            module: "esnext",
          },
        },
      };
    }),
  };
});

rules.push({
  test: /\.(obj)$/i,
  exclude: /(node_modules|.webpack)/,
  loader: "file-loader",
  options: {
    publicPath: "..",
  },
});

module.exports = {
  mode: isProduction ? "production" : "development",
  target: "web",
  entry: {
    bundle: "./src/apps/gbs-music-web/index.tsx",
  },
  output: {
    path: repoPath("out", "music-web"),
    filename: "[name].js",
    chunkFilename: isProduction ? "[name].[contenthash:8].js" : "[name].js",
    clean: true,
  },
  module: {
    rules,
  },
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".json"],
    alias: {
      store: srcPath("store"),
      components: srcPath("components"),
      lang: srcPath("lang"),
      lib: srcPath("lib"),
      ui: srcPath("components/ui"),
      renderer: srcPath("renderer"),
      shared: srcPath("shared"),
      assets: srcPath("assets"),
      consts: srcPath("consts.ts"),
      "gbs-music-web": srcPath("apps/gbs-music-web"),
      wasm: repoPath("appData", "wasm"),
      "contributors.json": Path.join(__dirname, "contributors.json"),
      "contributors-external.json": Path.join(
        __dirname,
        "contributors-external.json",
      ),
      "patrons.json": Path.join(__dirname, "patrons.json"),
      "#my-quickjs-variant": require.resolve(
        "@jitl/quickjs-singlefile-browser-release-sync",
      ),
    },
    fallback: {
      path: require.resolve("path-browserify"),
      buffer: require.resolve("buffer"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/apps/gbs-music-web/index.html", to: "index.html" },
        { from: "appData/music/template.uge", to: "template.uge" },
      ],
    }),
    new webpack.DefinePlugin({
      GIT_VERSION: JSON.stringify(gitRevisionPlugin.version()),
      COMMITHASH: JSON.stringify(gitRevisionPlugin.commithash()),
      VERSION: JSON.stringify(pkg.version),
      RELEASE_VERSION: JSON.stringify(pkg.version.replace(/-rc.*/, "")),
      DOCS_URL: JSON.stringify(docsUrl),
    }),

    ...(isProduction ? [new PrecompressAssetsPlugin()] : []),
  ],
  optimization: {
    splitChunks: {
      chunks: "async",
    },
  },
  devServer: {
    static: {
      directory: repoPath("out", "music-web"),
    },
    compress: true,
    port: 3200,
    host: "127.0.0.1",
    hot: false,
    liveReload: true,
    historyApiFallback: true,
    client: {
      overlay: true,
    },
    devMiddleware: {
      writeToDisk: false,
    },
  },
};
