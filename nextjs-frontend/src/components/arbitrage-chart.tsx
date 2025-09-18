
"use client"

import { useRef, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LineChart, BarChart3, Activity, TrendingUp, Radio } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import for Chart.js to avoid SSR issues
const Line = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Line),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded" /> }
)

type ChartType = 'basis' | 'funding' | 'wyckoff' | 'gex' | 'pnl'

interface ArbitrageChartProps {
  type: ChartType
  title: string
  data: number[]
  labels: string[]
  className?: string
  isLive?: boolean
  lastUpdate?: string
  streamValue?: number
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
}

export default function ArbitrageChart({ 
  type, 
  title, 
  data = [], 
  labels = [], 
  className, 
  isLive = true, 
  lastUpdate, 
  streamValue 
}: ArbitrageChartProps) {
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d'>('1h')
  const [historicalData, setHistoricalData] = useState<number[][]>([])
  const [historicalLabels, setHistoricalLabels] = useState<string[][]>([])
  
  const config = chartConfigs[type] || chartConfigs.basis

  useEffect(() => {
    if (data?.length > 0 || streamValue !== undefined) {
      const now = new Date()
      const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      
      const currentValue = streamValue !== undefined 
        ? streamValue
        : data?.length > 0 
          ? data.reduce((sum, val) => sum + val, 0) / data.length
          : 0

      setHistoricalData(prev => {
        const newHistory = [...prev]
        const currentData = [...(newHistory[0] || [])]
        
        currentData.push(currentValue)
        
        // Manter apenas os últimos 50 pontos
        if (currentData.length > 50) {
          currentData.shift()
        }
        
        newHistory[0] = currentData
        return newHistory
      })

      setHistoricalLabels(prev => {
        const newHistory = [...prev]
        const currentLabels = [...(newHistory[0] || [])]
        
        currentLabels.push(currentTime)
        
        if (currentLabels.length > 50) {
          currentLabels.shift()
        }
        
        newHistory[0] = currentLabels
        return newHistory
      })
    }
  }, [data, streamValue])

  const chartData = {
    labels: historicalLabels[0] || labels || [],
    datasets: [
      {
        label: title,
        data: historicalData[0] || data || [],
        borderColor: config?.color || 'rgb(59, 130, 246)',
        backgroundColor: config?.backgroundColor || 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const value = context?.parsed?.y ?? 0
            return `${title}: ${value?.toFixed?.(4) ?? value}${config?.unit ?? ''}`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 10,
          font: {
            size: 10,
          },
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 10,
          },
          callback: function(value: any) {
            return `${value}${config?.unit ?? ''}`
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }

  const currentValue = historicalData[0]?.slice(-1)?.[0] ?? data?.[data?.length - 1] ?? 0
  const previousValue = historicalData[0]?.slice(-2, -1)?.[0] ?? 0
  const change = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue) * 100) : 0

  return (
    <Card className={`card-hover ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {config?.icon}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {isLive && <Badge variant="secondary" className="status-pulse">Live</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-mono font-bold">
            {currentValue?.toFixed?.(4) ?? currentValue}{config?.unit}
          </span>
          {Math.abs(change) > 0.01 && (
            <span className={`text-xs ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change > 0 ? '+' : ''}{change?.toFixed?.(2) ?? change}%
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <Line data={chartData} options={options} />
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1">
            {(['1h', '4h', '1d'] as const).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeframe(tf)}
                className="h-6 px-2 text-xs"
              >
                {tf}
              </Button>
            ))}
          </div>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              {lastUpdate}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
