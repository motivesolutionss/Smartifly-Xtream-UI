const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const workspaceRoot = path.resolve(__dirname, '..');
const exclusionList = require(path.resolve(
  workspaceRoot,
  'node_modules/metro-config/src/defaults/exclusionList',
)).default;

const config = {
  projectRoot: __dirname,
  watchFolders: [workspaceRoot],
  resolver: {
    blockList: exclusionList([
      /.*\/\.cxx\/.*/,
      /.*\/CMakeFiles\/CMakeTmp\/.*/,
    ]),
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
