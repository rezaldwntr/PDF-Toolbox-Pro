---
name: open-code-review
description: Multi-perspective AI code review checklist adapted from Alibaba open-code-review (CR-Bench). Use before every commit and push to verify git diff, React state/render safety, null/undefined handling, concurrency, and resource cleanup.
---

# Open Code Review Skill (Alibaba CR-Bench Methodology)

This skill enforces the multi-aspect code review methodology from [`alibaba/open-code-review`](https://github.com/alibaba/open-code-review) before any code change is committed or pushed.

## Core Philosophy: High Signal-to-Noise Ratio (SNR)
Focus exclusively on **actionable, high-impact defects** across 5 specialized perspectives:
1. **Logic & State Defect Hunter** (React render loops, state mutations, edge cases)
2. **Null / Undefined & Type Safety Auditor** (strict TypeScript, optional chaining, fallback bounds)
3. **Concurrency & Idempotency Reviewer** (duplicate side effects, async race conditions, double clicks)
4. **Resource & Memory Lifecycle Inspector** (Blob URL revocation, IndexedDB transactions, timers/listeners)
5. **Diff & Regression Verifier** (cross-file contract consistency, unintended deletions)

---

## Mandatory Pre-Commit Checklist

### 1. Diff Inspection (`git diff`)
- [ ] Run `git status` and `git diff` to inspect every modified hunk line by line.
- [ ] Verify no unintended debug logs, leftover dead state variables, or accidental removals of existing features/comments occurred.
- [ ] Verify all callers and imports of modified functions/components match the updated signatures.

### 2. React State & Render Safety (Anti-Infinite-Loop & Anti-Duplicate-Effect)
- [ ] **No Non-Deterministic Values in Render Props**: Never pass inline `Date.now()`, `Math.random()`, `new Date()`, or un-memoized object/array literals into props that are used inside a child component's `useEffect` dependency array (e.g., `fileName={\`merged-\${Date.now()}.pdf\`}`). Compute and lock the value once in state when the operation completes.
- [ ] **Idempotent Side Effects (`useEffect`)**: Any `useEffect` that writes to `IndexedDB`, `localStorage`, telemetry, or triggers a network request MUST have an idempotency guard (`useRef` lock or deduplication key check) so parent re-renders or React StrictMode double-invocations do not create duplicate records.
- [ ] **Clean Dependency Arrays**: Verify every `useEffect`, `useMemo`, and `useCallback` dependency array is complete and free of circular state updates.

### 3. Null, Undefined & Boundary Safety
- [ ] Guard all array indexing (`items[0]?.id`), regex matches, and DOM queries against `null`/`undefined`.
- [ ] Guard division operations against `0` (`total > 0 ? ... : 0`) to prevent `NaN` or `Infinity` in UI metrics and telemetry.
- [ ] Ensure numeric metrics (such as step durations in telemetry logs) sum up accurately and never produce negative numbers (`Math.max(1, ...)`).

### 4. Resource Cleanup & Concurrency
- [ ] **Blob & Object URLs**: Every `URL.createObjectURL(blob)` must either be revoked via `URL.revokeObjectURL(url)` on unmount/reset or managed cleanly according to its retention lifecycle.
- [ ] **Async Cancellation & Locks**: Prevent duplicate form submissions or repeated tool executions via loading/processing state guards (`isProcessing`).
- [ ] **Timers & Event Listeners**: Every `setInterval`, `setTimeout`, and `window.addEventListener` inside `useEffect` must return a cleanup function.

### 5. Automated Build & Type Verification
- [ ] Run `npm.cmd run type-check` (`tsc --noEmit`) — must exit with **0 errors**.
- [ ] Run `npm.cmd run build` (`vite build`) — must succeed cleanly with **0 errors**.
