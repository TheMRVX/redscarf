# Implementation Plan: Remediation of 12 GitHub Security Alerts

## Overview
Remediate all 12 security alerts registered on GitHub for repository `TheMRVX/redscarf`: 8 Dependabot CVEs and 4 CodeQL alerts.

## Architecture Decisions
- Upgrade `python-multipart` to `>=0.0.31` in `requirements.txt` to resolve all 8 Dependabot CVEs simultaneously.
- Restrict GitHub Actions token permissions in `.github/workflows/gitleaks.yml` to least privilege (`contents: read`, `pull-requests: write`).
- Sanitize exception responses in `app/api.py` to eliminate information leaks.
- Replace dynamic table name string interpolation in `app/api.py` with typed `AdminTable(str, Enum)` and static lookup to break CodeQL taint analysis.

## Task List

### Phase 1: Dependency & CI/CD Hardening
- [x] Task 1: Bump `python-multipart` to `>=0.0.31` in `requirements.txt` (Resolves Dependabot #1 through #8)
- [x] Task 2: Add explicit least-privilege `permissions:` block to `.github/workflows/gitleaks.yml` (Resolves CodeQL #4)

### Checkpoint: Phase 1
- [x] Dry-run dependency resolution succeeds.
- [x] Workflow YAML syntax validates.

### Phase 2: Application Code Security
- [x] Task 3: Mask raw exception stack traces in `/api/admin/force-join/check` in `app/api.py` (Resolves CodeQL #1)
- [x] Task 4: Introduce `AdminTable` Enum and static table dispatch in `app/api.py` to eliminate SQL injection taint (Resolves CodeQL #2 and #3)

### Checkpoint: Phase 2
- [x] Python syntax and type imports compile cleanly with `py_compile`.
- [x] All routes backward-compatible with frontend (`admin.js`).

### Phase 3: Verification & Branch Push
- [ ] Task 5: Run validation suite and create PR branch per git-workflow guidelines.
