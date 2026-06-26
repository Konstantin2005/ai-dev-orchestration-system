/**
 * Telemetry hooks for agent-core integration.
 * Attaches error capture to agents, pipeline, and template engine.
 */

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
      errorLogger.capture(err, `agent.${agent.name}`, 'error');
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
      errorLogger.capture(err, `pipeline.${stage?.name || 'unknown'}`, 'error');
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
      errorLogger.capture(err, 'template.engine', 'warning');
      throw err;
    }
  };

  return engine;
}
