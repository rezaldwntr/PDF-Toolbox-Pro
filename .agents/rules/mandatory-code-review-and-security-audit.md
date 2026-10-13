---
description: Mandatory pre-commit code review (alibaba/open-code-review) and security audit (cloudflare/security-audit-skill) rule before every commit and push.
trigger: always_on
---

# Mandatory Pre-Commit Code Review & Security Audit Rule

Before committing and pushing any code update or bugfix, you MUST execute both checklists below and verify zero issues:

## 1. Open Code Review Checklist (`open-code-review`)
- **Git Diff Inspection**: Inspect `git diff` line-by-line for unintended regressions, broken imports, or accidental deletions.
- **React State & Render Safety**:
  - Never pass inline non-deterministic values (`Date.now()`, `Math.random()`, `new Date()`) to props consumed by a child component's `useEffect` (e.g., `fileName` in `DownloadResultCard`). Lock generated filenames/IDs in `useState` once per execution.
  - Guard all `useEffect` hooks that write to `IndexedDB`, `localStorage`, or telemetry with an idempotency ref/deduplication check to prevent duplicate entries on parent re-renders.
- **Null/Undefined & Numeric Safety**: Guard all optional properties, array accesses, and division operations (`total > 0`). Ensure step timing metrics are non-negative and sum accurately.
- **Resource Lifecycle**: Clean up `URL.createObjectURL`, intervals, timeouts, and event listeners on unmount/reset.
- **Type & Build Check**: Run `npm.cmd run type-check` and `npm.cmd run build` and ensure both pass with 0 errors.

## 2. Security Audit Checklist (`security-audit-skill`)
- **Input/Output Sanitization**:
  - Escape all dynamic values in OpenXML (`.xlsx`/`.docx`) generators using `escapeXml()` and strip control characters.
  - Sanitize user-provided filenames and never pass unsanitized strings to `dangerouslySetInnerHTML`.
- **Auth & Subscription Tier Enforcement**:
  - Enforce file retention windows strictly by user tier (`guest`/`free`: 0 hours / immediate removal; `flash`: 6 hours; `monthly`: 24 hours; `annual`: 48 hours).
  - Ensure zero hardcoded secrets, API keys, or credentials exist in the diff.
- **Data Isolation & Expiry (UU PDP)**:
  - Scope all user file history by normalized `userId` and automatically purge expired blobs (`expiresAt <= Date.now()`).
