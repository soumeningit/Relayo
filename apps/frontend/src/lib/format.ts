/** Format an INR amount, e.g. 2999 -> ₹2,999. */
export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}