import asyncio
import html
import logging
import re
import secrets
import time
from datetime import datetime, timezone

from aiogram import Bot, Dispatcher, Router, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError, TelegramRetryAfter
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import (
    CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup,
    MenuButtonWebApp, Message, ReplyParameters, User, WebAppInfo,
)

from . import db
from .config import ADMIN_IDS, BOT_TOKEN, PUBLIC_URL, STORAGE_CHANNEL_ID

log = logging.getLogger("bot")
bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()
router = Router()
dp.include_router(router)

BOT_USERNAME = ""
PAGE = 8
_notified_channels: set[int] = set()

T = {
    "fa": {
        "open_app": "🚀 باز کردن مینی اپ", "files": "📂 فایل‌ها", "lang": "🌐 English",
        "no_files": "هنوز فایلی وجود ندارد.", "choose": "یک فایل را انتخاب کنید:",
        "not_found": "این فایل پیدا نشد یا حذف شده است.",
        "send_error": "ارسال فایل با خطا مواجه شد. کمی بعد دوباره تلاش کنید.",
        "cats": "🗂 دسته‌بندی‌ها", "all": "همه فایل‌ها", "prev": "◀️", "next": "▶️",
        "send_hint": "برای افزودن فایل، آن را همین‌جا برای من بفرستید.",
        "saved": "✅ فایل ذخیره شد", "link": "لینک دانلود", "panel": "پنل مدیریت",
        "channel_error": "کپی فایل به کانال ذخیره‌سازی ناموفق بود. مطمئن شوید ربات ادمین کانال است.\n",
        "no_channel": "کانال ذخیره‌سازی تنظیم نشده؛ فایل در همین چت ذخیره شد (توصیه می‌شود کانال بسازید).",
        "channel_found": "کانال شناسایی شد. این مقدار را در فایل .env بگذارید و ربات را ری‌استارت کنید:",
        "forbidden": "دسترسی ندارید.",
        "autodel": "⏳ برای جلوگیری از مشکلات کپی‌رایت، این فایل {t} دیگر به‌طور خودکار از این چت حذف می‌شود. همین حالا آن را ذخیره یا فوروارد کنید.",
        "join": "📢 برای دانلود، ابتدا در کانال زیر عضو شوید و سپس روی «عضو شدم» بزنید:",
        "joined": "✅ عضو شدم", "still_not": "هنوز عضو کانال نشده‌اید.",
        "limit": "⛔️ سقف دانلود شما ({limit} فایل در {h}) پر شده است. حدود {t} دیگر دوباره تلاش کنید.",
    },
    "en": {
        "open_app": "🚀 Open Mini App", "files": "📂 Files", "lang": "🌐 فارسی",
        "no_files": "There are no files yet.", "choose": "Choose a file:",
        "not_found": "This file was not found or has been removed.",
        "send_error": "Could not send the file. Please try again later.",
        "cats": "🗂 Categories", "all": "All files", "prev": "◀️", "next": "▶️",
        "send_hint": "Send me a file here to add it.",
        "saved": "✅ File saved", "link": "Download link", "panel": "Admin panel",
        "channel_error": "Copying to the storage channel failed. Make sure the bot is an admin there.\n",
        "no_channel": "No storage channel set; the file is kept in this chat (creating a channel is recommended).",
        "channel_found": "Channel detected. Put this value in .env and restart the bot:",
        "forbidden": "Access denied.",
        "autodel": "⏳ To avoid copyright issues, this file will be deleted from this chat automatically in {t}. Please save or forward it now.",
        "join": "📢 To download, please join the channel(s) below, then tap “I joined”:",
        "joined": "✅ I joined", "still_not": "You haven't joined yet.",
        "limit": "⛔️ Download limit reached ({limit} files per {h}). Please try again in about {t}.",
    },
}


def esc(s) -> str:
    return html.escape(str(s or ""))


def fmt_size(n: int) -> str:
    n = float(n or 0)
    for u in ("B", "KB", "MB", "GB"):
        if n < 1024 or u == "GB":
            return f"{n:.0f} {u}" if u == "B" else f"{n:.1f} {u}"
        n /= 1024


def pick(row: dict, base: str, lang: str) -> str:
    return row.get(f"{base}_{lang}") or row.get(f"{base}_fa") or row.get(f"{base}_en") or ""


