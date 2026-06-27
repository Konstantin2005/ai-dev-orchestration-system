// PR Control Loop — Core Orchestration Components

/**
 * Core agent orchestration for PR control loop
 *
 * Manages lifecycle:
 *   ├─ Issue detection
 *   ├─ PR creation with execution validation
 *   ├─ Review gate processing
 *   ├─ Fix loop management
 *   └─ Merge approval coordination
 */
class PRCOrchestration {
  constructor() {
    this.issueRegistry = new Map();
    this.prTracker = new Map();
    this.executionMonitor = new ExecutionMonitor();
  }

  async handleIssue(event) {
    const issue = this.parseIssueEvent(event);
    console.error(`[ORCHESTRATOR] Processing issue: #${issue.number} - ${issue.title}`);

    this.issueRegistry.set(issue.number, {
      ...issue,
      state: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await this.triggerPipeline(issue);
    return { status: 'queued', issueId: issue.number };
  }

  async triggerPipeline(issue) {
    console.error(`[ORCHESTRATOR] Starting pipeline for issue #${issue.number}`);

    const pipelineSteps = [
      { name: 'architect', status: 'pending', start: this.createArchitecture.bind(this, issue) },
      { name: 'backend', status: 'pending', start: this.executeBackendLogic.bind(this, issue) },
      { name: 'frontend', status: 'pending', start: this.executeFrontendLogic.bind(this, issue) },
      { name: 'qa', status: 'pending', start: this.executeQATests.bind(this, issue) },
      { name: 'orchestrator', status: 'pending', start: this.finalizeExecution.bind(this, issue) },
      { name: 'reviewer', status: 'pending', start: this.triggerReviewerGate.bind(this, issue) }
    ];

    for (const step of pipelineSteps) {
      step.status = 'running';
      try {
        const result = await step.start();
        step.status = 'completed';
        step.result = result;
        console.error(`[ORCHESTRATOR] Step ${step.name} completed: ${JSON.stringify(result).substring(0, 200)}...`);

        if (step.name === 'orchestrator') {
          await this.createPRWithExecution(issue, result);
        }

        if (step.name === 'reviewer') {
          await this.handleReviewerVerdict(issue, result);
        }

      } catch (error) {
        step.status = 'failed';
        step.error = error.message;
        console.error(`[ORCHESTRATOR] Step ${step.name} failed: ${error.message}`);

        if (this.isCriticalFailure(step.name, error)) {
          await this.triggerFixLoop(issue, step);
          break;
        }
      }
    }
  }

  async createPRWithExecution(issue, executionResult) {
    console.error(`[ORCHESTRATOR] Creating PR with execution data for issue #${issue.number}`);

    const prBody = {
      issueId: issue.number,
      title: issue.title,
      executionLog: executionResult.executionLog,
      testResults: executionResult.testResults,
      architectureSummary: executionResult.architectureSummary,
      validationReport: executionResult.validationReport,
      affectedFiles: executionResult.affectedFiles,
      timestamp: new Date().toISOString(),
      prRequirements: {
        executionVerified: true,
        testsVerified: true,
        architectureValid: true,
        securityValidated: true
      }
    };

    return {
      prNumber: this.generatePRNumber(),
      body: JSON.stringify(prBody, null, 2),
      status: 'open',
      createdAt: new Date().toISOString()
    };
  }

  async handleReviewerGate(issue, reviewResult) {
    console.error(`[ORCHESTRATOR] Processing reviewer gate for issue #${issue.number}`);

    if (reviewResult.verdict === 'PASSED') {
      return await this.approveMerge(issue, reviewResult);
    }

    if (reviewResult.verdict === 'FAILED' || reviewResult.verdict === 'FIX_REQUIRED') {
      return await this.initiateFixLoop(issue, reviewResult);
    }

    throw new Error(`Invalid reviewer verdict: ${reviewResult.verdict}`);
  }

  async approveMerge(issue, reviewResult) {
    console.error(`[ORCHESTRATOR] Merge approved for issue #${issue.number}`);
    return {
      status: 'merged',
      mergeTimestamp: new Date().toISOString(),
      reviewerVerification: reviewResult,
      executionVerified: reviewResult.executionVerified,
      testsVerified: reviewResult.testsVerified
    };
  }

  isCriticalFailure(step, error) {
    return ['backend', 'orchestrator', 'reviewer'].includes(step) || error.critical;
  }

  generatePRNumber() {
    return Math.floor(Math.random() * 1000000);
  }
}

class ExecutionMonitor {
  constructor() {
    this.executionTraces = new Map();
  }

  startTrace(issueNumber, node) {
    const traceId = `${issueNumber}-${node}-${Date.now()}`;
    this.executionTraces.set(traceId, {
      id: traceId,
      issueNumber,
      node,
      startTime: Date.now(),
      status: 'running'
    });
    return traceId;
  }

  endTrace(traceId, result) {
    const trace = this.executionTraces.get(traceId);
    if (trace) {
      trace.endTime = Date.now();
      trace.status = 'completed';
      trace.result = result;
      trace.duration = trace.endTime - trace.startTime;
      console.error(`[MONITOR] Execution trace ${traceId} completed in ${trace.duration}ms`);
    }
  }

  getExecutionHistory(issueNumber) {
    return Array.from(this.executionTraces.values())
      .filter(trace => trace.issueNumber === issueNumber)
      .sort((a, b) => b.startTime - a.startTime);
  }
}

module.exports = { PRCOrchestration, ExecutionMonitor };