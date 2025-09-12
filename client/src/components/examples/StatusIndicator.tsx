import { useState, useEffect } from 'react';
import StatusIndicator from '../StatusIndicator';
import { Button } from '@/components/ui/button';

export default function StatusIndicatorExample() {
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED'>('IDLE');
  
  const statuses: Array<'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED'> = ['IDLE', 'RUNNING', 'PAUSED', 'STOPPED'];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => {
        const currentIndex = statuses.indexOf(prev);
        const nextIndex = (currentIndex + 1) % statuses.length;
        return statuses[nextIndex];
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="p-6 space-y-4">
      <StatusIndicator status={status} />
      <div className="space-y-2">
        {statuses.map(s => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            onClick={() => setStatus(s)}
            className={status === s ? 'bg-accent' : ''}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}