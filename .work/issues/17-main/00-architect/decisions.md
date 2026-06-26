# Decisions Log — Issue #17

## D1: Merge agent-core as CJS, not ESM
The agent-core is ESM. The host system is CJS. Converting to CJS avoids dynamic import() complexity and ensures `require()` consistency. All merged files will use `module.exports` / `require()`.

## D2: agent-core src/agents/ → core/agents/
These are agent IMPLEMENTATIONS (ArchitectAgent, BackendAgent, etc.), not agent definitions. They belong in `core/` because they are the reusable agent layer that the bridge can invoke.

## D3: bridge/ created for INPUT adaptation, not OUTPUT
The bridge translates issue formats (ObsidianMain) into execution tasks. It does NOT create outputs — that's the Graph's job.

## D4: templates/ merge — keep both
agent-core has 8 templates with custom syntax `[var]`, `{% if %}`, `{% each %}`. This repo has 5 prompt templates. Both are valuable and non-overlapping. Keep both sets.

## D5: validators/ extracted from runtime/
The issue asks for `validators/` as a top-level dir. Move `runtime/validate-output.js` to `validators/validate-output.js`. Update imports.

## D6: engine/ bootstrap kept, but marked as legacy
`engine/bootstrap.sh` is a simple shell script. Keep it but add deprecation notice.

## D7: NO agent-core repo deletion here
I cannot delete the remote repo via API. The merge is done on the filesystem. Deletion of the agent-core GitHub repo is a manual post-step.
