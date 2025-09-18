
// 🏥 OPTIMIZED HEALTH CHECK SYSTEM - SUB-5 SECOND PERFORMANCE
import { testProxyConnectivity, getProxyStatus } from './proxy';
import { testGeoBypass, getGeoBypassStatus } from './geo-bypass';
import { performExchangeHealthCheck, getRenderDeploymentStatus } from './exchange-render';
import { storageManager } from './storage-manager';
import { httpClient } from './http-client-fixed';

interface OptimizedHealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  duration: number; // Check duration in milliseconds
  environment: string;
  services: {
    storage: any;
    proxy: any;
    geoBypass: any;
    exchanges: any;
    httpClient: any;
    render: any;
  };
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
    responseTime: number;
  };
}

let startTime = Date.now();
let healthCheckCache: { result: OptimizedHealthCheckResult; expiry: number } | null = null;
const CACHE_TTL = 30000; // Cache health check for 30 seconds

/**
 * ⚡ ULTRA-FAST HEALTH CHECK (< 5 seconds guaranteed)
 */
export async function performOptimizedHealthCheck(): Promise<OptimizedHealthCheckResult> {
  const checkStart = Date.now();
  console.log('🏥 Starting optimized health check...');

  // Check cache first
  if (healthCheckCache && Date.now() < healthCheckCache.expiry) {
    console.log('⚡ Using cached health check result');
    return {
      ...healthCheckCache.result,
      timestamp: new Date().toISOString(),
      duration: Date.now() - checkStart
    };
  }

  const timestamp = new Date().toISOString();
  const uptime = Date.now() - startTime;

  // 🚀 PARALLEL HEALTH CHECKS WITH TIMEOUT
  const HEALTH_CHECK_TIMEOUT = 3000; // 3 second max per check

  const results = await Promise.allSettled([
    // Storage check (fastest - local)
    Promise.race([
      storageManager.healthCheck(),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Storage check timeout')), 1000)
      )
    ]),

    // HTTP client connectivity test
    Promise.race([
      httpClient.testConnectivity(),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('HTTP client test timeout')), HEALTH_CHECK_TIMEOUT)
      )
    ]),

    // Quick proxy status (sync operation)
    Promise.resolve(getProxyStatus()),

    // Quick geo-bypass status (sync operation)
    Promise.resolve(getGeoBypassStatus()),

    // Exchange health check with timeout
    Promise.race([
      quickExchangeCheck(),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Exchange check timeout')), HEALTH_CHECK_TIMEOUT)
      )
    ]),

    // Render deployment status (sync operation)
    Promise.resolve(getRenderDeploymentStatus())
  ]);

  // Process results
  const services = {
    storage: {
      status: results[0].status === 'fulfilled' ? 
        results[0].value.status : 'unhealthy',
      details: results[0].status === 'fulfilled' ? 
        results[0].value : { error: (results[0] as any).reason?.message }
    },
    httpClient: {
      status: results[1].status === 'fulfilled' && results[1].value.overall ? 'healthy' : 'degraded',
      details: results[1].status === 'fulfilled' ? 
        results[1].value : { error: (results[1] as any).reason?.message }
    },
    proxy: {
      status: results[2].status === 'fulfilled' && results[2].value.enabled ? 'healthy' : 'degraded',
      details: results[2].status === 'fulfilled' ? results[2].value : {}
    },
    geoBypass: {
      status: results[3].status === 'fulfilled' && results[3].value.enabled ? 'healthy' : 'degraded',
      details: results[3].status === 'fulfilled' ? results[3].value : {}
    },
    exchanges: {
      status: results[4].status === 'fulfilled' && results[4].value.overall ? 'healthy' : 'unhealthy',
      details: results[4].status === 'fulfilled' ? 
        results[4].value : { error: (results[4] as any).reason?.message }
    },
    render: {
      status: 'healthy',
      details: results[5].status === 'fulfilled' ? results[5].value : {}
    }
  };

  // Determine overall status
  const serviceStatuses = Object.values(services).map(s => s.status);
  const unhealthyCount = serviceStatuses.filter(s => s === 'unhealthy').length;
  const degradedCount = serviceStatuses.filter(s => s === 'degraded').length;

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (unhealthyCount > 1) { // Allow 1 unhealthy service
    overallStatus = 'unhealthy';
  } else if (unhealthyCount > 0 || degradedCount > 2) { // Allow up to 2 degraded services
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const duration = Date.now() - checkStart;
  const result: OptimizedHealthCheckResult = {
    status: overallStatus,
    timestamp,
    uptime,
    duration,
    environment: process.env.NODE_ENV || 'development',
    services,
    performance: {
      memoryUsage: process.memoryUsage(),
      responseTime: duration
    }
  };

  // Cache result
  healthCheckCache = {
    result,
    expiry: Date.now() + CACHE_TTL
  };

  console.log(`🏥 Optimized health check completed: ${overallStatus.toUpperCase()} (${duration}ms)`);
  
  return result;
}

