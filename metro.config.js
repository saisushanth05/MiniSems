// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration for Expo SDK 56 + EAS Build
 * https://docs.expo.dev/guides/customizing-metro/
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    blockList: [
      /.*\/android\/.*/,
      /.*\/ios\/.*/,
      /.*\.cxx\/.*/,
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
