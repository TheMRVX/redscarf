# Security Alert Remediation Tasks

## Task 1: Update python-multipart in requirements.txt
**Description:** Bump `python-multipart` from `0.0.9` to `>=0.0.31` to close all 8 Dependabot CVE alerts.
**Acceptance criteria:**
- [x] `requirements.txt` specifies `python-multipart>=0.0.31`
- [x] No breaking changes with FastAPI `0.115.0`
**Verification:**
- [x] `pip check` or syntax inspection
**Files:** `requirements.txt`
**Dependencies:** None

## Task 2: Configure Least-Privilege Permissions in Gitleaks Workflow
**Description:** Add explicit `permissions:` block to `.github/workflows/gitleaks.yml` to close CodeQL Alert #4.
**Acceptance criteria:**
- [x] `permissions:` block specifies `contents: read` and `pull-requests: write`
**Verification:**
- [x] YAML parser checks pass
**Files:** `.github/workflows/gitleaks.yml`
**Dependencies:** None

## Task 3: Mask Raw Exceptions in Admin Force-Join Route
**Description:** Sanitize error reporting in `app/api.py` lines 277 and 286-288 to close CodeQL Alert #1.
**Acceptance criteria:**
- [x] Raw exception string is logged server-side and not exposed to client
- [x] Frontend UI receives safe error string
**Verification:**
- [x] Unit test or py_compile validation
**Files:** `app/api.py`
**Dependencies:** None

## Task 4: Refactor Table Routing to Typed Enum to Break SQL Injection Taint
**Description:** Use `AdminTable(str, Enum)` and static lookup to close CodeQL Alerts #2 and #3.
**Acceptance criteria:**
- [x] No dynamic f-string formatting of untrusted user input in SQL strings
- [x] Validated against `TABLES` dictionary with typed enum
**Verification:**
- [x] `python3 -m py_compile app/api.py app/db.py`
**Files:** `app/api.py`, `app/db.py`
**Dependencies:** None
