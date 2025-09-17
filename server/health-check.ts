
// 🏥 COMPREHENSIVE HEALTH CHECK SYSTEM FOR RENDER.COM
import { testProxyConnectivity, getProxyStatus } from './proxy';
import { testGeoBypass, getGeoBypassStatus } from './geo-bypass';
import { performExchangeHealthCheck, getRenderDeploymentStatus } from './exchange-render';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    proxy: any;
    geoBypass: any;
    exchanges: any;
    database: any;
    render: any;
  };
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

let startTime = Date.now();

/**
 * 🏥 COMPREHENSIVE HEALTH CHECK
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  console.log('🏥 Starting comprehensive health check...');
  
  const timestamp = new Date().toISOString();
  const uptime = Date.now() - startTime;
  
  // Test all systems
  const [proxyTest, geoBypassTest, exchangeTest] = await Promise.allSettled([
    testProxyConnectivity(),
    testGeoBypass(),
    performExchangeHealthCheck()
  ]);
  
  // Collect results
  const services = {
    proxy: {
      status: proxyTest.status === 'fulfilled' && proxyTest.value.proxy ? 'healthy' : 'degraded',
      details: proxyTest.status === 'fulfilled' ? proxyTest.value : { error: (proxyTest as any).reason?.message },
      config: getProxyStatus()
    },
    geoBypass: {
      status: geoBypassTest.status === 'fulfilled' && geoBypassTest.value.success ? 'healthy' : 'degraded',
      details: geoBypassTest.status === 'fulfilled' ? geoBypassTest.value : { error: (geoBypassTest as any).reason?.message },
      config: getGeoBypassStatus()
    },
    exchanges: {
      status: exchangeTest.status === 'fulfilled' && exchangeTest.value.overall ? 'healthy' : 'unhealthy',
      details: exchangeTest.status === 'fulfilled' ? exchangeTest.value : { error: (exchangeTest as any).reason?.message }
    },
    database: {
      status: process.env.DATABASE_URL ? 'healthy' : 'degraded',
      details: {
        configured: !!process.env.DATABASE_URL,
        url: process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT_CONFIGURED]'
      }
    },
    render: {
      status: 'healthy',
      details: getRenderDeploymentStatus()
    }
  };
  
  // Determine overall status
  const serviceStatuses = Object.values(services).map(s => s.status);
  const unhealthyCount = serviceStatuses.filter(s => s === 'unhealthy').length;
  const degradedCount = serviceStatuses.filter(s => s === 'degraded').length;
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (unhealthyCount > 0) {
    overallStatus = 'unhealthy';
  } else if (degradedCount > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }
  
  // Performance metrics
  const performance = {
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  };
  
  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp,
    uptime,
    environment: process.env.NODE_ENV || 'development',
    services,
    performance
  };
  
  console.log(`🏥 Health check completed: ${overallStatus.toUpperCase()}`);
  
  return result;
}

/**
 * 🚨 QUICK HEALTH CHECK (for Render health endpoint)
 */
export async function quickHealthCheck(): Promise<{ status: string; timestamp: string }> {
  try {
    // Quick checks only
    const hasEnvVars = !!(process.env.NODE_ENV && process.env.PORT);
    const hasMemory = process.memoryUsage().heapUsed < 1024 * 1024 * 1024; // Less than 1GB
    
    const status = hasEnvVars && hasMemory ? 'healthy' : 'degraded';
    
    return {
      status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 📊 GET SYSTEM METRICS
 */
export function getSystemMetrics(): {
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  uptime: number;
  environment: Record<string, string>;
} {
  return {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: Date.now() - startTime,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      PORT: process.env.PORT || 'unknown',
      PROXY_ENABLED: process.env.PROXY_ENABLED || 'false',
      RENDER_REGION: process.env.RENDER_REGION || 'unknown'
    }
  };
}

/**
 * 🔄 RESET START TIME (for testing)
 */
export function resetStartTime(): void {
  startTime = Date.now();
}
