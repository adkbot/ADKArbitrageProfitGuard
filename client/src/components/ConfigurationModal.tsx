import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Settings, CheckCircle, AlertTriangle } from 'lucide-react';

interface ConfigData {
  // Exchange
  exchange: string;
  apiKey: string;
  apiSecret: string;
  
  // Deribit (pré-preenchido)
  deribitClientId: string;
  deribitApiKey: string;
  
  // Parâmetros
  pairs: string;
  basisEntry: string;
  basisExit: string;
  maxNotionalUsdt: string;
  maxDailyTrades: string;
  slippageK: string;
  fundingLookaheadH: string;
  wyckoffN: string;
  gexRefreshSec: string;
  arbitrageEnabled: boolean;
}

interface ConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: ConfigData) => void;
  currentConfig?: Partial<ConfigData>;
}

const defaultConfig: ConfigData = {
  exchange: 'binance',
  apiKey: '',
  apiSecret: '',
  deribitClientId: import.meta.env.VITE_DERIBIT_CLIENT_ID || '',
  deribitApiKey: import.meta.env.VITE_DERIBIT_API_KEY || '',
  pairs: 'BTC/USDT,ETH/USDT',
  basisEntry: '0.004',
  basisExit: '0.0015',
  maxNotionalUsdt: '500',
  maxDailyTrades: '10',
  slippageK: '0.0002',
  fundingLookaheadH: '8',
  wyckoffN: '50',
  gexRefreshSec: '120',
  arbitrageEnabled: true
};

