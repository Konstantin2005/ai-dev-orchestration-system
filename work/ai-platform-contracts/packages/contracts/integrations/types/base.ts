// Task Integration Contracts
export interface TaskIntegration {
  readonly id: string;
  readonly description: string;
  readonly dependencies: string[];
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly createdAt: number;
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

export interface ResourceRequirement {
  readonly cpu: number;
  readonly memory: number;
  readonly storage: number;
  readonly network?: number;
}

export interface IntegrationResult {
  readonly success: boolean;
  readonly data?: any;
  readonly error?: IntegrationError;
  readonly timestamp: number;
  readonly serviceName: string;
  readonly operation: string;
  readonly executionTime: number;
  readonly metrics: IntegrationMetrics;
}

export interface IntegrationError {
  readonly code: string;
  readonly message: string;
  readonly details?: any;
  readonly retryable: boolean;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface IntegrationMetrics {
  readonly requestCount: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly averageResponseTime: number;
  readonly successRate: number;
}

export interface ServiceConfig {
  readonly name: string;
  readonly endpoint: string;
  readonly timeout: number;
  readonly retryPolicy: RetryPolicy;
  readonly circuitBreaker: CircuitBreakerConfig;
  readonly auth?: {
    readonly type: 'basic' | 'bearer' | 'apikey';
    readonly username?: string;
    readonly password?: string;
    readonly apiKey?: string;
    readonly token?: string;
  };
  readonly cache?: {
    readonly enabled: boolean;
    readonly ttl: number;
  };
  readonly metadata?: Record<string, any>;
}

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
  readonly jitter: number;
}

export interface CircuitBreakerConfig {
  readonly threshold: number;
  readonly timeout: number;
  readonly halfOpenMax: number;
  readonly failureRateThreshold: number;
  readonly minimumThroughput: number;
}

export interface CacheConfig {
  readonly enabled: boolean;
  readonly ttl: number;
  readonly maxSize: number;
}

export interface EventMetadata {
  readonly eventId: string;
  readonly timestamp: number;
  readonly source: string;
  readonly version: string;
  readonly traceId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly userId?: string;
  relativeEventTypes: any;
}

export class DomainEvent<T = any> {
  readonly eventId: string;
  readonly timestamp: number;
  readonly source: string;
  readonly version: string;
  readonly data: T;
  readonly metadata: EventMetadata;

  constructor(eventData: T, metadata: Partial<EventMetadata> = {}) {
    this.eventId = metadata.eventId || crypto.randomUUID();
    this.timestamp = metadata.timestamp || Date.now();
    this.source = metadata.source || 'unknown';
    this.version = metadata.version || '1.0.0';
    this.data = eventData;
    this.metadata = {
      eventId: this.eventId,
      timestamp: this.timestamp,
      source: this.source,
      version: this.version,
      ...metadata
    };
  }
}

export type Event = DomainEvent<any>;