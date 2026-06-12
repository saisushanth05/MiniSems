module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@theme': './src/theme',
          '@screens': './src/screens',
          '@components': './src/components',
          '@stores': './src/stores',
          '@services': './src/services',
          '@types': './src/types',
          '@i18n': './src/i18n',
          '@security': './src/security',
          '@utils': './src/utils',
          '@navigation': './src/navigation',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
