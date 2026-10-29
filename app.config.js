module.exports = ({ config }) => {
  const isDevelopment =
    process.env.APP_VARIANT === 'development';

  const plugins = [...(config.plugins || [])];

  const hasLocalization = plugins.some((plugin) =>
    Array.isArray(plugin)
      ? plugin[0] === 'expo-localization'
      : plugin === 'expo-localization'
  );

  if (!hasLocalization) {
    plugins.push('expo-localization');
  }

  return {
    ...config,
    name: isDevelopment ? 'Pito Dev' : config.name,
    plugins,
    ios: {
      ...config.ios,
      bundleIdentifier: isDevelopment
        ? 'com.oxpi.pito.dev'
        : config.ios.bundleIdentifier,
    },
  };
};