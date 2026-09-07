import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.commitments import router as commitment_router
from src.api.marine import router as marine_router
from src.api.phase456 import router as phase456_router
from src.api.voice import router as voice_router
from src.api.websocket import router as websocket_router
from src.core.config import get_settings
from src.core.database import db


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

settings = get_settings()

app = FastAPI(
    title="ORCA Intelligence",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core API routes
app.include_router(marine_router)
app.include_router(commitment_router)
app.include_router(phase456_router)

# Realtime + voice routes
app.include_router(websocket_router)
app.include_router(voice_router)


@app.exception_handler(Exception)
async def unhandled_error(
    _: Request,
    exc: Exception,
) -> JSONResponse:
    logging.getLogger(__name__).exception(
        "Unhandled API error",
        exc_info=exc,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred",
            }
        },
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.service_name,
    }


@app.get("/health/db")
def database_health() -> dict[str, object]:
    return {
        "status": "ok" if db.healthy() else "unavailable",
        "database": "mongodb",
    }