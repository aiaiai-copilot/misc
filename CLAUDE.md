# TaskMaster Project Standards & Guidelines

## 🎯 CORE PRINCIPLES

**These principles define HOW we work on this project:**

### 1. PRAGMATIC DEVELOPMENT

**Focus on implementation with practical validation**

- Implement features incrementally
- Validate functionality works as expected
- Write tests when they add value
- Configuration and setup tasks may not require tests

#### Task Completion Requirements

**A task or subtask can be marked as complete when:**

- ✅ Code is implemented and working
- ✅ Build passes without errors
- ✅ Manual testing confirms functionality
- ✅ User approves the implementation

### 2. CURRENT DOCUMENTATION

**Always use up-to-date documentation via Context7 MCP**

- Get current docs BEFORE using any external library
- Never rely on potentially outdated knowledge
- Applies to all external dependencies

### 3. BUILD QUALITY GATES

**All code must pass quality checks before commit**

- **Standard validation**: `yarn validate` (build + typecheck + lint + test)
  - Includes ALL tests (regular + performance + integration)
  - Use for most development work

- **Fast validation**: `yarn validate:fast` (build + typecheck + lint + test:fast)
  - Excludes performance tests tagged with `[perf]` for faster feedback
  - Use during iterative development for quick validation
  - **⚠️ Only for non-critical changes** (UI fixes, documentation, simple logic)
  - **🔴 MANDATORY to run full validation before commit**

- **Standard validation is MANDATORY for these changes:**
    - Database schema, migrations, or queries
    - Repository implementations or data access layer
    - Performance-critical code or optimizations
    - Integration between multiple services
    - Caching, background jobs, or async operations
    - API contracts with database interactions
    - Any code touching Testcontainer-tested functionality
  - Use before final commits or in CI/CD

- No commit should be made if any check fails
- Fix all errors before proceeding

**🔴 CRITICAL RULE: When in doubt, use `yarn validate` (full validation)**

If your changes involve:

- ❌ Database (PostgreSQL, Redis, migrations)
- ❌ Performance (queries, indexes, optimizations)
- ❌ Integration (API + DB, caching, async jobs)
- ❌ Repository layer or data access
- ❌ Batch operations or large datasets

→ **You MUST run `yarn validate`** to ensure all tests pass!

**Test Script Variants:**

```bash
yarn test        # All tests (regular + performance)
yarn test:fast   # Fast tests only (excludes [perf] tagged tests)
yarn test:perf   # Performance tests only ([perf] tagged tests)
```

See [.claude/TEST-TAGGING-EXAMPLES.md](.claude/TEST-TAGGING-EXAMPLES.md) for details on performance test tagging.

**🔴 CRITICAL**: See [.claude/VALIDATION-RULES.md](.claude/VALIDATION-RULES.md) for **mandatory** validation rules.
**Future sessions: READ THIS DOCUMENT to understand when `validate` (full) is REQUIRED!**

#### 🔴 CRITICAL: Test Validation Protocol

**MANDATORY test completion verification:**

1. **ALL tests MUST complete successfully** - no timeouts, no partial results
2. **Must see exact pattern**: `Tests: X passed, X total` (where both X are equal, zero failures)
3. **If tests timeout**: IMMEDIATELY increase timeout, never proceed on assumptions

**Timeout Handling Rules:**

```bash
# STEP 1: When tests timeout, increase Jest timeout
# Edit jest.config.js or package-specific config:
testTimeout: 300000  # 5 minutes for performance tests

# STEP 2: Or use per-test timeout
describe('Performance Tests', () => {
  jest.setTimeout(300000);
});

# STEP 3: Or command-line override
yarn test --testTimeout=300000
```

**NEVER:**

- ❌ Proceed with incomplete test validation
- ❌ Assume partial success = complete success
- ❌ Accept timeouts without increasing timeout
- ❌ Reduce test comprehensiveness to avoid timeouts

**ALWAYS:**

- ✅ Show final test count: "Tests: 80/80 passed (100%)"
- ✅ Increase timeout generously for performance/integration tests
- ✅ Verify 100% completion before any commit approval
- ✅ Performance tests with large datasets SHOULD take time

**Correct Validation Output:**

```
✅ Build: Success
✅ TypeScript: Success
✅ Lint: Success
✅ Tests: 142/142 passed (100% success rate)
```

**WRONG Validation Output:**

```
✅ Build: Success
✅ TypeScript: Success
✅ Lint: Success
❌ Missing test results!
```

### 4. INCREMENTAL DELIVERY

**Work must be completed incrementally with validation**

- One subtask at a time with approval between each
- Manual testing approval required before every commit
- Clear progress tracking and status updates

---

## 🧪 TESTING STANDARDS

### Testing Approach

**Write tests when they add value, not as a requirement**

- Tests validate implementation after code is written
- Focus on critical functionality and edge cases
- Integration tests for database/API operations when needed
- E2E tests for user workflows
- Manual testing is equally important

### Test Classification

| Test Type   | Dependencies | When to Use             | Tools            | Speed            |
| ----------- | ------------ | ----------------------- | ---------------- | ---------------- |
| Unit        | Mocked       | Isolated logic          | Jest + Mocks     | Fast (ms)        |
| Integration | Real         | Database/API operations | Jest             | Medium (seconds) |
| E2E         | Full stack   | User workflows          | Playwright       | Slow (minutes)   |

### File Naming Convention

```bash
# Unit tests
*.test.ts
*-unit.test.ts

# Integration tests
*-integration.test.ts

# End-to-end tests
*.e2e.test.ts
*.spec.ts
```

### Test Quality Requirements

