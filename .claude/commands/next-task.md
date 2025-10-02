# Start Next Task

Begin work on the next task following TaskMaster workflow rules.

## 🔴 CRITICAL WORKFLOW RULES

### ONE SUBTASK AT A TIME

- Complete ONE subtask → Get approval → Commit → ONLY THEN start next
- If task has subtasks, do them according to their interdependency (as a rule - sequentially)
- NEVER implement multiple subtasks without approval between each
- After each subtask: STOP and ask "Ready to continue with next subtask?"

### COMMIT APPROVAL REQUIRED

- NEVER commit without explicit user approval
- Always ask: "Ready for manual testing before commit?"
- Wait for user to say "yes", "proceed", or give clear approval
- User may request fixes - implement them before asking again

### BUILD VALIDATION MANDATORY

- Before ANY commit, validate changes based on what you changed:
  1. **For simple single package changes** (UI, docs, simple utils):
     - Navigate to package: `cd packages/<package-name>`
     - Run: `yarn build && yarn typecheck && yarn lint && yarn test`
     - Fast local checks (~30 seconds)

  2. **For database/performance/integration changes**:
     - **🔴 MANDATORY**: Run from root: `yarn validate:all` (~6-8 minutes)
     - **MUST use `validate:all` when changing:**
       - Database (schema, migrations, queries, indexes)
       - Repository layer or data access code
       - Performance code (query optimization, caching)
       - API + DB integration
       - Redis, background jobs, async operations
       - Batch processing or large datasets
       - Any code tested by Testcontainers

  3. **For other multi-package changes**:
     - **Fast option**: `yarn validate` (~2-3 minutes, skips [perf] tests)
     - **When in doubt**: `yarn validate:all` (safer, includes integration)

- **If ANY command fails**, fix errors before proceeding
- **This applies to EVERY subtask and main task**
- **Integration tests exist for a reason** - don't skip them when they matter!

### DOCKER CHECK FOR TEST FAILURES

- If integration tests fail during validation:
  1. **Check Docker status**: `docker ps`
  2. **If Docker is not running**, ask user to start it:

     ```bash
     sudo service docker start
     ```

  3. **Wait for Docker to start** before retrying tests
  4. **Common Docker-related failures**:
     - Database connection errors
     - Container startup failures
     - Port binding issues (ECONNREFUSED)
     - Test database initialization problems

## Workflow Execution

### Phase 1: Pre-Flight Checks

#### Branch Verification (CRITICAL)

1. **Check current task and its branch**:
   - Get current task: `tm current`
   - Check current Git branch: `git branch --show-current`
   - If current task exists and has an associated branch (task/X.Y-description):
     - Verify we're on the correct branch
     - If NOT on correct branch:

       ```bash
       # Example: Current task is 1.2 but we're on main
       git checkout task/1.2-feature  # Switch to task branch
       ```

     - If task branch doesn't exist yet, it will be created in Phase 3

2. **Handle uncommitted changes**:
   - Check for changes: `git status --porcelain`
   - If uncommitted changes exist:
     - If on wrong branch: "You have uncommitted changes on [branch]. Please commit or stash before switching branches."
     - Stop and wait for user to resolve

3. **Check for unmerged PRs**: `gh pr list --state=open`
   - If there are unmerged PRs, warn user and ask if they want to continue

4. **Only sync main if no active task or starting fresh**:
   - If no current task in progress: `git checkout main && git pull origin main`
   - If task in progress: Stay on task branch

### Phase 2: Task Selection

- Get next task using `tm next` or use provided task ID if specified
- Set task status to in-progress: `tm set-status --id=<task-id> --status=in-progress`
- **IMPORTANT**: After setting status, Task Master updates tasks.json
- Ensure we're on the correct branch before proceeding (see Phase 3)

### Phase 3: Branch Strategy

#### Determine correct branch:

1. **Check task hierarchy**:
   - Use `tm list --parent=<task-id>` to check for subtasks
   - Use `tm show <task-id>` to see task details and parent

2. **Branch creation rules**:
   - **Top-level task (parent or leaf)** → Create branch `task/<id>-<description>` from `main`
   - **Intermediate task (has parent AND subtasks)** → Create branch `task/<id>-<description>` from parent's branch
   - **Leaf task (has parent, NO subtasks)** → Work on parent's branch (no new branch)

3. **Branch base determination**:

   ```bash
   # Top-level tasks → base on main
   git checkout main
   git checkout -b task/1-feature

   # Intermediate tasks → base on parent's branch
   git checkout task/1-feature
   git checkout -b task/1.1-sub-feature

   # Leaf tasks → work on parent's branch (no new branch)
   git checkout task/1-feature  # or task/1.1-sub-feature
   # work here directly
   ```

4. **Branch switching logic**:

   ```bash
   # Get current branch
   current_branch=$(git branch --show-current)

   # Determine target branch based on task hierarchy:
   # - Top-level (no parent) → create from main
   # - Has parent AND subtasks → create from parent's branch
   # - Has parent, NO subtasks → use parent's branch

   # Switch/create if needed
   if [ "$current_branch" != "$target_branch" ]; then
       # First checkout base branch (main or parent)
       git checkout $base_branch
       # Then create/switch to target
       git checkout $target_branch || git checkout -b $target_branch
   fi
   ```

5. **Verify branch state**:
   - After switching, pull latest changes: `git pull origin <branch-name> --rebase`
   - Ensure tasks.json is up to date on this branch
   - If conflicts, resolve before proceeding

