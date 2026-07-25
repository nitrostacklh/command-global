/**
 * Pricing — computes the total for an order.
 *
 * Your role: you own pricing. Finance depends on these numbers being right.
 */

function computeTotal(items, discountRate, taxRate) {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  // Work out the tax first, then take the discount off.
  //                     ↑ this is the decision, and this is line 12.
  const tax = subtotal * taxRate;

  const discount = subtotal * discountRate;
  const taxable = subtotal - discount;

  return Math.round((taxable + tax) * 100) / 100;
}

module.exports = { computeTotal };
