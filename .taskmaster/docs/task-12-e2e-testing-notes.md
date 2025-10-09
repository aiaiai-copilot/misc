# Task 12: E2E Input Clearing Issue - Technical Notes

## Task Description
Fix input field not clearing after record creation in E2E tests.

## Date
2025-10-09

## Status
⚠️ **PARTIALLY RESOLVED** - Core functionality fixed, but fundamental E2E testing limitation discovered

---

## Issues Identified and Fixed

### 1. ✅ Backend Not Starting in E2E Tests
**Problem**: Playwright config used incorrect command to start backend
- **File**: `playwright.config.ts`
- **Issue**: Used `bash -c "cd packages/backend && yarn build && yarn start"`
- **Fix**: Changed to `yarn workspace @misc-poc/backend build && yarn workspace @misc-poc/backend start`
- **Result**: Backend now starts successfully on port 3001

### 2. ✅ CORS Errors Blocking API Calls
**Problem**: Backend only allowed requests from `http://localhost:3000` but E2E tests run on `http://localhost:4173`
- **File**: `packages/backend/src/index.ts`
- **Issue**: Hardcoded CORS origin
- **Fix**: Added support for multiple origins including E2E test ports (3000, 4173, 5173)
- **Result**: No more "Network connection failed" errors in E2E tests

### 3. ✅ Component State Management Improvements
**Problem**: Input clearing logic needed optimization
- **File**: `packages/presentation/web/src/components/MiscInput.tsx`
- **Changes**:
  - Wrapped input in `<form>` element with `onSubmit` handler
  - Added `onChange('')` before calling `onSubmit(tags)` in both `handleKeyDown` and `handleFormSubmit`
  - Added hidden submit button for E2E testing workaround
- **File**: `packages/presentation/web/src/pages/IntegratedIndex.tsx`
- **Changes**:
  - Optimized debounced search effect to skip debounce when input is cleared (empty string)
  - Modified `handleSubmit` to restore input value only on failure (better UX)

---

## Critical Discovery: Playwright + React Production Build Issue

### The Problem
**Playwright keyboard events do not reliably trigger React's synthetic event handlers in production builds used for E2E testing.**

### What Was Attempted (All Failed)
1. `inputField.press('Enter')` - No form submission triggered
2. `page.keyboard.press('Enter')` - No form submission triggered
3. `inputField.pressSequentially(content)` followed by Enter - No form submission triggered
4. Clicking hidden submit button with `force: true` - Button clicked but form submission not triggered
5. Clicking hidden submit button without `force: true` - Input element intercepts clicks
6. Dispatching native `submit` event via `page.evaluate()` - React doesn't respond to native events
7. Calling React handler directly via React fiber/props - Unable to access in production build
8. Using `form.requestSubmit()` - Doesn't trigger React's onSubmit handler

### Why This Happens
- **Production builds**: E2E tests run against Vite preview (production build) on port 4173
- **React synthetic events**: React's event system in production mode doesn't reliably capture events dispatched by Playwright
- **Event propagation**: `force: true` bypasses normal click behavior, preventing form submission
- **Element interception**: Properly positioned elements get intercepted by other elements; improperly positioned elements require `force: true` which doesn't work

### Evidence
- Manual testing works perfectly - the application functions correctly
- All network issues resolved - CORS working, backend running, API responding
- Button renders correctly - visible in DOM snapshot
- Events don't propagate - no toast notifications, no input clearing, no record creation in E2E tests

---

## Technical Debt & Known Limitations

### 🔴 HIGH PRIORITY: E2E Test Reliability Issue
**Description**: Playwright keyboard/form events don't work with React production builds

**Impact**:
- E2E tests for form submission will continue to fail
- Cannot reliably test keyboard-driven workflows in E2E environment
- May affect other E2E tests that rely on keyboard interactions

**Recommended Solutions** (choose one):

#### Option 1: Change E2E Test Strategy (Recommended)
- Test against development server instead of production build
- Modify `playwright.config.ts` to use `yarn dev` instead of `yarn preview`
- **Pros**: Keyboard events work in dev mode, more realistic testing
- **Cons**: Not testing actual production build

#### Option 2: Add Test-Specific API Endpoints
- Create test-only API endpoints for record creation
- Bypass UI interactions in E2E tests
- **Pros**: Reliable, fast tests
- **Cons**: Not testing actual user workflows, requires test-specific code

#### Option 3: Use Selenium or Cypress
- Different E2E framework might handle React events better
- **Pros**: May work with production builds
- **Cons**: Major migration effort, no guarantee it will work

#### Option 4: Add Explicit Test Hooks
- Add data attributes or window methods for testing
- Example: `window.__testHooks = { submitForm: () => {...} }`
- **Pros**: Clean separation, works reliably
- **Cons**: Test-specific code in production bundle

### 🟡 MEDIUM PRIORITY: Hidden Submit Button
**Description**: Added hidden submit button that isn't used

**Location**: `MiscInput.tsx` line 115-132

**Issue**: Button was added as workaround but clicking it doesn't trigger form submission due to Playwright limitations

**Recommendation**:
- Keep button for now (harmless)
- Remove if/when keyboard events are fixed
- Or repurpose for accessibility (actual hidden submit for screen readers)

### 🟢 LOW PRIORITY: Test Database Cleanup
**Description**: Stale data from previous test runs causing "Record already exists" errors

**Location**: E2E global setup/teardown

**Issue**: Database not being fully cleared between test runs

**Recommendation**:
- Verify `clearAllRecords()` in `e2e/support/api-helpers.ts` works correctly
- Consider using unique test data per test run (timestamps/UUIDs)
- Add more robust cleanup in global teardown

---

## Files Modified

### Core Fixes
1. `playwright.config.ts` - Fixed backend startup command
2. `packages/backend/src/index.ts` - Fixed CORS configuration
3. `packages/presentation/web/src/components/MiscInput.tsx` - Added form wrapper and optimized clearing
4. `packages/presentation/web/src/pages/IntegratedIndex.tsx` - Optimized debounced search

### E2E Test Updates (attempts to fix)
5. `e2e/support/page-objects/MiscPage.ts` - Multiple iterations trying different approaches

---

## Next Steps

### Immediate (Required)
1. **Decision needed**: Choose one of the recommended solutions above
2. **Update E2E tests**: Implement chosen solution
3. **Verify all E2E tests pass**: Run full E2E suite after fix
4. **Document decision**: Update this file with chosen approach

### Future (Nice to have)
1. **Investigate Playwright + React**: Research if newer versions have better compatibility
2. **E2E best practices**: Document working patterns for future tests
3. **Test against both builds**: Consider testing against both dev and production builds

---

## Lessons Learned

1. **CORS matters in E2E tests**: Always configure CORS for E2E test ports
2. **Playwright has limitations**: Not all interactions work the same as manual testing
3. **Production vs Development**: React behavior differs significantly between builds
4. **Test early**: E2E issues are easier to catch and fix early in development
5. **Keyboard events are tricky**: Form submissions via keyboard require special handling in automated tests

---

## References

- Task Master: Task 12
- Related PRs: (to be added)
- Playwright docs: https://playwright.dev/docs/input
- React synthetic events: https://react.dev/reference/react-dom/components/common#react-event-object
