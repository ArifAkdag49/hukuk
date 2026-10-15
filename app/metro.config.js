const { getDefaultConfig } = require("expo/metro-config");

/** Varsayılan Expo Metro yapılandırması. Web'de expo-sqlite kullanılmıyor (bkz. src/db/depo.web.ts),
 *  bu yüzden wasm ve COOP/COEP başlıkları için ek ayara gerek yok. */
module.exports = getDefaultConfig(__dirname);
