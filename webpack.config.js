const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './js/cli.js',
  module: {
    rules: [
      {test: /\.js$/, use: 'shebang-loader'},
    ],
  },
  output: {
    path: path.join(__dirname, '/dist/'),
    filename: 'karel.js',
    publicPath: './',
    sourceMapFilename: 'karel.map'
  },
  target: 'node',
  plugins: [
    new webpack.BannerPlugin(
        {banner: '#!/usr/bin/env node', raw: true, entryOnly: true}),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
    }),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: false,
    }),
  ]
};
