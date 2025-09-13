import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Play, Square, Settings, User, TrendingUp, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  name: string;
  token?: string;
}

interface UserStatus {
  user: {
    id: string;
    name: string;
    lastAccess: string;
  };
  bot: {
    enabled: boolean;
    executing: boolean;
    lastAnalysis: string;
  };
  trades: {
    today: number;
    total: number;
    active: number;
    profitToday: number;
    profitTotal: number;
  };
  limits: {
    maxTradeAmount: number;
    maxDailyTrades: number;
    remainingToday: number;
  };
}

export default function MultiuserDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [loginForm, setLoginForm] = useState({ userId: '', password: '' });
  const [configForm, setConfigForm] = useState({
    binanceApiKey: '',
    binanceSecretKey: '',
    maxTradeAmount: 100,
    riskLevel: 'medium'
  });

  const { toast } = useToast();

  // Load saved user data
  useEffect(() => {
    const savedUser = localStorage.getItem('adk_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      fetchUserStatus(userData.token);
    }
  }, []);

  // Auto-refresh status every 30s
  useEffect(() => {
    if (user?.token) {
      const interval = setInterval(() => {
        fetchUserStatus(user.token!);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall('/public/auth', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });

      const userData = {
        id: result.user.id,
        name: result.user.name,
        token: result.token,
      };

      setUser(userData);
      localStorage.setItem('adk_user', JSON.stringify(userData));
      
      toast({
        title: 'Login realizado!',
        description: `Bem-vindo, ${result.user.name}`,
      });

      // Fetch initial status
      await fetchUserStatus(result.token);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Erro no login',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStatus = async (token: string) => {
    try {
      const result = await apiCall('/user/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(result);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching status:', err);
      if (err.message.includes('Token')) {
        logout();
      }
    }
  };

  const handleBotAction = async (action: 'start' | 'stop') => {
    setIsLoading(true);
    try {
      await apiCall(`/user/${action}`, { method: 'POST' });
      
      toast({
        title: `Bot ${action === 'start' ? 'iniciado' : 'parado'}!`,
        description: `Bot ${action === 'start' ? 'ativado' : 'desativado'} com sucesso`,
      });

      // Refresh status
      if (user?.token) {
        await fetchUserStatus(user.token);
      }
    } catch (err: any) {
      toast({
        title: `Erro ao ${action === 'start' ? 'iniciar' : 'parar'} bot`,
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await apiCall('/user/config', {
        method: 'POST',
        body: JSON.stringify(configForm),
      });

      toast({
        title: 'Configuração salva!',
        description: 'API keys e configurações atualizadas',
      });

      // Refresh status
      if (user?.token) {
        await fetchUserStatus(user.token);
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar configuração',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setStatus(null);
    localStorage.removeItem('adk_user');
    toast({
      title: 'Logout realizado',
      description: 'Você foi desconectado',
    });
  };

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className=\"w-full max-w-md\">
          <CardHeader className=\"text-center\">
            <CardTitle className=\"text-2xl\">ADK Arbitragem</CardTitle>
            <CardDescription>Sistema Multiusuário de Arbitragem Spot-Futures</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className=\"space-y-4\">
              <div>
                <Label htmlFor=\"userId\">ID do Usuário</Label>
                <Input
                  id=\"userId\"
                  data-testid=\"input-user-id\"
                  value={loginForm.userId}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, userId: e.target.value }))}
                  placeholder=\"meu_usuario\"
                  required
                />
              </div>
              <div>
                <Label htmlFor=\"password\">Senha (opcional)</Label>
                <Input
                  id=\"password\"
                  type=\"password\"
                  data-testid=\"input-password\"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder=\"senha_opcional\"
                />
              </div>
              {error && (
                <Alert variant=\"destructive\">
                  <AlertCircle className=\"h-4 w-4\" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button 
                type=\"submit\" 
                className=\"w-full\" 
                disabled={isLoading}
                data-testid=\"button-login\"
              >
                {isLoading ? 'Entrando...' : 'Entrar / Registrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard screen
  return (
    <div className=\"min-h-screen bg-gray-50 p-4\">
      <div className=\"max-w-6xl mx-auto space-y-6\">
        {/* Header */}
        <div className=\"flex items-center justify-between\">
          <div>
            <h1 className=\"text-3xl font-bold\">ADK Arbitragem</h1>
            <p className=\"text-gray-600\">Bem-vindo, {user.name}</p>
          </div>
          <Button variant=\"outline\" onClick={logout} data-testid=\"button-logout\">
            <User className=\"h-4 w-4 mr-2\" />
            Sair
          </Button>
        </div>

        {/* Status Cards */}
        {status && (
          <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
            <Card>
              <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
                <CardTitle className=\"text-sm font-medium\">Status do Bot</CardTitle>
                <Badge variant={status.bot.enabled ? 'default' : 'secondary'}>
                  {status.bot.enabled ? 'Ativo' : 'Inativo'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className=\"text-2xl font-bold\">
                  {status.bot.executing ? 'Executando' : 'Aguardando'}
                </div>
                <p className=\"text-xs text-muted-foreground\">
                  Última análise: {status.bot.lastAnalysis ? 
                    new Date(status.bot.lastAnalysis).toLocaleTimeString() : 'Nunca'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
                <CardTitle className=\"text-sm font-medium\">Trades Hoje</CardTitle>
                <TrendingUp className=\"h-4 w-4 text-muted-foreground\" />
              </CardHeader>
              <CardContent>
                <div className=\"text-2xl font-bold\">{status.trades.today}</div>
                <p className=\"text-xs text-muted-foreground\">
                  Restantes: {status.limits.remainingToday}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
                <CardTitle className=\"text-sm font-medium\">Lucro Hoje</CardTitle>
                <Wallet className=\"h-4 w-4 text-muted-foreground\" />
              </CardHeader>
              <CardContent>
                <div className=\"text-2xl font-bold text-green-600\">
                  ${status.trades.profitToday.toFixed(2)}
                </div>
                <p className=\"text-xs text-muted-foreground\">
                  Total: ${status.trades.profitTotal.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue=\"control\" className=\"space-y-4\">
          <TabsList>
            <TabsTrigger value=\"control\" data-testid=\"tab-control\">Controle</TabsTrigger>
            <TabsTrigger value=\"config\" data-testid=\"tab-config\">Configurações</TabsTrigger>
            <TabsTrigger value=\"trades\" data-testid=\"tab-trades\">Trades</TabsTrigger>
          </TabsList>

          {/* Control Tab */}
          <TabsContent value=\"control\">
            <Card>
              <CardHeader>
                <CardTitle>Controle do Bot</CardTitle>
                <CardDescription>
                  Gerencie a execução do seu bot de arbitragem
                </CardDescription>
              </CardHeader>
              <CardContent className=\"space-y-4\">
                <div className=\"flex space-x-4\">
                  <Button
                    onClick={() => handleBotAction('start')}
                    disabled={isLoading || (status?.bot.enabled ?? false)}
                    data-testid=\"button-start-bot\"
                  >
                    <Play className=\"h-4 w-4 mr-2\" />
                    Iniciar Bot
                  </Button>
                  <Button
                    variant=\"outline\"
                    onClick={() => handleBotAction('stop')}
                    disabled={isLoading || !(status?.bot.enabled ?? false)}
                    data-testid=\"button-stop-bot\"
                  >
                    <Square className=\"h-4 w-4 mr-2\" />
                    Parar Bot
                  </Button>
                </div>
                
                {status && (
                  <div className=\"space-y-2\">
                    <div className=\"flex justify-between\">
                      <span>Trades ativos:</span>
                      <span>{status.trades.active}</span>
                    </div>
                    <div className=\"flex justify-between\">
                      <span>Valor máximo por trade:</span>
                      <span>${status.limits.maxTradeAmount}</span>
                    </div>
                    <div className=\"flex justify-between\">
                      <span>Limite diário:</span>
                      <span>{status.limits.maxDailyTrades} trades</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value=\"config\">
            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
                <CardDescription>
                  Configure suas API keys e parâmetros de risco
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConfigSave} className=\"space-y-4\">
                  <div>
                    <Label htmlFor=\"apiKey\">Binance API Key</Label>
                    <Input
                      id=\"apiKey\"
                      data-testid=\"input-api-key\"
                      value={configForm.binanceApiKey}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, binanceApiKey: e.target.value }))}
                      placeholder=\"Sua API Key da Binance\"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor=\"secretKey\">Binance Secret Key</Label>
                    <Input
                      id=\"secretKey\"
                      type=\"password\"
                      data-testid=\"input-secret-key\"
                      value={configForm.binanceSecretKey}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, binanceSecretKey: e.target.value }))}
                      placeholder=\"Sua Secret Key da Binance\"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor=\"maxAmount\">Valor Máximo por Trade ($)</Label>
                    <Input
                      id=\"maxAmount\"
                      type=\"number\"
                      data-testid=\"input-max-amount\"
                      value={configForm.maxTradeAmount}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, maxTradeAmount: parseInt(e.target.value) }))}
                      min=\"10\"
                      max=\"10000\"
                    />
                  </div>
                  <Button type=\"submit\" disabled={isLoading} data-testid=\"button-save-config\">
                    <Settings className=\"h-4 w-4 mr-2\" />
                    {isLoading ? 'Salvando...' : 'Salvar Configuração'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value=\"trades\">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Trades</CardTitle>
                <CardDescription>
                  Visualize seus trades e performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {status?.trades.active.length ? (
                  <div className=\"space-y-2\">
                    {status.trades.active.map((trade: any, index: number) => (
                      <div key={index} className=\"border rounded p-3\">
                        <div className=\"flex justify-between\">
                          <span>{trade.symbol || 'N/A'}</span>
                          <Badge>{trade.status || 'Ativo'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className=\"text-center text-gray-500 py-8\">
                    Nenhum trade ativo no momento
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}