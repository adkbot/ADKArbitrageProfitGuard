# 🚀 Configuração Vercel - ADK Arbitrage Profit Guard

## 📋 Configurações Necessárias no Vercel

### 1. **Root Directory**
```
client
```
*O Vercel deve apontar para a pasta `client` onde está o frontend Vite*

### 2. **Build Command**
```
npm run build
```

### 3. **Output Directory**
```
dist
```

### 4. **Install Command**
```
npm ci
```

### 5. **Node.js Version**
```
20.x
```

## 🌐 Variáveis de Ambiente

Configure as seguintes variáveis no Vercel Dashboard:

```bash
VITE_API_BASE_URL=https://adkarbitrageprofitguard.onrender.com
```

## 📁 Estrutura do Projeto

```
ADKArbitrageProfitGuard/
├── client/                 # Frontend Vite (Root Directory no Vercel)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── .env
├── server/                 # Backend (Deploy no Render)
├── vercel.json            # Configuração de proxy
├── package.json           # Scripts principais
└── vite.config.ts         # Configuração Vite
```

## 🔄 Proxy Configuration

O arquivo `vercel.json` configura o proxy para redirecionar chamadas `/api/*` para o backend no Render:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://adkarbitrageprofitguard.onrender.com/api/$1"
    }
  ]
}
```

## 🛠️ Scripts Configurados

- `npm run dev` - Desenvolvimento Vite
- `npm run build` - Build para produção
- `npm run preview` - Preview da build

## 🌍 CORS Backend

O backend já está configurado para aceitar requisições do Vercel:

```javascript
origin: [
  'https://adk-arbitrage-profit-guard.vercel.app',
  'https://adkarbitrageprofitguard.vercel.app',
  'https://*.vercel.app',
  // ...outros domínios
]
```

## 📝 Deploy Steps

1. **Push para GitHub** - Todas as configurações já estão commitadas
2. **Conectar Vercel ao GitHub** - Importar o repositório
3. **Configurar Root Directory** - Definir como `client`
4. **Adicionar Variável de Ambiente** - `VITE_API_BASE_URL`
5. **Deploy** - O Vercel fará o build automaticamente

## ✅ Verificações Pós-Deploy

- [ ] Frontend carrega corretamente
- [ ] Chamadas API funcionam via proxy
- [ ] CORS configurado no backend
- [ ] Variáveis de ambiente definidas
- [ ] Build sem erros

## 🔗 URLs

- **Frontend**: https://adk-arbitrage-profit-guard.vercel.app
- **Backend**: https://adkarbitrageprofitguard.onrender.com
- **API Proxy**: https://adk-arbitrage-profit-guard.vercel.app/api/*
