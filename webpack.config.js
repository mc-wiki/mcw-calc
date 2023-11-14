import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { VueLoaderPlugin } from 'vue-loader'
import { globSync } from 'glob'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

/** @type {import('webpack').Configuration} */
const config = {
  context: dirname(fileURLToPath(import.meta.url)),
  externals: {
    vue: "mw.loader.require('vue')",
    '@wikimedia/codex': "mw.loader.require('@wikimedia/codex')",
  },
  entry: {
    core: './src/loader.ts',
    ...globSync('./src/tools/**/main.ts')
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
      }, {}),
  },
  optimization: {
    minimize: true,
  },
  target: ['web', 'es5'],
  output: {
    clean: true,
    filename: 'Gadget-mcw-calc-[name].js',
    chunkLoading: 'import',
  },
  plugins: [
    new VueLoaderPlugin(),
    new BundleAnalyzerPlugin({ analyzerMode: 'static' }),
    new MiniCssExtractPlugin({
      runtime: false,
      filename: 'Gadget-mcw-calc-[name].css',
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
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
}

export default config
