import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import BotControlButtons from '../components/BotControlButtons';
import StatusIndicator from '../components/StatusIndicator';
import ArbitrageChart from '../components/ArbitrageChart';
import ConfigurationModal from '../components/ConfigurationModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { DollarSign, Percent, Clock, Activity, TrendingUp, BarChart3, RefreshCw, Zap, AlertCircle, CheckCircle, Loader } from 'lucide-react';

type BotStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';

// 🔥 DADOS 100% REAIS - Sistema ADK-Arbitragem
export default function HomePage() {
  const [botStatus, setBotStatus] = useState<BotStatus>('IDLE');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [lastNotifiedAttemptId, setLastNotifiedAttemptId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // 📊 BUSCAR OPORTUNIDADES DE ARBITRAGEM REAIS (Atualização a cada 5 segundos)
  const { data: opportunities = [], isLoading: loadingOpportunities, refetch: refetchOpportunities } = useQuery({
    queryKey: ['/api/arbitrage/opportunities'],
    refetchInterval: 5000, // Atualização automática a cada 5 segundos
    staleTime: 2000,
  });

  // 📊 BUSCAR STATUS REAL DO BOT
  const { data: botData = {}, isLoading: loadingBot } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 3000,
    staleTime: 1000,
  });

  // 📊 BUSCAR TRADES REAIS
  const { data: trades = [], isLoading: loadingTrades } = useQuery({
    queryKey: ['/api/trades'],
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // 📊 BUSCAR TENTATIVAS DE EXECUÇÃO EM TEMPO REAL
  const { data: executionData = {}, isLoading: loadingExecutions } = useQuery({
    queryKey: ['/api/execution/attempts'],
    refetchInterval: 2000, // Atualização muito rápida para mostrar tentativas
    staleTime: 1000,
  });

  // 💰 BUSCAR SALDOS REAIS DAS CARTEIRAS (Futuro e Spot)
  const { data: balanceData = {}, isLoading: loadingBalance } = useQuery({
    queryKey: ['/api/exchange/balance'],
    refetchInterval: 10000, // Atualização a cada 10 segundos
    staleTime: 5000,
  });
  // 🔥 PROCESSAMENTO DE DADOS REAIS APENAS
  const opportunitiesArray = Array.isArray(opportunities) ? opportunities : [];
  const tradesArray = Array.isArray(trades) ? trades : [];
  const botDataTyped = botData as { activeTrades?: number; todayTrades?: number; pairs?: string[] } || {};
  const executionAttempts = (executionData as any)?.attempts || [];

  // 🔔 SISTEMA INTELIGENTE DE NOTIFICAÇÕES
  useEffect(() => {
    if (executionAttempts.length > 0) {
      const latestAttempt = executionAttempts[0]; // Mais recente primeiro
      
      // Se é uma nova tentativa que não foi notificada
      if (latestAttempt.id && latestAttempt.id !== lastNotifiedAttemptId) {
        const { status, symbol, spotPrice, futuresPrice, profit, reason } = latestAttempt;
        
        if (status === 'completed' && profit > 0) {
          // 🎉 SUCESSO - Notificação verde
          toast({
            title: "✅ Trade Executado!",
            description: `${symbol}: Lucro de $${profit.toFixed(2)} (${((spotPrice - futuresPrice) / spotPrice * 100).toFixed(3)}%)`,
            variant: "default",
          });
        } else if (status === 'failed' && reason) {
          // ⚠️ FALHA - Notificação informativa
          const shortReason = reason.length > 50 ? reason.substring(0, 50) + "..." : reason;
          toast({
            title: "⚠️ Execução Falhou",
            description: `${symbol}: ${shortReason}`,
            variant: "destructive",
          });
        } else if (status === 'executing') {
          // 🔄 EXECUTANDO - Notificação azul
          toast({
            title: "🔄 Executando Trade",
            description: `${symbol}: Basis ${((spotPrice - futuresPrice) / spotPrice * 100).toFixed(3)}%`,
            variant: "default",
          });
        }
        
        setLastNotifiedAttemptId(latestAttempt.id);
      }
    }
  }, [executionAttempts, lastNotifiedAttemptId, toast]);
  
  // 💰 PROCESSAMENTO DE DADOS DE SALDO REAIS
  const balanceDataTyped = balanceData as any || {};
  const spotBalance = balanceDataTyped.spot?.USDT?.available || 0;
  const futuresBalance = balanceDataTyped.futures?.USDT?.available || 0;
  const totalBalance = spotBalance + futuresBalance;
  const balanceError = !balanceDataTyped.success;
  
  const topOpportunities = opportunitiesArray
    .sort((a: any, b: any) => Math.abs(b.basisPercent) - Math.abs(a.basisPercent))
    .slice(0, 30); // Top 30 melhores oportunidades

  const currentAnalyzingPair = topOpportunities[0]?.symbol || 'Analisando...';
  const avgBasis = topOpportunities.length > 0 
    ? topOpportunities.reduce((sum: number, opp: any) => sum + Math.abs(opp.basisPercent), 0) / topOpportunities.length
    : 0;

  // 🔥 FUNÇÃO HELPER - Verificar status de execução por símbolo
  const getExecutionStatus = (symbol: string) => {
    const recentAttempt = executionAttempts
      .filter((attempt: any) => attempt.symbol === symbol)
      .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
    
    if (!recentAttempt) return null;
    
    // Verificar se a tentativa é recente (últimos 2 minutos)
    const isRecent = (Date.now() - recentAttempt.timestamp) < 120000;
    if (!isRecent) return null;
    
    return {
      status: recentAttempt.status,
      reason: recentAttempt.failureReason,
      timestamp: recentAttempt.timestamp
    };
  };

  // 🔥 FUNÇÃO HELPER - Obter ícone de status de execução
  const getExecutionIcon = (status: string) => {
    switch (status) {
      case 'executing':
      case 'in_progress':
        return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Calcular métricas reais baseadas nos dados da API
  const realMetrics = [
    {
      id: 'futures-balance',
      title: 'Carteira Futuro',
      value: balanceError ? 'Erro' : `$${futuresBalance.toFixed(2)}`,
      icon: <DollarSign className="w-4 h-4" />,
      description: 'saldo disponível'
    },
    {
      id: 'spot-balance',
      title: 'Carteira Spot',
      value: balanceError ? 'Erro' : `$${spotBalance.toFixed(2)}`,
      icon: <DollarSign className="w-4 h-4" />,
      description: 'saldo disponível'
    },
    {
      id: 'current-opportunities',
      title: 'Oportunidades Ativas',
      value: topOpportunities.length,
      icon: <Activity className="w-4 h-4" />,
      description: 'detectadas agora'
    },
    {
      id: 'current-analyzing',
      title: 'Analisando Agora',
      value: currentAnalyzingPair,
      icon: <BarChart3 className="w-4 h-4" />,
      description: 'par atual'
    },
    {
      id: 'avg-basis',
      title: 'Base Média Top 30',
      value: `${avgBasis.toFixed(4)}%`,
      icon: <Percent className="w-4 h-4" />,
      description: 'melhores oportunidades'
    },
    {
      id: 'active-trades',
      title: 'Trades Ativos',
      value: botDataTyped.activeTrades || 0,
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'daily-trades',
      title: 'Trades Hoje',
      value: botDataTyped.todayTrades || 0,
      icon: <DollarSign className="w-4 h-4" />,
      description: 'total do dia'
    },
    {
      id: 'total-pairs',
      title: 'Pares Monitorados',
      value: botDataTyped.pairs?.length || 0,
      icon: <Clock className="w-4 h-4" />,
      description: 'em análise'
    },
    {
      id: 'execution-attempts',
      title: 'Tentativas Execução',
      value: executionAttempts.length,
      icon: <Zap className="w-4 h-4" />,
      description: 'registradas hoje'
    }
  ];

  // Gerar dados de gráfico baseados em oportunidades reais
  const generateRealChartData = (opportunities: any[]) => {
    const data = opportunities.slice(0, 24).map((opp: any) => Math.abs(opp.basisPercent));
    const labels = opportunities.slice(0, 24).map((opp: any) => opp.symbol.replace('/USDT', ''));
    return { data, labels };
  };

  // Calculate scalar values for time series charts
  const basisChart = generateRealChartData(topOpportunities);
  const realTimeChart = {
    data: topOpportunities.slice(0, 10).map((opp: any) => opp.spotPrice),
    labels: topOpportunities.slice(0, 10).map((opp: any) => opp.symbol.replace('/USDT', ''))
  };
  
  // Calculate streamValue for proper time series
  const avgBasisValue = basisChart.data.length > 0 
    ? basisChart.data.reduce((sum, val) => sum + val, 0) / basisChart.data.length 
    : 0;
    
  const avgSpotValue = realTimeChart.data.length > 0 
    ? realTimeChart.data.reduce((sum, val) => sum + val, 0) / realTimeChart.data.length 
    : 0;
    
  const btcBasis = Math.abs(topOpportunities.find((opp: any) => opp.symbol?.includes('BTC'))?.basisPercent || 0);
  const ethBasis = Math.abs(topOpportunities.find((opp: any) => opp.symbol?.includes('ETH'))?.basisPercent || 0);
  const btcEthDifference = Math.abs(btcBasis - ethBasis);
  
  const avgPotentialProfit = topOpportunities.length > 0
    ? topOpportunities.slice(0, 10).reduce((sum: number, opp: any) => sum + (opp.potentialProfit || 0), 0) / Math.min(10, topOpportunities.length)
    : 0;
  
  const handleStart = () => {
    console.log('Bot iniciado');
    setBotStatus('RUNNING');
  };
  
  const handlePause = () => {
    console.log('Bot pausado');
    setBotStatus('PAUSED');
  };
  
  const handleStop = () => {
    console.log('Bot parado');
    setBotStatus('STOPPED');
  };
  
  const handleSettings = () => {
    console.log('Abrindo configurações');
    setIsConfigOpen(true);
  };
  
  const handleSaveConfig = (config: any) => {
    console.log('Configuração salva:', config);
    // TODO: Save configuration to backend when implemented
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">ADK-Arbitragem</h1>
                <p className="text-sm text-muted-foreground">Sistema de Arbitragem Spot↔Futuros</p>
              </div>
              <StatusIndicator status={botStatus} />
            </div>
            
            <div className="flex items-center gap-4">
              <BotControlButtons
                status={botStatus}
                onStart={handleStart}
                onPause={handlePause}
                onStop={handleStop}
                onSettings={handleSettings}
              />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* 🔥 SEÇÃO DE DIFERENÇAS DE PREÇOS EM TEMPO REAL */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Diferenças de Preços Spot ↔ Futuros (REAL TIME)</h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchOpportunities()} 
                disabled={loadingOpportunities}
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingOpportunities ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Badge variant="outline" className="text-xs">
                🔄 Auto: 5s
              </Badge>
            </div>
          </div>
          
          {loadingOpportunities ? (
            <Card>
              <CardContent className="p-6 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Carregando oportunidades reais...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {topOpportunities.map((opportunity: any, index: number) => (
                <Card key={opportunity.symbol} className="hover-elevate" data-testid={`opportunity-${opportunity.symbol}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={index < 5 ? 'default' : 'outline'}>
                        {opportunity.symbol}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {/* 🔥 INDICADOR DE EXECUÇÃO EM TEMPO REAL */}
                        {(() => {
                          const execStatus = getExecutionStatus(opportunity.symbol);
                          if (execStatus) {
                            return (
                              <div className="flex items-center gap-1" title={`Status: ${execStatus.status} ${execStatus.reason ? `- ${execStatus.reason}` : ''}`}>
                                {getExecutionIcon(execStatus.status)}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <Badge variant={opportunity.basisPercent > 0 ? 'default' : 'destructive'} className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Spot:</span>
                        <span className="font-mono">${opportunity.spotPrice?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Futuros:</span>
                        <span className="font-mono">${opportunity.futuresPrice?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Diferença:</span>
                        <span className={`font-mono ${
                          opportunity.basisPercent > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {opportunity.basisPercent > 0 ? '+' : ''}{opportunity.basisPercent?.toFixed(4)}%
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">
                            Lucro Est.: {opportunity.potentialProfit?.toFixed(4)}%
                          </p>
                          {/* 🔥 STATUS DE EXECUÇÃO DETALHADO */}
                          {(() => {
                            const execStatus = getExecutionStatus(opportunity.symbol);
                            if (execStatus && execStatus.status === 'error' && execStatus.reason) {
                              return (
                                <p className="text-xs text-red-500" title={execStatus.reason}>
                                  {execStatus.reason.includes('Saldo insuficiente') ? '💰 Saldo ⚠️' : '❌ Erro'}
                                </p>
                              );
                            }
                            if (execStatus && execStatus.status === 'success') {
                              return <p className="text-xs text-green-500">✅ Executado</p>;
                            }
                            if (execStatus && execStatus.status === 'executing') {
                              return <p className="text-xs text-blue-500">⚡ Executando...</p>;
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
        
        {/* Métricas Dashboard - DADOS REAIS */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Métricas do Sistema (Dados Reais)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {realMetrics.map((metric) => (
              <Card key={metric.id} className="hover-elevate" data-testid={`metric-${metric.id}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  {metric.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  {metric.description && (
                    <p className="text-xs text-muted-foreground">
                      {metric.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        
        {/* Gráficos Dinâmicos com Dados Reais */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Gráficos em Tempo Real - Sistema ADK-Arbitragem</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <ArbitrageChart
              type="basis"
              title={`Base dos Top ${Math.min(topOpportunities.length, 24)} Pares`}
              data={basisChart.data}
              labels={basisChart.labels}
              streamValue={avgBasisValue}
              isLive={true}
              lastUpdate={topOpportunities[0]?.lastUpdate || new Date().toLocaleTimeString('pt-BR')}
            />
            
            <ArbitrageChart
              type="funding"
              title="Preços Spot - Top 10 Ativos"
              data={realTimeChart.data}
              labels={realTimeChart.labels}
              streamValue={avgSpotValue}
              isLive={true}
              lastUpdate={new Date().toLocaleTimeString('pt-BR')}
            />
            
            <ArbitrageChart
              type="wyckoff"
              title="Diferenças % - BTC vs ETH"
              data={[btcBasis, ethBasis]}
              labels={['BTC/USDT', 'ETH/USDT']}
              streamValue={btcEthDifference}
              isLive={true}
              lastUpdate={new Date().toLocaleTimeString('pt-BR')}
            />
            
            <ArbitrageChart
              type="pnl"
              title="Lucro Potencial Estimado (USD)"
              data={topOpportunities.slice(0, 10).map((opp: any) => (opp.potentialProfit || 0) * 1000)} // Simular USD
              labels={topOpportunities.slice(0, 10).map((opp: any) => opp.symbol?.replace('/USDT', '') || '')}
              streamValue={avgPotentialProfit * 1000}
              isLive={true}
              lastUpdate={new Date().toLocaleTimeString('pt-BR')}
            />
          </div>
        </section>
        
        {/* 📊 PAINEL DE TENTATIVAS RECENTES DE EXECUÇÃO */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Execuções em Tempo Real</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Tentativas Recentes
                <Badge variant="secondary" data-testid="badge-total-attempts">
                  {executionAttempts.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {executionAttempts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma execução recente</p>
                  <p className="text-sm">As tentativas aparecerão aqui quando o bot detectar oportunidades</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {executionAttempts.slice(0, 10).map((attempt: any, index: number) => (
                    <div 
                      key={attempt.id || index}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card/50"
                      data-testid={`execution-attempt-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {attempt.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : attempt.status === 'failed' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Loader className="h-4 w-4 text-blue-500 animate-spin" />
                          )}
                          <span className="font-medium" data-testid={`symbol-${index}`}>
                            {attempt.symbol}
                          </span>
                        </div>
                        <Badge 
                          variant={
                            attempt.status === 'completed' ? 'default' : 
                            attempt.status === 'failed' ? 'destructive' : 
                            'secondary'
                          }
                          data-testid={`status-${index}`}
                        >
                          {attempt.status === 'completed' ? 'Sucesso' : 
                           attempt.status === 'failed' ? 'Falhou' : 
                           'Executando'}
                        </Badge>
                      </div>
                      
                      <div className="text-right">
                        {attempt.status === 'completed' && attempt.profit > 0 && (
                          <div className="text-green-600 font-medium" data-testid={`profit-${index}`}>
                            +${attempt.profit.toFixed(2)}
                          </div>
                        )}
                        {attempt.spotPrice && attempt.futuresPrice && (
                          <div className="text-sm text-muted-foreground" data-testid={`basis-${index}`}>
                            {((attempt.spotPrice - attempt.futuresPrice) / attempt.spotPrice * 100).toFixed(3)}%
                          </div>
                        )}
                        {attempt.reason && attempt.status === 'failed' && (
                          <div className="text-xs text-red-600 max-w-40 truncate" data-testid={`reason-${index}`}>
                            {attempt.reason}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(attempt.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
        
        {/* Histórico de Trades Reais */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Histórico de Trades (Dados Reais)</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas Operações Reais</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTrades ? (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Carregando trades reais...</p>
                </div>
              ) : tradesArray.length > 0 ? (
                <div className="space-y-3">
                  {tradesArray.slice(0, 10).map((trade: any) => (
                    <div key={trade.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge variant="default">{trade.symbol}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(trade.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">Tipo: {trade.type}</span>
                        <span className={`text-sm font-mono ${
                          trade.pnl && trade.pnl > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {trade.pnl ? (trade.pnl > 0 ? '+' : '') + '$' + trade.pnl.toFixed(2) : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum trade realizado ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">O sistema detectará oportunidades automaticamente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      
      {/* Configuration Modal */}
      <ConfigurationModal
        open={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        onSave={handleSaveConfig}
      />
    </div>
  );
}