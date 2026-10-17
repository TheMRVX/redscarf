from enum import Enum
import json
import logging
import secrets
import time
from collections import defaultdict

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Body, Depends, File, Header, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel

from . import bot as bot_mod
from . import db
from .config import ADMIN_PASSWORD, ADMIN_USER, LOCAL, UPLOADS_DIR
from .security import check_admin_token, make_admin_token, validate_init_data

router = APIRouter(prefix="/api")

SECTIONS = ("posts", "links")


def _sections(raw) -> list:
    try:
        v = raw if isinstance(raw, list) else json.loads(raw)
        out = [s for s in v if s in SECTIONS]
    except Exception:
        out = []
    return out or list(SECTIONS)


# ---------------- public (Mini App) ----------------

@router.get("/config")
async def config():
    s = await db.get_settings()
    s["sections"] = _sections(s["sections"])
    s.pop("force_join_channels", None)  # may contain private invite links; only revealed when a download is blocked
    cats = await db.fetchall("SELECT * FROM categories ORDER BY sort ASC, id ASC")
    return {"settings": s, "categories": cats, "bot_username": bot_mod.BOT_USERNAME}


POST_LIGHT = (
    "id, title_fa, title_en, substr(body_fa,1,160) AS ex_fa, substr(body_en,1,160) AS ex_en, image_url, category_id, created_at, "
    "(SELECT COUNT(*) FROM post_files pf WHERE pf.post_id=posts.id) AS file_count"
)


def _like(q: str) -> str:
    return "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


@router.get("/posts")
async def posts(limit: int = 12, offset: int = 0, q: str = "", cat: int = 0):
    """Light, paginated post list (no full text, no files). Search and category filter run on the server."""
    limit, offset = max(1, min(limit, 30)), max(0, offset)
    where, params = "active=1", []
    if cat:
        where += " AND category_id=?"
        params.append(cat)
    q = q.strip()[:80]
    if q:
        where += " AND (title_fa LIKE ? ESCAPE '\\' OR title_en LIKE ? ESCAPE '\\' OR body_fa LIKE ? ESCAPE '\\' OR body_en LIKE ? ESCAPE '\\')"
        params += [_like(q)] * 4
    total = (await db.fetchone(f"SELECT COUNT(*) c FROM posts WHERE {where}", params))["c"]
    rows = await db.fetchall(
        f"SELECT {POST_LIGHT} FROM posts WHERE {where} ORDER BY id DESC LIMIT ? OFFSET ?", params + [limit, offset]
    )
    return {"items": rows, "total": total, "has_more": offset + len(rows) < total}


@router.get("/posts/{post_id}")
async def post_detail(post_id: int):
    p = await db.fetchone("SELECT * FROM posts WHERE id=? AND active=1", (post_id,))
    if not p:
        raise HTTPException(404, {"code": "not_found"})
    p["files"] = await db.fetchall(
        "SELECT f.id, f.token, f.title_fa, f.title_en, f.file_name, f.size, f.kind, pf.label_fa, pf.label_en "
        "FROM post_files pf JOIN files f ON f.id=pf.file_id WHERE pf.post_id=? AND f.active=1 ORDER BY pf.sort ASC, pf.id ASC",
        (post_id,),
    )
    related = await db.fetchall(
        f"SELECT {POST_LIGHT} FROM posts WHERE active=1 AND id<>? ORDER BY (category_id=?) DESC, id DESC LIMIT 4",
        (post_id, p["category_id"]),
    )
    return {"post": p, "related": related}


@router.get("/links")
async def links():
    return await db.fetchall("SELECT * FROM links WHERE active=1 ORDER BY sort ASC, id ASC")


class DownloadBody(BaseModel):
    file_id: int


@router.post("/download")
async def download(body: DownloadBody, x_init_data: str = Header("")):
    user = validate_init_data(x_init_data)
    if not user:
        raise HTTPException(401, {"code": "bad_init_data"})
    f = await db.downloadable_file(body.file_id)
    if not f:
        raise HTTPException(404, {"code": "not_found"})
    gate = await bot_mod.check_access(user["id"])
    if gate:
        raise HTTPException(403 if gate["code"] == "not_member" else 429, gate)
    lang = await bot_mod.user_lang(user["id"], user.get("language_code"))
    status = await bot_mod.send_file(user["id"], f, lang)
    if status != "ok":
        raise HTTPException(400 if status == "not_started" else 502, {"code": status})
    return {"ok": True}


class LangBody(BaseModel):
    lang: str


@router.post("/lang")
async def set_lang(body: LangBody, x_init_data: str = Header("")):
    user = validate_init_data(x_init_data)
    if not user or body.lang not in ("fa", "en"):
        raise HTTPException(400)
    await db.execute("UPDATE users SET lang=? WHERE tg_id=?", (body.lang, user["id"]))
    return {"ok": True}


# ---------------- admin auth ----------------

_fails: dict[str, list[float]] = defaultdict(list)