### Phase 4: Development Setup

#### For All Tasks

1. **Review requirements**: Check task description and acceptance criteria
2. **Get Context7 documentation** for ALL libraries that will be used
3. **Implement the functionality**
4. **Write tests if needed** to validate critical functionality
5. **Ensure build passes** and code works as expected

## 📋 IMPLEMENTATION CHECKLIST

**For EVERY subtask, follow this sequence:**

### 1. Get Documentation FIRST

- [ ] Identify ALL libraries/tools that will be used
- [ ] Get Context7 docs for each library BEFORE writing any code

### 2. Implementation

- [ ] Implement the functionality
- [ ] Write tests if appropriate for validation
- [ ] Ensure code works as expected

### 3. Validation (Optimized)

- [ ] Identify affected package(s) using `git diff --name-only`
- [ ] **Single package changes** (most common):
  - [ ] Navigate to package: `cd packages/<package-name>`
  - [ ] Run local validation: `yarn build && yarn typecheck && yarn lint && yarn test`
  - [ ] Time saved: ~30 seconds vs ~2-3 minutes for full check
  - [ ] Optional: Run full monorepo check if critical changes
- [ ] **Multi-package or root changes**:
  - [ ] **Fast validation**: `yarn validate` (~2-3 minutes, skips [perf] tests)
  - [ ] **OR Complete validation**: `yarn validate:all` (~6-8 minutes, all tests)
  - [ ] Use `validate` during development, `validate:all` before final commit
- [ ] **If integration tests fail**:
  - [ ] Check Docker status: `docker ps`
  - [ ] If Docker not running, ask user: `sudo service docker start`
  - [ ] Retry tests after Docker starts
- [ ] Fix ALL errors before proceeding
- [ ] Verify functionality works as expected
- [ ] **Note**: This validation will be remembered - if this is the last subtask, `/complete-task` will auto-create PR

### 4. Approval Gate

- [ ] Ask: "Ready for manual testing before commit?"
- [ ] WAIT for explicit user approval
- [ ] If changes requested, implement and return to step 3

### 5. Commit

- [ ] Update subtask status to done: `tm set-status --id=<subtask-id> --status=done`
- [ ] **If this is the LAST subtask**: Also update parent status: `tm set-status --id=<parent-id> --status=done`
- [ ] Stage ALL changes including tasks.json: `git add <changed-files> .taskmaster/tasks/tasks.json`
- [ ] Create meaningful commit message with feature work (NOT separate chore commits for status)
- [ ] **ONE commit** should include: implementation changes + task status updates

### 6. Next Subtask Check

- [ ] Report: "Subtask X.Y complete. Ready for subtask X.Z?"
- [ ] WAIT for user permission
- [ ] Only proceed if approved

## Remember These Critical Rules

⚠️ **BRANCH VERIFICATION** - always ensure on correct branch for current task
⚠️ **ONE subtask at a time** - never jump ahead
⚠️ **Context7 docs FIRST** - before writing any code
⚠️ **Manual testing approval** - before EVERY commit
⚠️ **Build validation** - must pass before commit
⚠️ **Docker check** - verify Docker running if tests fail

## Branch Management Best Practices

### Avoiding Branch Confusion

1. **Always verify branch before starting work**:

   ```bash
   git branch --show-current  # Check current branch
   tm current                  # Check current task
   ```

2. **Task-to-branch mapping examples**:

   ```
   main
   ├── task/1-setup-backend (top-level with subtasks, from main)
   │   ├── task/1.1-database (intermediate with subtasks, from task/1)
   │   │   ├── 1.1.1 (leaf, works on task/1.1-database)
   │   │   └── 1.1.2 (leaf, works on task/1.1-database)
   │   └── task/1.2-api (intermediate with subtasks, from task/1)
   │       ├── 1.2.1 (leaf, works on task/1.2-api)
   │       └── 1.2.2 (leaf, works on task/1.2-api)
   └── task/2-postgresql (top-level, no subtasks, from main)
   ```

3. **When confusion occurs**:
   - If on `main` but should be on task branch:

     ```bash
     # Check if you have uncommitted work
     git status
     # If clean, switch to correct branch
     git checkout task/1.2-feature
     # If not clean, stash first
     git stash
     git checkout task/1.2-feature
     git stash pop
     ```

4. **Prevent branch drift**:
   - Before each subtask: Verify branch
   - After each commit: Stay on task branch
   - Don't switch to main until task fully complete

## Common Docker Troubleshooting

### Symptoms of Docker Issues

- **Database tests failing**: Connection refused to localhost:5432 (PostgreSQL), :3306 (MySQL), :27017 (MongoDB)
- **Redis tests failing**: Connection refused to localhost:6379
- **Container errors**: "Cannot connect to Docker daemon", "docker: command not found"
- **Health check failures**: Containers not becoming healthy in time

### Quick Docker Fixes

1. **Start Docker service**:

   ```bash
   sudo service docker start     # Linux
   # OR
   sudo systemctl start docker   # SystemD-based systems
   ```

2. **Verify Docker is running**:

   ```bash
   docker ps                      # Should list running containers
   docker info                    # Should show Docker system info
   ```

3. **Check container health**:

   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}"
   ```

4. **Restart problematic containers**:

   ```bash
   docker-compose restart         # If using docker-compose
   # OR
   docker restart <container-name>
   ```

Always inform user if Docker needs to be started before running integration tests!
