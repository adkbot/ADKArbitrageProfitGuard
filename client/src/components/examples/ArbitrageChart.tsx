import { useState, useEffect } from 'react';
import ArbitrageChart from '../ArbitrageChart';

export default function ArbitrageChartExample() {
  const [basisData, setBasisData] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  
  // Generate realistic basis data
  useEffect(() => {
    const generateData = () => {
      const newLabels: string[] = [];
      const newData: number[] = [];
      const now = new Date();
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        newLabels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        
        // Generate realistic basis percentage (usually small positive values)
        const baseValue = 0.004 + Math.sin(i / 4) * 0.002;
        const noise = (Math.random() - 0.5) * 0.001;
        newData.push(baseValue + noise);
      }
      
      setLabels(newLabels);
      setBasisData(newData);
    };
    
    generateData();
    
    // Update data every 30 seconds
    const interval = setInterval(() => {
      setBasisData(prev => {
        const newData = [...prev.slice(1)];
        const lastValue = prev[prev.length - 1];
        const change = (Math.random() - 0.5) * 0.0005;
        newData.push(Math.max(0.001, lastValue + change));
        return newData;
      });
      
      setLabels(prev => {
        const newLabels = [...prev.slice(1)];
        const now = new Date();
        newLabels.push(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        return newLabels;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (basisData.length === 0) {
    return <div className="p-6">Carregando gráfico...</div>;
  }
  
  return (
    <div className="p-6">
      <ArbitrageChart
        type="basis"
        title="Base Spot-Futuros"
        data={basisData}
        labels={labels}
      />
    </div>
  );
}