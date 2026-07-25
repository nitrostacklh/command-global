/**
 * Golden order tests — the acceptance criteria for the pricing deliverable.
 *
 * These are the numbers finance signed off on. Run them with:  node --test
 *
 * Test 3 is the one that fails, and the error it prints points at THIS file.
 * The mistake is not in this file.
 */

const assert = require('node:assert/strict');
const test = require('node:test');
const { computeTotal } = require('./pricing');

// ── test 1 ────────────────────────────────────────────────────────────────
// $100 of goods, no discount code, 20% tax.
// subtotal 100 → discount 0 → taxable 100 → tax 20 → total 120.00
test('test 1 — no discount, 20% tax', () => {
  const items = [{ price: 50, qty: 2 }];
  assert.equal(computeTotal(items, 0, 0.2), 120.0);
});

// ── test 2 ────────────────────────────────────────────────────────────────
// $100 of goods, no discount code, no tax.
// subtotal 100 → discount 0 → taxable 100 → tax 0 → total 100.00
test('test 2 — no discount, no tax', () => {
  const items = [{ price: 25, qty: 4 }];
  assert.equal(computeTotal(items, 0, 0), 100.0);
});

// ── test 3 ────────────────────────────────────────────────────────────────
// $100 of goods, a 40%-OFF code, 20% tax.
// subtotal 100 → discount 40 → taxable 60 → tax 12 → total 72.00
//
// Tests 1 and 2 pass because discountRate is 0 in both: with no discount,
// taxing the subtotal and taxing the discounted amount are the same number.
// Test 3 is the first case where those two differ — which is why the bug hid
// this long, and why the error surfaces here rather than where it was made.
test('test 3 — 40% discount, 20% tax', () => {
  const items = [{ price: 100, qty: 1 }];
  assert.equal(computeTotal(items, 0.4, 0.2), 72.0); // ← ✗ actual: 80.00
});
