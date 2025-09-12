import { useState } from 'react';
import BotControlButtons from '@/components/BotControlButtons';
import StatusIndicator from '@/components/StatusIndicator';
import DashboardMetrics from '@/components/DashboardMetrics';
import ArbitrageChart from '@/components/ArbitrageChart';
import ConfigurationModal from '@/components/ConfigurationModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Percent, Clock, Activity, TrendingUp, BarChart3 } from 'lucide-react';

type BotStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';

export default function HomePage() {
  const [botStatus, setBotStatus] = useState<BotStatus>('IDLE');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Mock data for dashboard
  const [metrics] = useState([
    {
      id: 'total-pnl',
      title: 'P&L Total',
      value: '$2,847.50',
      change: 12.5,
      changeType: 'positive' as const,
      icon: <DollarSign className="w-4 h-4" />,
      description: 'hoje'
    },
    {
      id: 'basis-pct',
      title: 'Base Atual',
      value: '0.0045%',
      change: -0.2,
      changeType: 'negative' as const,
      icon: <Percent className="w-4 h-4" />,
      description: 'vs média'
    },
    {
      id: 'active-trades',
      title: 'Trades Ativos',
      value: 3,
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'daily-trades',
      title: 'Trades Hoje',
      value: 8,
      change: 20,
      changeType: 'positive' as const,
      icon: <BarChart3 className="w-4 h-4" />,
      description: 'vs ontem'
    },
    {
      id: 'funding-rate',
      title: 'Funding Rate',
      value: '0.0012%',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'wyckoff-score',
      title: 'Wyckoff Score',
      value: '0.65',
      change: 5.2,
      changeType: 'positive' as const,
      icon: <TrendingUp className="w-4 h-4" />,
    }
  ]);
  
  // Mock chart data
  const generateChartData = (baseValue: number, count: number = 24) => {
    const data: number[] = [];
    const labels: string[] = [];
    const now = new Date();
    
    for (let i = count - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      
      const value = baseValue + Math.sin(i / 4) * (baseValue * 0.1) + (Math.random() - 0.5) * (baseValue * 0.05);
      data.push(Math.max(0, value));
    }
    
    return { data, labels };
  };
  
  const basisChart = generateChartData(0.004);
  const fundingChart = generateChartData(0.0012);
  const wyckoffChart = generateChartData(0.65);
  const gexChart = generateChartData(0.15);
  
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
        {/* Metrics Dashboard */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Métricas em Tempo Real</h2>
          <DashboardMetrics metrics={metrics} />
        </section>
        
        {/* Charts Grid */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Análises e Gráficos</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <ArbitrageChart
              type="basis"
              title="Base Spot-Futuros"
              data={basisChart.data}
              labels={basisChart.labels}
            />
            
            <ArbitrageChart
              type="funding"
              title="Funding Rate"
              data={fundingChart.data}
              labels={fundingChart.labels}
            />
            
            <ArbitrageChart
              type="wyckoff"
              title="Wyckoff Score"
              data={wyckoffChart.data}
              labels={wyckoffChart.labels}
            />
            
            <ArbitrageChart
              type="gex"
              title="GEX/Gamma"
              data={gexChart.data}
              labels={gexChart.labels}
            />
          </div>
        </section>
        
        {/* Trade Log */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Histórico de Trades</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas Operações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Mock trade entries */}
                <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="default">BTC/USDT</Badge>
                    <span className="text-sm text-muted-foreground">14:23:45</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">Base: 0.0042%</span>
                    <span className="text-sm font-mono text-green-500">+$24.50</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="default">ETH/USDT</Badge>
                    <span className="text-sm text-muted-foreground">13:45:12</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">Base: 0.0038%</span>
                    <span className="text-sm font-mono text-green-500">+$18.75</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="default">BTC/USDT</Badge>
                    <span className="text-sm text-muted-foreground">12:56:30</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">Base: 0.0041%</span>
                    <span className="text-sm font-mono text-green-500">+$31.20</span>
                  </div>
                </div>
              </div>
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