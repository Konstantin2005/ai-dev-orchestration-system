param(
    [int]$IssueId,
    [string]$Title,
    [string]$Body
)

$slug = $Title.ToLower() -replace '[^a-z0-9\s]', '' -replace '\s+', '-'
$dir = ".work\issues\$IssueId-$slug"

Write-Host "Creating workspace: $dir"

# Create role directories
@('00-architect', '01-backend-engineer', '02-frontend-engineer', '03-qa-engineer', '04-code-reviewer', 'shared', 'logs') | ForEach-Object {
    New-Item -ItemType Directory -Path "$dir\$_" -Force | Out-Null
}

# Create context.md
@"
# Context: Issue #$IssueId

## Общая информация
- **Issue:** #$IssueId
- **Title:** $Title

## Описание задачи
$Body

## Статус
- [ ] Architect
- [ ] Backend
- [ ] Frontend
- [ ] QA
- [ ] Code Review
"@ | Set-Content -Path "$dir\shared\context.md"

# Create initial orchestrator log
$timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
@"
[$timestamp] ORCHESTRATOR: Issue #$IssueId received
[$timestamp] ORCHESTRATOR: Workspace created at $dir
[$timestamp] ORCHESTRATOR: Roles initialized: Architect, Backend, Frontend, QA, Code Reviewer
[$timestamp] ORCHESTRATOR: Pipeline ready for AI agents
"@ | Set-Content -Path "$dir\logs\orchestrator.log"

Write-Host "Workspace created successfully at $dir"
