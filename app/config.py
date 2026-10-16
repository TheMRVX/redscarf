import os
import re
import secrets
from pathlib import Path


def _req(name: str) -> str:
    v = os.getenv(name, "").strip()
    if not v:
        raise SystemExit(f"Missing required setting {name} in .env")
    return v


BOT_TOKEN = _req("BOT_TOKEN")
ADMIN_IDS = {int(x) for x in re.split(r"[,\s]+", os.getenv("ADMIN_IDS", "")) if x.isdigit()}

_ch = os.getenv("STORAGE_CHANNEL_ID", "").strip()
try:
    STORAGE_CHANNEL_ID = int(_ch) if _ch else 0
except ValueError:
    STORAGE_CHANNEL_ID = 0

DOMAIN = os.getenv("DOMAIN", "localhost").strip() or "localhost"
LOCAL = DOMAIN in ("localhost", "127.0.0.1")
PUBLIC_URL = "http://localhost:8000" if LOCAL else f"https://{DOMAIN}"

ADMIN_USER = os.getenv("ADMIN_USER", "admin").strip() or "admin"
ADMIN_PASSWORD = _req("ADMIN_PASSWORD")

DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
UPLOADS_DIR = DATA_DIR / "uploads"
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

_key_file = DATA_DIR / "secret.key"
if os.getenv("SECRET_KEY"):
    SECRET_KEY = os.environ["SECRET_KEY"]
else:
    if not _key_file.exists():
        _key_file.write_text(secrets.token_hex(32))
    SECRET_KEY = _key_file.read_text().strip()
