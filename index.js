const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { createProxy } = require('./proxy');

const WEB_PORT = 18742;
const PROXY_PORT = 8742;

let proxy = null;

// === Web Server ===
const webServer = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${WEB_PORT}`);

  // API routes
  if (url.pathname === '/api/proxy/start' && req.method === 'POST') {
    return handleStart(req, res);
  }
  if (url.pathname === '/api/proxy/stop' && req.method === 'POST') {
    return handleStop(res);
  }
  if (url.pathname === '/api/proxy/status') {
    return handleStatus(res);
  }
  if (url.pathname === '/api/logs') {
    return handleLogs(res);
  }
  if (url.pathname === '/api/test' && req.method === 'POST') {
    return handleTest(req, res);
  }

  // Serve web UI
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const html = fs.readFileSync(path.join(__dirname, 'web', 'index.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => resolve(body));
  });
}

async function handleStart(req, res) {
  try {
    const body = JSON.parse(await readBody(req));
    const { baseUrl, apiKey } = body;
    if (!baseUrl || !apiKey) {
      return json(res, 400, { ok: false, error: 'baseUrl and apiKey required' });
    }

    // Stop existing proxy
    if (proxy) {
      await proxy.stop();
      proxy = null;
    }

    // Extract host from baseUrl
    const url = new URL(baseUrl);
    const targetHost = url.host;

    proxy = createProxy(PROXY_PORT, targetHost, apiKey);
    await proxy.start();
    json(res, 200, { ok: true, port: PROXY_PORT });
  } catch (e) {
    json(res, 500, { ok: false, error: e.message });
  }
}

async function handleStop(res) {
  if (proxy) {
    await proxy.stop();
    proxy = null;
  }
  json(res, 200, { ok: true });
}

function handleStatus(res) {
  const status = proxy ? proxy.getStatus() : { running: false, port: PROXY_PORT, requestCount: 0 };
  json(res, 200, status);
}

function handleLogs(res) {
  const logs = proxy ? proxy.getLogs() : [];
  json(res, 200, { logs });
}

async function handleTest(req, res) {
  try {
    const body = JSON.parse(await readBody(req));
    const { baseUrl, apiKey } = body;
    if (!baseUrl || !apiKey) {
      return json(res, 400, { ok: false, error: 'baseUrl and apiKey required' });
    }

    const url = new URL(baseUrl);
    const start = Date.now();

    const result = await new Promise((resolve) => {
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: '/v1/models',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 10000,
      };

      const req = https.request(options, (resp) => {
        let body = '';
        resp.on('data', (chunk) => body += chunk);
        resp.on('end', () => {
          const latencyMs = Date.now() - start;
          if (resp.statusCode === 200) {
            try {
              const parsed = JSON.parse(body);
              const models = (parsed.data || []).map(m => m.id);
              resolve({ ok: true, models, latencyMs });
            } catch {
              resolve({ ok: true, models: [], latencyMs });
            }
          } else {
            let errorMsg = `HTTP ${resp.statusCode}`;
            try { errorMsg = JSON.parse(body).error?.message || errorMsg; } catch {}
            resolve({ ok: false, error: errorMsg, latencyMs });
          }
        });
      });

      req.on('error', (e) => resolve({ ok: false, error: e.message, latencyMs: Date.now() - start }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Timeout', latencyMs: Date.now() - start }); });
      req.end();
    });

    json(res, 200, result);
  } catch (e) {
    json(res, 500, { ok: false, error: e.message });
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// === Start ===
webServer.listen(WEB_PORT, '127.0.0.1', () => {
  console.log(`\n  Codex Mimo Bridge`);
  console.log(`  ─────────────────`);
  console.log(`  Web UI:   http://127.0.0.1:${WEB_PORT}`);
  console.log(`  Proxy:    http://127.0.0.1:${PROXY_PORT}`);
  console.log(`\n  Open the Web UI in your browser to configure and start.\n`);
});
