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

from api.routes import catalog, cart, listings, marketplace, profile  # noqa: E402

app = FastAPI(title="BlindBox API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog.router, prefix="/api/catalog", tags=["catalog"])
app.include_router(listings.router, prefix="/api/listings", tags=["listings"])
app.include_router(cart.router, prefix="/api/cart", tags=["cart"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(marketplace.router, prefix="/api/marketplace", tags=["marketplace"])


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
