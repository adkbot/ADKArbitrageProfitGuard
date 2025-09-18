
// 📊 COMPREHENSIVE MONITORING SYSTEM - PRODUCTION READY
import { EventEmitter } from 'events';

interface SystemMetrics {
  timestamp: number;
  memory: {
    used: number;
    free: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  network: {
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
  };
  exchanges: {
    [key: string]: {
      available: boolean;
      latency: number;
      errorCount: number;
      successRate: number;
    };
  };
  proxy: {
    enabled: boolean;
    working: boolean;
    failureCount: number;
  };
  database: {
    connected: boolean;
    mode: 'database' | 'memory';
    responseTime: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  category: 'memory' | 'cpu' | 'network' | 'exchange' | 'proxy' | 'database';
  title: string;
  message: string;
  timestamp: number;
  resolved: boolean;
  value?: number;
  threshold?: number;
}

/**
 * 📊 COMPREHENSIVE MONITORING SYSTEM
 */
export class MonitoringSystem extends EventEmitter {
  private metrics: SystemMetrics[] = [];
  private alerts: Map<string, PerformanceAlert> = new Map();
  private isRunning: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private startTime: number = Date.now();
  
  // Network monitoring
  private requestCount = 0;
  private totalResponseTime = 0;
  private errorCount = 0;
  private exchangeMetrics: { [key: string]: any } = {};

  // Thresholds
  private readonly MEMORY_WARNING_THRESHOLD = 0.8; // 80%
  private readonly MEMORY_CRITICAL_THRESHOLD = 0.95; // 95%
  private readonly CPU_WARNING_THRESHOLD = 80; // 80%
  private readonly ERROR_RATE_WARNING_THRESHOLD = 0.05; // 5%
  private readonly RESPONSE_TIME_WARNING_THRESHOLD = 5000; // 5 seconds

  constructor() {
    super();
    console.log('📊 Initializing Monitoring System...');
  }

  /**
   * 🚀 INITIALIZE MONITORING SYSTEM
   */
  async initialize(): Promise<void> {
    try {
      console.log('📊 Starting monitoring system...');
      this.isRunning = true;
      
      // Start monitoring loop
      this.monitoringInterval = setInterval(() => {
        this.collectMetrics();
        this.checkAlerts();
        this.cleanupOldData();
      }, 60000); // Collect metrics every minute
      
      // Initial metrics collection
      await this.collectMetrics();
      
      console.log('✅ Monitoring system initialized');
      this.createAlert('info', 'system', 'Monitoring Started', 'Performance monitoring system is now active');
      
    } catch (error) {
      console.error('❌ Failed to initialize monitoring system:', error);
      throw error;
    }
  }

  /**
   * 📈 COLLECT SYSTEM METRICS
   */
  private async collectMetrics(): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const loadAverage = process.loadavg?.() || [0, 0, 0];

      const metrics: SystemMetrics = {
        timestamp: Date.now(),
        memory: {
          used: memUsage.heapUsed,
          free: memUsage.heapTotal - memUsage.heapUsed,
          total: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal
        },
        cpu: {
          usage: this.calculateCPUUsage(cpuUsage),
          loadAverage
        },
        network: {
          requestCount: this.requestCount,
          averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
          errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0
        },
        exchanges: this.exchangeMetrics,
        proxy: {
          enabled: process.env.PROXY_ENABLED === 'true',
          working: true, // Will be updated by proxy system
          failureCount: 0
        },
        database: {
          connected: !!process.env.DATABASE_URL,
          mode: process.env.DATABASE_URL ? 'database' : 'memory',
          responseTime: 0 // Will be measured during health checks
        }
      };

      this.metrics.push(metrics);
      
      // Keep only last 24 hours of metrics (1440 minutes)
      if (this.metrics.length > 1440) {
        this.metrics = this.metrics.slice(-1440);
      }

      // Emit metrics event for real-time updates
      this.emit('metrics', metrics);

    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
    }
  }

  /**
   * 🧮 CALCULATE CPU USAGE PERCENTAGE
   */
  private calculateCPUUsage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU usage calculation
    const totalUsage = cpuUsage.user + cpuUsage.system;
    const totalTime = process.uptime() * 1000000; // Convert to microseconds
    
