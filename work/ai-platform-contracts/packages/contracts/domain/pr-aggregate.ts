"use strict";

/**
 * PR Aggregate Root - Domain Model
 * 
 * Represents a Pull Request in the autonomous engineering platform.
 * Manages PR lifecycle and produces events for state changes.
 */
import { DomainEvent, AggregateRoot } 
import { PRStatus, GitHubPR, GitHubRepository, GitHubUser }
from './types';

export class PR extends AggregateRoot {
  private _id: number;
  private _issueNumber: number;
  private _repository: GitHubRepository;
  private _head: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
  };
  private _base: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
  };
  private _user: GitHubUser;
  private _title: string;
  private _body?: string;
  private _state: PRStatus;
  private _labels: string[];
  private _createdAt: number;
  private _updatedAt: number;
  private _mergedAt?: number;
  private _closedAt?: number;

  constructor(
    id: number,
    issueNumber: number,
    repository: GitHubRepository,
    head: { ref: string; sha: string; repo: GitHubRepository },
    base: { ref: string; sha: string; repo: GitHubRepository },
    user: GitHubUser,
    title: string,
    body?: string
  ) {
    super();
    if (!id || id <= 0) throw new Error('PR ID must be a positive number');
    if (!issueNumber || issueNumber <= 0) throw new Error('Issue number must be positive');
    if (!repository || !repository.name || !repository.owner) {
      throw new Error('Repository must have valid name and owner');
    }
    if (!head || !head.ref || !head.sha) throw new Error('Head branch must have ref and sha');
    if (!base || !base.ref || !base.sha) throw new Error('Base branch must have ref and sha');
    if (!user || !user.login) throw new Error('User must have login');

    this._id = id;
    this._issueNumber = issueNumber;
    this._repository = repository;
    this._head = head;
    this._base = base;
    this._user = user;
    this._title = title.trim();
    this._body = body?.trim() || undefined;
    this._labels = ['pr:open'];
    this._createdAt = Date.now();
    this._updatedAt = Date.now();
    this._state = PRStatus.OPEN;

    this.raiseEventImmediately(new PRCreatedEvent(this.toDTO()));
  }

  get id(): number {
    return this._id;
  }

  get issueNumber(): number {
    return this._issueNumber;
  }

  get repository(): GitHubRepository {
    return { ...this._repository };
  }

  get head(): { ref: string; sha: string; repo: GitHubRepository } {
    return {
      ref: this._head.ref,
      sha: this._head.sha,
      repo: { ...this._head.repo }
    };
  }

  get base(): { ref: string; sha: string; repo: GitHubRepository } {
    return {
      ref: this._base.ref,
      sha: this._base.sha,
      repo: { ...this._base.repo }
    };
  }

  get user(): GitHubUser {
    return { ...this._user };
  }

  get title(): string {
    return this._title;
  }

  get body(): string | undefined {
    return this._body;
  }

  get state(): PRStatus {
    return this._state;
  }

  get labels(): string[] {
    return [...this._labels];
  }

  get createdAt(): number {
    return this._createdAt;
  }

  get updatedAt(): number {
    return this._updatedAt;
  }

  get html_url(): string {
    return `https://github.com/${this._repository.owner.login}/${this._repository.name}/pull/${this._id}`;
  }

  get mergedAt(): number | undefined {
    return this._mergedAt;
  }

  get closedAt(): number | undefined {
    return this._closedAt;
  }

  get status(): 'open' | 'closed' {
    return this._state === PRStatus.MERGED || this._state === PRStatus.CLOSED ? 'closed' : 'open';
  }

  review(verdict: PRStatus, reviewer: GitHubUser, comments?: string): void {
    if (!Object.values(PRStatus).includes(verdict)) {
      throw new Error(`Invalid PR status: ${verdict}`);
    }

    if (!['passed', 'failed', 'merge-ready'].includes(verdict)) {
      throw new Error(`PR review verdict must be 'passed', 'failed', or 'merge-ready', got: ${verdict}`);
    }

    if (!['passed', 'failed', 'merge-ready'].includes(this._state)) {
      throw new Error(`PR must be in 'reviewing' state for review, current state: ${this._state}`);
    }

    const oldState = this._state;
    this._state = verdict;
    this._updatedAt = Date.now();
    this._labels = this._labels.filter(l => !l.startsWith('pr:'));
    this._labels.push(`pr:${verdict}`);

    if (verdict === PRStatus.MERGED) {
      this._mergedAt = Date.now();
    } else if (verdict === PRStatus.CLOSED) {
      this._closedAt = Date.now();
    }

    this.raiseEventImmediately(
      new PRReviewedEvent(this.toDTO(), oldState, verdict, reviewer, comments)
    );
  }

  merge(): void {
    if (this._state !== PRStatus.MERGE_READY) {
      throw new Error(`PR must be in 'merge-ready' state to merge, current state: ${this._state}`);
    }

    const oldState = this._state;
    this._state = PRStatus.MERGED;
    this._mergedAt = Date.now();
    this._updatedAt = Date.now();
    this._labels = this._labels.filter(l => !l.startsWith('pr:'));
    this._labels.push('pr:merged');

    this.raiseEventImmediately(
      new PRMergedEvent(this.toDTO(), oldState)
    );
  }

  close(): void {
    if (this._state === PRStatus.MERGED) {
      throw new Error('Cannot close a merged PR');
    }

    const oldState = this._state;
    this._state = PRStatus.CLOSED;
    this._closedAt = Date.now();
    this._updatedAt = Date.now();
    this._labels = this._labels.filter(l => !l.startsWith('pr:'));
    this._labels.push('pr:closed');

    this.raiseEventImmediately(
      new PRClosedEvent(this.toDTO(), oldState)
    );
  }

  reprocess(): void {
    if (![PRStatus.FAILED, PRStatus.FIX_REQUIRED, PRStatus.REVIEWING].includes(this._state)) {
      throw new Error(`PR can only be reprocessed from FAILED, FIX_REQUIRED, or REVIEWING states, current: ${this._state}`);
    }

    const oldState = this._state;
    this._state = PRStatus.OPEN;
    this._updatedAt = Date.now();
    this._labels = this._labels.filter(l => !l.startsWith('pr:'));
    this._labels.push('pr:open');

    this.raiseEventImmediately(
      new PRReprocessedEvent(this.toDTO(), oldState)
    );
  }

  addLabel(label: string): void {
    const normalizedLabel = label.trim();
    if (!normalizedLabel || this._labels.includes(normalizedLabel)) return;

    if (normalizedLabel.startsWith('pr:')) {
      this._labels.push(normalizedLabel);
    } else {
      this._labels.push(label);
    }

    this.raiseEventImmediately(
      new PRLabelAddedEvent(this.toDTO(), label)
    );
  }

  removeLabel(label: string): void {
    const index = this._labels.indexOf(label.trim());
    if (index === -1) return;
    const removedLabel = this._labels.splice(index, 1)[0];
    this.raiseEventImmediately(
      new PRLabelRemovedEvent(this.toDTO(), removedLabel)
    );
  }

  toDTO(): any {
    return {
      id: this._id,
      issueNumber: this._issueNumber,
      title: this._title,
      body: this._body,
      repository: this._repository,
      head: this._head,
      base: this._base,
      user: this._user,
      state: this._state,
      labels: [...this._labels],
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      mergedAt: this._mergedAt,
      closedAt: this._closedAt,
      html_url: this.html_url,
      status: this.status
    };
  }

  fromDTO(data: any, events: any[] = []): void {
    const {
      id,
      issueNumber,
      title,
      body,
      repository,
      head,
      base,
      user,
      state,
      labels,
      createdAt,
      updatedAt,
      mergedAt,
      closedAt,
      status
    } = data;

    this._id = id;
    this._issueNumber = issueNumber;
    this._repository = repository;
    this._head = head;
    this._base = base;
    this._user = user;
    this._title = title;
    this._body = body;
    this._labels = [...labels];
    this._state = state;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._mergedAt = mergedAt;
    this._closedAt = closedAt;

    // Replay events to rebuild state consistency
    if (events && events.length > 0) {
      events.forEach(eventData => {
        if (eventData.type === 'PRCreated') {
          // Already initialized
        } else if (eventData.type === 'PRReviewed') {
          this._state = eventData.newState;
          this._labels = eventData.labels;
        } else if (eventData.type === 'PRMerged') {
          this._state = PRStatus.MERGED;
          this._mergedAt = Date.now();
          this._labels = eventData.labels;
        } else if (eventData.type === 'PRClosed') {
          this._state = PRStatus.CLOSED;
          this._closedAt = Date.now();
          this._labels = eventData.labels;
        } else if (eventData.type === 'PRReprocessed') {
          this._state = PRStatus.OPEN;
          this._labels = eventData.labels;
        } else if (eventData.type === 'PRLabelAdded') {
          const normalizedLabel = eventData.label.trim();
          if (!this._labels.includes(normalizedLabel)) {
            this._labels.push(normalizedLabel);
          }
        } else if (eventData.type === 'PRLabelRemoved') {
          const index = this._labels.indexOf(eventData.label);
          if (index !== -1) {
            this._labels.splice(index, 1);
          }
        }
      });
    }
  }

  toSnapshot(): any {
    return this.toDTO();
  }
}

