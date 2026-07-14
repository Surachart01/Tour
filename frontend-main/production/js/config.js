// config.js - production fallback. The Docker entrypoint overwrites this when BACKEND_URL is set.
const Endpoint = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8081"
  : "https://gracious-trust-production-cc0c.up.railway.app";
