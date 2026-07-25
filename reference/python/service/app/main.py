"""Atlas Payments — demo microservice under SENTINEL's watch.

Endpoints:
  GET  /health       liveness + golden-canary self check (500 on failure)
  POST /api/charge   price an order and "charge" it

All requests and errors are written to logs/service.log so SENTINEL's
observability tools can read them.
"""

from __future__ import annotations

import logging
import traceback
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app import pricing

# ── logging ────────────────────────────────────────────────────────────────
LOG_DIR = Path(__file__).resolve().parents[1] / "logs"
LOG_DIR.mkdir(exist_ok=True)

logger = logging.getLogger("atlas")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = RotatingFileHandler(LOG_DIR / "service.log", maxBytes=1_000_000, backupCount=2)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)

app = FastAPI(title="Atlas Payments", version="1.0.0")


class OrderItem(BaseModel):
    sku: str
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)


class ChargeRequest(BaseModel):
    items: list[OrderItem]
    discount_code: Optional[str] = None
    region: str = "US"


# A known-good order used as a golden canary: if pricing regresses, /health
# fails loudly and the on-call (SENTINEL) is expected to investigate.
_CANARY_ITEMS = [
    {"sku": "SKU-001", "quantity": 2, "unit_price": 19.99},
    {"sku": "SKU-777", "quantity": 1, "unit_price": 5.00},
]
_CANARY_EXPECTED_TOTAL = 43.41  # (44.98 - 10% = 40.48) + 7.25% US tax = 43.41


@app.get("/health")
def health() -> JSONResponse:
    try:
        result = pricing.compute_total(_CANARY_ITEMS, discount_code="WELCOME10", region="US")
        if abs(result["total"] - _CANARY_EXPECTED_TOTAL) > 0.005:
            raise AssertionError(
                f"canary pricing mismatch: expected {_CANARY_EXPECTED_TOTAL}, got {result['total']} "
                f"(breakdown={result})"
            )
    except Exception as exc:  # noqa: BLE001 — health must never crash silently
        logger.error("HEALTHCHECK FAILED: %s\n%s", exc, traceback.format_exc())
        return JSONResponse(status_code=500, content={"status": "unhealthy", "error": str(exc)})
    return JSONResponse(content={"status": "ok", "canary_total": result["total"]})


@app.post("/admin/reload")
def reload_modules() -> JSONResponse:
    """Hot-reload business logic (deterministic alternative to file watching)."""
    import importlib

    importlib.reload(pricing)
    logger.info("pricing module hot-reloaded")
    return JSONResponse(content={"reloaded": True})


@app.post("/api/charge")
def charge(req: ChargeRequest) -> JSONResponse:
    try:
        breakdown = pricing.compute_total(
            [i.model_dump() for i in req.items],
            discount_code=req.discount_code,
            region=req.region,
        )
    except pricing.PricingError as exc:
        logger.warning("charge rejected: %s", exc)
        return JSONResponse(status_code=422, content={"error": str(exc)})
    except Exception as exc:  # noqa: BLE001
        logger.error("charge crashed: %s\n%s", exc, traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": "internal error"})
    logger.info("charged order: total=%s region=%s", breakdown["total"], breakdown["region"])
    return JSONResponse(content=breakdown)
