# Ad Studio — Deploy no Vercel

## Estrutura
```
adstudio/
├── api/
│   └── proxy.js        ← backend (resolve CORS com a API Anthropic)
├── public/
│   └── index.html      ← frontend do app
├── vercel.json
└── package.json
```

## Deploy em 3 passos

### 1. Crie uma conta no Vercel
Acesse https://vercel.com e crie conta gratuita (pode entrar com GitHub).

### 2. Suba o projeto
Opção A — pelo site:
- Acesse https://vercel.com/new
- Clique em "Browse" e selecione a pasta `adstudio`
- Clique em Deploy

Opção B — pelo terminal:
```bash
npm i -g vercel
cd adstudio
vercel
```

### 3. Configure a variável de ambiente
Após o deploy, no painel do Vercel:
- Vá em Settings → Environment Variables
- Adicione:
  - Nome: `ANTHROPIC_API_KEY`
  - Valor: sua chave da API Anthropic (https://console.anthropic.com)
- Clique em Save
- Vá em Deployments → clique nos 3 pontinhos → Redeploy

Pronto! O link gerado pelo Vercel é o seu app funcionando.

## Observações
- O plano gratuito do Vercel é suficiente
- A chave Anthropic é usada apenas no backend (nunca exposta no frontend)
- Os créditos Higgsfield são consumidos via MCP quando você gera imagens
