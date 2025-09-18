
"use client"

import { Button } from '@/components/ui/button'
import { Play, Pause, Square, Settings } from 'lucide-react'
import type { BotStatus } from '@/types'

interface BotControlButtonsProps {
  status: BotStatus
  onStart: () => void
  onPause: () => void
  onStop: () => void
  onSettings: () => void
}

export default function BotControlButtons({
  status,
  onStart,
  onPause,
  onStop,
  onSettings
}: BotControlButtonsProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          data-testid="button-start"
          onClick={onStart}
          disabled={status === 'RUNNING'}
          variant={status === 'RUNNING' ? 'secondary' : 'default'}
          size="default"
        >
          <Play className="w-4 h-4 mr-2" />
          Iniciar
        </Button>
        
        <Button
          data-testid="button-pause"
          onClick={onPause}
          disabled={status !== 'RUNNING'}
          variant="outline"
          size="default"
        >
          <Pause className="w-4 h-4 mr-2" />
          Pausar
        </Button>
        
        <Button
          data-testid="button-stop"
          onClick={onStop}
          disabled={status === 'IDLE' || status === 'STOPPED'}
          variant="destructive"
          size="default"
        >
          <Square className="w-4 h-4 mr-2" />
          Parar
        </Button>
      </div>
      
      <div className="border-l h-8" />
      
      <Button
        data-testid="button-settings"
        onClick={onSettings}
        variant="outline"
        size="icon"
      >
        <Settings className="w-4 h-4" />
      </Button>
    </div>
  )
}