def detect_lang(code: str | None) -> str:
    return "fa" if (code or "").lower().startswith("fa") else "en"


async def upsert_user(u: User, started: bool = False):
    await db.execute(
        "INSERT INTO users(tg_id, first_name, username, lang, started) VALUES(?,?,?,?,?) "
        "ON CONFLICT(tg_id) DO UPDATE SET first_name=excluded.first_name, username=excluded.username, "
        "last_seen=datetime('now'), started=MAX(started, excluded.started), "
        "lang=CASE WHEN users.lang='' THEN excluded.lang ELSE users.lang END",
        (u.id, u.first_name or "", u.username or "", detect_lang(u.language_code), 1 if started else 0),
    )


async def user_lang(tg_id: int, code: str | None = None) -> str:
    row = await db.fetchone("SELECT lang FROM users WHERE tg_id=?", (tg_id,))
    if row and row["lang"] in ("fa", "en"):
        return row["lang"]
    return detect_lang(code)


async def set_lang(tg_id: int, lang: str):
    await db.execute("UPDATE users SET lang=? WHERE tg_id=?", (lang, tg_id))


def file_title(f: dict, lang: str) -> str:
    return pick(f, "title", lang) or f.get("file_name") or "file"


def fmt_minutes(n: int, lang: str) -> str:
    if n >= 60 and n % 60 == 0:
        h = n // 60
        return f"{h} ساعت" if lang == "fa" else f"{h} hour{'s' if h > 1 else ''}"
    return f"{n} دقیقه" if lang == "fa" else f"{n} minute{'s' if n != 1 else ''}"


async def autodelete_settings() -> tuple[int, bool]:
    s = await db.get_settings()
    try:
        mins = max(0, min(int(s["autodelete_minutes"]), 1440))
    except (TypeError, ValueError):
        mins = 0
    return mins, s["autodelete_notice"] == "1"


async def schedule_delete_after_send(chat_id: int, msg_id: int, lang: str):
    """If auto-delete is on, queue the delivered file (and the warning) for removal from the user's chat."""
    mins, notice = await autodelete_settings()
    if mins <= 0:
        return
    due = int(time.time()) + mins * 60
    await db.execute("INSERT INTO pending_deletes(chat_id,message_id,delete_at) VALUES(?,?,?)", (chat_id, msg_id, due))
    if notice:
        try:
            n = await bot.send_message(
                chat_id, T[lang]["autodel"].format(t=fmt_minutes(mins, lang)),
                reply_parameters=ReplyParameters(message_id=msg_id, allow_sending_without_reply=True),
            )
            await db.execute("INSERT INTO pending_deletes(chat_id,message_id,delete_at) VALUES(?,?,?)", (chat_id, n.message_id, due))
        except Exception as e:
            log.warning("auto-delete notice failed: %s", e)


async def autodelete_tick() -> int:
    """Delete every queued message whose time has come. Returns how many rows were handled."""
    rows = await db.fetchall(
        "SELECT * FROM pending_deletes WHERE delete_at<=? ORDER BY delete_at LIMIT 50", (int(time.time()),)
    )
    for r in rows:
        try:
            await bot.delete_message(r["chat_id"], r["message_id"])
            await db.execute("DELETE FROM pending_deletes WHERE id=?", (r["id"],))
        except (TelegramBadRequest, TelegramForbiddenError):
            # already deleted by the user, blocked bot, or older than Telegram's 48h limit
            await db.execute("DELETE FROM pending_deletes WHERE id=?", (r["id"],))
        except TelegramRetryAfter as e:
            await asyncio.sleep(min(e.retry_after, 30))
            break
        except Exception:
            log.exception("auto-delete failed")
            if r["tries"] >= 4:
                await db.execute("DELETE FROM pending_deletes WHERE id=?", (r["id"],))
            else:
                await db.execute("UPDATE pending_deletes SET tries=tries+1 WHERE id=?", (r["id"],))
        await asyncio.sleep(0.05)
    return len(rows)


async def autodelete_loop():
    while True:
        try:
            await autodelete_tick()
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("auto-delete loop error")
        await asyncio.sleep(15)


# ---------- access control: forced channel membership + download limit ----------

_member_cache: dict[tuple[int, str], float] = {}
_title_cache: dict[str, str] = {}


