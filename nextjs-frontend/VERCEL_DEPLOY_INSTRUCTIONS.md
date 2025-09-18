# 🚀 Instruções para Deploy no Vercel - ADK Arbitrage Profit Guard

## ✅ Status da Preparação
- ✅ Projeto Next.js configurado e testado
- ✅ Build realizado com sucesso
- ✅ Variáveis de ambiente configuradas
- ✅ Vercel CLI instalado
- ✅ Configuração vercel.json otimizada
- ✅ Repositório Git configurado

## 🔧 Configurações Aplicadas

### 1. Variáveis de Ambiente (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=https://adkarbitrageprofitguard.onrender.com
NEXT_PUBLIC_APP_NAME=ADK Arbitrage Profit Guard
NEXT_PUBLIC_APP_VERSION=2.1.0
NODE_ENV=production
```

### 2. Configuração Vercel (vercel.json)
- ✅ Rewrites configurados para API do Render
- ✅ Headers de segurança aplicados
- ✅ Framework Next.js detectado automaticamente

## 🚀 Passos para Deploy

### Opção 1: Deploy via CLI (Recomendado)

1. **Fazer login no Vercel:**
```bash
cd /home/ubuntu/github_repos/ADKArbitrageProfitGuard/nextjs-frontend
npx vercel login
```

2. **Fazer o deploy:**
```bash
npx vercel --prod --yes
```

### Opção 2: Deploy via Dashboard Vercel

1. Acesse: https://vercel.com/dashboard
2. Clique em "New Project"
3. Conecte o repositório: `https://github.com/adkbot/ADKArbitrageProfitGuard`
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `nextjs-frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

5. **Adicione as variáveis de ambiente:**
   - `NEXT_PUBLIC_API_BASE_URL` = `https://adkarbitrageprofitguard.onrender.com`
   - `NEXT_PUBLIC_APP_NAME` = `ADK Arbitrage Profit Guard`
   - `NEXT_PUBLIC_APP_VERSION` = `2.1.0`

6. Clique em "Deploy"

## 🔍 Verificações Pós-Deploy

Após o deploy, verifique:

1. **URL do Vercel:** Será fornecida após o deploy
2. **Conectividade com Backend:** Teste as chamadas para o Render
3. **Funcionalidades:** Verifique se todas as páginas carregam
4. **Console do Browser:** Verifique se não há erros de CORS

## 🛠️ Comandos de Teste Local

Para testar localmente antes do deploy:
```bash
cd /home/ubuntu/github_repos/ADKArbitrageProfitGuard/nextjs-frontend
npm run dev
```

## 📋 Checklist Final

- [ ] Login no Vercel realizado
- [ ] Deploy executado com sucesso
- [ ] URL do Vercel funcionando
- [ ] Backend no Render respondendo
- [ ] Todas as funcionalidades testadas
- [ ] Sem erros no console do browser

## 🔧 Troubleshooting

### Erro de CORS
Se houver problemas de CORS, verifique se o backend no Render está configurado para aceitar requisições do domínio do Vercel.

### Erro de Build
Se o build falhar, execute localmente:
```bash
npm run build
```

### Variáveis de Ambiente
Certifique-se de que todas as variáveis estão configuradas no dashboard do Vercel.

---

**Projeto preparado e pronto para deploy! 🎉**
