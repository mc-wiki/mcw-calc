import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { VueLoaderPlugin } from 'vue-loader'
import { globSync } from 'glob'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import webpack from 'webpack'

/** @returns {import('webpack').Configuration} */
const config = (env, argv) => {
  const entries = globSync('./src/tools/**/main.ts')
    .map((path) => `./${path}`)
    .reduce((acc, path) => {
      const key = path.replace('./src/tools/', '').replace('/main.ts', '')
      acc[key] = {
        import: path,
        library: {
          name: ['mcwCalc', key],
          type: 'window',
        },
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
        vue: "mw.loader.require('vue')",
        '@wikimedia/codex': "mw.loader.require('@wikimedia/codex')",
      },
      {}
    ),
    resolve: {
      alias: {
        '@': dirname(fileURLToPath(import.meta.url)) + '/src',
      },
    },
    entry: {
      ...prodDev({ core: './src/loader.ts' }, {}),
      ...entries,
    },
    optimization: {
      minimize: false,
    },
    target: ['web', 'es5'],
    output: {
      clean: true,
      filename: 'Gadget-mcw-calc-[name].js',
      chunkLoading: 'import',
    },
    watchOptions: {
      aggregateTimeout: 200,
    },
    devServer: {
      hot: false,
    },
    plugins: [
      new VueLoaderPlugin(),
      prodDev(new BundleAnalyzerPlugin({ analyzerMode: 'static' }), ''),
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
                ${names
                  .map(
                    (name) => `<div class="mcw-calc" data-type="${name}"></div>`
                  )
                  .join('')}
                ${htmlWebpackPlugin.tags.bodyTags}
              </body>
            </html>
          `,
        })
      ),
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false,
      }),
    ],
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
          options: {
            experimentalInlineMatchResource: true,
          },
        },
        {
          test: /\.(?:js|mjs|cjs|vue|ts)$/,
          exclude: /node_modules/,
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
          test: /\.css$/,
          use: [
            prodDev(MiniCssExtractPlugin.loader, 'vue-style-loader'),
            'css-loader',
          ],
        },
      ],
    },
  }
}

export default config