def parse_channels(raw: str) -> list[dict]:
    """One channel per line: @name | https://t.me/name | -100123 | -100123|https://t.me/+invite"""
    out = []
    for line in re.split(r"[\n,]+", raw or ""):
        line = line.strip()
        if not line:
            continue
        chat, url = line, ""
        if "|" in line:
            chat, url = [x.strip() for x in line.split("|", 1)]
        m = re.match(r"^(?:https?://)?(?:t\.me|telegram\.me)/([A-Za-z][A-Za-z0-9_]{3,})/?$", chat)
        if m:
            chat = "@" + m.group(1)
        if re.fullmatch(r"-?\d+", chat):
            chat_id = int(chat)
        elif re.fullmatch(r"@[A-Za-z][A-Za-z0-9_]{3,}", chat):
            chat_id = chat
            url = url or "https://t.me/" + chat[1:]
        else:
            continue
        out.append({"chat": chat_id, "url": url if url.startswith("http") else ""})
    return out


async def channel_title(chat) -> str:
    key = str(chat)
    if key not in _title_cache:
        try:
            c = await bot.get_chat(chat)
            _title_cache[key] = c.title or key
        except Exception:
            return key if key.startswith("@") else ""
    return _title_cache[key]


async def is_member(user_id: int, chat) -> bool | None:
    """True/False, or None when Telegram could not answer (bot not admin, bad channel, network...)."""
    key = (user_id, str(chat))
    if _member_cache.get(key, 0) > time.time():
        return True
    try:
        m = await bot.get_chat_member(chat, user_id)
    except Exception as e:
        log.warning("membership check failed for %s: %s", chat, e)
        return None
    ok = m.status in ("creator", "administrator", "member") or (m.status == "restricted" and getattr(m, "is_member", False))
    if ok:
        _member_cache[key] = time.time() + 120
    return ok


def _parse_db_time(s: str) -> float:
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc).timestamp()


