import { useState, useEffect } from 'react';
import DashboardMetrics from '../DashboardMetrics';
import { DollarSign, Percent, Clock, Activity, TrendingUp, BarChart3 } from 'lucide-react';

export default function DashboardMetricsExample() {
  const [metrics, setMetrics] = useState([
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
  
  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => {
        if (metric.id === 'total-pnl') {
          const currentValue = typeof metric.value === 'string' ? parseFloat(metric.value.replace('$', '').replace(',', '')) : Number(metric.value);
          const newValue = currentValue + (Math.random() - 0.5) * 50;
          return {
            ...metric,
            value: `$${newValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          };
        }
        if (metric.id === 'basis-pct') {
          const newBasis = (Math.random() * 0.01).toFixed(4);
          return {
            ...metric,
            value: `${newBasis}%`
          };
        }
        return metric;
      }));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="p-6">
      <DashboardMetrics metrics={metrics} />
    </div>
  );
}