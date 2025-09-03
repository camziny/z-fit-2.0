module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      require.resolve('expo-router/babel'),
      // This plugin must be last
      'react-native-reanimated/plugin',
    ],
  };
};


