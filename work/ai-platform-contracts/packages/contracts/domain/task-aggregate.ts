"use strict";

/**
 * Task Aggregate Root - Domain Model
 * 
 * Represents a task in the autonomous engineering platform.
 * Maintains state and produces events for state changes.
 */
import { DomainEvent, AggregateRoot } from './types';
import { TaskStatus, TaskEvent } from './types';

export class Task extends AggregateRoot {
  private _title: string;
  private _description?: string;
  private _assignee?: string;
  private _labels: string[];
  private _priority: 'low' | 'medium' | 'high' | 'critical';
  private _status: TaskStatus;

  constructor(
    id: string,
    title: string,
    description?: string,
    assignee?: string,
    labels: string[] = [],
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super();
    if (!id) throw new Error('Task ID cannot be empty');
    if (!title || title.trim().length === 0) throw new Error('Task title cannot be empty');

    this._id = id;
    this._title = title.trim();
    this._description = description?.trim() || undefined;
    this._assignee = assignee?.trim();
    this._labels = [...labels];
    this._priority = priority;
    this._status = TaskStatus.CREATED;

    this.raiseEventImmediately(new TaskCreatedEvent(this.toDTO()));
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get description(): string | undefined {
    return this._description;
  }

  get assignee(): string | undefined {
    return this._assignee;
  }

  get labels(): string[] {
    return [...this._labels];
  }

  get priority(): 'low' | 'medium' | 'high' | 'critical' {
    return this._priority;
  }

  get status(): TaskStatus {
    return this._status;
  }

  get createdAt(): number {
    return this.collectUncommittedEvents().find(e => e instanceof TaskCreatedEvent)?.timestamp || Date.now();
  }

  assign(assignee: string): void {
    if (!assignee || assignee.trim().length === 0) {
      throw new Error('Assignee cannot be empty');
    }

    if (this._assignee === assignee) {
      return; // Already assigned
    }

    const oldAssignee = this._assignee;
    this._assignee = assignee.trim();
    this.raiseEventImmediately(new TaskAssignedEvent(this.toDTO(), oldAssignee));
  }

  updateStatus(newStatus: TaskStatus): void {
    if (!Object.values(TaskStatus).includes(newStatus)) {
      throw new Error(`Invalid task status: ${newStatus}`);
    }

    if (this._status === newStatus) {
      return; // Already in this state
    }

    const oldStatus = this._status;
    this._status = newStatus;
    this.raiseEventImmediately(new TaskStatusChangedEvent(this.toDTO(), oldStatus));
  }

  updateDescription(description: string): void {
    const oldDescription = this._description;
    this._description = description.trim() || undefined;
    if (oldDescription !== this._description) {
      this.raiseEventImmediately(new TaskDescriptionUpdatedEvent(this.toDTO(), oldDescription));
    }
  }

  addLabel(label: string): void {
    const normalizedLabel = label.trim();
    if (!normalizedLabel || this._labels.includes(normalizedLabel)) return;
    this._labels.push(normalizedLabel);
    this.raiseEventImmediately(new TaskLabelAddedEvent(this.toDTO(), label));
  }

  removeLabel(label: string): void {
    const index = this._labels.indexOf(label.trim());
    if (index === -1) return;
    const removedLabel = this._labels.splice(index, 1)[0];
    this.raiseEventImmediately(new TaskLabelRemovedEvent(this.toDTO(), removedLabel));
  }

  setPriority(newPriority: 'low' | 'medium' | 'high' | 'critical'): void {
    if (this._priority === newPriority) return;
    const oldPriority = this._priority;
    this._priority = newPriority;
    this.raiseEventImmediately(new TaskPriorityChangedEvent(this.toDTO(), oldPriority));
  }

  complete(): void {
    if (this._status === TaskStatus.COMPLETED) return;
    if (this._status === TaskStatus.FAILED) {
      throw new Error('Cannot complete a failed task');
    }
    this.updateStatus(TaskStatus.COMPLETED);
  }

  fail(): void {
    if (this._status === TaskStatus.FAILED) return;
    this.updateStatus(TaskStatus.FAILED);
  }

  toDTO(): any {
    return {
      id: this._id,
      title: this._title,
      description: this._description,
      assignee: this._assignee,
      labels: [...this._labels],
      priority: this._priority,
      status: this._status
    };
  }

  fromDTO(data: any, events: any[] = []): void {
    const {
      id,
      title,
      description,
      assignee,
      labels,
      priority,
      status
    } = data;

    this._id = id;
    this._title = title;
    this._description = description;
    this._assignee = assignee;
    this._labels = [...labels];
    this._priority = priority;
    this._status = status;

    // Replay events to rebuild state consistency
    if (events && events.length > 0) {
      events.forEach(eventData => {
        if (eventData.type === 'TaskCreated') {
          // Already initialized
        } else if (eventData.type === 'TaskAssigned') {
          this._assignee = eventData.assignee;
        } else if (eventData.type === 'TaskStatusChanged') {
          this._status = eventData.newStatus;
        } else if (eventData.type === 'TaskDescriptionUpdated') {
          this._description = eventData.newDescription;
        } else if (eventData.type === 'TaskLabelAdded') {
          this._labels.push(eventData.label);
        } else if (eventData.type === 'TaskLabelRemoved') {
          const index = this._labels.indexOf(eventData.label);
          if (index !== -1) {
            this._labels.splice(index, 1);
          }
        } else if (eventData.type === 'TaskPriorityChanged') {
          this._priority = eventData.newPriority;
        }
      });
    }
  }

  toSnapshot(): any {
    return this.toDTO();
  }
}

class TaskCreatedEvent extends DomainEvent<any> {
  readonly type = 'TaskCreated';
  readonly newStatus = TaskStatus.CREATED;

