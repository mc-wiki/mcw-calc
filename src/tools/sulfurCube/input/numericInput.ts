const decimalNumberPattern = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/

/**
 * Keep reader-entered numeric text in the non-exponential decimal form used by
 * the sulfur-cube controls. Commas are normalized to dots at the form boundary;
 * the browser remains free to localize the rendered number widget.
 */
export function sanitizeNumericInput(value: string | number): string | number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : ''
  }

  let result = ''
  let hasDecimalSeparator = false

  for (const character of value) {
    if (character >= '0' && character <= '9') {
      result += character
    } else if (character === '-' && result === '') {
      result = '-'
    } else if ((character === '.' || character === ',') && !hasDecimalSeparator) {
      result += '.'
      hasDecimalSeparator = true
    }
  }

  return result
}

/** Empty and transitional edit states behave as zero until more digits arrive. */
export function parseNumericInput(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const normalized = value.trim().replace(',', '.')

  if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') {
    return 0
  }

  if (!decimalNumberPattern.test(normalized)) {
    return null
  }

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}
