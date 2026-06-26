#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# bootstrap.sh — Multi-platform submodule bootstrap
#
# Detects project root, verifies git repo, reads project context, and
# initialises the .ai-system workspace.  Idempotent: safe to run multiple
# times.
###############################################################################

# ---- helpers ----------------------------------------------------------------
info()  { printf '\033[0;34m[INFO]\033[0m %s\n' "$*" >&2; }
ok()    { printf '\033[0;32m[ OK ]\033[0m %s\n' "$*" >&2; }
warn()  { printf '\033[0;33m[WARN]\033[0m %s\n' "$*" >&2; }
err()   { printf '\033[0;31m[ERR ]\033[0m %s\n' "$*" >&2; exit 1; }

# ---- 1. detect project root -------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_SYSTEM_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$AI_SYSTEM_DIR/.." && pwd)"

info "AI system dir : $AI_SYSTEM_DIR"
info "Project root  : $PROJECT_ROOT"

# ---- 2. verify git repository ------------------------------------------------
if ! git -C "$PROJECT_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
    err "$PROJECT_ROOT is not a git repository"
fi
ok "Git repository verified"

# ---- 3. detect project language & test framework -----------------------------
detect_language() {
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        echo "nodejs"
    elif [ -f "$PROJECT_ROOT/requirements.txt" ] || [ -f "$PROJECT_ROOT/setup.py" ] || [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
        echo "python"
    elif [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
        echo "rust"
    elif [ -f "$PROJECT_ROOT/go.mod" ]; then
        echo "go"
    elif [ -f "$PROJECT_ROOT/CMakeLists.txt" ]; then
        echo "cpp"
    elif [ -f "$PROJECT_ROOT/pom.xml" ] || [ -f "$PROJECT_ROOT/build.gradle" ]; then
        echo "java"
    else
        echo "unknown"
    fi
}

detect_test_framework() {
    local lang="$1"
    case "$lang" in
        nodejs)
            if grep -q '"jest"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
                echo "jest"
            elif grep -q '"mocha"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
                echo "mocha"
            elif grep -q '"vitest"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
                echo "vitest"
            elif grep -q '"node --test"' "$PROJECT_ROOT/package.json" 2>/dev/null ||
                 grep -q '"node:test"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
                echo "node:test"
            else
                echo "unknown"
            fi
            ;;
        python)
            if [ -f "$PROJECT_ROOT/pytest.ini" ] || [ -f "$PROJECT_ROOT/pyproject.toml" ] && grep -q 'pytest' "$PROJECT_ROOT/pyproject.toml" 2>/dev/null; then
                echo "pytest"
            elif grep -qr 'unittest' "$PROJECT_ROOT" --include='*.py' 2>/dev/null; then
                echo "unittest"
            else
                echo "unknown"
            fi
            ;;
        rust)
            echo "cargo-test"
            ;;
        go)
            echo "go-test"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

LANGUAGE="$(detect_language)"
TEST_FRAMEWORK="$(detect_test_framework "$LANGUAGE")"
info "Detected language      : $LANGUAGE"
info "Detected test framework: $TEST_FRAMEWORK"

# ---- 4. create workspace directory -------------------------------------------
WORKSPACE_DIR="$AI_SYSTEM_DIR/workspace"
mkdir -p "$WORKSPACE_DIR"
ok "Workspace directory ready: $WORKSPACE_DIR"

# ---- 5. create .ai-project-context.json ---------------------------------------
CONTEXT_FILE="$PROJECT_ROOT/.ai-project-context.json"

cat > "$CONTEXT_FILE" <<JSONEOF
{
  "version": "1.0",
  "projectRoot": "$PROJECT_ROOT",
  "language": "$LANGUAGE",
  "testFramework": "$TEST_FRAMEWORK",
  "detectedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSONEOF
ok "Project context written: $CONTEXT_FILE"

# ---- 6. validate required directories exist -----------------------------------
REQUIRED=(
    "$AI_SYSTEM_DIR/core"
    "$AI_SYSTEM_DIR/runtime"
    "$AI_SYSTEM_DIR/engine"
    "$AI_SYSTEM_DIR/workflows"
    "$AI_SYSTEM_DIR/templates"
)
for dir in "${REQUIRED[@]}"; do
    if [ -d "$dir" ]; then
        ok "Required directory exists: $dir"
    else
        warn "Missing required directory: $dir"
    fi
done

# ---- 7. create empty workspace subdirs for architect & reviewer ----------------
mkdir -p "$WORKSPACE_DIR/00-architect"
mkdir -p "$WORKSPACE_DIR/04-code-reviewer"
ok "Workspace subdirectories initialised"

info "Bootstrap complete — project ready for AI orchestration."