def _eq(a: str, b: str) -> bool:
    return secrets.compare_digest(a.encode(), b.encode())


@router.post("/admin/login")
async def login(request: Request, response: Response, body: dict = Body(...)):
    ip = request.client.host if request.client else "?"
    now = time.time()
    _fails[ip] = [t for t in _fails[ip] if now - t < 600]
    if len(_fails[ip]) >= 8:
        raise HTTPException(429, "Too many attempts, try again later")
    ok = _eq(str(body.get("username", "")), ADMIN_USER) & _eq(str(body.get("password", "")), ADMIN_PASSWORD)
    if not ok:
        _fails[ip].append(now)
        raise HTTPException(401, "Invalid credentials")
    response.set_cookie(
        "adm", make_admin_token(), max_age=7 * 86400, httponly=True, samesite="lax", secure=not LOCAL
    )
    return {"ok": True}


async def require_admin(request: Request):
    if not check_admin_token(request.cookies.get("adm", "")):
        raise HTTPException(401, "Unauthorized")


admin = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


@admin.get("/me")
async def me():
    return {"ok": True}


@admin.post("/logout")
async def logout(response: Response):
    response.delete_cookie("adm")
    return {"ok": True}


@admin.get("/stats")
async def stats():
    one = lambda sql: db.fetchone(sql)
    users = (await one("SELECT COUNT(*) c FROM users"))["c"]
    started = (await one("SELECT COUNT(*) c FROM users WHERE started=1"))["c"]
    nfiles = (await one("SELECT COUNT(*) c FROM files"))["c"]
    total = (await one("SELECT COALESCE(SUM(downloads),0) c FROM files"))["c"]
    today = (await one("SELECT COUNT(*) c FROM downloads WHERE at >= date('now')"))["c"]
    top = await db.fetchall(
        "SELECT id, title_fa, title_en, file_name, downloads FROM files ORDER BY downloads DESC, id DESC LIMIT 10"
    )
    return {"users": users, "started": started, "files": nfiles, "downloads": total, "today": today, "top": top}


@admin.get("/settings")
async def get_settings():
    s = await db.get_settings()
    s["sections"] = _sections(s["sections"])
    return s


@admin.put("/settings")
async def put_settings(body: dict = Body(...)):
    if "sections" in body:
        body["sections"] = _sections(body["sections"])
    for key, default, hi in (("dl_limit_count", 5, 1000), ("dl_limit_hours", 24, 720)):
        if key in body:
            try:
                body[key] = max(1, min(int(body[key]), hi))
            except (TypeError, ValueError):
                body[key] = default
    if "autodelete_minutes" in body:
        try:
            body["autodelete_minutes"] = max(0, min(int(body["autodelete_minutes"]), 1440))
        except (TypeError, ValueError):
            body["autodelete_minutes"] = 10
    await db.set_settings(body)
    await bot_mod.apply_menu_button()
    return {"ok": True}


def _sniff(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG"):
        return ".png"
    if data.startswith(b"\xff\xd8"):
        return ".jpg"
    if data.startswith(b"GIF8"):
        return ".gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


@admin.post("/upload")
async def upload(file: UploadFile = File(...)):
    data = await file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 5MB)")
    ext = _sniff(data)
    if not ext:
        raise HTTPException(400, "Only PNG, JPG, GIF or WEBP images are allowed")
    name = secrets.token_hex(8) + ext
    (UPLOADS_DIR / name).write_bytes(data)
    return {"url": f"/uploads/{name}"}


class AdminTable(str, Enum):
    files = "files"
    categories = "categories"
    posts = "posts"
    links = "links"


SAFE_TABLE_NAMES: dict[AdminTable, str] = {
    AdminTable.files: "files",
    AdminTable.categories: "categories",
    AdminTable.posts: "posts",
    AdminTable.links: "links",
}

TABLES = {
    "files": ["title_fa", "title_en", "desc_fa", "desc_en", "sort", "active"],
    "categories": ["name_fa", "name_en", "sort"],
    "posts": ["title_fa", "title_en", "body_fa", "body_en", "image_url", "category_id", "active"],
    "links": ["title_fa", "title_en", "url", "sort", "active"],
}
ORDER = {
    "files": "sort DESC, id DESC",
    "categories": "sort ASC, id ASC",
    "posts": "id DESC",
    "links": "sort ASC, id ASC",
}


def _check(table: str):
    if table not in TABLES:
        raise HTTPException(404, "Unknown table")


def _page(sql: str, params: list, limit: int, offset: int) -> tuple[str, list]:
    if limit > 0:
        return sql + " LIMIT ? OFFSET ?", params + [min(limit, 200), max(0, offset)]
    return sql, params


