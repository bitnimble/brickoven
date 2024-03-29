// @ts-ignore
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
// @ts-ignore
import postcssModulesValuesReplace from 'postcss-modules-values-replace';
import { Configuration } from 'webpack';
import { Configuration as DevConfiguration } from 'webpack-dev-server';
import { PageManifest } from './manifest';

const config = (env: any): Configuration & { devServer?: DevConfiguration } => {
  const devMode = env.mode === 'development';

  let manifestFile = require(path.resolve(__dirname, 'manifest.ts'));
  const manifest: PageManifest = manifestFile.manifest;
  const fonts = manifest
    .head
    ?.googleFonts
    ?.map(s => {
      if (typeof s === 'string') {
        return `family=${s.replace(/ /g, '+')}`;
      }
      return `family=${s.name.replace(/ /g, '+')}:wght@${s.weights.join(';')}`;
    })
    .join('&');
  const mergedHead = fonts
    ? `
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">
`
    : undefined;

  const faviconPath = path.resolve(__dirname, `static/favicon.png`);

  const modules = [
    path.resolve(__dirname, '../node_modules'),
    path.resolve(__dirname, '../src'),
  ];

  return {
    mode: devMode ? 'development' : 'production',
    devtool: devMode && 'cheap-module-source-map',
    entry: path.resolve(__dirname, '../src/index.tsx'),
    target: 'browserslist:> 0.5%, last 2 versions, Firefox ESR, not dead',
    devServer: { historyApiFallback: true },
    module: {
      rules: [{
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: { transpileOnly: true },
      }, {
        test: /\.css$/,
        use: [{ loader: 'style-loader', options: { injectType: 'singletonStyleTag' } }, {
          loader: 'css-loader',
          options: {
            importLoaders: 2,
            modules: {
              localIdentName: devMode
                ? '[path][name]__[local]--[hash:base64:5]'
                : '[hash:base64:6]',
            },
          },
        }, {
          loader: 'postcss-loader',
          options: {
            sourceMap: true,
            postcssOptions: {
              plugins: [
                postcssModulesValuesReplace({ resolve: { modules } }),
                'postcss-url',
                'postcss-calc',
                'postcss-color-function',
                'autoprefixer',
              ],
            },
          },
        }],
      }, {
        test: /\.(png|jpe?g|gif|svg|webp|woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: (path: string) => {
            if (path === faviconPath) {
              return 'favicon.png';
            }
            return '[contenthash].[ext]';
          },
        },
      }],
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({
        templateParameters: {
          title: manifest.title,
          description: manifest.description || '',
          head: mergedHead,
        },
        template: path.resolve(__dirname, './static/index.html'),
      }),
    ],
    resolve: {
      fallback: manifest.fallback,
      // js and jsx includes for node_modules
      extensions: ['.tsx', '.ts', '.js', '.jsx', '.css', '.jpeg'],
      modules,
    },
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, `../dist/`),
    },
  };
};

export default config;
