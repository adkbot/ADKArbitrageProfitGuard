import { Badge } from '../components/ui/badge';
import { Dot } from 'lucide-react';

type BotStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';

interface StatusIndicatorProps {
  status: BotStatus;
  className?: string;
}

const statusConfig = {
  IDLE: {
    label: 'Inativo',
    color: 'bg-gray-500',
    variant: 'secondary' as const
  },
  RUNNING: {
    label: 'Executando',
    color: 'bg-green-500',
    variant: 'default' as const
  },
  PAUSED: {
    label: 'Pausado',
    color: 'bg-yellow-500',
    variant: 'outline' as const
  },
  STOPPED: {
    label: 'Parado',
    color: 'bg-red-500',
    variant: 'destructive' as const
  }
};

export default function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const config = statusConfig[status];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color} ${status === 'RUNNING' ? 'animate-pulse' : ''}`} />
        <Badge variant={config.variant} data-testid={`status-${status.toLowerCase()}`}>
          {config.label}
        </Badge>
      </div>
    </div>
  );
}