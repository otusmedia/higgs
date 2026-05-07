# Ad Studio — Deploy no Vercel

## Estrutura
```
adstudio/
├── api/
│   ├── proxy.js         ← proxy Anthropic (prompts / Claude)
│   └── higgsfield.js    ← proxy API REST Higgsfield (imagens)
├── public/
│   └── index.html
├── vercel.json
└── package.json
```

Documentação oficial da API REST: [How to use API](https://docs.higgsfield.ai/how-to/introduction), [Generate Images](https://docs.higgsfield.ai/guides/images). Base: **`https://platform.higgsfield.ai`**. Credenciais: **[cloud.higgsfield.ai](https://cloud.higgsfield.ai/)**.

## Deploy no Vercel

1. Crie/importe o projeto no [Vercel](https://vercel.com).
2. **Settings → Environment Variables** — adicione:

| Nome | Obrigatório | Descrição |
|------|-------------|-----------|
| `ANTHROPIC_API_KEY` | Sim (prompts) | Chave [Anthropic Console](https://console.anthropic.com) |
| `HIGGSFIELD_API_KEY` | Sim (imagens) | API Key do Cloud Higgsfield |
| `HIGGSFIELD_API_SECRET` | Recomendado | Secret (formato oficial `Authorization: Key key:secret`) |
| `HIGGSFIELD_MODEL_SOUL_CINEMA` | Não | Override do `model_id` para Soul Cinema (se o padrão der 404) |
| `HIGGSFIELD_MODEL_SOUL_2` | Não | Override para Soul 2.0 |

Se **só** `HIGGSFIELD_API_KEY` estiver definida, o proxy envia `Authorization: Bearer <HIGGSFIELD_API_KEY>`. Com **key + secret**, usa o formato oficial `Key key:secret`.

3. Redeploy.

## Observações

- Geração de imagem é **assíncrona**; `api/higgsfield.js` faz **polling** do `status_url` até completar ou estourar o limite (ajuste `maxDuration` em `vercel.json` se necessário).
- `resolution` no body segue a API (`720p`, `1080p`, `2K`, etc.); o frontend envia `quality` mapeado para `resolution`.
- Créditos Higgsfield são os da sua conta Cloud.