@admin.get("/posts")
async def list_posts(limit: int = 0, offset: int = 0, q: str = ""):
    where, params = "1=1", []
    if q.strip():
        where, params = "(p.title_fa LIKE ? ESCAPE '\\' OR p.title_en LIKE ? ESCAPE '\\')", [_like(q.strip()[:80])] * 2
    sql, params = _page(
        f"SELECT p.*, (SELECT COUNT(*) FROM post_files pf WHERE pf.post_id=p.id) AS file_count FROM posts p WHERE {where} ORDER BY p.id DESC",
        params, limit, offset)
    return await db.fetchall(sql, params)


@admin.post("/force-join/check")
async def check_force_join(body: dict = Body(...)):
    """Admin 'test' button: can the bot see each channel, and is it an admin there?"""
    out = []
    try:
        me = await bot_mod.bot.get_me()
    except Exception as e:
        logger.warning("Telegram get_me failed during force-join check: %s", e)
        raise HTTPException(502, "Telegram service unreachable")
    for ch in bot_mod.parse_channels(str(body.get("channels", ""))):
        try:
            chat = await bot_mod.bot.get_chat(ch["chat"])
            cm = await bot_mod.bot.get_chat_member(ch["chat"], me.id)
            out.append({"chat": str(ch["chat"]), "title": chat.title or "", "status": cm.status,
                        "ok": cm.status in ("administrator", "creator"), "has_link": bool(ch["url"])})
        except Exception as e:
            logger.warning("Telegram channel probe failed for channel %s: %s", ch.get("chat"), e)
            out.append({"chat": str(ch["chat"]), "title": "", "ok": False, "error": "bot_not_admin", "has_link": bool(ch["url"])})
    return out


@admin.get("/posts/{post_id}/files")
async def get_post_files(post_id: int):
    return await db.fetchall(
        "SELECT file_id, label_fa, label_en FROM post_files WHERE post_id=? ORDER BY sort ASC, id ASC", (post_id,)
    )


@admin.put("/posts/{post_id}/files")
async def put_post_files(post_id: int, body: list = Body(...)):
    """Replace the download buttons of a post (order = list order)."""
    await db.execute("DELETE FROM post_files WHERE post_id=?", (post_id,))
    for i, it in enumerate(body):
        try:
            fid = int(it.get("file_id", 0))
        except (TypeError, ValueError, AttributeError):
            continue
        if not await db.fetchone("SELECT 1 FROM files WHERE id=?", (fid,)):
            continue
        await db.execute(
            "INSERT INTO post_files(post_id,file_id,label_fa,label_en,sort) VALUES(?,?,?,?,?)",
            (post_id, fid, str(it.get("label_fa", ""))[:200], str(it.get("label_en", ""))[:200], i),
        )
    return {"ok": True}


@admin.get("/{table}")
async def list_rows(table: AdminTable, limit: int = 0, offset: int = 0, q: str = ""):
    t_name = SAFE_TABLE_NAMES[table]
    where, params = "1=1", []
    if q.strip() and table == AdminTable.files:
        where = "(title_fa LIKE ? ESCAPE '\\' OR title_en LIKE ? ESCAPE '\\' OR file_name LIKE ? ESCAPE '\\')"
        params = [_like(q.strip()[:80])] * 3
    sql, params = _page(f"SELECT * FROM {t_name} WHERE {where} ORDER BY {ORDER[t_name]}", params, limit, offset)
    return await db.fetchall(sql, params)


@admin.post("/{table}")
async def create_row(table: AdminTable, body: dict = Body(...)):
    t_name = SAFE_TABLE_NAMES[table]
    if table == AdminTable.files:
        raise HTTPException(400, "Files are added by sending them to the bot")
    cols = [c for c in TABLES[t_name] if c in body]
    if cols:
        placeholders = ",".join("?" for _ in cols)
        sql = f"INSERT INTO {t_name}({','.join(cols)}) VALUES({placeholders})"
        new_id = await db.execute(sql, [body[c] for c in cols])
    else:
        new_id = await db.execute(f"INSERT INTO {t_name} DEFAULT VALUES")
    return {"id": new_id}


@admin.patch("/{table}/{row_id}")
async def update_row(table: AdminTable, row_id: int, body: dict = Body(...)):
    t_name = SAFE_TABLE_NAMES[table]
    cols = [c for c in TABLES[t_name] if c in body]
    if cols:
        sets = ",".join(f"{c}=?" for c in cols)
        await db.execute(f"UPDATE {t_name} SET {sets} WHERE id=?", [body[c] for c in cols] + [row_id])
    return {"ok": True}


@admin.delete("/{table}/{row_id}")
async def delete_row(table: AdminTable, row_id: int):
    t_name = SAFE_TABLE_NAMES[table]
    await db.execute(f"DELETE FROM {t_name} WHERE id=?", (row_id,))
    if table == AdminTable.categories:
        await db.execute("UPDATE posts SET category_id=0 WHERE category_id=?", (row_id,))
    elif table == AdminTable.posts:
        await db.execute("DELETE FROM post_files WHERE post_id=?", (row_id,))
    elif table == AdminTable.files:
        await db.execute("DELETE FROM post_files WHERE file_id=?", (row_id,))
    return {"ok": True}


router.include_router(admin)
