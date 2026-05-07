export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada' });

  let body;
  const rawBody = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
  try {
    const trimmed = (rawBody || '').trim();
    if (trimmed) {
      body = JSON.parse(trimmed);
    } else if (req.body != null && typeof req.body === 'object') {
      body = req.body;
    } else {
      return res.status(400).json({ error: 'Body inválido' });
    }
  } catch {
    return res.status(400).json({ error: 'Body inválido' });
  }

  const mcpToken = process.env.HIGGSFIELD_MCP_TOKEN;
  if (mcpToken && Array.isArray(body.mcp_servers)) {
    body.mcp_servers = body.mcp_servers.map((s) => {
      if (!s || typeof s !== 'object') return s;
      const url = String(s.url || '');
      if (url.includes('higgsfield') && !s.authorization_token) {
        return { ...s, authorization_token: mcpToken };
      }
      return s;
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-11-20'
      },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: 'Resposta não-JSON da Anthropic', detail: text.slice(0, 500) };
    }
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
