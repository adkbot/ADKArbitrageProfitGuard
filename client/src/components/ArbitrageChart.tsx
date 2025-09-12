import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, BarChart3, Activity, TrendingUp } from 'lucide-react';
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

export default function ArbitrageChart({ type, title, data, labels, className }: ArbitrageChartProps) {
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d'>('1h');
  const config = chartConfigs[type];
  
  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data,
        borderColor: config.color,
        backgroundColor: config.backgroundColor,
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4
      }
    ]
  };
  
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: config.color,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          color: 'hsl(var(--foreground) / 0.7)',
          maxTicksLimit: 6,
          font: {
            size: 12
          }
        }
      },
      y: {
        display: true,
        grid: {
          color: 'hsl(var(--border) / 0.3)',
          display: true,
          lineWidth: 1
        },
        ticks: {
          color: 'hsl(var(--foreground) / 0.7)',
          font: {
            size: 12
          },
          callback: function(value) {
            return `${value}${config.unit}`;
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
  
  const currentValue = data[data.length - 1] || 0;
  const previousValue = data[data.length - 2] || 0;
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? ((change / previousValue) * 100) : 0;
  
  return (
    <Card className={`${className} hover-elevate`} data-testid={`chart-${type}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          {config.icon}
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-right">
            <span className="text-2xl font-mono font-bold">
              {currentValue.toFixed(type === 'pnl' ? 2 : 4)}{config.unit}
            </span>
            {change !== 0 && (
              <Badge variant={change > 0 ? 'default' : 'destructive'} className="text-xs">
                {change > 0 ? '+' : ''}{changePercent.toFixed(2)}%
              </Badge>
            )}
          </div>
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