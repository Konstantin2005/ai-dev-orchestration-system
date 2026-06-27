"use strict";

/**
 * Command Bus Implementation
 * 
 * Command bus for handling domain commands with middleware support.
 */
import { CommandBus, CommandHandler, Command, CommandResult, CommandError, Middleware } from './types';
import { ulid } from 'ulid';

export class InMemoryCommandBus implements CommandBus {
  private handlers: Map<string, CommandHandler<Command>> = new Map();
  private middlewares: Middleware[] = [];
  private inFlightCommands: Map<string, Promise<CommandResult>> = new Map();

  registerHandler<T extends Command>(commandType: string, handler: CommandHandler<T>): void {
    this.handlers.set(commandType, handler as CommandHandler<Command>);
  }

  unregisterHandler(commandType: string): void {
    this.handlers.delete(commandType);
  }

  registerMiddleware(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  async send<T extends Command, R = any>(command: T): Promise<CommandResult<R>> {
    return this.executeCommand(command, this.middlewares);
  }

  async sendAndWait<T extends Command, R = any>(command: T, timeout?: number): Promise<CommandResult<R>> {
    return this.executeCommand(command, this.middlewares, timeout);
  }

  private async executeCommand<T extends Command, R = any>(
    command: T,
    middlewares: Middleware[],
    timeout?: number
  ): Promise<CommandResult<R>> {
    const commandId = command.id;
    const commandType = command.type;
    const startTime = Date.now();

    // Check if command is already being processed
    if (this.inFlightCommands.has(commandId)) {
      return this.inFlightCommands.get(commandId)!;
    }

    const resultPromise = this.processCommand(command, middlewares);
    this.inFlightCommands.set(commandId, resultPromise);

    try {
      const result = await this.withTimeout(resultPromise, timeout);
      this.inFlightCommands.delete(commandId);
      return result;
    } catch (error) {
      this.inFlightCommands.delete(commandId);
      throw error;
    }
  }

  private async processCommand<T extends Command, R = any>(
    command: T,
    middlewares: Middleware[],
    timeout?: number
  ): Promise<CommandResult<R>> {
    const commandId = command.id;
    const commandType = command.type;

    if (!this.handlers.has(commandType)) {
      throw new Error(`No command handler registered for command type: ${commandType}`);
    }

    const handler = this.handlers.get(commandType)!;
    const resultPromise = handler.handle(command);

    // Apply middlewares in order
    let pipeline: any = resultPromise;
    for (const middleware of middlewares.reverse()) {
      if (middleware.canHandle(command)) {
        pipeline = middleware.handle(command, () => pipeline);
      }
    }

    try {
      const result = await this.withTimeout(pipeline, timeout);

      return {
        success: true,
        data: result?.data,
        timestamp: Date.now(),
        commandId,
        correlationId: command.metadata.correlationId,
        aggregateId: command.aggregateId
      };
    } catch (error) {
      const commandError: CommandError = {
        code: 'COMMAND_HANDLER_ERROR',
        message: error instanceof Error ? error.message : String(error),
        details: { commandId, commandType },
        stack: error instanceof Error ? error.stack : undefined
      };

      return {
        success: false,
        error: commandError,
        timestamp: Date.now(),
        commandId,
        correlationId: command.metadata.correlationId,
        aggregateId: command.aggregateId
      };
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeout?: number): Promise<T> {
    if (!timeout) {
      return promise;
    }

    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Command timeout after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  getHandlers(commandType?: string): CommandHandler<Command>[] {
    if (commandType) {
      const handler = this.handlers.get(commandType);
      return handler ? [handler] : [];
    }
    return Array.from(this.handlers.values());
  }

  getMiddlewareIds(): string[] {
    return this.middlewares.map(m => m.id);
  }

  removeMiddleware(middlewareId: string): void {
    this.middlewares = this.middlewares.filter(m => m.id !== middlewareId);
  }

  async healthCheck(): Promise<boolean> {
    const handlerCount = this.handlers.size;
    const middlewareCount = this.middlewares.length;
    const inFlightCount = this.inFlightCommands.size;
    return handlerCount > 0 && middlewareCount >= 0 && inFlightCount === 0;
  }

  async shutdown(): Promise<void> {
    this.handlers.clear();
    this.middlewares = [];
    this.inFlightCommands.clear();
  }
}

export class CommandBusFactory {
  private buses: Map<string, CommandBus> = new Map();

  createCommandBus(identifier?: string): CommandBus {
    const busId = identifier || `command-bus-${Date.now()}`;

    if (!this.buses.has(busId)) {
      this.buses.set(busId, new InMemoryCommandBus());
    }

    return this.buses.get(busId)!;
  }

  getCommandBus(identifier: string): CommandBus | undefined {
    return this.buses.get(identifier);
  }

  deleteCommandBus(identifier: string): void {
    this.buses.delete(identifier);
  }

  listBuses(): string[] {
    return Array.from(this.buses.keys());
  }

  clearAll(): void {
    this.buses.clear();
  }
}