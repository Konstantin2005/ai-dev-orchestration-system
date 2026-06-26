# Validation Pipeline

## Zero-Trust Validation Steps

### 1. Input Sanitization
- Strip `/`, `\`, `..`, `~` from title
- Enforce max length (title: 200, body: 10KB)
- Remove control characters

### 2. JSON Schema Check
```json
{
  "architecture": { "summary": "", "flow": "", "decisions": [] },
  "files": [{ "path": "", "content": "" }],
  "logs": { "architect": "", "backend": "", "frontend": "", "qa": "", "reviewer": "" },
  "status": "READY_FOR_PR"
}
```

### 3. Path Whitelist
- Must start with: `/workspace/issues/<id>-<slug>/`
- Forbidden: `../`, `..\\`, `/etc/`, absolute paths

### 4. Extension Allowlist
- Allowed: `.md`, `.json`, `.log`, `.txt`, `.yml`, `.yaml`, `.js`, `.ts`, `.py`, `.sh`

### 5. Content Limits
- Max 50K chars per file
- Max 50 files per output
- Max 10K chars per log entry
