"""Unit tests for the Atlas Payments pricing engine.

SENTINEL runs this suite inside its verification sandbox: a proposed patch is
only eligible for deployment once every test here passes.
"""

import pytest

from app import pricing


BASKET = [
    {"sku": "SKU-001", "quantity": 2, "unit_price": 19.99},
    {"sku": "SKU-777", "quantity": 1, "unit_price": 5.00},
]


class TestLineTotal:
    def test_simple(self):
        assert pricing.line_total(3, 10.0) == 30.0

    def test_rounding(self):
        assert pricing.line_total(3, 0.1) == 0.3

    def test_rejects_zero_quantity(self):
        with pytest.raises(pricing.PricingError):
            pricing.line_total(0, 10.0)

    def test_rejects_negative_quantity(self):
        with pytest.raises(pricing.PricingError):
            pricing.line_total(-1, 10.0)

    def test_accepts_positive_quantity(self):
        assert pricing.line_total(1, 5.0) == 5.0

    def test_rejects_negative_price(self):
        with pytest.raises(pricing.PricingError):
            pricing.line_total(1, -0.01)


class TestSubtotal:
    def test_basket(self):
        assert pricing.subtotal(BASKET) == 44.98

    def test_empty_order_rejected(self):
        with pytest.raises(pricing.PricingError):
            pricing.subtotal([])


class TestDiscount:
    def test_no_code(self):
        assert pricing.discount_amount(100.0, None) == 0.0

    def test_welcome10(self):
        assert pricing.discount_amount(44.98, "WELCOME10") == 4.5

    def test_code_is_case_insensitive(self):
        assert pricing.discount_amount(100.0, "vip40") == 40.0

    def test_unknown_code_rejected(self):
        with pytest.raises(pricing.PricingError):
            pricing.discount_amount(100.0, "BOGUS")


class TestTax:
    @pytest.mark.parametrize(
        "region,expected",
        [("US", 7.25), ("EU", 21.0), ("UK", 20.0), ("IN", 18.0)],
    )
    def test_rates(self, region, expected):
        assert pricing.tax_amount(100.0, region) == expected

    def test_region_case_insensitive(self):
        assert pricing.tax_amount(100.0, "us") == 7.25

    def test_unknown_region_rejected(self):
        with pytest.raises(pricing.PricingError):
            pricing.tax_amount(100.0, "MARS")


class TestComputeTotal:
    def test_canary_order(self):
        """The golden canary used by the /health endpoint."""
        result = pricing.compute_total(BASKET, discount_code="WELCOME10", region="US")
        assert result["subtotal"] == 44.98
        assert result["discount"] == 4.5
        assert result["tax"] == 2.93  # 7.25% of 40.48
        assert result["total"] == 43.41

    def test_tax_applies_after_discount(self):
        """Tax must be computed on the discounted amount, not the subtotal."""
        result = pricing.compute_total(
            [{"sku": "A", "quantity": 1, "unit_price": 100.0}],
            discount_code="VIP40",
            region="UK",
        )
        assert result["tax"] == 12.0   # 20% of 60, NOT 20% of 100
        assert result["total"] == 72.0

    def test_no_discount(self):
        result = pricing.compute_total(BASKET, region="EU")
        assert result["discount"] == 0.0
        assert result["total"] == round(44.98 * 1.21, 2)

    def test_breakdown_is_consistent(self):
        r = pricing.compute_total(BASKET, discount_code="SUMMER25", region="IN")
        assert r["total"] == round(r["subtotal"] - r["discount"] + r["tax"], 2)
