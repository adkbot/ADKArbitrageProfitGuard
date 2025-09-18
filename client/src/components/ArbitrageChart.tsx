import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { LineChart, BarChart3, Activity, TrendingUp, Radio } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type ChartType = 'basis' | 'funding' | 'wyckoff' | 'gex' | 'pnl';

interface ArbitrageChartProps {
  type: ChartType;
  title: string;
  data: number[];
  labels: string[];
  className?: string;
  isLive?: boolean;
  lastUpdate?: string;
  streamValue?: number; // Single scalar value for time series (optional)
}

const chartConfigs = {
  basis: {
    color: 'rgb(59, 130, 246)',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    icon: <BarChart3 className="w-4 h-4" />,
    unit: '%'
  },
  funding: {
    color: 'rgb(16, 185, 129)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    icon: <Activity className="w-4 h-4" />,
    unit: '%'
  },
  wyckoff: {
    color: 'rgb(245, 158, 11)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: ''
  },
  gex: {
    color: 'rgb(139, 92, 246)',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    icon: <LineChart className="w-4 h-4" />,
    unit: ''
  },
  pnl: {
    color: 'rgb(34, 197, 94)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: '$'
  }
};

export default function ArbitrageChart({ type, title, data, labels, className, isLive = true, lastUpdate, streamValue }: ArbitrageChartProps) {
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d'>('1h');
  const [historicalData, setHistoricalData] = useState<number[][]>([]);
  const [historicalLabels, setHistoricalLabels] = useState<string[][]>([]);
  const chartRef = useRef<any>(null);
  const config = chartConfigs[type];
  
  // 🔥 SISTEMA DE HISTÓRICO TEMPORAL PARA GRÁFICOS DINÂMICOS
  useEffect(() => {
    if (data.length > 0 || streamValue !== undefined) {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      // Calculate current value: use streamValue if provided, else aggregate data
      const currentValue = streamValue !== undefined 
        ? streamValue
        : data.length > 0 
          ? data.reduce((sum, val) => sum + val, 0) / data.length // Average of data array
          : 0;
      
      setHistoricalData(prev => {
        const newHistory = [...prev];
        // Only use real data - no simulation/initialization
        const currentData = [...(newHistory[0] || [])];
        if (currentValue !== undefined && currentValue !== 0) {
          currentData.push(currentValue);
          if (currentData.length > 20) currentData.shift();
          newHistory[0] = currentData;
        }
        return newHistory;
      });
      
      setHistoricalLabels(prev => {
        const newHistory = [...prev];
        // Only use real timestamps - no simulation
        const currentLabels = [...(newHistory[0] || [])];
        if (currentValue !== undefined && currentValue !== 0) {
          currentLabels.push(currentTime);
          if (currentLabels.length > 20) currentLabels.shift();
          newHistory[0] = currentLabels;
        }
        return newHistory;
      });
    }
  }, [data, streamValue]);
  
  // Usar dados históricos temporais para criar gráfico dinâmico
  const currentData = historicalData[0] || data;
  const currentLabels = historicalLabels[0] || labels;
  
  const chartData = {
    labels: currentLabels,
    datasets: [
      {
        label: title,
        data: currentData,
        borderColor: config.color,
        backgroundColor: config.backgroundColor,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: config.color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      }
    ]
  };
  
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'hsl(var(--popover))',
        titleColor: 'hsl(var(--popover-foreground))',
        bodyColor: 'hsl(var(--popover-foreground))',
        borderColor: config.color,
        borderWidth: 2,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${title}: ${context.parsed.y.toFixed(4)}${config.unit}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          color: 'hsl(var(--border) / 0.2)',
          lineWidth: 1
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          maxTicksLimit: 8,
          font: {
            size: 11,
            family: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
          }
        }
      },
      y: {
        display: true,
        grid: {
          color: 'hsl(var(--border) / 0.4)',
          display: true,
          lineWidth: 1
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          font: {
            size: 11,
            family: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
          },
          callback: function(value) {
            const num = typeof value === 'number' ? value : 0;
            return `${num.toFixed(4)}${config.unit}`;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };
  
  const currentValue = currentData[currentData.length - 1] || 0;
  const previousValue = currentData[currentData.length - 2] || 0;
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? ((change / previousValue) * 100) : 0;
  
  return (
    <Card className={`${className} hover-elevate`} data-testid={`chart-${type}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          {config.icon}
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          {isLive && (
            <div className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-destructive animate-pulse" />
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                LIVE
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold text-foreground">
              {currentValue.toFixed(type === 'pnl' ? 2 : 4)}{config.unit}
            </span>
            {change !== 0 && (
              <Badge variant={change > 0 ? 'default' : 'destructive'} className="text-xs">
                {change > 0 ? '+' : ''}{changePercent.toFixed(2)}%
              </Badge>
            )}
          </div>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground font-mono">
              Última: {lastUpdate}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 mb-4">
          {(['1h', '4h', '1d'] as const).map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe(tf)}
              data-testid={`timeframe-${tf}`}
            >
              {tf}
            </Button>
          ))}
        </div>
        <div className="h-64 w-full">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}