  constructor(task: any) {
    super(
      { task },
      {
        source: 'task-management',
        version: '1.0.0'
      }
    );
  }
}

class TaskAssignedEvent extends DomainEvent<any> {
  readonly type = 'TaskAssigned';

  constructor(task: any, readonly oldAssignee: string | undefined) {
    super(
      { task, oldAssignee },
      {
        source: 'task-management',
        version: '1.0.0'
      }
    );
  }
}

class TaskStatusChangedEvent extends DomainEvent<any> {
  readonly type = 'TaskStatusChanged';

  constructor(task: any, readonly oldStatus: TaskStatus) {
    super(
      { task, oldStatus, newStatus: task.status },
      {
        source: 'task-management',
        version: '1.0.0'
      }
    );
  }
}

class TaskDescriptionUpdatedEvent extends DomainEvent<any> {
  readonly type = 'TaskDescriptionUpdated';

  constructor(task: any, readonly oldDescription: string | undefined) {
    super(
      { task, oldDescription, newDescription: task.description },
      {
        source: 'task-management',
        version: '1.0.0'
      }
    );
  }
}

class TaskLabelAddedEvent extends DomainEvent<any> {
  readonly type = 'TaskLabelAdded';

  constructor(task: any, readonly label: string) {
    super(
      { task, label },
      {
        source: 'task-management',
        version: '1.0.0'
      }
    );
  }
}

class TaskLabelRemovedEvent extends DomainEvent<any> {
  readonly type = 'TaskLabelRemoved';

  constructor(task: any, readonly label: string) {
    super(
      { task, label },
      {
        source: 'task-management',
        version: '1.0.0'
      }
    );
  }
}

class TaskPriorityChangedEvent extends DomainEvent<any> {
  readonly type = 'TaskPriorityChanged';

  constructor(task: any, readonly oldPriority: 'low' | 'medium' | 'high' | 'critical') {
    super(
      { task, oldPriority, newPriority: task.priority },
      {
        source: 'task-management',
        version: '1.0.0'
      }
    );
  }
}

export { Task, TaskCreatedEvent, TaskAssignedEvent, TaskStatusChangedEvent, TaskDescriptionUpdatedEvent, TaskLabelAddedEvent, TaskLabelRemovedEvent, TaskPriorityChangedEvent };