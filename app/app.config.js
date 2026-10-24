// app.json'u olduğu gibi kullanır; yalnız web derlemesinde alt yol (ör. /app) ortam değişkeninden gelir.
// Yerel önizleme ve Android derlemesi etkilenmez (EXPO_BASE_URL yoksa kök yol).
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