export default function ConfigurationModal({ open, onOpenChange, onSave, currentConfig }: ConfigurationModalProps) {
  const [config, setConfig] = useState<ConfigData>({ ...defaultConfig, ...currentConfig });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
    console.log('Configuration saved:', config);
  };
  
  const testConnection = async () => {
    setConnectionStatus('testing');
    
    // Simulate API test
    setTimeout(() => {
      const success = config.apiKey.length > 10 && config.apiSecret.length > 10;
      setConnectionStatus(success ? 'success' : 'error');
      
      setTimeout(() => {
        if (connectionStatus !== 'testing') {
          setConnectionStatus('idle');
        }
      }, 3000);
    }, 2000);
  };
  
  const updateConfig = (field: keyof ConfigData, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="modal-configuration">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações do Sistema
          </DialogTitle>
          <DialogDescription>
            Configure as APIs, parâmetros de trading e filtros de entrada para o sistema de arbitragem.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="exchange" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="exchange">Exchange</TabsTrigger>
            <TabsTrigger value="deribit">Deribit/GEX</TabsTrigger>
            <TabsTrigger value="params">Parâmetros</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>
          
          <TabsContent value="exchange" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="exchange">Exchange</Label>
                <Select value={config.exchange} onValueChange={(value) => updateConfig('exchange', value)}>
                  <SelectTrigger data-testid="select-exchange">
                    <SelectValue placeholder="Selecione a exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="bybit">Bybit</SelectItem>
                    <SelectItem value="okx">OKX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  data-testid="input-api-key"
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => updateConfig('apiKey', e.target.value)}
                  placeholder="Sua API Key da exchange"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  data-testid="input-api-secret"
                  type="password"
                  value={config.apiSecret}
                  onChange={(e) => updateConfig('apiSecret', e.target.value)}
                  placeholder="Seu API Secret da exchange"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={testConnection}
                  disabled={connectionStatus === 'testing' || !config.apiKey || !config.apiSecret}
                  data-testid="button-test-connection"
                >
                  {connectionStatus === 'testing' && 'Testando...'}
                  {connectionStatus === 'idle' && 'Testar Conexão'}
                  {connectionStatus === 'success' && <><CheckCircle className="w-4 h-4 mr-1" />Conectado</>}
                  {connectionStatus === 'error' && <><AlertTriangle className="w-4 h-4 mr-1" />Erro</>}
                </Button>
                
                {connectionStatus === 'success' && (
                  <Badge variant="default">Conexão OK</Badge>
                )}
                {connectionStatus === 'error' && (
                  <Badge variant="destructive">Falha na conexão</Badge>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="deribit" className="space-y-4">
            <div className="grid gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Credenciais da API pública Deribit (GEX/Gamma) - configuradas automaticamente
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="deribitClientId">Deribit Client ID</Label>
                <Input
                  id="deribitClientId"
                  data-testid="input-deribit-client-id"
                  value={config.deribitClientId}
                  onChange={(e) => updateConfig('deribitClientId', e.target.value)}
                  placeholder="Configurado automaticamente"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="deribitApiKey">Deribit API Key</Label>
                <Input
                  id="deribitApiKey"
                  data-testid="input-deribit-api-key"
                  value={config.deribitApiKey}
                  onChange={(e) => updateConfig('deribitApiKey', e.target.value)}
                  placeholder="Configurado automaticamente"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="params" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="pairs">Pares de Trading</Label>
                <Input
                  id="pairs"
                  data-testid="input-pairs"
                  value={config.pairs}
                  onChange={(e) => updateConfig('pairs', e.target.value)}
                  placeholder="BTC/USDT,ETH/USDT"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="basisEntry">Base de Entrada (%)</Label>
                <Input
                  id="basisEntry"
                  data-testid="input-basis-entry"
                  value={config.basisEntry}
                  onChange={(e) => updateConfig('basisEntry', e.target.value)}
                  placeholder="0.004"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="basisExit">Base de Saída (%)</Label>
                <Input
                  id="basisExit"
                  data-testid="input-basis-exit"
                  value={config.basisExit}
                  onChange={(e) => updateConfig('basisExit', e.target.value)}
                  placeholder="0.0015"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="maxNotionalUsdt">Máx. Notional (USDT)</Label>
                <Input
                  id="maxNotionalUsdt"
                  data-testid="input-max-notional"
                  value={config.maxNotionalUsdt}
                  onChange={(e) => updateConfig('maxNotionalUsdt', e.target.value)}
                  placeholder="500"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="maxDailyTrades">Máx. Trades/Dia</Label>
                <Input
                  id="maxDailyTrades"
                  data-testid="input-max-daily-trades"
                  value={config.maxDailyTrades}
                  onChange={(e) => updateConfig('maxDailyTrades', e.target.value)}
                  placeholder="10"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="slippageK">Slippage (%)</Label>
                <Input
                  id="slippageK"
                  data-testid="input-slippage"
                  value={config.slippageK}
                  onChange={(e) => updateConfig('slippageK', e.target.value)}
                  placeholder="0.0002"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="fundingLookaheadH">Funding Lookahead (h)</Label>
                <Input
                  id="fundingLookaheadH"
                  data-testid="input-funding-lookahead"
                  value={config.fundingLookaheadH}
                  onChange={(e) => updateConfig('fundingLookaheadH', e.target.value)}
                  placeholder="8"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="wyckoffN">Wyckoff N</Label>
                <Input
                  id="wyckoffN"
                  data-testid="input-wyckoff-n"
                  value={config.wyckoffN}
                  onChange={(e) => updateConfig('wyckoffN', e.target.value)}
                  placeholder="50"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="gexRefreshSec">GEX Refresh (s)</Label>
                <Input
                  id="gexRefreshSec"
                  data-testid="input-gex-refresh"
                  value={config.gexRefreshSec}
                  onChange={(e) => updateConfig('gexRefreshSec', e.target.value)}
                  placeholder="120"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="arbitrageEnabled"
                  data-testid="switch-arbitrage-enabled"
                  checked={config.arbitrageEnabled}
                  onCheckedChange={(checked) => updateConfig('arbitrageEnabled', checked)}
                />
                <Label htmlFor="arbitrageEnabled">Arbitragem Habilitada</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} data-testid="button-save-config">
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}