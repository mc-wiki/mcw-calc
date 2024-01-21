import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { VueLoaderPlugin } from 'vue-loader'
import { globSync } from 'glob'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import * as prettier from 'prettier'

/** @returns {import('webpack').Configuration} */
const config = (env, argv) => {
  const entries = globSync('./src/tools/**/main.ts', {
    posix: true,
  })
    .map((path) => `./${path}`)
    .reduce((acc, path) => {
      const key = path.match(/src\/tools\/(.+)\/main\.ts/)[1]
      acc[key] = {
        import: path,
      }
      return acc
    }, {})

  const names = Object.keys(entries)

  function prodDev(prod, dev) {
    return argv.mode === 'production' ? prod : dev
  }

  return {
    context: dirname(fileURLToPath(import.meta.url)),
    externals: prodDev(
      {
        vue: "require('vue')",
        '@wikimedia/codex': "require('@wikimedia/codex')",
      },
      {},
    ),
    resolve: {
      alias: {
        '@': dirname(fileURLToPath(import.meta.url)) + '/src',
      },
    },
    entry: {
      core: ['./src/loader.ts', './src/common.less'],
      ...entries,
    },
    devServer: {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      hot: false,
      webSocketServer: false,
      onListening: () => {
        console.log(
          `<i> [mcw-calc] On-Wiki Preview: https://minecraft.wiki/w/User:Dianliang233/calc-sandbox`,
        )
      },
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          parallel: false,
          minify: async (file, sourceMap, minimizerOptions, extractComments) => {
            const terserStep = await TerserPlugin.terserMinify(
              file,
              sourceMap,
              minimizerOptions,
              extractComments,
            )
            return {
              code: await prettier.format(terserStep.code, {
                filepath: Object.keys(file)[0],
                trailingComma: 'es5',
              }),
              map: terserStep.map,
              warnings: terserStep.warnings,
              errors: terserStep.errors,
              extractedComments: terserStep.extractedComments,
            }
          },
          extractComments: false,
          terserOptions: {
            ecma: 5,
            compress: { pure_funcs: ['generateBlockMap'], passes: 2 },
            mangle: false,
            format: {
              comments: true,
            },
          },
        }),
      ],
    },
    target: ['web', 'es5'],
    output: {
      clean: true,
      filename: 'Gadget-mcw-calc-[name].js',
      chunkFormat: 'commonjs',
      chunkLoading: 'import',
    },
    watchOptions: {
      aggregateTimeout: 200,
    },
    plugins: [
      new VueLoaderPlugin(),
      prodDev(new BundleAnalyzerPlugin({ analyzerMode: 'static', openAnalyzer: false }), ''),
      new MiniCssExtractPlugin({
        runtime: false,
        filename: 'Gadget-mcw-calc-[name].css',
      }),
      prodDev(
        '',
        new HtmlWebpackPlugin({
          templateContent: ({ htmlWebpackPlugin }) => `
          <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <link rel="stylesheet" href="@wikimedia/codex/dist/codex.style.css">
              </head>
              <body>
                <div class="mcw-calc" data-type="blockDistribution" data-blocks="minecraft:stone"></div>
                ${names.map((name) => `<div class="mcw-calc" data-type="${name}"></div>`).join('')}
                ${htmlWebpackPlugin.tags.bodyTags}
              </body>
            </html>
          `,
        }),
      ),
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false,
      }),
      new webpack.BannerPlugin(
        'Automatically deployed from GitHub: <https://github.com/mc-wiki/mcw-calc>, your edit will be overwritten',
      ),
    ],
    performance: {
      hints: false,
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
          options: {
            compilerOptions: {
              whitespace: 'condense',
              compatConfig: {
                MODE: 3,
              },
            },
            experimentalInlineMatchResource: true,
          },
        },
        {
          test: /\.(?:js|mjs|cjs|vue|ts)$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { useBuiltIns: false }],
                '@babel/preset-typescript',
                'babel-preset-typescript-vue3',
              ],
            },
          },
        },

        {
          test: /\.less$/,
          use: [
            'css-loader',
            prodDev(MiniCssExtractPlugin.loader, 'vue-style-loader'),
            'css-loader',
            'less-loader',
          ],
        },
        {
          test: /\.css$/,
          use: [prodDev(MiniCssExtractPlugin.loader, 'vue-style-loader'), 'css-loader'],
        },
        {
          resourceQuery: /inline/,
          type: 'asset/inline',
        },
      ],
    },
  }
}

export default config
