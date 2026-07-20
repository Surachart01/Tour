// Fallback configuration for static deployments that do not run entrypoint.sh.
// Railway's container entrypoint can still replace this file with BACKEND_URL.
const Endpoint = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
  ? 'http://localhost:8081'
  : 'https://gracious-trust-production-cc0c.up.railway.app';
