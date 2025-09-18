import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Percent, Clock, Activity } from 'lucide-react';

interface MetricData {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  description?: string;
}

interface DashboardMetricsProps {
  metrics: MetricData[];
}

function MetricCard({ metric }: { metric: MetricData }) {
  const { title, value, change, changeType, icon, description } = metric;
  
  return (
    <Card data-testid={`metric-${metric.id}`} className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono" data-testid={`value-${metric.id}`}>
          {value}
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {changeType === 'positive' && <TrendingUp className="w-3 h-3 text-green-500" />}
            {changeType === 'negative' && <TrendingDown className="w-3 h-3 text-red-500" />}
            <span className={changeType === 'positive' ? 'text-green-500' : changeType === 'negative' ? 'text-red-500' : ''}>
              {change > 0 ? '+' : ''}{change}%
            </span>
            {description && <span className="ml-1">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}