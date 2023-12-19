const path = require('path');

const isDev = process.argv.indexOf('--dev') >= 0;
const isWatch = process.argv.indexOf('--watch') >= 0;
const demoSrc = path.resolve(__dirname, './demo');
const demoDist = path.resolve(__dirname, '../miniprogram_dev');
const src = path.resolve(__dirname, '../src');
const dev = path.join(demoDist, 'components/wxml2canvas-2d');
const dist = path.resolve(__dirname, '../miniprogram_dist');

module.exports = {
  isDev,
  isWatch,
  demoSrc,
  demoDist,
  distPath: isDev ? dev : dist,
  srcPath: src,
};
