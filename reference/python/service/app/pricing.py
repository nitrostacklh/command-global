"""Atlas Payments — pricing engine.

Pure business logic for computing order totals: subtotal, discount codes,
regional tax, and the final charge amount. Kept deliberately framework-free
so it is unit-testable in isolation.
"""

from __future__ import annotations

from typing import Iterable, Mapping, Optional

# Regional VAT / sales-tax rates applied to the *discounted* amount.
TAX_RATES: dict[str, float] = {
    "US": 0.0725,
    "EU": 0.21,
    "UK": 0.20,
    "IN": 0.18,
}

# Promotional discount codes -> fractional discount on the subtotal.
DISCOUNT_CODES: dict[str, float] = {
    "WELCOME10": 0.10,
    "SUMMER25": 0.25,
    "VIP40": 0.40,
}


class PricingError(ValueError):
    """Raised when an order cannot be priced."""


def line_total(quantity: int, unit_price: float) -> float:
    """Price of a single order line.

    Raises PricingError for non-positive quantities or negative prices.
    """
    if quantity <= 0:
        raise PricingError(f"quantity must be positive, got {quantity}")
    if unit_price < 0:
        raise PricingError(f"unit_price must be non-negative, got {unit_price}")
    return round(quantity * unit_price, 2)


def subtotal(items: Iterable[Mapping]) -> float:
    """Sum of all line totals for the order."""
    items = list(items)
    if not items:
        raise PricingError("order must contain at least one item")
    return round(sum(line_total(int(i["quantity"]), float(i["unit_price"])) for i in items), 2)


def discount_amount(amount: float, code: Optional[str]) -> float:
    """Discount value for a code applied to `amount`. Unknown codes are rejected."""
    if code is None:
        return 0.0
    rate = DISCOUNT_CODES.get(code.strip().upper())
    if rate is None:
        raise PricingError(f"unknown discount code: {code!r}")
    return round(amount * rate, 2)


def tax_amount(amount: float, region: str) -> float:
    """Tax owed on `amount` for a region. Unknown regions are rejected."""
    key = region.strip().upper()
    if key not in TAX_RATES:
        raise PricingError(f"unsupported region: {region!r}")
    return round(amount * TAX_RATES[key], 2)


def compute_total(
    items: Iterable[Mapping],
    discount_code: Optional[str] = None,
    region: str = "US",
) -> dict:
    """Full pricing breakdown for an order.

    Tax is computed on the discounted amount (subtotal - discount), which is
    the legally correct order of operations in every region we serve.
    """
    sub = subtotal(items)
    disc = discount_amount(sub, discount_code)
    taxable = round(sub - disc, 2)
    tax = tax_amount(taxable, region)
    total = round(taxable + tax, 2)
    return {
        "subtotal": sub,
        "discount": disc,
        "tax": tax,
        "total": total,
        "region": region.strip().upper(),
        "discount_code": discount_code,
    }
