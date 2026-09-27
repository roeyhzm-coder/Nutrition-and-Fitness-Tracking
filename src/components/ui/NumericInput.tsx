import type { InputHTMLAttributes } from 'react'
import {
  acceptNumericInput,
  safeInputValue,
} from '../../lib/numericInput'

type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'step' | 'inputMode'
> & {
  value: string | number | null | undefined
  onChange: (next: string) => void
  /** 0 = integers only; default 2 decimal places. */
  decimals?: number
}

export function NumericInput({
  value,
  onChange,
  decimals = 2,
  className = 'mt-1 field',
  ...rest
}: NumericInputProps) {
  const integer = decimals <= 0
  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      step={integer ? 1 : 0.01}
      value={safeInputValue(value)}
      onChange={(e) => {
        const next = acceptNumericInput(e.target.value, decimals)
        if (next != null) onChange(next)
      }}
      className={className}
      {...rest}
    />
  )
}
