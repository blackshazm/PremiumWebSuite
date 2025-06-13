import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

// Armazenar métricas em memória (em produção, usar Redis ou banco)
const metricsStore: PerformanceMetrics[] = [];
const MAX_METRICS = 10000; // Manter apenas as últimas 10k métricas

// Middleware para medir performance das requisições
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();

  // Interceptar o final da resposta
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();

    // Calcular diferença de memória
    const memoryDiff: NodeJS.MemoryUsage = {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
    };

    // Criar métrica
    const metric: PerformanceMetrics = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      memoryUsage: memoryDiff,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
    };

    // Armazenar métrica
    storeMetric(metric);

    // Log para requisições lentas (> 1 segundo)
    if (responseTime > 1000) {
      console.warn(`Slow request detected: ${req.method} ${req.originalUrl} - ${responseTime.toFixed(2)}ms`);
    }

    // Log para alto uso de memória (> 50MB)
    if (memoryDiff.heapUsed > 50 * 1024 * 1024) {
      console.warn(`High memory usage: ${req.method} ${req.originalUrl} - ${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }

    return originalSend.call(this, data);
  };

  next();
};

// Armazenar métrica
const storeMetric = (metric: PerformanceMetrics) => {
  metricsStore.push(metric);

  // Manter apenas as últimas métricas
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }
};

// Obter estatísticas de performance
export const getPerformanceStats = (timeRange: number = 3600000) => { // 1 hora por padrão
  const now = new Date();
  const startTime = new Date(now.getTime() - timeRange);

  const relevantMetrics = metricsStore.filter(
    metric => metric.timestamp >= startTime
  );

  if (relevantMetrics.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      slowestRequest: null,
      fastestRequest: null,
      errorRate: 0,
      memoryStats: null,
      endpointStats: {},
    };
  }

  // Calcular estatísticas
  const responseTimes = relevantMetrics.map(m => m.responseTime);
  const totalRequests = relevantMetrics.length;
  const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / totalRequests;
  const slowestRequest = relevantMetrics.reduce((prev, current) => 
    prev.responseTime > current.responseTime ? prev : current
  );
  const fastestRequest = relevantMetrics.reduce((prev, current) => 
    prev.responseTime < current.responseTime ? prev : current
  );

  // Taxa de erro
  const errorRequests = relevantMetrics.filter(m => m.statusCode >= 400).length;
  const errorRate = (errorRequests / totalRequests) * 100;

  // Estatísticas de memória
  const memoryUsages = relevantMetrics.map(m => m.memoryUsage.heapUsed);
  const averageMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
  const maxMemoryUsage = Math.max(...memoryUsages);

  // Estatísticas por endpoint
  const endpointStats: Record<string, any> = {};
  relevantMetrics.forEach(metric => {
    const key = `${metric.method} ${metric.url}`;
    if (!endpointStats[key]) {
      endpointStats[key] = {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
      };
    }

    const stats = endpointStats[key];
    stats.count++;
    stats.totalTime += metric.responseTime;
    stats.averageTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, metric.responseTime);
    stats.maxTime = Math.max(stats.maxTime, metric.responseTime);
    
    if (metric.statusCode >= 400) {
      stats.errors++;
    }
  });

  return {
    totalRequests,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    slowestRequest: {
      url: `${slowestRequest.method} ${slowestRequest.url}`,
      responseTime: Math.round(slowestRequest.responseTime * 100) / 100,
      timestamp: slowestRequest.timestamp,
    },
    fastestRequest: {
      url: `${fastestRequest.method} ${fastestRequest.url}`,
      responseTime: Math.round(fastestRequest.responseTime * 100) / 100,
      timestamp: fastestRequest.timestamp,
    },
    errorRate: Math.round(errorRate * 100) / 100,
    memoryStats: {
      average: Math.round(averageMemoryUsage / 1024 / 1024 * 100) / 100, // MB
      max: Math.round(maxMemoryUsage / 1024 / 1024 * 100) / 100, // MB
    },
    endpointStats: Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        ...stats,
        averageTime: Math.round(stats.averageTime * 100) / 100,
        minTime: Math.round(stats.minTime * 100) / 100,
        maxTime: Math.round(stats.maxTime * 100) / 100,
        errorRate: Math.round((stats.errors / stats.count) * 100 * 100) / 100,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 20), // Top 20 endpoints mais lentos
  };
};

// Middleware para cache de resposta
export const cacheMiddleware = (duration: number = 300) => { // 5 minutos por padrão
  const cache = new Map<string, { data: any; timestamp: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    // Apenas para GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl;
    const cached = cache.get(key);

    // Verificar se existe cache válido
    if (cached && Date.now() - cached.timestamp < duration * 1000) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    // Interceptar resposta para cachear
    const originalJson = res.json;
    res.json = function(data) {
      // Cachear apenas respostas de sucesso
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, {
          data,
          timestamp: Date.now(),
        });

        // Limpar cache antigo periodicamente
        if (cache.size > 1000) {
          const now = Date.now();
          for (const [cacheKey, cacheValue] of cache.entries()) {
            if (now - cacheValue.timestamp > duration * 1000) {
              cache.delete(cacheKey);
            }
          }
        }
      }

      res.setHeader('X-Cache', 'MISS');
      return originalJson.call(this, data);
    };

    next();
  };
};

// Middleware para compressão condicional
export const conditionalCompression = (req: Request, res: Response, next: NextFunction) => {
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  // Verificar se cliente suporta compressão
  if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
  } else if (acceptEncoding.includes('deflate')) {
    res.setHeader('Content-Encoding', 'deflate');
  }

  next();
};

// Middleware para rate limiting baseado em performance
export const adaptiveRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const currentLoad = process.cpuUsage();
  const memoryUsage = process.memoryUsage();
  
  // Calcular "stress" do servidor
  const memoryStress = memoryUsage.heapUsed / memoryUsage.heapTotal;
  
  // Se servidor estiver sob stress, aplicar rate limiting mais agressivo
  if (memoryStress > 0.8) {
    const clientRequests = getClientRequestCount(req.ip);
    
    if (clientRequests > 10) { // Limite reduzido sob stress
      return res.status(429).json({
        success: false,
        error: {
          message: 'Servidor sob alta carga. Tente novamente em alguns minutos.',
          statusCode: 429,
        },
      });
    }
  }

  next();
};

// Contador de requisições por cliente (simplificado)
const clientRequestCounts = new Map<string, { count: number; resetTime: number }>();

const getClientRequestCount = (ip: string): number => {
  const now = Date.now();
  const client = clientRequestCounts.get(ip);

  if (!client || now > client.resetTime) {
    clientRequestCounts.set(ip, { count: 1, resetTime: now + 60000 }); // Reset a cada minuto
    return 1;
  }

  client.count++;
  return client.count;
};

// Limpeza periódica de métricas antigas
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 3600000);
  const validMetrics = metricsStore.filter(metric => metric.timestamp > oneHourAgo);
  
  metricsStore.length = 0;
  metricsStore.push(...validMetrics);
  
  console.log(`Performance metrics cleaned. Kept ${validMetrics.length} metrics.`);
}, 300000); // A cada 5 minutos
