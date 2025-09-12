import { useState } from 'react';
import BotControlButtons from '../BotControlButtons';

export default function BotControlButtonsExample() {
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED'>('IDLE');
  
  const handleStart = () => {
    console.log('Bot started');
    setStatus('RUNNING');
  };
  
  const handlePause = () => {
    console.log('Bot paused');
    setStatus('PAUSED');
  };
  
  const handleStop = () => {
    console.log('Bot stopped');
    setStatus('STOPPED');
  };
  
  const handleSettings = () => {
    console.log('Settings modal opened');
  };
  
  return (
    <div className="p-6">
      <BotControlButtons
        status={status}
        onStart={handleStart}
        onPause={handlePause}
        onStop={handleStop}
        onSettings={handleSettings}
      />
      <p className="mt-4 text-sm text-muted-foreground">Status atual: {status}</p>
    </div>
  );
}