    return totalTime > 0 ? (totalUsage / totalTime) * 100 : 0;
  }

  /**
   * 🚨 CHECK FOR PERFORMANCE ALERTS
   */
  private checkAlerts(): void {
    if (this.metrics.length === 0) return;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    
    // Memory alerts
    const memoryUsage = latestMetrics.memory.used / latestMetrics.memory.total;
    if (memoryUsage > this.MEMORY_CRITICAL_THRESHOLD) {
      this.createAlert('critical', 'memory', 'Critical Memory Usage', 
        `Memory usage at ${(memoryUsage * 100).toFixed(1)}%`, memoryUsage, this.MEMORY_CRITICAL_THRESHOLD);
    } else if (memoryUsage > this.MEMORY_WARNING_THRESHOLD) {
      this.createAlert('warning', 'memory', 'High Memory Usage', 
        `Memory usage at ${(memoryUsage * 100).toFixed(1)}%`, memoryUsage, this.MEMORY_WARNING_THRESHOLD);
    } else {
      this.resolveAlert('memory_warning');
      this.resolveAlert('memory_critical');
    }

    // CPU alerts
    if (latestMetrics.cpu.usage > this.CPU_WARNING_THRESHOLD) {
      this.createAlert('warning', 'cpu', 'High CPU Usage', 
        `CPU usage at ${latestMetrics.cpu.usage.toFixed(1)}%`, latestMetrics.cpu.usage, this.CPU_WARNING_THRESHOLD);
    } else {
      this.resolveAlert('cpu_warning');
    }

    // Network error rate alerts
    if (latestMetrics.network.errorRate > this.ERROR_RATE_WARNING_THRESHOLD) {
      this.createAlert('warning', 'network', 'High Error Rate', 
        `Network error rate at ${(latestMetrics.network.errorRate * 100).toFixed(1)}%`, 
        latestMetrics.network.errorRate, this.ERROR_RATE_WARNING_THRESHOLD);
    } else {
      this.resolveAlert('network_warning');
    }

    // Response time alerts
    if (latestMetrics.network.averageResponseTime > this.RESPONSE_TIME_WARNING_THRESHOLD) {
      this.createAlert('warning', 'network', 'Slow Response Time', 
        `Average response time ${latestMetrics.network.averageResponseTime.toFixed(0)}ms`, 
        latestMetrics.network.averageResponseTime, this.RESPONSE_TIME_WARNING_THRESHOLD);
    } else {
      this.resolveAlert('response_time_warning');
    }

    // Exchange alerts
    for (const [exchangeName, exchange] of Object.entries(latestMetrics.exchanges)) {
      if (!exchange.available) {
        this.createAlert('critical', 'exchange', `${exchangeName} Unavailable`, 
          `Exchange ${exchangeName} is not responding`);
      } else if (exchange.errorCount > 10) {
        this.createAlert('warning', 'exchange', `${exchangeName} High Errors`, 
          `Exchange ${exchangeName} has ${exchange.errorCount} errors`);
      } else {
        this.resolveAlert(`exchange_${exchangeName}_critical`);
        this.resolveAlert(`exchange_${exchangeName}_warning`);
      }
    }
  }

  /**
   * 🚨 CREATE PERFORMANCE ALERT
   */
  private createAlert(
    type: 'warning' | 'critical' | 'info', 
    category: 'memory' | 'cpu' | 'network' | 'exchange' | 'proxy' | 'database' | 'system', 
    title: string, 
    message: string,
    value?: number,
    threshold?: number
  ): void {
    const alertId = `${category}_${type}`;
    
    // Don't create duplicate alerts
    if (this.alerts.has(alertId) && !this.alerts.get(alertId)?.resolved) {
      return;
    }

    const alert: PerformanceAlert = {
      id: alertId,
      type,
      category: category as any,
      title,
      message,
      timestamp: Date.now(),
      resolved: false,
      value,
      threshold
    };

    this.alerts.set(alertId, alert);
    
    console.log(`🚨 ${type.toUpperCase()} Alert: ${title} - ${message}`);
    this.emit('alert', alert);
  }

  /**
   * ✅ RESOLVE ALERT
   */
  private resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      console.log(`✅ Resolved Alert: ${alert.title}`);
      this.emit('alertResolved', alert);
    }
  }

  /**
   * 🧹 CLEANUP OLD DATA
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    
    // Clean old metrics (keep last 24 hours)
    this.metrics = this.metrics.filter(m => m.timestamp > twentyFourHoursAgo);
    
    // Clean resolved alerts older than 1 hour
    const oneHourAgo = now - (60 * 60 * 1000);
    for (const [alertId, alert] of this.alerts) {
      if (alert.resolved && alert.timestamp < oneHourAgo) {
        this.alerts.delete(alertId);
      }
    }
  }

  /**
   * 📊 RECORD NETWORK METRICS
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    this.totalResponseTime += responseTime;
    
    if (isError) {
      this.errorCount++;
    }
  }

  /**
   * 🏦 UPDATE EXCHANGE METRICS
   */
  updateExchangeMetrics(exchangeName: string, metrics: {
    available: boolean;
    latency?: number;
    errorCount?: number;
    successRate?: number;
  }): void {
    this.exchangeMetrics[exchangeName] = {
      available: metrics.available,
      latency: metrics.latency || 0,
      errorCount: metrics.errorCount || 0,
      successRate: metrics.successRate || (metrics.available ? 1 : 0),
      lastUpdate: Date.now()
    };
  }

  /**
   * 📊 GET CURRENT STATUS
   */
  async getStatus(): Promise<{
    running: boolean;
    uptime: number;
    metricsCollected: number;
    activeAlerts: number;
    lastMetricsCollection: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  }> {
    const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolved);
    const criticalAlerts = activeAlerts.filter(a => a.type === 'critical');
    const warningAlerts = activeAlerts.filter(a => a.type === 'warning');

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      systemHealth = 'critical';
    } else if (warningAlerts.length > 0) {
      systemHealth = 'warning';
    }

    return {
      running: this.isRunning,
      uptime: Date.now() - this.startTime,
      metricsCollected: this.metrics.length,
      activeAlerts: activeAlerts.length,
      lastMetricsCollection: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].timestamp : 0,
      systemHealth
    };
  }

  /**
   * 📈 GET METRICS
   */
  async getMetrics(hours: number = 1): Promise<{
    current: SystemMetrics | null;
    historical: SystemMetrics[];
    summary: {
      avgMemoryUsage: number;
      avgCpuUsage: number;
      avgResponseTime: number;
      totalRequests: number;
      errorRate: number;
    };
  }> {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const historicalMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    const currentMetrics = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;

    // Calculate summary statistics
    let summary = {
      avgMemoryUsage: 0,
      avgCpuUsage: 0,
      avgResponseTime: 0,
      totalRequests: 0,
      errorRate: 0
    };

    if (historicalMetrics.length > 0) {
      const totals = historicalMetrics.reduce((acc, metric) => {
        acc.memoryUsage += metric.memory.used / metric.memory.total;
        acc.cpuUsage += metric.cpu.usage;
        acc.responseTime += metric.network.averageResponseTime;
        acc.requests += metric.network.requestCount;
        acc.errors += metric.network.requestCount * metric.network.errorRate;
        return acc;
      }, { memoryUsage: 0, cpuUsage: 0, responseTime: 0, requests: 0, errors: 0 });

      summary = {
        avgMemoryUsage: totals.memoryUsage / historicalMetrics.length,
        avgCpuUsage: totals.cpuUsage / historicalMetrics.length,
        avgResponseTime: totals.responseTime / historicalMetrics.length,
        totalRequests: totals.requests,
        errorRate: totals.requests > 0 ? totals.errors / totals.requests : 0
      };
    }

    return {
      current: currentMetrics,
      historical: historicalMetrics,
      summary
    };
  }

  /**
   * 🚨 GET ALERTS
   */
  async getAlerts(includeResolved: boolean = false): Promise<PerformanceAlert[]> {
    const alerts = Array.from(this.alerts.values());
    
    if (includeResolved) {
      return alerts.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      return alerts.filter(a => !a.resolved).sort((a, b) => b.timestamp - a.timestamp);
    }
  }

  /**
   * ✅ MANUAL ALERT RESOLUTION
   */
  async resolveAlertManually(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      this.resolveAlert(alertId);
      return true;
    }
    return false;
  }

  /**
   * ⏹️ STOP MONITORING SYSTEM
   */
  stop(): void {
    console.log('⏹️ Stopping monitoring system...');
    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.createAlert('info', 'system', 'Monitoring Stopped', 'Performance monitoring system has been stopped');
    console.log('✅ Monitoring system stopped');
  }

  /**
   * 📊 GET DASHBOARD DATA
   */
  async getDashboardData(): Promise<{
    systemHealth: 'healthy' | 'warning' | 'critical';
    uptime: number;
    currentMetrics: SystemMetrics | null;
    recentAlerts: PerformanceAlert[];
    quickStats: {
      memoryUsage: number;
      cpuUsage: number;
      requestsPerMinute: number;
      errorRate: number;
    };
  }> {
    const status = await this.getStatus();
    const metrics = await this.getMetrics(0.1); // Last 6 minutes
    const alerts = await this.getAlerts(false);

    let quickStats = {
      memoryUsage: 0,
      cpuUsage: 0,
      requestsPerMinute: 0,
      errorRate: 0
    };

    if (metrics.current) {
      quickStats = {
        memoryUsage: (metrics.current.memory.used / metrics.current.memory.total) * 100,
        cpuUsage: metrics.current.cpu.usage,
        requestsPerMinute: metrics.current.network.requestCount,
        errorRate: metrics.current.network.errorRate * 100
      };
    }

    return {
      systemHealth: status.systemHealth,
      uptime: status.uptime,
      currentMetrics: metrics.current,
      recentAlerts: alerts.slice(0, 10), // Last 10 alerts
      quickStats
    };
  }
}

// Export singleton instance
export const monitoringSystem = new MonitoringSystem();
export default MonitoringSystem;
