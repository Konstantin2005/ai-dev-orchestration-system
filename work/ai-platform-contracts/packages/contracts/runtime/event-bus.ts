"use strict";

/**
 * Event Bus Implementation
 * 
 * In-memory event bus for publishing and subscribing to domain events.
 */
import { EventBus, EventHandler, EventFilter, Subscription, DomainEvent, EventType } from './types';
import { ulid } from 'ulid';

export class InMemoryEventBus implements EventBus {
  private subscribers: Map<EventType, Subscription[]> = new Map();
  private handlers: Map<string, EventHandler<any>> = new Map();

  subscribe(eventType: EventType, handler: EventHandler<any>, filter?: EventFilter<any>): Subscription {
    const subscriptionId = ulid();
    const subscription: Subscription = {
      id: subscriptionId,
      eventType,
      handler,
      filter,
      metadata: {
        subscribedAt: Date.now(),
        subscriberId: subscriptionId,
      }
    };

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    this.subscribers.get(eventType)!.push(subscription);
    this.handlers.set(subscriptionId, handler);

    return subscription;
  }

  async publish<T extends Event>(event: T, routingKey: string, metadata?: Partial<EventMetadata>): Promise<void> {
    const eventType = (event as any).type;

    if (!this.subscribers.has(eventType)) {
      console.warn(`[EVENT-BUS] No subscribers for event type: ${eventType}`);
      return;
    }

    const subscriptions = this.subscribers.get(eventType)!;
    const executionPromises = subscriptions.map(async (subscription) => {
      try {
        if (subscription.filter && !subscription.filter(event)) {
          return;
        }

        await subscription.handler(event);
      } catch (error) {
        console.error(`[EVENT-BUS] Error handling event ${eventType}`, {
          subscriptionId: subscription.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.all(executionPromises);
  }

  async publishBatch<T extends Event>(events: T[]): Promise<void> {
    const groupedByEventType = new Map<EventType, T[]>();

    events.forEach(event => {
      const eventType = (event as any).type;
      if (!groupedByEventType.has(eventType)) {
        groupedByEventType.set(eventType, []);
      }
      groupedByEventType.get(eventType)!.push(event);
    });

    const publishPromises = Array.from(groupedByEventType.entries()).map(
      ([eventType, eventBatch]) => this.publishBatchOfType(eventType, eventBatch)
    );

    await Promise.all(publishPromises);
  }

  private async publishBatchOfType<T extends Event>(eventType: EventType, events: T[]): Promise<void> {
    if (!this.subscribers.has(eventType)) {
      return;
    }

    const subscriptions = this.subscribers.get(eventType)!;
    const executionPromises = subscriptions.map(async (subscription) => {
      try {
        if (subscription.filter) {
          const filteredEvents = events.filter(subscription.filter);
          if (filteredEvents.length === 0) {
            return;
          }
          // For batch processing, we would need to extend the handler interface
          // For now, we'll handle each event individually
          for (const event of filteredEvents) {
            await subscription.handler(event);
          }
        } else {
          for (const event of events) {
            await subscription.handler(event);
          }
        }
      } catch (error) {
        console.error(`[EVENT-BUS] Error handling batch event ${eventType}`, {
          subscriptionId: subscription.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.all(executionPromises);
  }

  unsubscribe(subscriptionId: string): void {
    const entries = Array.from(this.subscribers.entries());
    for (const [eventType, subscriptions] of entries) {
      const filtered = subscriptions.filter(sub => sub.id !== subscriptionId);
      this.subscribers.set(eventType, filtered);

      if (this.handlers.has(subscriptionId)) {
        this.handlers.delete(subscriptionId);
      }
    }
  }

  getSubscriptions(eventType?: EventType): Subscription[] {
    if (eventType) {
      return this.subscribers.get(eventType)?.slice() || [];
    }

    const allSubscriptions: Subscription[] = [];
    for (const subscriptions of this.subscribers.values()) {
      allSubscriptions.push(...subscriptions);
    }
    return allSubscriptions;
  }

  getSubscription(subscriptionId: string): Subscription | undefined {
    for (const subscriptions of this.subscribers.values()) {
      const subscription = subscriptions.find(sub => sub.id === subscriptionId);
      if (subscription) {
        return subscription;
      }
    }
    return undefined;
  }

  async healthCheck(): Promise<boolean> {
    // Check if event bus is operational
    const subscriptionCount = this.getSubscriptions().length;
    const handlerCount = this.handlers.size;
    return subscriptionCount > 0 && handlerCount > 0;
  }

  async shutdown(): Promise<void> {
    this.subscribers.clear();
    this.handlers.clear();
  }
}

export class EventBusFactory {
  private buses: Map<string, EventBus> = new Map();

  createEventBus(identifier?: string): EventBus {
    const busId = identifier || `event-bus-${Date.now()}`;

    if (!this.buses.has(busId)) {
      this.buses.set(busId, new InMemoryEventBus());
    }

    return this.buses.get(busId)!;
  }

  getEventBus(identifier: string): EventBus | undefined {
    return this.buses.get(identifier);
  }

  deleteEventBus(identifier: string): void {
    this.buses.delete(identifier);
  }

  listBuses(): string[] {
    return Array.from(this.buses.keys());
  }

  clearAll(): void {
    this.buses.clear();
  }
}