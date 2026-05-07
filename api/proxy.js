const fetch = require('node-fetch');
const getRawBody = require('raw-body');

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const buf = await getRawBody(req, {
    length: req.headers['content-length'],
    limit: '2mb'
  });
  const text = buf.toString('utf8').trim();
  if (!text) return {};
  return JSON.parse(text);
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada' });

  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body', detail: e.message });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04'
      },
      body: JSON.stringify(body)
    });

    const ct = upstream.headers.get('content-type') || '';
    const payload = ct.includes('application/json') ? await upstream.json() : await upstream.text();
    if (typeof payload === 'string') {
      return res.status(upstream.status).json({
        error: 'Upstream non-JSON',
        detail: payload.slice(0, 500)
      });
    }
    res.status(upstream.status).json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = handler;

if (require.main === module) {
  const express = require('express');
  const cors = require('cors');
  const path = require('path');

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.post('/api/proxy', handler);
  app.use(express.static(path.join(__dirname, '..', 'public')));
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Ad Studio dev: http://localhost:${port}`);
  });
}
