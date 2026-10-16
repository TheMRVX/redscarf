import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from .config import BOT_TOKEN, SECRET_KEY


def validate_init_data(init_data: str, max_age: int = 86400) -> dict | None:
    """Validate Telegram Mini App initData and return the user dict, or None."""
    if not init_data:
        return None
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
    except ValueError:
        return None
    received = pairs.pop("hash", None)
    if not received:
        return None
    check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, received):
        return None
    try:
        if time.time() - int(pairs.get("auth_date", "0")) > max_age:
            return None
        user = json.loads(pairs.get("user", ""))
        return user if isinstance(user, dict) and "id" in user else None
    except (ValueError, TypeError):
        return None


def make_admin_token(days: int = 7) -> str:
    exp = str(int(time.time()) + days * 86400)
    sig = hmac.new(SECRET_KEY.encode(), exp.encode(), hashlib.sha256).hexdigest()
    return f"{exp}.{sig}"


def check_admin_token(tok: str) -> bool:
    try:
        exp, sig = tok.split(".", 1)
        good = hmac.new(SECRET_KEY.encode(), exp.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, good) and int(exp) > time.time()
    except Exception:
        return False
