import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from . import bot as bot_mod
from . import db
from .api import router
from .config import UPLOADS_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

STATIC = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init()
    await bot_mod.setup()
    tasks = [asyncio.create_task(bot_mod.run_polling()), asyncio.create_task(bot_mod.autodelete_loop())]
    yield
    for t in tasks:
        t.cancel()
    for t in tasks:
        try:
            await t
        except BaseException:
            pass
    await bot_mod.bot.session.close()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(router)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/admin", StaticFiles(directory=STATIC / "admin", html=True), name="admin")
app.mount("/app", StaticFiles(directory=STATIC / "miniapp", html=True), name="miniapp")


@app.get("/")
async def root():
    return RedirectResponse("/app/")
