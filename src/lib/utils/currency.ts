/**
 * Monetary & Currency Precision Utilities for L'Asador – Grill & Brew.
 * Location: Sector 82, JLPL Industrial Area, Mohali, Punjab.
 *
 * Avoids IEEE 754 floating-point rounding inaccuracies by computing in integer paise
 * (1 INR = 100 paise) and explicitly rounding at every statutory financial boundary.
 */

/**
 * Converts INR Rupees into integer paise (1 INR = 100 paise).
 */
export function toPaise(rupees: number): number {
  return Math.round(Number(rupees || 0) * 100);
}

/**
 * Converts integer paise back into formatted INR Rupees with 2 decimal precision.
 */
export function fromPaise(paise: number): number {
  return Number((Math.round(paise || 0) / 100).toFixed(2));
}

/**
 * Rounds any floating-point currency amount to exact 2-decimal rupee precision.
 */
export function roundCurrency(amount: number): number {
  return fromPaise(toPaise(amount));
}

/**
 * Computes an order line item subtotal in paise before converting to rupees.
 */
export function calculateLineSubtotal(
  unitPrice: number,
  modifierTotal: number = 0,
  quantity: number = 1
): number {
  const pricePaise = toPaise(unitPrice) + toPaise(modifierTotal);
  const linePaise = pricePaise * Math.max(1, Math.floor(quantity));
  return fromPaise(linePaise);
}

/**
 * Calculates statutory 5% Indian GST (2.5% CGST + 2.5% SGST) using integer paise.
 */
export function calculateStatutoryGst(subtotal: number): {
  subtotal: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  grandTotal: number;
} {
  const subtotalPaise = toPaise(subtotal);
  const cgstPaise = Math.round(subtotalPaise * 0.025);
  const sgstPaise = Math.round(subtotalPaise * 0.025);
  const totalTaxPaise = cgstPaise + sgstPaise;
  const grandTotalPaise = subtotalPaise + totalTaxPaise;

  return {
    subtotal: fromPaise(subtotalPaise),
    cgst: fromPaise(cgstPaise),
    sgst: fromPaise(sgstPaise),
    totalTax: fromPaise(totalTaxPaise),
    grandTotal: fromPaise(grandTotalPaise),
  };
}

/**
 * Validates a payment against an outstanding bill balance in paise.
 * Returns whether payment is valid, and computes remaining balance without float errors.
 */
export function evaluatePayment(
  finalTotal: number,
  alreadyPaid: number,
  newPaymentAmount: number
): {
  isValid: boolean;
  error?: string;
  newAmountPaid: number;
  balanceRemaining: number;
  isFullySettled: boolean;
} {
  const totalPaise = toPaise(finalTotal);
  const paidPaise = toPaise(alreadyPaid);
  const newPayPaise = toPaise(newPaymentAmount);

  if (newPayPaise <= 0) {
    return {
      isValid: false,
      error: "Payment amount must be greater than zero.",
      newAmountPaid: fromPaise(paidPaise),
      balanceRemaining: fromPaise(totalPaise - paidPaise),
      isFullySettled: false,
    };
  }

  const currentBalancePaise = totalPaise - paidPaise;
  if (newPayPaise > currentBalancePaise) {
    return {
      isValid: false,
      error: `Overpayment rejected: payment of ₹${fromPaise(newPayPaise).toFixed(
        2
      )} exceeds outstanding balance of ₹${fromPaise(currentBalancePaise).toFixed(2)}.`,
      newAmountPaid: fromPaise(paidPaise),
      balanceRemaining: fromPaise(currentBalancePaise),
      isFullySettled: false,
    };
  }

  const updatedPaidPaise = paidPaise + newPayPaise;
  const updatedBalancePaise = Math.max(0, totalPaise - updatedPaidPaise);
  const isFullySettled = updatedBalancePaise === 0;

  return {
    isValid: true,
    newAmountPaid: fromPaise(updatedPaidPaise),
    balanceRemaining: fromPaise(updatedBalancePaise),
    isFullySettled,
  };
}

/**
 * Formats a numeric rupee amount as clean Indian currency string.
 */
export function formatINR(amount: number): string {
  return `₹${roundCurrency(amount).toFixed(2)}`;
}
