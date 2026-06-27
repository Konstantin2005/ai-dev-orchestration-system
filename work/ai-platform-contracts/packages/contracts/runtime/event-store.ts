"use strict";

/**
 * Event Store Implementation
 * 
 * Persistent storage for domain events with efficient querying capabilities.
 */
import { EventStore, DomainEvent } from './types';
import { EventType } from './types';

export class MemoryEventStore implements EventStore {
  private events: DomainEvent<any>[] = [];

  async save(event: DomainEvent<any>): Promise<void> {
    this.events.push(event);
  }

  async saveBatch(events: DomainEvent<any>[]): Promise<void> {
    this.events.push(...events);
  }

  async getEvents(eventType: EventType, filter?: (e: DomainEvent<any>) => boolean): Promise<DomainEvent<any>[]> {
    let filtered = this.events.filter(e => e.constructor.name === eventType);

    if (filter) {
      filtered = filtered.filter(filter);
    }

    return filtered;
  }

  async getEventsByAggregateId(aggregateId: string): Promise<DomainEvent<any>[]> {
    return this.events.filter(e => e.aggregateId === aggregateId);
  }

  async getEventsByAggregateType(aggregateType: string): Promise<DomainEvent<any>[]> {
    return this.events.filter(e => e.aggregateType === aggregateType);
  }

  async getEventsByTimeRange(start: number, end: number): Promise<DomainEvent<any>[]> {
    return this.events.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  async getEvents(eventIds: string[]): Promise<DomainEvent<any>[]> {
    return this.events.filter(e => eventIds.includes(e.eventId));
  }

  getAllEvents(): DomainEvent<any>[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }

  getEventCount(): number {
    return this.events.length;
  }

  async exportEvents(): Promise<DomainEvent<any>[]> {
    return this.getAllEvents();
  }

  async importEvents(events: DomainEvent<any>[]): Promise<void> {
    this.events.push(...events);
  }
}

export class EventStoreFactory {
  private stores: Map<string, EventStore> = new Map();

  createEventStore(identifier?: string): EventStore {
    const storeId = identifier || `default-${Date.now()}`;
    
    if (!this.stores.has(storeId)) {
      this.stores.set(storeId, new MemoryEventStore());
    }
    
    return this.stores.get(storeId)!;
  }

  getEventStore(identifier: string): EventStore | undefined {
    return this.stores.get(identifier);
  }

  deleteEventStore(identifier: string): void {
    this.stores.delete(identifier);
  }

  listStores(): string[] {
    return Array.from(this.stores.keys());
  }

  clearAll(): void {
    this.stores.clear();
  }
}