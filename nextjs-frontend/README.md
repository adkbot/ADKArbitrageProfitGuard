
# ADK Arbitrage Profit Guard - Frontend Next.js

Frontend Next.js para o sistema de arbitragem ADK Arbitrage Profit Guard, otimizado para deploy no Vercel.

## 🚀 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` com:

```bash
NEXT_PUBLIC_API_BASE_URL=https://adkarbitrageprofitguard.onrender.com
NEXT_PUBLIC_APP_NAME=ADK Arbitrage Profit Guard
NEXT_PUBLIC_APP_VERSION=2.1.0
```

Para desenvolvimento local:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

### Build para Produção

```bash
npm run build
npm start
```

## 📦 Deploy no Vercel

1. Conecte este repositório ao Vercel
2. Configure as variáveis de ambiente no dashboard do Vercel
3. O deploy será automático

## 🔧 Configuração do Backend

Certifique-se de que o backend no Render tenha CORS configurado para aceitar requisições do domínio Vercel:

```javascript
app.use(cors({
  origin: [
    'https://adkarbitrageprofitguard.vercel.app',
    'https://*.vercel.app',
    'http://localhost:3000'
  ]
}))
```

## 📊 Funcionalidades

- ✅ Dashboard em tempo real
- ✅ Gráficos interativos de arbitragem
- ✅ Controles de bot
- ✅ Métricas de performance
- ✅ Tema escuro/claro
- ✅ Responsivo para mobile
- ✅ Notificações em tempo real

## 🛠 Tecnologias

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Radix UI Components
- React Query (TanStack Query)
- Chart.js
- Framer Motion

## 🔄 Comunicação com Backend

O frontend se comunica com o backend através de requisições HTTP para:
- `GET /api/arbitrage/opportunities` - Oportunidades de arbitragem
- `GET /api/status` - Status do bot
- `GET /api/trades` - Histórico de trades
- `GET /api/execution/attempts` - Tentativas de execução
- `POST /api/bot/start` - Iniciar bot
- `POST /api/bot/pause` - Pausar bot
- `POST /api/bot/stop` - Parar bot

## 📱 Responsividade

O layout é completamente responsivo e funciona perfeitamente em:
- 📱 Mobile (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Large screens (1280px+)