async def check_access(user_id: int) -> dict | None:
    """None = allowed. Otherwise {"code": "not_member", "channels": [...]} or {"code": "limit", ...}. Admins are exempt."""
    if user_id in ADMIN_IDS:
        return None
    s = await db.get_settings()
    if s["force_join_enabled"] == "1":
        missing = []
        for ch in parse_channels(s["force_join_channels"]):
            if await is_member(user_id, ch["chat"]) is False:  # None (cannot check) never blocks users
                missing.append(ch)
        if missing:
            return {"code": "not_member",
                    "channels": [{"title": await channel_title(c["chat"]), "url": c["url"]} for c in missing]}
    if s["dl_limit_enabled"] == "1":
        try:
            limit, hours = int(s["dl_limit_count"]), int(s["dl_limit_hours"])
        except (TypeError, ValueError):
            limit = hours = 0
        if limit > 0 and hours > 0:
            win = f"-{hours} hours"
            used = (await db.fetchone("SELECT COUNT(*) c FROM downloads WHERE tg_id=? AND at >= datetime('now', ?)", (user_id, win)))["c"]
            if used >= limit:
                # a slot frees up when the `limit`-th most recent download leaves the window
                row = await db.fetchone(
                    "SELECT at FROM downloads WHERE tg_id=? AND at >= datetime('now', ?) ORDER BY at DESC LIMIT 1 OFFSET ?",
                    (user_id, win, limit - 1))
                free_at = _parse_db_time(row["at"]) + hours * 3600 if row else time.time()
                return {"code": "limit", "limit": limit, "hours": hours,
                        "retry_minutes": max(1, int((free_at - time.time()) // 60) + 1)}
    return None


def limit_text(gate: dict, lang: str) -> str:
    return T[lang]["limit"].format(limit=gate["limit"], h=fmt_minutes(gate["hours"] * 60, lang),
                                   t=fmt_minutes(max(1, gate["retry_minutes"]), lang))


async def send_gate_prompt(user_id: int, gate: dict, token: str, lang: str):
    if gate["code"] == "not_member":
        chans = gate["channels"]
        kb = [[InlineKeyboardButton(text="📢 " + (c["title"] or "Channel")[:40], url=c["url"])] for c in chans if c["url"]]
        kb.append([InlineKeyboardButton(text=T[lang]["joined"], callback_data=f"rt:{token}")])
        names = "\n".join("• " + esc(c["title"]) for c in chans if c["title"])
        await bot.send_message(user_id, T[lang]["join"] + (("\n\n" + names) if names else ""),
                               reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))
    else:
        await bot.send_message(user_id, limit_text(gate, lang))


async def deliver(user_id: int, f: dict, lang: str) -> str:
    """Access checks + send, for requests that arrive through the bot chat."""
    gate = await check_access(user_id)
    if gate:
        await send_gate_prompt(user_id, gate, f["token"], lang)
        return gate["code"]
    return await send_file(user_id, f, lang)


async def send_file(user_id: int, f: dict, lang: str) -> str:
    """Copy a stored file to a user. Returns ok | not_started | missing | error."""
    kwargs = {}
    if f["kind"] not in ("video_note", "sticker"):
        cap = file_title(f, lang)
        desc = pick(f, "desc", lang)
        if desc:
            cap += "\n\n" + desc
        kwargs["caption"] = cap[:1000]
    try:
        sent = await bot.copy_message(
            chat_id=user_id, from_chat_id=f["channel_id"], message_id=f["message_id"],
            parse_mode=None, **kwargs,
        )
    except TelegramForbiddenError:
        return "not_started"
    except TelegramBadRequest as e:
        log.warning("copy_message failed for file %s: %s", f["id"], e)
        return "missing"
    except Exception:
        log.exception("send_file failed")
        return "error"
    await db.execute("UPDATE files SET downloads=downloads+1 WHERE id=?", (f["id"],))
    await db.execute("INSERT INTO downloads(file_id, tg_id) VALUES(?,?)", (f["id"], user_id))
    try:
        await schedule_delete_after_send(user_id, sent.message_id, lang)
    except Exception:
        log.exception("could not schedule auto-delete")
    return "ok"


def deep_link(token: str) -> str:
    return f"https://t.me/{BOT_USERNAME}?start=f_{token}"


async def miniapp_url() -> str:
    s = await db.get_settings()
    return (s["miniapp_url"] or f"{PUBLIC_URL}/app/").strip()


async def apply_menu_button():
    url = await miniapp_url()
    if not url.startswith("https://"):
        return
    s = await db.get_settings()
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(text=(s["menu_button_text"] or "Open")[:16], web_app=WebAppInfo(url=url))
        )
    except Exception as e:
        log.warning("set_chat_menu_button failed: %s", e)


async def setup():
    global BOT_USERNAME
    try:
        me = await bot.get_me()
        BOT_USERNAME = me.username or ""
        await apply_menu_button()
    except Exception as e:
        log.error("Bot setup failed (check BOT_TOKEN / network): %s", e)


# ---------- media helpers ----------

def extract_media(m: Message) -> dict | None:
    if m.document:
        o = m.document
        return dict(kind="document", name=o.file_name or "file", size=o.file_size or 0, mime=o.mime_type or "")
    if m.video:
        o = m.video
        return dict(kind="video", name=o.file_name or "video.mp4", size=o.file_size or 0, mime=o.mime_type or "")
    if m.audio:
        o = m.audio
        return dict(kind="audio", name=o.file_name or o.title or "audio", size=o.file_size or 0, mime=o.mime_type or "")
    if m.animation:
        o = m.animation
        return dict(kind="animation", name=o.file_name or "animation.mp4", size=o.file_size or 0, mime=o.mime_type or "")
    if m.voice:
        o = m.voice
        return dict(kind="voice", name="voice.ogg", size=o.file_size or 0, mime=o.mime_type or "")
    if m.video_note:
        o = m.video_note
        return dict(kind="video_note", name="video_note.mp4", size=o.file_size or 0, mime="video/mp4")
    if m.photo:
        o = m.photo[-1]
        return dict(kind="photo", name="photo.jpg", size=o.file_size or 0, mime="image/jpeg")
    return None


async def register_file(meta: dict, chan: int, mid: int, caption: str | None = None) -> dict:
    ex = await db.fetchone("SELECT * FROM files WHERE channel_id=? AND message_id=?", (chan, mid))
    if ex:
        return ex
    title = ((caption or "").strip().split("\n")[0])[:120] or meta["name"]
    fid = await db.execute(
        "INSERT INTO files(token,title_fa,title_en,file_name,size,mime,kind,channel_id,message_id) "
        "VALUES(?,?,?,?,?,?,?,?,?)",
        (secrets.token_urlsafe(6), title, title, meta["name"], meta["size"], meta["mime"], meta["kind"], chan, mid),
    )
    return await db.fetchone("SELECT * FROM files WHERE id=?", (fid,))


def saved_text(f: dict, lang: str, extra: str = "") -> str:
    t = T[lang]
    return (
        f"{t['saved']}\n\n📄 {esc(f['title_fa'] or f['file_name'])}\n💾 {fmt_size(f['size'])}\n\n"
        f"🔗 {t['link']}:\n<code>{esc(deep_link(f['token']))}</code>\n\n"
        f"🛠 {t['panel']}: {esc(PUBLIC_URL)}/admin/" + (f"\n\n{extra}" if extra else "")
    )


# ---------- user-facing views ----------

async def welcome_kb(lang: str) -> InlineKeyboardMarkup:
    rows = []
    url = await miniapp_url()
    if url.startswith("https://"):
        rows.append([InlineKeyboardButton(text=T[lang]["open_app"], web_app=WebAppInfo(url=url))])
    rows.append([InlineKeyboardButton(text=T[lang]["lang"], callback_data="lang")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


async def welcome_text(lang: str) -> str:
    s = await db.get_settings()
    custom = s.get(f"start_text_{lang}") or ""
    if custom:
        return esc(custom)
    return f"<b>{esc(s[f'brand_name_{lang}'])}</b>\n{esc(s[f'welcome_{lang}'])}"


async def send_post(chat_id: int, post_id: int, lang: str) -> bool:
    """Send a post (cover, text, download buttons) into a chat. Used by t.me/bot?start=p_<id> links."""
    p = await db.fetchone("SELECT * FROM posts WHERE id=? AND active=1", (post_id,))
    if not p:
        return False
    files = await db.fetchall(
        "SELECT f.id, f.title_fa, f.title_en, f.file_name, f.size, pf.label_fa, pf.label_en FROM post_files pf "
        "JOIN files f ON f.id=pf.file_id WHERE pf.post_id=? AND f.active=1 ORDER BY pf.sort ASC, pf.id ASC",
        (post_id,),
    )
    kb = []
    for f in files:
        label = pick(f, "label", lang) or file_title(f, lang)
        if f["size"]:
            label += f" · {fmt_size(f['size'])}"
        kb.append([InlineKeyboardButton(text="⬇️ " + label[:50], callback_data=f"dl:{f['id']}")])
    markup = InlineKeyboardMarkup(inline_keyboard=kb) if kb else None
    text = f"<b>{esc(pick(p, 'title', lang))}</b>\n\n{esc(pick(p, 'body', lang))}"
    img = p["image_url"] or ""
    if img.startswith("/"):
        img = PUBLIC_URL + img
    if img.startswith("http"):
        try:
            await bot.send_photo(chat_id, img, caption=text[:1000], reply_markup=markup)
            return True
        except Exception as e:
            log.warning("send_photo failed for post %s: %s", post_id, e)
    await bot.send_message(chat_id, text[:4000], reply_markup=markup)
    return True


# ---------- handlers ----------

@router.message(CommandStart())
async def h_start(m: Message, command: CommandObject):
    await upsert_user(m.from_user, started=True)
    lang = await user_lang(m.from_user.id, m.from_user.language_code)
    arg = (command.args or "").strip()
    if arg.startswith("f_"):
        f = await db.fetchone("SELECT * FROM files WHERE token=? AND active=1", (arg[2:],))
        if not f:
            await m.answer(T[lang]["not_found"])
            return
        if await deliver(m.from_user.id, f, lang) not in ("ok", "not_member", "limit"):
            await m.answer(T[lang]["send_error"])
        return
    if arg.startswith("p_") and arg[2:].isdigit():
        if not await send_post(m.chat.id, int(arg[2:]), lang):
            await m.answer(T[lang]["not_found"])
        return
    await m.answer(await welcome_text(lang), reply_markup=await welcome_kb(lang))


@router.message(Command("lang"))
async def h_lang(m: Message):
    await upsert_user(m.from_user, started=True)
    cur = await user_lang(m.from_user.id, m.from_user.language_code)
    new = "en" if cur == "fa" else "fa"
    await set_lang(m.from_user.id, new)
    await m.answer(await welcome_text(new), reply_markup=await welcome_kb(new))


@router.message(Command("panel"))
async def h_panel(m: Message):
    lang = await user_lang(m.from_user.id, m.from_user.language_code)
    if m.from_user.id not in ADMIN_IDS:
        await m.answer(T[lang]["forbidden"])
        return
    await m.answer(f"{PUBLIC_URL}/admin/")


@router.callback_query(F.data == "lang")
async def cb_lang(c: CallbackQuery):
    cur = await user_lang(c.from_user.id, c.from_user.language_code)
    new = "en" if cur == "fa" else "fa"
    await set_lang(c.from_user.id, new)
    try:
        await c.message.edit_text(await welcome_text(new), reply_markup=await welcome_kb(new))
    except TelegramBadRequest:
        pass
    await c.answer()


@router.callback_query(F.data.startswith("dl:"))
async def cb_dl(c: CallbackQuery):
    lang = await user_lang(c.from_user.id, c.from_user.language_code)
    f = await db.downloadable_file(int(c.data[3:]))
    if not f:
        await c.answer(T[lang]["not_found"], show_alert=True)
        return
    st = await deliver(c.from_user.id, f, lang)
    if st in ("ok", "not_member", "limit"):
        await c.answer()
    else:
        await c.answer(T[lang]["send_error"], show_alert=True)


@router.callback_query(F.data.startswith("rt:"))
async def cb_retry(c: CallbackQuery):
    """The 'I joined' button: re-check access and deliver the file."""
    lang = await user_lang(c.from_user.id, c.from_user.language_code)
    f = await db.fetchone("SELECT * FROM files WHERE token=? AND active=1", (c.data[3:],))
    if not f:
        await c.answer(T[lang]["not_found"], show_alert=True)
        return
    gate = await check_access(c.from_user.id)
    if gate:
        await c.answer(T[lang]["still_not"] if gate["code"] == "not_member" else limit_text(gate, lang), show_alert=True)
        return
    await c.answer()
    try:
        await c.message.delete()
    except Exception:
        pass
    if await send_file(c.from_user.id, f, lang) != "ok":
        await bot.send_message(c.from_user.id, T[lang]["send_error"])


@router.message(F.from_user.id.in_(ADMIN_IDS))
async def h_admin_upload(m: Message):
    """Any media an admin sends is stored and gets a download link."""
    lang = await user_lang(m.from_user.id, m.from_user.language_code)
    meta = extract_media(m)
    if not meta:
        await m.answer(T[lang]["send_hint"])
        return
    extra = ""
    if STORAGE_CHANNEL_ID:
        try:
            copy = await bot.copy_message(STORAGE_CHANNEL_ID, m.chat.id, m.message_id)
        except Exception as e:
            await m.answer(T[lang]["channel_error"] + esc(e))
            return
        chan, mid = STORAGE_CHANNEL_ID, copy.message_id
    else:
        chan, mid = m.chat.id, m.message_id
        extra = T[lang]["no_channel"]
    f = await register_file(meta, chan, mid, m.caption)
    await m.answer(saved_text(f, lang, extra))


@router.channel_post()
async def h_channel_post(m: Message):
    """Files posted directly into the storage channel (e.g. >2GB via Premium) are registered automatically."""
    if not STORAGE_CHANNEL_ID:
        if m.chat.id not in _notified_channels:
            _notified_channels.add(m.chat.id)
            for a in ADMIN_IDS:
                try:
                    await bot.send_message(a, f"{T['en']['channel_found']}\n<code>STORAGE_CHANNEL_ID={m.chat.id}</code>")
                except Exception:
                    pass
        return
    if m.chat.id != STORAGE_CHANNEL_ID:
        return
    meta = extract_media(m)
    if not meta:
        return
    f = await register_file(meta, m.chat.id, m.message_id, m.caption)
    for a in ADMIN_IDS:
        try:
            await bot.send_message(a, saved_text(f, await user_lang(a)))
        except Exception:
            pass


async def run_polling():
    while True:
        try:
            if not BOT_USERNAME:
                await setup()
            await dp.start_polling(
                bot, handle_signals=False, allowed_updates=dp.resolve_used_update_types()
            )
            return
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Polling crashed; retrying in 5s")
            await asyncio.sleep(5)
