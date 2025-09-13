#!/bin/bash

# 🚀 ADK ARBITRAGEM - DEPLOYMENT SCRIPT PARA VPS
# Usar: bash server/vps-deploy.sh

echo "🚀 Iniciando deployment do ADK Arbitragem Multiusuário..."

# Configurações
VPS_USER="root"
VPS_HOST="138.68.255.204"
VPS_PATH="/opt/adk-arbitragem"
LOCAL_PATH="."

echo "📊 Informações do deployment:"
echo "   🖥️  VPS: $VPS_USER@$VPS_HOST"
echo "   📁 Pasta: $VPS_PATH"
echo "   🌐 Porta: 3000"
echo "   🔗 Acesso: http://$VPS_HOST:3000"

# Criar diretório no VPS se não existir
echo "📁 Criando estrutura de diretórios..."
ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH/logs"

# Fazer backup da configuração atual (se existir)
echo "💾 Fazendo backup da configuração atual..."
ssh $VPS_USER@$VPS_HOST "if [ -d $VPS_PATH ]; then cp -r $VPS_PATH $VPS_PATH.backup.$(date +%Y%m%d_%H%M%S); fi"

# Sincronizar arquivos
echo "📤 Sincronizando arquivos para VPS..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'logs' $LOCAL_PATH/ $VPS_USER@$VPS_HOST:$VPS_PATH/

# Instalar dependências no VPS
echo "📦 Instalando dependências no VPS..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && npm install"

# Instalar PM2 globalmente se não existir
echo "🔧 Verificando PM2..."
ssh $VPS_USER@$VPS_HOST "which pm2 || npm install -g pm2"

# Configurar variáveis de ambiente
echo "🔐 Configurando variáveis de ambiente..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && cat > .env.production << EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=adk_$(openssl rand -hex 32)
PROXY_ENABLED=false
API_RATE_LIMIT=1000
EOF"

# Fazer deploy com PM2
echo "🏃 Iniciando aplicação com PM2..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && pm2 delete adk-arbitragem-multiuser 2>/dev/null || true"
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && pm2 start ecosystem.config.js --env production"

# Salvar configuração do PM2
ssh $VPS_USER@$VPS_HOST "pm2 save && pm2 startup"

# Verificar status
echo "📊 Verificando status da aplicação..."
ssh $VPS_USER@$VPS_HOST "pm2 status"

# Teste de conectividade
echo "🌐 Testando conectividade..."
sleep 5
if curl -f http://$VPS_HOST:3000/api/public/status; then
    echo "✅ Deployment concluído com SUCESSO!"
    echo ""
    echo "🎉 SISTEMA MULTIUSUÁRIO ATIVO:"
    echo "   🌐 URL: http://$VPS_HOST:3000"
    echo "   📖 Docs: http://$VPS_HOST:3000/api/public/docs"
    echo "   📊 Status: http://$VPS_HOST:3000/api/public/status"
    echo ""
    echo "👥 ENDPOINTS PARA USUÁRIOS:"
    echo "   🔐 POST /api/public/auth - Login/registro"
    echo "   ▶️  POST /api/user/start - Iniciar bot"
    echo "   ⏹️  POST /api/user/stop - Parar bot"
    echo "   🔧 POST /api/user/config - Configurar API keys"
    echo ""
    echo "💡 Exemplo de uso:"
    echo "   curl -X POST http://$VPS_HOST:3000/api/public/auth \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"userId\":\"meu_usuario\", \"password\":\"minha_senha\"}'"
else
    echo "❌ Falha no deployment - verifique os logs:"
    ssh $VPS_USER@$VPS_HOST "pm2 logs adk-arbitragem-multiuser --lines 20"
fi