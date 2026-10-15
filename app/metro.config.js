const http = require("node:http");
const { getDefaultConfig } = require("expo/metro-config");

/**
 * Varsayılan Expo Metro yapılandırması. Web'de expo-sqlite kullanılmıyor (bkz. src/db/depo.web.ts),
 * bu yüzden wasm ve COOP/COEP başlıkları için ek ayara gerek yok.
 *
 * Yalnız geliştirme: web önizlemesini yerel sunucuya CORS'a takılmadan bağlamak için
 * `/api/*` istekleri DEV_API_PROXY (varsayılan http://127.0.0.1:8810) adresine aktarılır.
 * Kullanım: EXPO_PUBLIC_API_URL=http://localhost:8081/api npx expo start --web
 * Android derlemesini etkilemez.
 */
const config = getDefaultConfig(__dirname);

const target = new URL(process.env.DEV_API_PROXY || "http://127.0.0.1:8810");

config.server = config.server || {};
const previous = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const base = previous ? previous(middleware, server) : middleware;
  return (req, res, next) => {
    if (!req.url || !req.url.startsWith("/api/")) return base(req, res, next);
    const proxied = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: req.url.slice(4),
        method: req.method,
        headers: { ...req.headers, host: target.host },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode || 502, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxied.on("error", () => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ detail: "Yerel sunucuya ulaşılamadı" }));
    });
    req.pipe(proxied);
  };
};

module.exports = config;
