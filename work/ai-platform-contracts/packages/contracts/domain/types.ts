"use strict";

/**
 * Core domain events for the AI Platform Contracts
 * 
 * These events represent state changes and important occurrences
 * throughout the autonomous engineering platform.
 */

export interface EventMetadata {
  readonly eventId: string;
  readonly timestamp: number;
  readonly source: string;
  readonly version: string;
  readonly traceId?: string;
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

export abstract class AggregateRoot {
  protected events: DomainEvent<any>[] = [];

  abstract get id(): string;
  abstract get version(): string;

  protected raiseEvent<T>(event: DomainEvent<T>): void {
    this.events.push(event);
  }

  protected raiseEventImmediately<T>(event: DomainEvent<T>): void {
    this.collectUncommittedEvents();
    this.events.push(event);
  }

  protected commitEvents(): DomainEvent<any>[] {
    const committed = [...this.events];
    this.events = [];
    return committed;
  }

  protected collectUncommittedEvents(): DomainEvent<any>[] {
    return [...this.events];
  }

  abstract toSnapshot(): any;
  abstract fromSnapshot(snapshot: any, events?: DomainEvent<any>[]): void;
}

export enum TaskStatus {
  CREATED = 'created',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVIEWED = 'reviewed',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum AgentStatus {
  IDLE = 'idle',
  WORKING = 'working',
  FAILED = 'failed',
  RECOVERING = 'recovering',
  DEAD = 'dead'
}

export enum PRStatus {
  OPEN = 'open',
  REVIEWING = 'reviewing',
  PASSED = 'passed',
  FAILED = 'failed',
  MERGE_READY = 'merge-ready',
  MERGED = 'merged',
  CLOSED = 'closed'
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

export interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  body?: string;
  labels: string[];
  state: 'open' | 'closed';
  createdAt: number;
  updatedAt: number;
  author: {
    id: number;
    login: string;
    avatar_url: string;
  };
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  head: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
  };
  base: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
  };
  createdAt: number;
  updatedAt: number;
  mergedAt?: number;
  closedAt?: number;
  html_url: string;
  user: GitHubUser;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  html_url: string;
  private: boolean;
  fork: boolean;
}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

export enum EventType {
  // Task events
  TASK_CREATED = 'task.created',
  TASK_ASSIGNED = 'task.assigned',
  TASK_STATUS_CHANGED = 'task.status.changed',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',
  
  // PR events
  PR_OPENED = 'pr.opened',
  PR_REVIEWED = 'pr.reviewed',
  PR_APPROVED = 'pr.approved',
  PR_REJECTED = 'pr.rejected',
  PR_FAILED = 'pr.failed',
  PR_MERGED = 'pr.merged',
  PR_CLOSED = 'pr.closed',
  
  // Agent events
  AGENT_STARTED = 'agent.started',
  AGENT_FAILED = 'agent.failed',
  AGENT_RECOVERED = 'agent.recovered',
  AGENT_STOPPED = 'agent.stopped',
  
  // System events
  CIRCUIT_BREAKER_OPENED = 'circuit.breaker.opened',
  CIRCUIT_BREAKER_CLOSED = 'circuit.breaker.closed',
  CIRCUIT_BREAKER_HALF_OPEN = 'circuit.breaker.half.open',
  AGENT_ISOLATED = 'agent.isolated',
  EXECUTION_STARTED = 'execution.started',
  EXECUTION_COMPLETED = 'execution.completed',
  EXECUTION_FAILED = 'execution.failed',
  DEPLOYMENT_STARTED = 'deployment.started',
  DEPLOYMENT_COMPLETED = 'deployment.completed',
  DEPLOYMENT_FAILED = 'deployment.failed',
  
  // Recovery events
  RECOVERY_STARTED = 'recovery.started',
  RECOVERY_COMPLETED = 'recovery.completed',
  FIX_APPLIED = 'fix.applied',
  
  // Monitoring events
  METRICS_COLLECTED = 'metrics.collected',
  HEALTH_CHECK = 'health.check',
  ALERT_TRIGGERED = 'alert.triggered',
  
  // Integration events
  EXTERNAL_SERVICE_CALLED = 'external.service.called',
  EXTERNAL_SERVICE_FAILED = 'external.service.failed',
  INTEGRATION_CONFIG_CHANGED = 'integration.config.changed'
}

export interface TaskEvent {
  type: EventType.TASK_CREATED | EventType.TASK_ASSIGNED | EventType.TASK_STATUS_CHANGED | EventType.TASK_COMPLETED | EventType.TASK_FAILED;
  taskId: string;
  data: Partial<Task>;
}

