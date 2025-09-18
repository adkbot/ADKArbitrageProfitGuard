#!/bin/bash

# 🚀 Script de Deploy Automatizado para Vercel
# ADK Arbitrage Profit Guard

echo "🚀 Iniciando deploy do ADK Arbitrage Profit Guard no Vercel..."
echo "=================================================="

# Navegar para o diretório correto
cd /home/ubuntu/github_repos/ADKArbitrageProfitGuard/nextjs-frontend

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: package.json não encontrado. Verifique se está no diretório correto."
    exit 1
fi

echo "✅ Diretório correto encontrado"

# Verificar se o Vercel CLI está instalado
if ! command -v npx &> /dev/null; then
    echo "❌ Erro: npx não encontrado. Instale o Node.js primeiro."
    exit 1
fi

echo "✅ Node.js e npx encontrados"

# Fazer build do projeto para verificar se está tudo OK
echo "🔨 Fazendo build do projeto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build. Corrija os erros antes de fazer o deploy."
    exit 1
fi

echo "✅ Build realizado com sucesso"

# Verificar se o usuário está logado no Vercel
echo "🔐 Verificando autenticação no Vercel..."
npx vercel whoami 2>/dev/null

if [ $? -ne 0 ]; then
    echo "⚠️  Você não está logado no Vercel."
    echo "🔐 Fazendo login no Vercel..."
    echo "   Siga as instruções no browser que será aberto."
    npx vercel login
    
    if [ $? -ne 0 ]; then
        echo "❌ Erro no login. Tente novamente."
        exit 1
    fi
fi

echo "✅ Autenticação verificada"

# Fazer o deploy
echo "🚀 Iniciando deploy no Vercel..."
npx vercel --prod --yes

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deploy realizado com sucesso!"
    echo "=================================================="
    echo "✅ Frontend deployado no Vercel"
    echo "✅ Backend rodando no Render: https://adkarbitrageprofitguard.onrender.com"
    echo ""
    echo "🔍 Próximos passos:"
    echo "1. Teste a URL fornecida pelo Vercel"
    echo "2. Verifique se a comunicação com o backend está funcionando"
    echo "3. Teste todas as funcionalidades da aplicação"
    echo ""
else
    echo "❌ Erro no deploy. Verifique os logs acima."
    exit 1
fi
