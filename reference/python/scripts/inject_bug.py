"""Demo fault injection — break Atlas Payments live, on stage.

Each bug is a realistic regression applied to service/app/pricing.py via
exact string replacement. A pristine copy is stashed on first injection so
`restore()` can always roll back.

Usage:
    python -m scripts.inject_bug tax-before-discount
    python -m scripts.inject_bug --restore
    python -m scripts.inject_bug --list
"""

from __future__ import annotations

import os
import shutil
import sys
import urllib.request
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parents[1] / "service"
PRICING = SERVICE_DIR / "app" / "pricing.py"
PRISTINE = SERVICE_DIR / "app" / ".pricing.pristine.py"

# name -> (description, old, new)
BUGS: dict[str, tuple[str, str, str]] = {
    "tax-before-discount": (
        "Regression: tax is computed on the pre-discount subtotal, overcharging every discounted order.",
        """    sub = subtotal(items)
    disc = discount_amount(sub, discount_code)
    taxable = round(sub - disc, 2)
    tax = tax_amount(taxable, region)""",
        """    sub = subtotal(items)
    disc = discount_amount(sub, discount_code)
    taxable = round(sub - disc, 2)
    tax = tax_amount(sub, region)""",
    ),
    "flipped-validation": (
        "Regression: quantity validation flipped, rejecting every valid order line.",
        """    if quantity <= 0:
        raise PricingError(f"quantity must be positive, got {quantity}")""",
        """    if quantity >= 0:
        raise PricingError(f"quantity must be positive, got {quantity}")""",
    ),
    "region-keyerror": (
        "Regression: tax lookup bypasses normalization/validation and crashes with KeyError.",
        """    key = region.strip().upper()
    if key not in TAX_RATES:
        raise PricingError(f"unsupported region: {region!r}")
    return round(amount * TAX_RATES[key], 2)""",
        """    return round(amount * TAX_RATES[region.lower()], 2)""",
    ),
}


def _hot_reload_service() -> None:
    """Ask the running service to reload immediately (file-watcher lag workaround)."""
    url = os.environ.get("SENTINEL_SERVICE_URL", "http://127.0.0.1:8000") + "/admin/reload"
    try:
        urllib.request.urlopen(urllib.request.Request(url, method="POST"), timeout=2)
    except Exception:  # noqa: BLE001 — service may not be running; that's fine
        pass


def inject(name: str) -> str:
    description, old, new = BUGS[name]  # KeyError propagates for unknown names
    if not PRISTINE.exists():
        shutil.copy2(PRICING, PRISTINE)
    text = PRISTINE.read_text(encoding="utf-8")  # always inject into pristine code
    if old not in text:
        raise RuntimeError(f"bug template no longer matches pricing.py: {name}")
    PRICING.write_text(text.replace(old, new, 1), encoding="utf-8")
    _hot_reload_service()
    print(f"[injected] {name}: {description}")
    return description


def restore() -> None:
    if PRISTINE.exists():
        shutil.copy2(PRISTINE, PRICING)
        _hot_reload_service()
        print("[restored] pricing.py back to pristine state")
    else:
        print("nothing to restore — no bug was injected")


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("--list", "-l"):
        for name, (desc, *_rest) in BUGS.items():
            print(f"  {name:22} {desc}")
        return 0
    if argv[0] in ("--restore", "-r"):
        restore()
        return 0
    try:
        inject(argv[0])
    except KeyError:
        print(f"unknown bug {argv[0]!r}; use --list")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