export interface PREvent {
  type: EventType.PR_OPENED | EventType.PR_REVIEWED | EventType.PR_APPROVED | EventType.PR_REJECTED | EventType.PR_FAILED | EventType.PR_MERGED | EventType.PR_CLOSED;
  prId: number;
  issueNumber: number;
  prState: PRStatus;
  data: Partial<PR>;
}

export interface AgentEvent {
  type: EventType.AGENT_STARTED | EventType.AGENT_FAILED | EventType.AGENT_RECOVERED | EventType.AGENT_STOPPED;
  agentId: string;
  agentType: string;
  role: string;
  status: AgentStatus;
  data: Partial<Agent>;
}

export interface CircuitBreakerEvent {
  type: EventType.CIRCUIT_BREAKER_OPENED | EventType.CIRCUIT_BREAKER_CLOSED | EventType.CIRCUIT_BREAKER_HALF_OPEN;
  serviceName: string;
  state: CircuitBreakerState;
  failureCount: number;
  threshold: number;
  timeout: number;
  data: Partial<CircuitBreaker>;
}

export interface ExecutionEvent {
  type: EventType.EXECUTION_STARTED | EventType.EXECUTION_COMPLETED | EventType.EXECUTION_FAILED;
  executionId: string;
  taskId: string;
  agentId: string;
  agentType: string;
  status: string;
  duration: number;
  error?: string;
  data: Partial<Execution>;
}

export interface DeploymentEvent {
  type: EventType.DEPLOYMENT_STARTED | EventType.DEPLOYMENT_COMPLETED | EventType.DEPLOYMENT_FAILED;
  deploymentId: string;
  serviceName: string;
  version: string;
  target?: string;
  status: string;
  duration: number;
  error?: string;
  data: Partial<Deployment>;
}

export interface HealthEvent {
  type: EventType.HEALTH_CHECK;
  agentId: string;
  agentType: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: number;
  data: any;
}

export interface MetricEvent {
  type: EventType.METRICS_COLLECTED;
  serviceName: string;
  metrics: Metric[];
  timestamp: number;
  source: string;
  data: any;
}

export interface AlertEvent {
  type: EventType.ALERT_TRIGGERED;
  alertId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  message: string;
  source: string;
  timestamp: number;
  data: any;
}

export type AnyEvent = 
  | TaskEvent 
  | PREvent 
  | AgentEvent 
  | CircuitBreakerEvent 
  | ExecutionEvent 
  | DeploymentEvent 
  | HealthEvent 
  | MetricEvent 
  | AlertEvent;

export interface IntegrationConfig {
  readonly serviceName: string;
  readonly endpoint: string;
  readonly timeout: number;
  readonly retryPolicy: RetryPolicy;
  readonly circuitBreaker: CircuitBreakerConfig;
  readonly credentials?: {
    username?: string;
    password?: string;
    apiKey?: string;
    token?: string;
  };
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: number;
}

export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  halfOpenMax: number;
  failureRateThreshold: number;
  minimumThroughput: number;
}

export type EventHandler<T extends AnyEvent> = (event: T) => Promise<void> | void;

export type EventFilter<T extends AnyEvent> = (event: T) => boolean;

export interface EventStore {
  save(event: DomainEvent<any>): Promise<void>;
  saveBatch(events: DomainEvent<any>[]): Promise<void>;
  getEvents(eventType: EventType, filter?: (e: DomainEvent<any>) => boolean): Promise<DomainEvent<any>[]>;
  getEventsByAggregateId(aggregateId: string): Promise<DomainEvent<any>[]>;
  getEventsByAggregateType(aggregateType: string): Promise<DomainEvent<any>[]>;
  getEventsByTimeRange(start: number, end: number): Promise<DomainEvent<any>[]>;
  getEvents(eventIds: string[]): Promise<DomainEvent<any>[]>;
}

export interface EventPublisher {
  publish<T extends AnyEvent>(event: DomainEvent<T>, routingKey: string, metadata?: Partial<EventMetadata>): Promise<void>;
  publishBatch<T extends AnyEvent>(events: DomainEvent<T>[]): Promise<void>;
  subscribe(eventType: EventType, handler: EventHandler<AnyEvent>, filter?: EventFilter<AnyEvent>): Subscription;
  unsubscribe(subscriptionId: string): void;
}

export interface Subscription {
  id: string;
  eventType: EventType;
  handler: EventHandler<AnyEvent>;
  filter?: EventFilter<AnyEvent>;
  metadata?: Record<string, any>;
}