class PRCreatedEvent extends DomainEvent<any> {
  readonly type = 'PRCreated';

  constructor(pr: any) {
    super(
      { pr },
      {
        source: 'pr-management',
        version: '1.0.0'
      }
    );
  }
}

class PRReviewedEvent extends DomainEvent<any> {
  readonly type = 'PRReviewed';

  constructor(
    pr: any,
    readonly oldState: PRStatus,
    readonly newState: PRStatus,
    readonly reviewer: GitHubUser,
    readonly comments?: string
  ) {
    super(
      { pr, oldState, newState, reviewer, comments },
      {
        source: 'pr-management',
        version: '1.0.0'
      }
    );
  }
}

class PRMergedEvent extends DomainEvent<any> {
  readonly type = 'PRMerged';

  constructor(pr: any, readonly oldState: PRStatus) {
    super(
      { pr, oldState },
      {
        source: 'pr-management',
        version: '1.0.0'
      }
    );
  }
}

class PRClosedEvent extends DomainEvent<any> {
  readonly type = 'PRClosed';

  constructor(pr: any, readonly oldState: PRStatus) {
    super(
      { pr, oldState },
      {
        source: 'pr-management',
        version: '1.0.0'
      }
    );
  }
}

class PRReprocessedEvent extends DomainEvent<any> {
  readonly type = 'PRReprocessed';

  constructor(pr: any, readonly oldState: PRStatus) {
    super(
      { pr, oldState },
      {
        source: 'pr-management',
        version: '1.0.0'
      }
    );
  }
}

class PRLabelAddedEvent extends DomainEvent<any> {
  readonly type = 'PRLabelAdded';

  constructor(pr: any, readonly label: string) {
    super(
      { pr, label },
      {
        source: 'pr-management',
        version: '1.0.0'
      }
    );
  }
}

class PRLabelRemovedEvent extends DomainEvent<any> {
  readonly type = 'PRLabelRemoved';

  constructor(pr: any, readonly label: string) {
    super(
      { pr, label },
      {
        source: 'pr-management',
        version: '1.0.0'
      }
    );
  }
}

export { PR, PRCreatedEvent, PRReviewedEvent, PRMergedEvent, PRClosedEvent, PRReprocessedEvent, PRLabelAddedEvent, PRLabelRemovedEvent };