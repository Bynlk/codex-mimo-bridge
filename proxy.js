const http = require('http');
const https = require('https');

function createProxy(port, targetHost, apiKey) {
  let requestCount = 0;
  let server = null;
  const logs = [];

  function log(level, msg, extra) {
    const entry = { ts: Date.now(), level, msg, ...extra };
    logs.push(entry);
    if (logs.length > 500) logs.shift();
    return entry;
  }

  function convertResponsesToChat(body) {
    const messages = [];
    if (body.instructions) messages.push({ role: 'system', content: body.instructions });
    if (Array.isArray(body.input)) {
      for (const item of body.input) {
        if (typeof item === 'string') {
          messages.push({ role: 'user', content: item });
        } else if (item.type === 'message' && item.content) {
          const text = Array.isArray(item.content)
            ? item.content.map(c => c.text || (typeof c === 'string' ? c : '')).join('')
            : (typeof item.content === 'string' ? item.content : JSON.stringify(item.content));
          messages.push({ role: item.role || 'user', content: text });
        } else if (item.role && item.content) {
          messages.push({ role: item.role, content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content) });
        }
      }
    } else if (typeof body.input === 'string') {
      messages.push({ role: 'user', content: body.input });
    }
    return {
      model: body.model || 'mimo-v2.5-pro',
      messages,
      stream: !!body.stream,
      max_tokens: body.max_output_tokens || 4096,
      temperature: body.temperature ?? 0.7,
    };
  }

  function convertChatToResponses(chatBody, chatResponse) {
    const outputText = chatResponse.choices?.[0]?.message?.content || '';
    return {
      id: chatResponse.id || `resp_${Date.now()}`,
      object: 'response',
      created_at: chatResponse.created || Math.floor(Date.now() / 1000),
      status: 'completed',
      model: chatResponse.model || chatBody.model,
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: outputText }] }],
      usage: chatResponse.usage || {},
    };
  }

  function streamChatToResponses(chatBody, proxyRes, clientRes) {
    clientRes.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const responseId = `resp_${Date.now()}`;
    let buffer = '';
    let fullText = '';
    let completed = false;

    function write(event, data) {
      clientRes.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }

    write('response.created', { type: 'response.created', response: { id: responseId, status: 'in_progress', output: [] } });
    write('response.in_progress', { type: 'response.in_progress', response: { id: responseId, status: 'in_progress' } });
    write('response.output_item.added', { type: 'response.output_item.added', item: { type: 'message', role: 'assistant', content: [] } });

    function finishStream() {
      if (completed) return;
      completed = true;
      write('response.content_part.done', { type: 'response.content_part.done', part: { type: 'output_text', text: fullText } });
      write('response.output_item.done', { type: 'response.output_item.done', item: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: fullText }] } });
      write('response.completed', { type: 'response.completed', response: { id: responseId, status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: fullText }] }] } });
      clientRes.end();
    }

    proxyRes.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') { finishStream(); return; }
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;
          if (delta.reasoning_content) continue;
          if (delta.content) {
            fullText += delta.content;
            write('response.output_text.delta', { type: 'response.output_text.delta', delta: delta.content });
          }
          if (parsed.choices?.[0]?.finish_reason === 'stop') { finishStream(); return; }
        } catch (e) { /* skip */ }
      }
    });

    proxyRes.on('end', () => finishStream());
    proxyRes.on('error', (e) => { log('error', 'stream_error', { error: e.message }); finishStream(); });
  }

  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      const start = Date.now();
      if (req.url === '/v1/responses' && req.method === 'POST') {
        try {
          const parsed = JSON.parse(body);
          const chatBody = convertResponsesToChat(parsed);
          const data = JSON.stringify(chatBody);
          const options = {
            hostname: targetHost, port: 443, path: '/v1/chat/completions', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'Content-Length': Buffer.byteLength(data) },
          };
          const proxyReq = https.request(options, (proxyRes) => {
            requestCount++;
            if (parsed.stream) {
              log('info', 'request', { method: 'POST', url: '/v1/responses', stream: true });
              streamChatToResponses(chatBody, proxyRes, res);
            } else {
              let responseBody = '';
              proxyRes.on('data', (chunk) => responseBody += chunk);
              proxyRes.on('end', () => {
                try {
                  const chatResp = JSON.parse(responseBody);
                  const responsesResp = convertChatToResponses(chatBody, chatResp);
                  log('info', 'request', { method: 'POST', url: '/v1/responses', status: 200, durationMs: Date.now() - start });
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(responsesResp));
                } catch (e) {
                  log('error', 'parse_error', { error: e.message });
                  res.writeHead(502);
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
            }
          });
          proxyReq.on('error', (e) => {
            log('error', 'upstream_error', { error: e.message });
            res.writeHead(502);
            res.end(JSON.stringify({ error: e.message }));
          });
          proxyReq.write(data);
          proxyReq.end();
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: e.message }));
        }
      } else if (req.url === '/v1/models' && req.method === 'GET') {
        log('info', 'request', { method: 'GET', url: '/v1/models' });
        requestCount++;
        const options = {
          hostname: targetHost, port: 443, path: '/v1/models', method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}` },
        };
        const proxyReq = https.request(options, (proxyRes) => {
          let responseBody = '';
          proxyRes.on('data', (chunk) => responseBody += chunk);
          proxyRes.on('end', () => {
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(responseBody);
          });
        });
        proxyReq.on('error', (e) => { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); });
        proxyReq.end();
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
  });

  return {
    start() {
      return new Promise((resolve, reject) => {
        server.listen(port, '127.0.0.1', () => {
          log('info', 'listening', { port, host: '127.0.0.1', target: targetHost });
          resolve();
        });
        server.on('error', reject);
      });
    },
    stop() {
      return new Promise((resolve) => {
        if (!server) return resolve();
        server.close(() => resolve());
        server = null;
      });
    },
    getStatus() {
      return { running: !!server, port, requestCount };
    },
    getLogs() {
      return logs;
    },
  };
}

module.exports = { createProxy };