1. **Type Safety**: No `any` types in test code
2. **Cleanup**: Proper resource disposal (`afterAll`, `beforeEach`)
3. **Isolation**: Tests don't depend on each other
4. **Assertions**: Clear, specific expectations

---

## 🎨 E2E TESTING STANDARDS

### When Adding New UI Components

1. CREATE new E2E tests in `e2e/` following naming `XX-feature-name.spec.ts`
2. UPDATE page objects in `e2e/support/page-objects/`
3. TEST all user interactions and accessibility
4. VERIFY error scenarios and edge cases

### When Modifying Existing UI

1. UPDATE affected E2E tests to match new behavior
2. MODIFY page object methods if selectors change
3. VERIFY backward compatibility
4. TEST transition periods

### When Removing UI Features

1. REMOVE corresponding E2E tests
2. CLEAN UP page object methods
3. UPDATE dependent test suites

### E2E Coverage Requirements

- **Functionality**: Core features work as expected
- **User flows**: Complete journeys from start to finish
- **Error handling**: Graceful failure and recovery
- **Accessibility**: Keyboard navigation, focus management, ARIA
- **Cross-component integration**: Component interactions
- **Data integrity**: CRUD operations

### E2E Quality Standards

- Use semantic selectors (`data-testid`)
- Write descriptive test names (Given-When-Then)
- Include multilingual content support
- Test realistic scenarios
- Maintain test independence
- Clean up test data between tests

---

## 📚 CONTEXT7 MCP USAGE

Use Context7 to get current documentation for ANY external library:

```javascript
// Step 1: Resolve library ID
mcp__context7__resolve - library - id('library-name');

// Step 2: Get documentation with specific topic
mcp__context7__get -
  library -
  docs('/resolved/library-id', {
    topic: 'specific-feature', // e.g., "migrations", "testing"
    tokens: 8000, // increase for complex topics
  });
```

**Always get documentation BEFORE using any external library or framework.**

---

## 🏗️ BRANCHING STRATEGY

### Branch Hierarchy

- **Parent tasks** (have subtasks) → Create new branch
- **Leaf tasks** (no subtasks) → Work on parent's branch

### Branch Naming

- Format: `task/<id>-<description>`
- Use lowercase, hyphens for spaces
- Keep under 50 characters

### Merge Strategy

- **Top-level branches** → Merge into `main`
- **Intermediate branches** → Merge into parent branch
- **Leaf tasks** → Already on parent branch (no merge)

### Pull Request Rules

- **Top-level tasks** → PR to `main`
- **Intermediate tasks** → PR to parent branch
- **Leaf tasks** → No PR needed

---

## 🚀 WORKFLOW AUTOMATION

### Available Commands

**TaskMaster Commands (enforce all workflow rules automatically):**

- `/next-task` - Start work on next priority task
- `/complete-task` - Complete current task with validation (auto-creates PR when entire task done)
- `/fix-errors <package>` - Fix errors in specific package (for new sessions)

**Commands enforce:**

- One subtask at a time workflow
- Mandatory build validation before commits
- Manual testing approval gates
- Proper git branching strategy
- Automated PR creation

### Command Location

Place command files in:

- `.claude/commands/` - Project-specific commands (shared with team)
- `~/.claude/commands/` - Personal commands (user-specific)

### Workflow Sequence

1. **Start**: `/next-task` → Get next task from TaskMaster
2. **Work**: Implement the functionality
3. **Complete**: `/complete-task` → Validates build, gets approval, then commits
4. **Repeat**: For each task (with approval between)
5. **Auto-PR**: `/complete-task` on final subtask → Auto-detects completion, creates PR automatically

### New Session Recovery (After Context Loss)

**When starting a NEW SESSION to continue work:**

1. **If fixing errors**: Use `/fix-errors <package>` command
   - Example: `/fix-errors backend` or `/fix-errors infrastructure/postgresql`
   - Focuses on single package to avoid overwhelming context
   - Ensures build passes in that package

2. **Key reminders for new sessions**:
   - Fix one package completely before moving to another
   - Run validation before committing
   - Get manual testing approval

---

## 📁 PROJECT REFERENCES

- **Test Specifications**: `.taskmaster/docs/prd.txt`
- **Task Definitions**: `.taskmaster/tasks/tasks.json`
- **E2E Tests**: `e2e/`
- **E2E Guidelines**: `e2e/README.md`
- **TaskMaster CLI**: `.taskmaster/CLAUDE.md`
- **Context Recovery**: `.claude/commands/CONTEXT-RECOVERY.md` (for new sessions)

---

## 🚫 COMMON ANTI-PATTERNS

### Testing Anti-Patterns

- ❌ Using `any` types in test code
- ❌ Skipping cleanup in tests
- ❌ Tests that depend on execution order
- ❌ Reducing test data to avoid timeouts (increase timeout instead!)
- ❌ Accepting partial test results due to timeouts
- ❌ Reporting "validation passed" without showing test numbers
- ❌ Assuming test success when tests timeout or partially complete

### Development Anti-Patterns

- ❌ Using libraries without checking Context7 documentation
- ❌ Committing code that fails build validation
- ❌ Creating branches for leaf tasks
- ❌ **Starting new session without `/fix-errors`** when errors exist
- ❌ **Trying to fix multiple packages simultaneously** in new session

### Quality Anti-Patterns

- ❌ Ignoring TypeScript errors
- ❌ Ignoring build errors
- ❌ Skipping manual testing approval

---

## 📝 IMPORT TASKMASTER WORKFLOW

**For workflow commands and operational procedures:**
@./.taskmaster/CLAUDE.md

---

_This document defines the technical standards and principles for the project. For specific workflow instructions, use the appropriate slash commands or refer to the TaskMaster documentation._
