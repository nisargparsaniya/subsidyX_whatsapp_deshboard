import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import settings
from app.database import DB_ENGINE_TYPE, SessionLocal, init_db
from app.models.system_setting import get_whatsapp_mode
from app.routers import admin_users, auth, ca_network, campaigns_templates, chatbot, client_lists, contacts, leads_integrations, whatsapp
from app.services.campaign_scheduler import run_campaign_scheduler_loop
from app.services.security import AUTH_COOKIE

BASE_DIR = Path(__file__).resolve().parent

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()  # create tables + seed Super Admins and the presentation showcase
    scheduler_task = asyncio.create_task(run_campaign_scheduler_loop())
    try:
        yield
    finally:
        scheduler_task.cancel()


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Compression middleware for low-bandwidth / low-spec network efficiency
app.add_middleware(GZipMiddleware, minimum_size=500)


import hashlib

@app.middleware("http")
async def cache_control_middleware(request: Request, call_next):
    path = request.url.path
    response = await call_next(request)
    if path.startswith(("/static/js/", "/static/css/")) or path.endswith((".js", ".css")):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    elif path.startswith("/static/img/") or path.endswith((".png", ".jpg", ".svg", ".ico", ".woff2")):
        response.headers["Cache-Control"] = "public, max-age=604800, immutable"
    elif path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache"
        if request.method == "GET" and response.status_code == 200:
            body_chunks = [chunk async for chunk in response.body_iterator]
            body_bytes = b"".join(chunk if isinstance(chunk, bytes) else chunk.encode("utf-8") for chunk in body_chunks)
            etag = f'"{hashlib.md5(body_bytes).hexdigest()}"'
            if request.headers.get("if-none-match") == etag:
                from fastapi.responses import Response as FastResponse
                return FastResponse(status_code=304, headers={"ETag": etag, "Cache-Control": "no-cache"})
            from fastapi.responses import Response as FastResponse
            headers = dict(response.headers)
            headers["ETag"] = etag
            headers["Cache-Control"] = "no-cache"
            return FastResponse(
                content=body_bytes,
                status_code=response.status_code,
                headers=headers,
                media_type=response.media_type,
            )
    return response


app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(contacts.router)
app.include_router(ca_network.router)
app.include_router(client_lists.router)
app.include_router(campaigns_templates.router)
app.include_router(chatbot.router)
app.include_router(leads_integrations.router)
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
    if not request.cookies.get(AUTH_COOKIE):
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse(request, "dashboard.html")


@app.get("/health", include_in_schema=False)
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
