
"use client"

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import BotControlButtons from '@/components/bot-control-buttons'
import StatusIndicator from '@/components/status-indicator'
import ArbitrageChart from '@/components/arbitrage-chart'
import DashboardMetrics from '@/components/dashboard-metrics'
import { ThemeToggle } from '@/components/theme-toggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { DollarSign, Percent, Clock, Activity, TrendingUp, BarChart3, RefreshCw, Zap, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import type { BotStatus } from '@/types'

export default function HomePage() {
  const [botStatus, setBotStatus] = useState<BotStatus>('IDLE')
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [lastNotifiedAttemptId, setLastNotifiedAttemptId] = useState<string | null>(null)
  const { toast } = useToast()
  
  // Buscar oportunidades de arbitragem
  const { data: opportunities = [], isLoading: loadingOpportunities, refetch: refetchOpportunities } = useQuery({
    queryKey: ['/api/arbitrage/opportunities'],
    refetchInterval: 5000,
    staleTime: 2000,
  })

  // Buscar status do bot
  const { data: botData = {}, isLoading: loadingBot } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 3000,
    staleTime: 1000,
  })

  // Buscar trades
  const { data: trades = [], isLoading: loadingTrades } = useQuery({
    queryKey: ['/api/trades'],
    refetchInterval: 10000,
    staleTime: 5000,
  })

  // Buscar tentativas de execução
  const { data: executionData = {}, isLoading: loadingExecutions } = useQuery({
    queryKey: ['/api/execution/attempts'],
    refetchInterval: 2000,
    staleTime: 1000,
  })

  // Buscar saldos das carteiras
  const { data: balanceData = {}, isLoading: loadingBalance } = useQuery({
    queryKey: ['/api/exchange/balance'],
    refetchInterval: 10000,
    staleTime: 5000,
  })

  // Processamento de dados
  const opportunitiesArray = Array.isArray(opportunities) ? opportunities : []
  const tradesArray = Array.isArray(trades) ? trades : []
  const botDataTyped = (botData as any) || {}
  const executionAttempts = ((executionData as any)?.attempts) || []
  const balanceDataTyped = (balanceData as any) || {}

  // Sistema de notificações
  useEffect(() => {
    if (executionAttempts?.length > 0) {
      const latestAttempt = executionAttempts[0]
      
      if (latestAttempt?.id && latestAttempt.id !== lastNotifiedAttemptId) {
        const { status, symbol, spotPrice, futuresPrice, profit, reason } = latestAttempt
        
        if (status === 'completed' && profit > 0) {
          toast({
            title: "✅ Trade Executado!",
            description: `${symbol}: Lucro de $${profit?.toFixed?.(2) ?? profit} (${(((spotPrice - futuresPrice) / spotPrice * 100)?.toFixed?.(3) ?? 0)}%)`,
          })
        } else if (status === 'failed' && reason) {
          const shortReason = reason?.length > 50 ? reason.substring(0, 50) + "..." : reason
          toast({
            title: "⚠️ Execução Falhou",
            description: `${symbol}: ${shortReason}`,
            variant: "destructive",
          })
        } else if (status === 'executing') {
          toast({
            title: "🔄 Executando Trade",
            description: `${symbol}: Basis ${(((spotPrice - futuresPrice) / spotPrice * 100)?.toFixed?.(3) ?? 0)}%`,
          })
        }
        
        setLastNotifiedAttemptId(latestAttempt.id)
      }
    }
  }, [executionAttempts, lastNotifiedAttemptId, toast])
  
  // Processamento de saldos
  const spotBalance = balanceDataTyped?.spot?.USDT?.available ?? 0
  const futuresBalance = balanceDataTyped?.futures?.USDT?.available ?? 0
  const totalBalance = spotBalance + futuresBalance
  const balanceError = !balanceDataTyped?.success

  const topOpportunities = opportunitiesArray
    ?.filter?.((opp: any) => opp?.symbol)
    ?.sort?.((a: any, b: any) => Math.abs(b?.basisPercent ?? 0) - Math.abs(a?.basisPercent ?? 0))
    ?.slice?.(0, 30) ?? []

  const currentAnalyzingPair = topOpportunities?.[0]?.symbol ?? 'Analisando...'
  const avgBasis = topOpportunities?.length > 0 
    ? topOpportunities.reduce((sum: number, opp: any) => sum + Math.abs(opp?.basisPercent ?? 0), 0) / topOpportunities.length
    : 0

  // Métricas do dashboard
  const metrics = [
    {
      id: 'total-profit',
      title: 'Lucro Total',
      value: `$${(botDataTyped?.totalProfit ?? 0)?.toFixed?.(2) ?? '0.00'}`,
      change: 5.2,
      changeType: 'positive' as const,
      icon: <DollarSign className="w-4 h-4" />,
      description: 'últimas 24h'
    },
    {
      id: 'success-rate',
      title: 'Taxa de Sucesso',
      value: `${(botDataTyped?.successRate ?? 85)?.toFixed?.(1) ?? '85.0'}%`,
      change: 2.1,
      changeType: 'positive' as const,
      icon: <Percent className="w-4 h-4" />,
      description: 'últimas 50 operações'
    },
    {
      id: 'active-trades',
      title: 'Trades Ativos',
      value: botDataTyped?.activeTrades ?? 0,
      change: 0,
      changeType: 'neutral' as const,
      icon: <Activity className="w-4 h-4" />,
      description: 'em execução'
    },
    {
      id: 'avg-basis',
      title: 'Basis Média',
      value: `${avgBasis?.toFixed?.(3) ?? '0.000'}%`,
      change: 0.5,
      changeType: 'positive' as const,
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'top 30 pares'
    },
  ]

  // Handlers para controle do bot
  const handleStart = async () => {
    try {
      await fetch('/api/bot/start', { method: 'POST' })
      setBotStatus('RUNNING')
      toast({ title: "✅ Bot Iniciado", description: "Sistema de arbitragem ativado" })
    } catch (error) {
      toast({ title: "❌ Erro", description: "Falha ao iniciar o bot", variant: "destructive" })
    }
  }

  const handlePause = async () => {
    try {
      await fetch('/api/bot/pause', { method: 'POST' })
      setBotStatus('PAUSED')
      toast({ title: "⏸️ Bot Pausado", description: "Sistema pausado temporariamente" })
    } catch (error) {
      toast({ title: "❌ Erro", description: "Falha ao pausar o bot", variant: "destructive" })
    }
  }

  const handleStop = async () => {
    try {
      await fetch('/api/bot/stop', { method: 'POST' })
      setBotStatus('STOPPED')
      toast({ title: "⏹️ Bot Parado", description: "Sistema de arbitragem desativado" })
    } catch (error) {
      toast({ title: "❌ Erro", description: "Falha ao parar o bot", variant: "destructive" })
    }
  }

  const handleSettings = () => {
    setIsConfigOpen(true)
  }

  // Dados para gráficos
  const basisData = topOpportunities?.map?.((opp: any) => Math.abs(opp?.basisPercent ?? 0)) ?? []
  const basisLabels = topOpportunities?.map?.((opp: any) => opp?.symbol ?? '') ?? []

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ADK Arbitrage Profit Guard
          </h1>
          <p className="text-muted-foreground mt-1">
            Sistema avançado de arbitragem Spot↔Futuros em tempo real
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatusIndicator status={botStatus} />
          <ThemeToggle />
        </div>
      </div>

      {/* Métricas do Dashboard */}
      <div className="mb-8">
        <DashboardMetrics metrics={metrics} />
      </div>

      {/* Controles do Bot */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Controle do Bot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <BotControlButtons
              status={botStatus}
              onStart={handleStart}
              onPause={handlePause}
              onStop={handleStop}
              onSettings={handleSettings}
            />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Analisando: {currentAnalyzingPair}
              </div>
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                {topOpportunities?.length ?? 0} oportunidades
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <ArbitrageChart
          type="basis"
          title="Basis Real-Time"
          data={basisData}
          labels={basisLabels}
          isLive={true}
          streamValue={avgBasis}
        />
        <ArbitrageChart
          type="pnl"
          title="P&L Acumulado"
          data={[botDataTyped?.totalProfit ?? 0]}
          labels={['Agora']}
          isLive={true}
        />
      </div>

      {/* Oportunidades de Arbitragem */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top Oportunidades de Arbitragem
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchOpportunities()}
            disabled={loadingOpportunities}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingOpportunities ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loadingOpportunities ? (
              <div className="text-center py-8">
                <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Carregando oportunidades...</p>
              </div>
            ) : topOpportunities?.length > 0 ? (
              topOpportunities?.slice?.(0, 10)?.map?.((opp: any, index: number) => (
                <div key={opp?.symbol ?? index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-mono font-medium">{opp?.symbol}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Spot: ${opp?.spotPrice?.toFixed?.(4) ?? 'N/A'}</span>
                    <span>Futures: ${opp?.futuresPrice?.toFixed?.(4) ?? 'N/A'}</span>
                    <Badge 
                      variant={Math.abs(opp?.basisPercent ?? 0) > 0.1 ? 'default' : 'secondary'}
                      className="font-mono"
                    >
                      {opp?.basisPercent > 0 ? '+' : ''}{opp?.basisPercent?.toFixed?.(3) ?? '0.000'}%
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                <p>Nenhuma oportunidade encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
