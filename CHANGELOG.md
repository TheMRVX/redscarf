# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated Gitleaks secret scanning CI action on pushes and pull requests (`.github/workflows/gitleaks.yml`).

### Planned
- Automated backup job for SQLite data volume.
- Multi-language UI switcher in Admin Dashboard.

## [1.0.0] - 2026-10-16

### Added
- Complete Telegram Uploader Bot built with `aiogram 3.x`.
- FastAPI backend serving Mini App endpoints and Admin APIs.
- Telegram Mini App (Web App) with responsive UI, Vazirmatn Persian typography, and infinite scroll pagination.
- Comprehensive Admin Dashboard for managing posts, categories, branding, mandatory channel subscriptions, and download rate limits.
- Zero-reupload file transfer mechanism leveraging Telegram's native `copyMessage` from private storage channels.
- Production-ready Docker Compose orchestration bundled with automated HTTPS/SSL Caddy reverse proxy.
- Initial contributing guidelines (`CONTRIBUTING.md`) covering Trunk-Based Git workflow, Worktrees, and Conventional Commits.
