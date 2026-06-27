let _capturing = false;

function safeCapture(logger, err, source, severity) {
  if (_capturing) return;
  _capturing = true;
  try {
    logger.capture(err, source, severity);
  } catch {
    // telemetry must never throw or re-trigger
  } finally {
    _capturing = false;
  }
}

export function createAgentTelemetry(agent, errorLogger) {
  const originalExecute = agent.execute.bind(agent);

  agent.execute = async (context) => {
    try {
      return await originalExecute(context);
    } catch (err) {
      err.context = {
        agentName: agent.name,
        agentRole: agent.role,
        workspace: context?.workspace,
        issueId: context?.memory?.get?.('issue')?.id,
      };
      safeCapture(errorLogger, err, `agent.${agent.name}`, 'error');
      throw err;
    }
  };

  return agent;
}

export function createPipelineTelemetry(pipeline, errorLogger) {
  const originalRunStage = pipeline.#runStage;

  pipeline.#runStage = async (stage, workspace, memory) => {
    try {
      return await originalRunStage.call(pipeline, stage, workspace, memory);
    } catch (err) {
      err.context = {
        stageName: stage?.name,
        workspace,
      };
      safeCapture(errorLogger, err, `pipeline.${stage?.name || 'unknown'}`, 'error');
      throw err;
    }
  };

  return pipeline;
}

export function createTemplateTelemetry(engine, errorLogger) {
  const originalRender = engine.render.bind(engine);

  engine.render = (template, variables) => {
    try {
      return originalRender(template, variables);
    } catch (err) {
      err.context = { templatePreview: template?.slice(0, 100) };
      safeCapture(errorLogger, err, 'template.engine', 'warning');
      throw err;
    }
  };

  return engine;
}
