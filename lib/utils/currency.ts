/**
 * Central currency & number formatting utilities — INR / Indian Rupee system
 */

/**
 * Format a number as Indian Rupee with proper IN locale formatting
 * Examples: 125000 → ₹1,25,000 | 5000 → ₹5,000 | 2450 → ₹2,450
 */
export function formatINR(amount: number | string | null | undefined): string {
  const num = Number(amount)
  if (isNaN(num) || amount === null || amount === undefined) return "₹0"
  return `₹${num.toLocaleString("en-IN")}`
}

/**
 * Format a compact version for large numbers on dashboards
 * Examples: 125000 → ₹1.25L | 5000000 → ₹50L | 10000000 → ₹1Cr
 */
export function formatINRCompact(amount: number | string | null | undefined): string {
  const num = Number(amount)
  if (isNaN(num) || amount === null || amount === undefined) return "₹0"
  if (num >= 10_000_000) return `₹${(num / 10_000_000).toFixed(2)}Cr`
  if (num >= 100_000) return `₹${(num / 100_000).toFixed(2)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`
  return `₹${num.toLocaleString("en-IN")}`
}

/**
 * Safe number parser — returns 0 for null/undefined/NaN
 */
export function safeNum(val: any): number {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}
