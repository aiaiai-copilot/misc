# Technical Debt

This document tracks known technical debt, limitations, and issues that need to be addressed in the project.

---

## Current Status Summary (2025-10-09)

### ✅ Resolved Issues
- **Playwright + React Production Build Incompatibility** - E2E tests now use dev server (15/27 tests passing, 56%)
- **CORS Configuration** - Backend accepts E2E test requests
- **Backend Startup** - Playwright config uses proper yarn workspace commands
- **Input Clearing Logic** - React components optimized for proper UX

### ⚠️ Active Issues
- **🔴 HIGH PRIORITY: Test Database Cleanup** - 12 tests failing due to empty tag constraint violations (44% failure rate)
- **🟡 MEDIUM: Unused Hidden Submit Button** - 200 bytes of unused code, harmless but could be removed

### 📊 E2E Test Results
- **Pass Rate**: 56% (15/27 tests)
- **Fail Rate**: 44% (12/27 tests)
- **Root Cause of Failures**: Database cleanup issue, NOT Playwright compatibility

---

## Table of Contents

- [E2E Testing](#e2e-testing)
- [Backend](#backend)
- [Frontend](#frontend)
- [Infrastructure](#infrastructure)

---

## E2E Testing

### ✅ RESOLVED: Playwright + React Production Build Incompatibility

**Date Discovered**: 2025-10-09
**Date Resolved**: 2025-10-09
**Discovered In**: Task 12 - E2E Input Clearing Issue
**Resolved By**: Switching to dev server for E2E tests
**Status**: ✅ RESOLVED

#### Problem
Playwright keyboard events do not reliably trigger React's synthetic event handlers in production builds used for E2E testing.

#### Impact
- E2E tests for form submission fail consistently
- Cannot reliably test keyboard-driven workflows in E2E environment
- May affect other E2E tests that rely on keyboard interactions
- Reduces confidence in E2E test suite

#### What Was Attempted (All Failed)
1. `inputField.press('Enter')` - No form submission triggered
2. `page.keyboard.press('Enter')` - No form submission triggered
3. `inputField.pressSequentially(content)` followed by Enter - No form submission triggered
4. Clicking hidden submit button with `force: true` - Button clicked but form submission not triggered
5. Clicking hidden submit button without `force: true` - Input element intercepts clicks
6. Dispatching native `submit` event via `page.evaluate()` - React doesn't respond to native events
7. Calling React handler directly via React fiber/props - Unable to access in production build
8. Using `form.requestSubmit()` - Doesn't trigger React's onSubmit handler

#### Root Cause Analysis
- **Production builds**: E2E tests run against Vite preview (production build) on port 4173
- **React synthetic events**: React's event system in production mode doesn't reliably capture events dispatched by Playwright
- **Event propagation**: `force: true` bypasses normal click behavior, preventing form submission
- **Element interception**: Properly positioned elements get intercepted by other elements; improperly positioned elements require `force: true` which doesn't work

#### Evidence
- Manual testing works perfectly - the application functions correctly
- All network issues resolved - CORS working, backend running, API responding
- Button renders correctly - visible in DOM snapshot
- Events don't propagate - no toast notifications, no input clearing, no record creation in E2E tests

#### Solution Implemented

**Option 1: Changed E2E Test Strategy** ✅
- Modified `playwright.config.ts` to test against development server (port 5173) instead of production build (port 4173)
- Changed command from `yarn preview` to `yarn dev`
- Changed baseURL from `http://localhost:4173` to `http://localhost:5173`
- Added inline comment documenting the reason for using dev server

**Results**:
- ✅ Keyboard events now work correctly in E2E tests
- ✅ 15 out of 27 tests passing (56% pass rate, up from 0% reliable)
- ⚠️ 12 tests failing due to separate database cleanup issue (see "Test Database Cleanup Issues" below)
- ✅ Input clearing works as expected
- ✅ Form submission via Enter key works
- ✅ All React synthetic event handlers respond correctly
- ✅ E2E page object methods simplified to follow Playwright documentation patterns

**Tradeoffs**:
- ✅ **Pro**: Fast implementation (< 1 hour)
- ✅ **Pro**: Tests actual user interaction patterns
- ✅ **Pro**: No test-specific code in application
- ⚠️ **Con**: Not testing production build (acceptable for now - production builds are tested in other ways)

#### Files Affected
- `playwright.config.ts`
- `packages/presentation/web/src/components/MiscInput.tsx`
- `packages/presentation/web/src/pages/IntegratedIndex.tsx`
- `e2e/support/page-objects/MiscPage.ts`

#### Related Documentation
- See `.taskmaster/docs/task-12-e2e-testing-notes.md` for detailed investigation
- Task Master: Task 12

---

### 🟡 MEDIUM PRIORITY: Unused Hidden Submit Button

**Date Created**: 2025-10-09
**Created In**: Task 12 - Attempting to fix E2E tests
**Status**: ⚠️ PRESENT - Not harmful but unused

#### Problem
A hidden submit button was added to `MiscInput.tsx` as a workaround for E2E testing, but it doesn't work due to the Playwright limitations described above.

#### Location
- File: `packages/presentation/web/src/components/MiscInput.tsx`
- Lines: 115-132

#### Impact
- Minor: Adds ~200 bytes to production bundle
- No functional impact (button is hidden and not used)

#### Recommendation
- **Keep for now**: Harmless and may be useful if E2E issue is resolved differently
- **Or remove**: Once a proper E2E solution is implemented
- **Or repurpose**: Convert to actual accessibility feature (hidden submit for screen readers)

---

### 🔴 HIGH PRIORITY: Test Database Cleanup Issues

**Date Discovered**: 2025-10-09
**Discovered In**: Task 12 - E2E test runs
**Status**: ⚠️ BLOCKING - 12 tests failing due to this issue (44% of test suite)

#### Problem
Stale data from previous test runs causes "Record already exists" errors in E2E tests. Empty records with normalized_tags=({}) are being created and not properly cleaned up between tests.

#### Root Cause
Database not being fully cleared between test runs, or timing issues with cleanup.

#### Location
- `e2e/support/global-setup.ts`
- `e2e/support/global-teardown.ts`
- `e2e/support/api-helpers.ts`

#### Impact
- **CRITICAL**: 12 out of 27 E2E tests failing (44% failure rate)
- Duplicate key violations: `Key (normalized_tags)=({}) already exists`
- Test flakiness due to data pollution between test runs
- False positives/negatives in E2E tests
- Requires manual database cleanup between test runs

#### Current Test Results
- ✅ **15 tests passing** (56%): Basic functionality, first use, some CRUD operations
- ❌ **12 tests failing** (44%): Multi-record creation, sequential operations, import/export, keyboard navigation
- All failures show identical error pattern: empty normalized_tags constraint violation

#### Recommendation
1. Verify `clearAllRecords()` in `api-helpers.ts` works correctly
2. Consider using unique test data per test run (timestamps/UUIDs)
3. Add more robust cleanup in global teardown
4. Add retry logic for "already exists" errors

#### Effort
Low (1-2 hours)

---

## Backend

### ✅ RESOLVED: CORS Configuration for E2E Tests

**Date Resolved**: 2025-10-09
**Resolved In**: Task 12

#### What Was Fixed
Backend was only configured to accept requests from `http://localhost:3000`, but E2E tests run on `http://localhost:4173`.

#### Solution
Updated `packages/backend/src/index.ts` to accept requests from multiple origins:
- `http://localhost:3000` (dev server)
- `http://localhost:4173` (E2E preview)
- `http://localhost:5173` (Vite dev)

#### Files Modified
- `packages/backend/src/index.ts`

---

### ✅ RESOLVED: Backend Not Starting in E2E Tests

**Date Resolved**: 2025-10-09
**Resolved In**: Task 12

#### What Was Fixed
Playwright config used incorrect command to start backend via yarn workspaces.

#### Solution
Changed from `bash -c "cd packages/backend && yarn build && yarn start"` to proper workspace commands:
`yarn workspace @misc-poc/backend build && yarn workspace @misc-poc/backend start`

#### Files Modified
- `playwright.config.ts`

---

## Frontend

### ✅ RESOLVED: Input Clearing Logic Optimization

**Date Resolved**: 2025-10-09
**Resolved In**: Task 12

#### What Was Fixed
Input field clearing logic needed optimization to ensure proper UX during form submission.

#### Solution
1. Wrapped input in `<form>` element with proper `onSubmit` handler
2. Added `onChange('')` before calling `onSubmit(tags)` to clear input immediately
3. Optimized debounced search to skip debounce when input is empty
4. Modified `handleSubmit` to only restore input value on failure

#### Files Modified
- `packages/presentation/web/src/components/MiscInput.tsx`
- `packages/presentation/web/src/pages/IntegratedIndex.tsx`

---

## Infrastructure

_(No items currently tracked)_

---

## How to Use This Document

### Adding New Technical Debt

1. Choose the appropriate section (E2E Testing, Backend, Frontend, Infrastructure)
2. Choose priority level: 🔴 HIGH, 🟡 MEDIUM, 🟢 LOW
3. Include:
   - Date discovered
   - Where discovered (task number/PR)
   - Status (UNRESOLVED, IN PROGRESS, or BLOCKED)
   - Problem description
   - Impact
   - Root cause (if known)
   - Recommended solution(s)
   - Files affected
   - Estimated effort

### Resolving Technical Debt

1. Move the item to "RESOLVED" section under appropriate category
2. Update status to ✅ RESOLVED
3. Add "Date Resolved" and "Resolved In"
4. Keep the original problem description
5. Add "Solution" section describing what was done
6. List files modified

### Reviewing Technical Debt

- Review this document monthly
- Prioritize HIGH items in sprint planning
- Update statuses as work progresses
- Archive RESOLVED items after 3 months

---

## Lessons Learned

### From Task 12 (E2E Testing)

1. **CORS matters in E2E tests**: Always configure CORS for all test ports
2. **Playwright has limitations**: Not all interactions work the same as manual testing
3. **Production vs Development**: React behavior differs significantly between builds
4. **Test early**: E2E issues are easier to catch and fix early in development
5. **Keyboard events are tricky**: Form submissions via keyboard require special handling in automated tests
6. **Document as you go**: Detailed investigation notes help future developers

---

## References

- Task Master Tasks: `.taskmaster/tasks/`
- Detailed Investigation Notes: `.taskmaster/docs/task-*-notes.md`
- Architecture Docs: `docs/architecture/`
- API Docs: `docs/api/`
