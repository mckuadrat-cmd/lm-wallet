/**
 * Formats a number to Leadership Money (LM) Indonesian format.
 * Example: 1500 -> 1.500 LM, -260 -> -260 LM
 */
export function formatLM(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 LM'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0 LM'

  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.abs(num))

  return `${num < 0 ? '-' : ''}${formatted} LM`
}
