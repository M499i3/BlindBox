import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# Ensure `src/` is on the path so imports work regardless of cwd
_SRC = Path(__file__).resolve().parent / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from api.routes import (
    auth,
    catalog,
    cart,
    chats,
    collections,
    listings,
    marketplace,
    notifications,
    orders,
    profile,
    swap_proposals,
    split_boxes,
)


app = FastAPI(title="BlindBox API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
    # 手機／平板用區網 IP 開前端（如 http://192.168.0.140:3001）
    allow_origin_regex=(
        r"http://192\.168\.\d{1,3}\.\d{1,3}:(3001|3002)"
        r"|http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(3001|3002)"
        r"|http://172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}:(3001|3002)"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["catalog"])
app.include_router(listings.router, prefix="/api/listings", tags=["listings"])
app.include_router(cart.router, prefix="/api/cart", tags=["cart"])
app.include_router(collections.router, prefix="/api/collections", tags=["collections"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(marketplace.router, prefix="/api/marketplace", tags=["marketplace"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(chats.router, prefix="/api/chats", tags=["chats"])
app.include_router(swap_proposals.router, prefix="/api/swap-proposals", tags=["swap-proposals"])
app.include_router(split_boxes.router, prefix="/api/split-boxes", tags=["split-boxes"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])



@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
