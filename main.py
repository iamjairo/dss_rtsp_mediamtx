# -*- coding: utf-8 -*-
import logging
import os
from contextlib import asynccontextmanager

from app.config.database import database_manager_sqlite
from app.services.camera_service import camera_service
from app.websocket.websocket import router as api_router_ws
from starlette.responses import HTMLResponse

logging.basicConfig(level=logging.INFO)

import uvicorn
from fastapi import FastAPI

from app.app import api_router
from app.config.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting the server")
    if not settings.DAHUA_PASSWORD:
        logging.warning("DAHUA_PASSWORD is empty. Configure it with environment variables before production use.")
    database_manager_sqlite.create_tables()
    camera_service.load_all_camera()
    yield

    print("Shutting down the server")



app = FastAPI(
    docs_url="/docs",
    root_path=settings.APP_ROOT_PATH,
    openapi_url="/openapi.json",
    title="DSS Backend API",
    lifespan=lifespan,
)


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def get_camera_management_ui():
    template_path = os.path.join(os.path.dirname(__file__), "templates", "camera_management.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content, status_code=200)

app.include_router(api_router_ws, prefix="/ws")

app.include_router(api_router)
if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.APP_HOST, port=settings.PORT)
