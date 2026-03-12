import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.dependencies import get_supabase
from app.middleware.auth import WalletAuthMiddleware
from app.routers import health, auth, chat, quotes, escrow, overheads, projects, users

logger = logging.getLogger(__name__)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Starts the background event indexer on startup and cancels it
    on shutdown.
    """
    from app.services.event_indexer import poll_events

    supabase = get_supabase()
    task = asyncio.create_task(
        poll_events(supabase, settings.onechain_rpc_url),
        name="event-indexer",
    )
    logger.info("Event indexer background task started")

    yield

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        logger.info("Event indexer background task stopped")


app = FastAPI(title="QuoteGuard API", version="0.1.0", lifespan=lifespan)

# Middleware is applied in reverse order (last added = first executed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(WalletAuthMiddleware)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(quotes.router)
app.include_router(escrow.router)
app.include_router(overheads.router)
app.include_router(projects.router)
app.include_router(users.router)
