/**
 * Higgsfield REST proxy (official API: https://docs.higgsfield.ai/how-to/introduction)
 * Base URL: https://platform.higgsfield.ai (credentials from https://cloud.higgsfield.ai/)
 *
 * Auth (official): Authorization: Key {api_key}:{api_key_secret}
 *   → HIGGSFIELD_API_KEY + HIGGSFIELD_API_SECRET, OR one line HIGGSFIELD_CREDENTIALS=key:secret
 * Bearer: HIGGSFIELD_USE_BEARER=true
 * Só um UUID no Cloud: tente HIGGSFIELD_AUTH_FORMAT=key_only → envia Key uuid: (secret vazio)
 *
 * Optional env overrides for model slugs if your Cloud gallery uses different IDs:
 *   HIGGSFIELD_MODEL_SOUL_CINEMA, HIGGSFIELD_MODEL_SOUL_2
 */

const PLATFORM_BASE = (process.env.HIGGSFIELD_API_BASE || 'https://platform.higgsfield.ai').replace(/\/$/, '');

/** Slugs exatos vêm da galeria no Cloud; estes são padrão razoáveis (ajuste via env se a API retornar 404). */
const DEFAULT_MODEL_IDS = {
  soul_cinematic: process.env.HIGGSFIELD_MODEL_SOUL_CINEMA || 'higgsfield-ai/soul/standard',
  soul_2: process.env.HIGGSFIELD_MODEL_SOUL_2 || 'higgsfield-ai/soul-2/standard'
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function resolveAuth() {
  const creds = (process.env.HIGGSFIELD_CREDENTIALS || '').trim();
  if (creds && creds.includes(':')) {
    const i = creds.indexOf(':');
    return { ok: true, header: `Key ${creds.slice(0, i)}:${creds.slice(i + 1)}` };
  }

  let key = (process.env.HIGGSFIELD_API_KEY || '').trim();
  const secret = (process.env.HIGGSFIELD_API_SECRET || '').trim();

  if (!key) {
    return { ok: false, status: 500, body: { error: 'HIGGSFIELD_API_KEY não configurada' } };
  }

  if (secret) {
    return { ok: true, header: `Key ${key}:${secret}` };
  }

  if (key.includes(':')) {
    const i = key.indexOf(':');
    return { ok: true, header: `Key ${key.slice(0, i)}:${key.slice(i + 1)}` };
  }

  if (process.env.HIGGSFIELD_USE_BEARER === '1' || process.env.HIGGSFIELD_USE_BEARER === 'true') {
    return { ok: true, header: `Bearer ${key}` };
  }

  const authFmt = (process.env.HIGGSFIELD_AUTH_FORMAT || '').toLowerCase().trim();
  if (authFmt === 'key_only' || authFmt === 'key_empty_secret' || authFmt === 'single') {
    return { ok: true, header: `Key ${key}:` };
  }

  return {
    ok: false,
    status: 503,
    body: {
      error: 'Credenciais Higgsfield incompletas',
      detail:
        'Documentação: Key API_KEY:API_SECRET — https://docs.higgsfield.ai/how-to/introduction — No Cloud, confira se existe um segundo campo (secret) ou export completo. Se o painel só mostrar um UUID, no Vercel defina HIGGSFIELD_AUTH_FORMAT=key_only para tentar Key uuid: (secret vazio). Ou HIGGSFIELD_USE_BEARER=true. Ou HIGGSFIELD_CREDENTIALS=key:secret.',
      docs: 'https://docs.higgsfield.ai/how-to/introduction'
    }
  };
}

function mapUiModelToPath(uiModel) {
  if (!uiModel) return DEFAULT_MODEL_IDS.soul_cinematic;
  if (DEFAULT_MODEL_IDS[uiModel]) return DEFAULT_MODEL_IDS[uiModel];
  if (uiModel.includes('/')) return uiModel;
  return DEFAULT_MODEL_IDS.soul_cinematic;
}

function normalizeResolution(quality) {
  if (!quality || typeof quality !== 'string') return '1080p';
  const q = quality.trim().toLowerCase();
  if (q === '2k' || q === '2048' || q === '2kp') return '2K';
  if (q === '1080p' || q === '1080') return '1080p';
  if (q === '720p' || q === '720') return '720p';
  return quality;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authRes = resolveAuth();
  if (!authRes.ok) {
    return res.status(authRes.status).json(authRes.body);
  }
  const auth = authRes.header;

  let payload;
  try {
    const raw = (await readRawBody(req)).trim();
    if (raw) payload = JSON.parse(raw);
    else if (req.body != null && typeof req.body === 'object') payload = req.body;
    else return res.status(400).json({ error: 'Body inválido' });
  } catch {
    return res.status(400).json({ error: 'Body inválido' });
  }

  const {
    prompt,
    aspect_ratio,
    quality,
    model: uiModel,
    soul_id: soulId,
    seed: seedRaw
  } = payload;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt é obrigatório' });
  }

  const modelPath = mapUiModelToPath(uiModel);
  const url = `${PLATFORM_BASE}/${modelPath}`;

  const body = {
    prompt: prompt.trim(),
    aspect_ratio: aspect_ratio || '9:16',
    resolution: normalizeResolution(quality)
  };

  if (soulId && typeof soulId === 'string') {
    body.soul_id = soulId;
  }

  if (seedRaw != null && seedRaw !== '') {
    const n = Number(seedRaw);
    if (Number.isFinite(n)) body.seed = Math.max(1, Math.min(1000000, Math.floor(n)));
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: auth
  };

  let submitText;
  let submit;
  try {
    const upstream = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    submitText = await upstream.text();
    try {
      submit = submitText ? JSON.parse(submitText) : {};
    } catch {
      return res.status(upstream.status).json({
        error: 'Resposta não-JSON do Higgsfield',
        status: upstream.status,
        detail: submitText.slice(0, 800)
      });
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json(submit);
    }
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Falha ao contatar Higgsfield' });
  }

  const statusUrl = submit.status_url
    || (submit.request_id ? `${PLATFORM_BASE}/requests/${submit.request_id}/status` : null);

  if (!statusUrl || submit.status === 'completed') {
    return res.status(200).json(submit);
  }

  const maxAttempts = Math.min(parseInt(process.env.HIGGSFIELD_POLL_MAX_ATTEMPTS || '14', 10), 25);
  const delayMs = Math.min(parseInt(process.env.HIGGSFIELD_POLL_DELAY_MS || '2000', 10), 5000);

  let last = submit;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(delayMs);
    try {
      const st = await fetch(statusUrl, { headers: { Accept: 'application/json', Authorization: auth } });
      const txt = await st.text();
      last = txt ? JSON.parse(txt) : {};
      if (last.status === 'completed' || last.status === 'failed' || last.status === 'nsfw') {
        return res.status(200).json({ ...last, _submit: submit });
      }
    } catch (e) {
      return res.status(200).json({
        ...last,
        _submit: submit,
        _poll_error: e.message
      });
    }
  }

  return res.status(200).json({
    ...last,
    _submit: submit,
    _poll: 'timeout',
    message: 'Geração ainda em fila; consulte status_url no painel ou aumente maxDuration/poll.'
  });
}
