---
name: security-audit
description: Defensive security audit checklist adapted from Cloudflare security-audit-skill. Use before every commit and push to verify trust boundaries, auth/tier enforcement, input/output sanitization (XSS/XML/path traversal), and data isolation.
---

# Security Audit Skill (Cloudflare Defensive Audit Methodology)

This skill enforces the structured security audit workflow from [`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill) before any code change is committed or pushed.

## Core Philosophy: Evidence-Backed Trust Boundary & Data Flow Analysis
1. **Map Entry Points & Trust Boundaries**: Identify where untrusted input (uploaded PDFs, filenames, URL params, localStorage/IndexedDB state, API payloads) enters the system.
2. **Trace Data Flows to Sensitive Sinks**: Follow untrusted values to DOM rendering, XML/OpenXML builders (`.xlsx`/`.docx`), file downloads, and backend/admin endpoints.
3. **Verify Auth, Quota & Tier Enforcement**: Ensure tier privileges (`guest`, `free`, `flash`, `monthly`, `annual`) and admin actions are strictly enforced.

---

## Mandatory Pre-Commit Security Checklist

### 1. Input & Output Sanitization (XSS, XML/OpenXML, Path Traversal)
- [ ] **DOM & HTML Rendering**: Never pass unvalidated user input or PDF metadata/text into `dangerouslySetInnerHTML`, `innerHTML`, or `eval`.
- [ ] **OpenXML (`.xlsx` / `.docx`) & XML Generation**: Every string interpolated into XML templates (`sheet1.xml`, `document.xml`, etc.) MUST be sanitized with `escapeXml()` (`&`, `<`, `>`, `"`, `'`) and stripped of invalid XML control characters (`[\x00-\x08\x0B\x0C\x0E-\x1F]`).
- [ ] **Filename & Path Sanitization**: Sanitize user-supplied filenames before download or storage to prevent path traversal (`../`), null bytes, or dangerous extensions.
- [ ] **URL Validation**: Validate download URLs (`blob:`, `https:`) before rendering `<a href>` or triggering programmatic navigation to block `javascript:` or `data:` URI injection.

### 2. Authentication, Authorization & Tier Retention Enforcement
- [ ] **Subscription Tier Enforcement**: Verify that feature limits and file retention windows strictly match the user's active tier (`guest`/`free`: immediate deletion / 0h retention; `flash`: 6h; `monthly`: 24h; `annual`: 48h).
- [ ] **Admin & API Route Protection**: Verify admin views and API endpoints validate authentication tokens/roles and never expose sensitive keys or other users' telemetry.
- [ ] **No Hardcoded Secrets**: Confirm `git diff` contains zero hardcoded API keys, JWT secrets, database credentials, or private tokens.

### 3. Data Isolation & Privacy Compliance (UU PDP No. 27 Tahun 2022)
- [ ] **Per-User Storage Isolation**: Ensure file history and cached blobs in IndexedDB/localStorage are scoped by normalized `userId` (`email`) and never leak across accounts on shared browsers.
- [ ] **Automatic Expiry & Purge**: Ensure expired file records and Blobs (`expiresAt <= Date.now()`) are automatically purged on read/write and cannot be downloaded once expired.
