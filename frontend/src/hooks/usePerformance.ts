import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  connectionType?: string;
  isSlowConnection: boolean;
}

interface UsePerformanceOptions {
  trackMemory?: boolean;
  trackConnection?: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

export const usePerformance = (options: UsePerformanceOptions = {}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const startTimeRef = useRef<number>(Date.now());
  const renderStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;
      const renderTime = Date.now() - renderStartRef.current;

      let memoryUsage: number | undefined;
      if (options.trackMemory && 'memory' in performance) {
        const memory = (performance as any).memory;
        memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }

      let connectionType: string | undefined;
      let isSlowConnection = false;
      
      if (options.trackConnection && 'connection' in navigator) {
        const connection = (navigator as any).connection;
        connectionType = connection.effectiveType;
        isSlowConnection = ['slow-2g', '2g'].includes(connection.effectiveType);
      }

      const performanceMetrics: PerformanceMetrics = {
        loadTime,
        renderTime,
        memoryUsage,
        connectionType,
        isSlowConnection,
      };

      setMetrics(performanceMetrics);
      setIsLoading(false);

      if (options.onMetrics) {
        options.onMetrics(performanceMetrics);
      }

      // Enviar métricas para analytics (opcional)
      if (process.env.NODE_ENV === 'production') {
        sendPerformanceMetrics(performanceMetrics);
      }
    };

    // Aguardar o carregamento completo
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
      return () => window.removeEventListener('load', measurePerformance);
    }
  }, [options]);

  return { metrics, isLoading };
};

// Hook para medir performance de componentes específicos
export const useComponentPerformance = (componentName: string) => {
  const renderStartRef = useRef<number>(Date.now());
  const [renderTime, setRenderTime] = useState<number | null>(null);

  useEffect(() => {
    const endTime = Date.now();
    const duration = endTime - renderStartRef.current;
    setRenderTime(duration);

    // Log para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`Component ${componentName} rendered in ${duration}ms`);
    }
  }, [componentName]);

  return renderTime;
};

// Hook para lazy loading de imagens
export const useLazyImage = (src: string, options: IntersectionObserverInit = {}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, options]);

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.onerror = () => setIsError(true);
      img.src = imageSrc;
    }
  }, [imageSrc]);

  return { imgRef, imageSrc, isLoaded, isError };
};

// Hook para debounce
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook para throttle
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return ((...args: any[]) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }) as T;
};

// Hook para detectar conexão lenta
export const useSlowConnection = () => {
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionStatus = () => {
        const slowTypes = ['slow-2g', '2g'];
        setIsSlowConnection(slowTypes.includes(connection.effectiveType));
      };

      updateConnectionStatus();
      connection.addEventListener('change', updateConnectionStatus);

      return () => {
        connection.removeEventListener('change', updateConnectionStatus);
      };
    }
  }, []);

  return isSlowConnection;
};

// Hook para preload de recursos
export const usePreload = (resources: string[], type: 'image' | 'script' | 'style' = 'image') => {
  useEffect(() => {
    const preloadedResources: HTMLLinkElement[] = [];

    resources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      switch (type) {
        case 'image':
          link.as = 'image';
          break;
        case 'script':
          link.as = 'script';
          break;
        case 'style':
          link.as = 'style';
          break;
      }

      document.head.appendChild(link);
      preloadedResources.push(link);
    });

    return () => {
      preloadedResources.forEach((link) => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      });
    };
  }, [resources, type]);
};

// Função para enviar métricas de performance
const sendPerformanceMetrics = (metrics: PerformanceMetrics) => {
  // Implementar envio para serviço de analytics
  // Exemplo: Google Analytics, DataDog, etc.
  
  if ('sendBeacon' in navigator) {
    const data = JSON.stringify({
      type: 'performance',
      metrics,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    navigator.sendBeacon('/api/analytics/performance', data);
  }
};

// Hook para Web Vitals
export const useWebVitals = () => {
  const [vitals, setVitals] = useState<Record<string, number>>({});

  useEffect(() => {
    // Implementar coleta de Web Vitals
    // CLS, FID, FCP, LCP, TTFB
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          setVitals(prev => ({ ...prev, LCP: entry.startTime }));
        }
        
        if (entry.entryType === 'first-input') {
          setVitals(prev => ({ ...prev, FID: (entry as any).processingStart - entry.startTime }));
        }
        
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          setVitals(prev => ({ ...prev, CLS: (prev.CLS || 0) + (entry as any).value }));
        }
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

    return () => observer.disconnect();
  }, []);

  return vitals;
};