export interface EventBus {
  subscribe(eventType: EventType, handler: EventHandler<AnyEvent>, filter?: EventFilter<AnyEvent>): Subscription;
  publish<T extends AnyEvent>(event: DomainEvent<T>, routingKey: string, metadata?: Partial<EventMetadata>): Promise<void>;
  publishBatch<T extends AnyEvent>(events: DomainEvent<T>[]): Promise<void>;
  unsubscribe(subscriptionId: string): void;
  getSubscriptions(eventType?: EventType): Subscription[];
  healthCheck(): Promise<boolean>;
}

export interface Command {
  readonly id: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly payload: any;
  readonly metadata: CommandMetadata;
}

export interface CommandMetadata {
  readonly commandId: string;
  readonly timestamp: number;
  readonly source: string;
  readonly version: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
}

export interface CommandResult<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: CommandError;
  readonly timestamp: number;
  readonly commandId: string;
  readonly aggregateId?: string;
  readonly correlationId?: string;
}

export interface CommandError {
  readonly code: string;
  readonly message: string;
  readonly details?: any;
  readonly stack?: string;
}

export interface CommandHandler<T extends Command> {
  handle(command: T): Promise<CommandResult>;
}

export interface CommandBus {
  registerHandler<T extends Command>(commandType: string, handler: CommandHandler<T>): void;
  send<T extends Command, R = any>(command: T): Promise<CommandResult<R>>;
  sendAndWait<T extends Command, R = any>(command: T, timeout?: number): Promise<CommandResult<R>>;
  registerMiddleware(middleware: Middleware): void;
  unregisterHandler(commandType: string): void;
  getHandlers(commandType?: string): CommandHandler<Command>[];
  healthCheck(): Promise<boolean>;
}

export interface Middleware {
  readonly id: string;
  readonly name: string;
  precedence?: number;

  canHandle(command: Command): boolean;
  handle(command: Command, next: () => Promise<CommandResult>): Promise<CommandResult>;
}

export interface EventSchema {
  readonly eventType: EventType;
  readonly version: string;
  readonly schema: any;
  readonly publishedAt: number;
  readonly isActive: boolean;
}

export interface Configuration {
  readonly events: {
    readonly eventSchemaPath: string;
    readonly maxEventSize?: number;
    readonly retentionDays?: number;
    readonly compressionEnabled?: boolean;
  };
  readonly commands: {
    readonly maxCommandSize?: number;
    readonly timeoutMs?: number;
    readonly retryPolicy?: Partial<RetryPolicy>;
  };
  readonly transports: {
    readonly defaultTransport?: string;
    readonly transports: Record<string, any>;
  };
  readonly security: {
    readonly authEnabled?: boolean;
    readonly encryptionEnabled?: boolean;
    readonly auditLogEnabled?: boolean;
    readonly rateLimiting?: RateLimitingConfig;
  };
}

export interface RateLimitingConfig {
  readonly enabled: boolean;
  readonly defaultQuota: number;
  readonly defaultWindowMs: number;
  readonly perUser: boolean;
}

export interface HealthCheck {
  readonly name: string;
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly message?: string;
  readonly timestamp: number;
  readonly details?: any;
}

export interface Metric {
  readonly name: string;
  readonly value: number;
  readonly type: 'counter' | 'gauge' | 'histogram' | 'summary';
  readonly labels?: Record<string, string>;
  readonly timestamp: number;
  readonly unit?: string;
}

export interface Deployment {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled back';
  readonly target?: string;
  readonly startedAt?: number;
  readonly completedAt?: number;
  readonly duration?: number;
  readonly error?: string;
  readonly description?: string;
}

export interface Execution {
  readonly id: string;
  readonly taskId: string;
  readonly agentId: string;
  readonly agentType: string;
  readonly type: string;
  readonly status: string;
  readonly startedAt: number;
  readonly completedAt?: number;
  readonly duration?: number;
  readonly result?: any;
  readonly error?: string;
  readonly retries: number;
  readonly maxRetries: number;
}

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: TaskStatus;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly assignee?: string;
  readonly reporter?: string;
  readonly labels: string[];
  readonly tags: string[];
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly dueDate?: number;
  readonly estimatedHours?: number;
  readonly actualHours?: number;
  readonly dependencies: string[];
  readonly blockedBy?: string[];
  readonly metadata?: any;
}

export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly role: string;
  readonly status: AgentStatus;
  readonly capabilities: string[];
  readonly labels: string[];
  readonly configuration?: any;
  readonly metadata?: any;
}