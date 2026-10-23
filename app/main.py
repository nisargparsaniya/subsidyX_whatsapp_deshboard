"""Application entrypoint — API routers plus the executive in-house command center UI."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import settings
from app.database import DB_ENGINE_TYPE, SessionLocal, init_db
from app.models.system_setting import get_whatsapp_mode
from app.routers import admin_users, auth, campaigns_templates, chatbot, contacts, whatsapp
from app.services.security import AUTH_COOKIE

BASE_DIR = Path(__file__).resolve().parent

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()  # create tables + seed Super Admins and the presentation showcase
    yield


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(contacts.router)
app.include_router(campaigns_templates.router)
app.include_router(chatbot.router)
app.include_router(whatsapp.router)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/dashboard", status_code=302)


@app.get("/login", response_class=HTMLResponse, include_in_schema=False)
def login_page(request: Request):
    if request.cookies.get(AUTH_COOKIE):
        return RedirectResponse("/dashboard", status_code=302)
    return templates.TemplateResponse(request, "login.html")


@app.get("/dashboard", response_class=HTMLResponse, include_in_schema=False)
def dashboard_page(request: Request):
    # ponytail: cheap cookie presence check here; the API layer re-validates the JWT on every call.
    if not request.cookies.get(AUTH_COOKIE):
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse(request, "dashboard.html")


@app.get("/api/health", tags=["System"])
def health():
    with SessionLocal() as db:
        mode = get_whatsapp_mode(db)
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "database_engine": DB_ENGINE_TYPE,
        "whatsapp_mode": mode,
    }
