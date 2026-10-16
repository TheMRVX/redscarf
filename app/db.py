import json
import aiosqlite
from .config import DATA_DIR

_db: aiosqlite.Connection | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS categories(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_fa TEXT DEFAULT '', name_en TEXT DEFAULT '', sort INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS files(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  title_fa TEXT DEFAULT '', title_en TEXT DEFAULT '',
  desc_fa TEXT DEFAULT '', desc_en TEXT DEFAULT '',
  category_id INTEGER DEFAULT 0,
  file_name TEXT DEFAULT '', size INTEGER DEFAULT 0, mime TEXT DEFAULT '', kind TEXT DEFAULT 'document',
  channel_id INTEGER NOT NULL, message_id INTEGER NOT NULL,
  downloads INTEGER DEFAULT 0, active INTEGER DEFAULT 1, sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')));
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_msg ON files(channel_id, message_id);
CREATE TABLE IF NOT EXISTS posts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_fa TEXT DEFAULT '', title_en TEXT DEFAULT '',
  body_fa TEXT DEFAULT '', body_en TEXT DEFAULT '',
  image_url TEXT DEFAULT '', category_id INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS post_files(
  id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, file_id INTEGER NOT NULL,
  label_fa TEXT DEFAULT '', label_en TEXT DEFAULT '', sort INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_pf_post ON post_files(post_id);
CREATE TABLE IF NOT EXISTS links(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_fa TEXT DEFAULT '', title_en TEXT DEFAULT '', url TEXT DEFAULT '',
  sort INTEGER DEFAULT 0, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS users(
  tg_id INTEGER PRIMARY KEY, first_name TEXT DEFAULT '', username TEXT DEFAULT '',
  lang TEXT DEFAULT '', started INTEGER DEFAULT 0,
  first_seen TEXT DEFAULT (datetime('now')), last_seen TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS pending_deletes(
  id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, message_id INTEGER NOT NULL,
  delete_at INTEGER NOT NULL, tries INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_pd_at ON pending_deletes(delete_at);
CREATE TABLE IF NOT EXISTS downloads(
  id INTEGER PRIMARY KEY AUTOINCREMENT, file_id INTEGER, tg_id INTEGER,
  at TEXT DEFAULT (datetime('now')));
"""

DEFAULTS = {
    "brand_name_fa": "مرکز فایل",
    "brand_name_en": "File Hub",
    "welcome_fa": "فایل‌های مورد نیازتان را از اینجا دانلود کنید.",
    "welcome_en": "Download the files you need from here.",
    "start_text_fa": "",
    "start_text_en": "",
    "logo_url": "",
    "banner_url": "",
    "default_lang": "auto",
    "miniapp_url": "",
    "menu_button_text": "Open",
    "primary_color": "#0e7c66",
    "bg_color": "#f7f5f0",
    "card_color": "#ffffff",
    "text_color": "#1c2321",
    "muted_color": "#6d7773",
    "dark_bg_color": "#101716",
    "dark_card_color": "#18211f",
    "dark_text_color": "#e8efec",
    "theme_mode": "auto",
    "layout": "cards",
    "radius": "14",
    "font": "vazirmatn",
    "show_size": "1",
    "autodelete_minutes": "10",
    "autodelete_notice": "1",
    "force_join_enabled": "0",
    "force_join_channels": "",
    "dl_limit_enabled": "0",
    "dl_limit_count": "5",
    "dl_limit_hours": "24",
    "show_downloads": "1",
    "sections": '["posts","links"]',
}


async def init():
    global _db
    _db = await aiosqlite.connect(DATA_DIR / "app.db")
    _db.row_factory = aiosqlite.Row
    await _db.execute("PRAGMA journal_mode=WAL")
    await _db.executescript(SCHEMA)
    cols = [r["name"] for r in await fetchall("PRAGMA table_info(posts)")]
    if "category_id" not in cols:  # migrate databases created by the first version
        await _db.execute("ALTER TABLE posts ADD COLUMN category_id INTEGER DEFAULT 0")
    await _db.commit()


async def fetchall(sql: str, params=()) -> list[dict]:
    cur = await _db.execute(sql, tuple(params))
    rows = await cur.fetchall()
    await cur.close()
    return [dict(r) for r in rows]


async def fetchone(sql: str, params=()) -> dict | None:
    rows = await fetchall(sql, params)
    return rows[0] if rows else None


async def execute(sql: str, params=()) -> int:
    cur = await _db.execute(sql, tuple(params))
    await _db.commit()
    last = cur.lastrowid
    await cur.close()
    return last


async def get_settings() -> dict:
    out = dict(DEFAULTS)
    for r in await fetchall("SELECT key, value FROM settings"):
        if r["key"] in DEFAULTS:
            out[r["key"]] = r["value"]
    return out


async def set_settings(data: dict):
    for k, v in data.items():
        if k not in DEFAULTS:
            continue
        if isinstance(v, (list, dict)):
            v = json.dumps(v)
        await _db.execute(
            "INSERT INTO settings(key,value) VALUES(?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (k, str(v)),
        )
    await _db.commit()


async def downloadable_file(file_id: int) -> dict | None:
    """A file may be sent to users only if it is attached to a published post."""
    return await fetchone(
        "SELECT f.* FROM files f JOIN post_files pf ON pf.file_id=f.id JOIN posts p ON p.id=pf.post_id "
        "WHERE f.id=? AND f.active=1 AND p.active=1 LIMIT 1",
        (file_id,),
    )