/**
 * ⚡ ULTRA-QUICK EXCHANGE CHECK (< 2 seconds)
 */
async function quickExchangeCheck(): Promise<{ overall: boolean; exchanges: any }> {
  const exchanges = ['binance', 'okx', 'bybit'];
  const testPromises = exchanges.map(async (exchangeName) => {
    try {
      // Quick ping test with short timeout
      const testUrls: { [key: string]: string } = {
        binance: 'https://api.binance.com/api/v3/ping',
        okx: 'https://www.okx.com/api/v5/public/time',
        bybit: 'https://api.bybit.com/v5/market/time'
      };

      const response = await httpClient.fetch(testUrls[exchangeName], {
        method: 'GET',
        timeout: 1500, // 1.5 second timeout per exchange
        maxRetries: 1 // Only 1 retry for speed
      });

      return {
        name: exchangeName,
        available: response.status < 400,
        status: response.status,
        latency: 0 // Skip latency calculation for speed
      };
    } catch (error: any) {
      return {
        name: exchangeName,
        available: false,
        status: error.response?.status || 0,
        error: error.message,
        latency: 0
      };
    }
  });

  try {
    const results = await Promise.all(testPromises);
    const successCount = results.filter(r => r.available).length;
    
    return {
      overall: successCount > 0, // At least one exchange working
      exchanges: results.reduce((acc, result) => {
        acc[result.name] = result;
        return acc;
      }, {} as any)
    };
  } catch (error) {
    return {
      overall: false,
      exchanges: { error: (error as Error).message }
    };
  }
}

/**
 * 🚨 LIGHTNING-FAST HEALTH CHECK (< 1 second) for Render health endpoint
 */
export async function lightningHealthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
  try {
    // Ultra-basic checks only
    const hasEnvVars = !!(process.env.NODE_ENV && process.env.PORT);
    const hasMemory = process.memoryUsage().heapUsed < 1024 * 1024 * 1024; // Less than 1GB
    const storageStatus = storageManager.getStatus();
    
    const isHealthy = hasEnvVars && hasMemory && (storageStatus.connected || storageStatus.mode === 'memory');
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime
    };
  }
}

/**
 * 📊 GET SYSTEM METRICS (OPTIMIZED)
 */
export function getOptimizedSystemMetrics(): {
  memory: NodeJS.MemoryUsage;
  uptime: number;
  environment: Record<string, string>;
  storage: any;
  proxy: any;
} {
  return {
    memory: process.memoryUsage(),
    uptime: Date.now() - startTime,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      PORT: process.env.PORT || 'unknown',
      PROXY_ENABLED: process.env.PROXY_ENABLED || 'false',
      DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not_configured',
      RENDER_REGION: process.env.RENDER_REGION || 'unknown'
    },
    storage: storageManager.getStatus(),
    proxy: getProxyStatus()
  };
}

/**
 * 🔄 CLEAR HEALTH CHECK CACHE
 */
export function clearHealthCheckCache(): void {
  healthCheckCache = null;
  console.log('🔄 Health check cache cleared');
}

/**
 * 🔄 RESET START TIME (for testing)
 */
export function resetStartTime(): void {
  startTime = Date.now();
}

// Maintain backward compatibility
export const performHealthCheck = performOptimizedHealthCheck;
export const quickHealthCheck = lightningHealthCheck;
export const getSystemMetrics = getOptimizedSystemMetrics;
